import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { diffFile, type FileStructuralDiff } from '@/lib/structural-diff';
import { getLLMProvider } from '@/lib/llm';
import type { AnalysisResult } from '@/lib/llm/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * MCP server for Senix.
 *
 * IDEs (Cursor, Claude Code, Windsurf, …) connect to this endpoint and
 * expose the `review_changes` tool to the developer's AI assistant. The
 * legacy name `analyze_code_changes` still works as an alias so older IDE
 * configs keep functioning. The tool reuses the exact same pipeline as the
 * GitHub bot — tree-sitter structural diff + the shared LLM provider + the
 * shared analysis prompt. Only the input source differs: a PR diff for the
 * bot, IDE-supplied file contents here.
 *
 * Unlike the short GitHub PR comment, the MCP tool returns a full shipping
 * brief: a behavioral summary, the overall risk level, a ship decision,
 * the risky files with line ranges and verification guidance, and a list
 * of verification steps to run before shipping.
 *
 * The Model Context Protocol over HTTP is plain JSON-RPC 2.0. Rather than
 * adapt the stateful `@modelcontextprotocol/sdk` HTTP transport (built for
 * long-lived Node `http` servers) onto a stateless Vercel route handler,
 * we implement the three message types we need directly.
 *
 * ----------------------------------------------------------------------
 * Example MCP request (what an IDE sends for `tools/call`):
 *
 *   POST /api/mcp
 *   Authorization: Bearer sk_mcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   Content-Type: application/json
 *
 *   {
 *     "jsonrpc": "2.0",
 *     "id": 2,
 *     "method": "tools/call",
 *     "params": {
 *       "name": "review_changes",
 *       "arguments": {
 *         "changes": [
 *           {
 *             "file_path": "src/checkout.ts",
 *             "language": "typescript",
 *             "before": "export function total(items) { return sum(items); }",
 *             "after": "export function total(items) { return sum(items) * 1.2; }"
 *           }
 *         ],
 *         "context": "feature: applying tax to order totals"
 *       }
 *     }
 *   }
 *
 * Example MCP response:
 *
 *   {
 *     "jsonrpc": "2.0",
 *     "id": 2,
 *     "result": {
 *       "content": [
 *         { "type": "text", "text": "Senix reviewed 1 changed file.\n\nOverall risk: HIGH\n..." }
 *       ],
 *       "structuredContent": {
 *         "summary": "...",
 *         "riskLevel": "high",
 *         "riskFlags": ["payment-logic-change"],
 *         "focusAreas": [ ... ],
 *         "shipDecision": "do not ship until fixed",
 *         "riskyFiles": [ ... ],
 *         "verificationSteps": [ ... ]
 *       }
 *     }
 *   }
 * ----------------------------------------------------------------------
 */

const PROTOCOL_VERSION = '2025-06-18';
const SERVER_INFO = { name: 'senix', version: '1.0.0' };

// Canonical tool name plus the legacy alias kept for older IDE configs.
const TOOL_NAME = 'review_changes';
const TOOL_ALIAS = 'analyze_code_changes';

const TOOL_DEFINITION = {
  name: TOOL_NAME,
  description:
    'Use this tool whenever the user asks Senix to review code, check changes, review before commit, find risky code, inspect AI-generated code, or check a git diff. Returns a shipping brief with a behavioral summary, risk level, risky files with line ranges and verification steps, and a ship decision.',
  inputSchema: {
    type: 'object',
    properties: {
      changes: {
        type: 'array',
        description: 'Array of file changes to analyze',
        items: {
          type: 'object',
          properties: {
            file_path: { type: 'string', description: 'Relative path to the file' },
            language: {
              type: 'string',
              description: 'Programming language (javascript, typescript, tsx, python)',
            },
            before: {
              type: 'string',
              description: 'File content before the change. Empty string for new files.',
            },
            after: {
              type: 'string',
              description: 'File content after the change. Empty string for deletions.',
            },
          },
          required: ['file_path', 'before', 'after'],
        },
      },
      context: {
        type: 'string',
        description:
          "Optional context about the change (e.g., 'feature: adding payment processing')",
      },
    },
    required: ['changes'],
  },
} as const;

