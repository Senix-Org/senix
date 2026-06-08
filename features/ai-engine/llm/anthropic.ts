import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt, buildUserPrompt } from '@features/ai-engine/prompts/pr-analysis';
import {
  normalizeRiskyFiles,
  normalizeVerificationSteps,
  resolveShipDecision,
} from '@features/ai-engine/llm/normalize';
import type {
  AnalysisInput,
  AnalysisResult,
  FocusArea,
  LLMProvider,
  RiskLevel,
} from '@features/ai-engine/llm/types';

type ToolInput = {
  summary: string;
  risk_level: RiskLevel;
  risk_flags: string[];
  focus_areas: FocusArea[];
  ship_decision?: unknown;
  risky_files?: unknown;
  verification_steps?: unknown;
};

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1500;
const TEMPERATURE = 0;
const REQUEST_TIMEOUT_MS = 60_000;

// USD pricing for claude-sonnet-4-6, expressed in cents per million tokens
const INPUT_CENTS_PER_MTOK = 300; // $3.00 / 1M
const OUTPUT_CENTS_PER_MTOK = 1500; // $15.00 / 1M

const TOOL_NAME = 'submit_analysis';

const TOOL_INPUT_SCHEMA = {
  type: 'object' as const,
  properties: {
    summary: {
      type: 'string',
      description: 'Exactly 3 sentences describing the behavioral change.',
    },
    risk_level: {
      type: 'string',
      enum: ['low', 'medium', 'high'],
      description: 'Production-impact risk level, not diff size.',
    },
    risk_flags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Short kebab-case risk labels that apply to this PR.',
    },
    focus_areas: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          lines: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['file', 'lines', 'reason'],
      },
      description: 'Up to 3 file/line ranges that deserve reviewer attention.',
    },
    ship_decision: {
      type: 'string',
      enum: ['safe to ship', 'ship after checking', 'do not ship until fixed'],
      description: 'Ship recommendation, consistent with risk_level.',
    },
    risky_files: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'File path exactly as given in the diff.' },
          line_range: { type: 'string', description: 'Affected lines, e.g. "20-36" or "45".' },
          symbol: {
            type: 'string',
            description: 'Function, method, or class name involved, when one applies.',
          },
          what_changed: { type: 'string', description: 'One sentence on what the code now does.' },
          why_risky: { type: 'string', description: 'One sentence on the production impact.' },
          how_to_verify: {
            type: 'string',
            description: 'A concrete test the developer can run.',
          },
          suggested_fix: {
            type: 'string',
            description: 'The direction of a safe fix, not full code.',
          },
        },
        required: [
          'file',
          'line_range',
          'what_changed',
          'why_risky',
          'how_to_verify',
          'suggested_fix',
        ],
      },
      description: 'Files with real production risk. Empty when nothing risky was found.',
    },
    verification_steps: {
      type: 'array',
      maxItems: 5,
      items: { type: 'string' },
      description: 'Up to 5 concrete checks to run before shipping. Empty for trivial changes.',
    },
  },
  required: [
    'summary',
    'risk_level',
    'risk_flags',
    'focus_areas',
    'ship_decision',
    'risky_files',
    'verification_steps',
  ],
};

/**
 * LLMProvider backed by the Anthropic Messages API. Uses forced tool-use
 * with the `submit_analysis` tool so the response is always structured
 * JSON rather than free text.
 */
export class AnthropicProvider implements LLMProvider {
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (this.client) return this.client;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('[anthropic] ANTHROPIC_API_KEY must be set to call the Anthropic API');
    }
    this.client = new Anthropic({ apiKey });
    return this.client;
  }

  /**
   * Send a structural diff to Claude and return a typed behavioral analysis.
   * Throws with an `[anthropic]` prefix if the API key is missing, the
   * request times out (60s), or Claude fails to invoke the tool.
   */
  async analyzePR(input: AnalysisInput): Promise<AnalysisResult> {
    const { prMeta, structuralDiff } = input;

    const response = await this.getClient().messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        system: buildSystemPrompt(),
        tools: [
          {
            name: TOOL_NAME,
            description:
              'Submit a structured behavioral analysis of the pull request. Must be called.',
            input_schema: TOOL_INPUT_SCHEMA,
          },
        ],
        tool_choice: { type: 'tool', name: TOOL_NAME },
        messages: [{ role: 'user', content: buildUserPrompt(prMeta, structuralDiff) }],
      },
      { timeout: REQUEST_TIMEOUT_MS }
    );

    const toolUse = response.content.find((block) => block.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use' || toolUse.name !== TOOL_NAME) {
      throw new Error(
        `[anthropic] response did not invoke ${TOOL_NAME} tool — stop_reason=${response.stop_reason}`
      );
    }

    const toolInput = toolUse.input as ToolInput;
    if (
      typeof toolInput.summary !== 'string' ||
      typeof toolInput.risk_level !== 'string' ||
      !Array.isArray(toolInput.risk_flags) ||
      !Array.isArray(toolInput.focus_areas)
    ) {
      throw new Error('[anthropic] submit_analysis tool input was missing required fields');
    }

    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
    const costUsdCents = computeCostCents(
      response.usage.input_tokens,
      response.usage.output_tokens
    );

    return {
      summary: toolInput.summary,
      riskLevel: toolInput.risk_level,
      riskFlags: toolInput.risk_flags,
      focusAreas: toolInput.focus_areas,
      shipDecision: resolveShipDecision(toolInput.ship_decision, toolInput.risk_level),
      riskyFiles: normalizeRiskyFiles(toolInput.risky_files),
      verificationSteps: normalizeVerificationSteps(toolInput.verification_steps),
      tokensUsed,
      costUsdCents,
      provider: 'anthropic',
    };
  }
}

function computeCostCents(inputTokens: number, outputTokens: number): number {
  const inputCents = (inputTokens / 1_000_000) * INPUT_CENTS_PER_MTOK;
  const outputCents = (outputTokens / 1_000_000) * OUTPUT_CENTS_PER_MTOK;
  return Math.ceil(inputCents + outputCents);
}