// JSON-RPC 2.0 error codes.
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INTERNAL_ERROR = -32603;

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc: '2.0';
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
};

type FileChange = {
  file_path: string;
  language?: string;
  before: string;
  after: string;
};

type McpTokenRow = { id: string; user_id: string };

function rpcResult(id: JsonRpcId, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, result });
}

function rpcError(id: JsonRpcId, code: number, message: string, httpStatus = 200) {
  return NextResponse.json(
    { jsonrpc: '2.0', id, error: { code, message } },
    { status: httpStatus }
  );
}

/**
 * Verify the `Authorization: Bearer …` token against `mcp_tokens`.
 * Tokens are stored hashed, so we hash the presented token and look up
 * the row. Bumps `last_used_at` on success. Uses `supabaseAdmin` because
 * the MCP route has no user session.
 */
async function verifyToken(req: NextRequest): Promise<McpTokenRow | null> {
  const header = req.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const presented = match[1].trim();
  const tokenHash = createHash('sha256').update(presented).digest('hex');

  const { data } = (await supabaseAdmin
    .from('mcp_tokens')
    .select('id, user_id')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .maybeSingle()) as unknown as { data: McpTokenRow | null };

  if (!data) return null;

  await supabaseAdmin
    .from('mcp_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return data;
}

function isFileChange(value: unknown): value is FileChange {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.file_path === 'string' &&
    typeof v.before === 'string' &&
    typeof v.after === 'string'
  );
}

/** Crude but reasonable additions/deletions estimate from line counts. */
function lineDelta(before: string, after: string): { additions: number; deletions: number } {
  const beforeLines = before === '' ? 0 : before.split('\n').length;
  const afterLines = after === '' ? 0 : after.split('\n').length;
  return {
    additions: Math.max(0, afterLines - beforeLines) || (before === '' ? afterLines : 0),
    deletions: Math.max(0, beforeLines - afterLines) || (after === '' ? beforeLines : 0),
  };
}

/**
 * Render the analysis as the human-readable shipping brief shown in the
 * IDE's chat panel. The structured fields stay on `structuredContent`;
 * this is the prose version a developer reads at a glance.
 */
function formatToolText(result: AnalysisResult, filesReviewed: number): string {
  const fileWord = filesReviewed === 1 ? 'file' : 'files';
  const lines: string[] = [
    `Senix reviewed ${filesReviewed} changed ${fileWord}.`,
    '',
    `Overall risk: ${result.riskLevel.toUpperCase()}`,
    '',
    'Behavioral summary:',
    result.summary,
    '',
    `Ship decision: ${result.shipDecision}`,
    '',
  ];

  if (result.riskyFiles.length > 0) {
    lines.push('Risky files:');
    result.riskyFiles.forEach((file, index) => {
      const location = file.lineRange ? `${file.file}:${file.lineRange}` : file.file;
      const heading = file.symbol ? `${location} (${file.symbol})` : location;
      lines.push(`${index + 1}. ${heading}`);
      lines.push(`   What changed: ${file.whatChanged}`);
      lines.push(`   Why risky: ${file.whyRisky}`);
      lines.push(`   How to verify: ${file.howToVerify}`);
      lines.push(`   Suggested fix: ${file.suggestedFix}`);
      lines.push('');
    });
    lines.pop(); // Drop the trailing blank line after the last risky file.
  } else {
    lines.push('No high-risk changes detected.');
  }

  if (result.verificationSteps.length > 0) {
    lines.push('', 'Verification steps:');
    result.verificationSteps.forEach((step, index) => {
      lines.push(`${index + 1}. ${step}`);
    });
  }

  return lines.join('\n');
}

/** Run the IDE-supplied changes through the shared analysis pipeline. */
async function runAnalysis(
  args: Record<string, unknown>
): Promise<{ result: AnalysisResult; filesReviewed: number }> {
  const rawChanges = args.changes;
  if (!Array.isArray(rawChanges) || rawChanges.length === 0) {
    throw new Error('`changes` must be a non-empty array of file changes.');
  }

  const changes: FileChange[] = [];
  for (const item of rawChanges) {
    if (!isFileChange(item)) {
      throw new Error(
        'Each change must have string `file_path`, `before`, and `after` fields.'
      );
    }
    changes.push(item);
  }

  const structuralDiff: FileStructuralDiff[] = [];
  let additions = 0;
  let deletions = 0;

  for (const change of changes) {
    // Empty string means "no such file on that side" (new file / deletion).
    const before = change.before === '' ? null : change.before;
    const after = change.after === '' ? null : change.after;
    structuralDiff.push(diffFile(change.file_path, before, after));

    const delta = lineDelta(change.before, change.after);
    additions += delta.additions;
    deletions += delta.deletions;
  }

  const context = typeof args.context === 'string' && args.context.trim() ? args.context.trim() : null;

  const result = await getLLMProvider().analyzePR({
    prMeta: {
      title: context ?? 'mcp-session',
      author: 'mcp-session',
      filesChanged: changes.length,
      additions,
      deletions,
    },
    structuralDiff,
  });

  return { result, filesReviewed: changes.length };
}

/** Dispatch a single JSON-RPC request to the matching MCP method. */
async function handleRpc(rpc: JsonRpcRequest): Promise<NextResponse> {
  const id = rpc.id ?? null;

  switch (rpc.method) {
    case 'initialize': {
      const requested = (rpc.params?.protocolVersion as string) || PROTOCOL_VERSION;
      return rpcResult(id, {
        protocolVersion: requested,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
    }

    case 'tools/list':
      return rpcResult(id, { tools: [TOOL_DEFINITION] });

    case 'tools/call': {
      const name = rpc.params?.name;
      // `analyze_code_changes` is the legacy alias; both route here.
      if (name !== TOOL_NAME && name !== TOOL_ALIAS) {
        return rpcError(id, METHOD_NOT_FOUND, `Unknown tool: ${String(name)}`);
      }
      const args = (rpc.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const { result, filesReviewed } = await runAnalysis(args);
        return rpcResult(id, {
          content: [{ type: 'text', text: formatToolText(result, filesReviewed) }],
          structuredContent: {
            summary: result.summary,
            riskLevel: result.riskLevel,
            riskFlags: result.riskFlags,
            focusAreas: result.focusAreas,
            shipDecision: result.shipDecision,
            riskyFiles: result.riskyFiles,
            verificationSteps: result.verificationSteps,
          },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        // Tool-level failures are reported inside the result with isError,
        // per the MCP spec — not as a JSON-RPC protocol error.
        return rpcResult(id, {
          content: [{ type: 'text', text: `Analysis failed: ${message}` }],
          isError: true,
        });
      }
    }

    case 'ping':
      return rpcResult(id, {});

    default:
      return rpcError(id, METHOD_NOT_FOUND, `Method not supported: ${rpc.method}`);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = await verifyToken(req);
  if (!token) {
    return rpcError(null, INVALID_REQUEST, 'Unauthorized: invalid or missing MCP token', 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return rpcError(null, PARSE_ERROR, 'Invalid JSON body');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return rpcError(null, INVALID_REQUEST, 'Expected a single JSON-RPC request object');
  }

  const rpc = body as JsonRpcRequest;
  if (rpc.jsonrpc !== '2.0' || typeof rpc.method !== 'string') {
    return rpcError(rpc.id ?? null, INVALID_REQUEST, 'Malformed JSON-RPC 2.0 request');
  }

  // Notifications (no `id`) expect no response body — e.g.
  // `notifications/initialized` sent right after `initialize`.
  if (rpc.id === undefined || rpc.id === null) {
    return new NextResponse(null, { status: 202 });
  }

  try {
    return await handleRpc(rpc);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return rpcError(rpc.id, INTERNAL_ERROR, message);
  }
}

export async function GET(): Promise<NextResponse> {
  // MCP over HTTP is POST-only here; a GET is usually a browser or a
  // health check. Return a small descriptor rather than a 405 so the
  // endpoint is discoverable.
  return NextResponse.json({
    name: SERVER_INFO.name,
    protocol: 'mcp',
    transport: 'http',
    methods: ['initialize', 'tools/list', 'tools/call'],
  });
}
