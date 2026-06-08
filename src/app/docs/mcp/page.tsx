import type { Metadata } from 'next';
import {
  DocH1,
  DocH2,
  DocH3,
  DocLead,
  DocP,
  DocOL,
  DocUL,
  CodeBlock,
  InlineCode,
  DocLink,
} from '@features/shared/components/docs/doc-elements';
import {
  claudeCodeCliCommand,
  claudeCodeConfigJson,
  cursorConfigJson,
  getMcpServerUrl,
  windsurfConfigJson,
} from '@features/shared/mcp-config';

export const metadata: Metadata = {
  title: 'MCP integration for IDEs — Senix Docs',
  description: 'Connect Senix to Cursor, Claude Code, Windsurf, and other MCP-compatible IDEs.',
};

export default function McpDocsPage(): React.ReactElement {
  const serverUrl = getMcpServerUrl();
  // Snippets use a placeholder token; the dashboard Connect flow fills in a
  // real token automatically. These are built from the same module the
  // dashboard uses, so the shapes always match.
  const cursorConfig = cursorConfigJson(null, serverUrl);
  const claudeCodeConfig = claudeCodeConfigJson(null, serverUrl);
  const claudeCodeCli = claudeCodeCliCommand(null, serverUrl);
  const windsurfConfig = windsurfConfigJson(null, serverUrl);

  return (
    <>
      <DocH1>MCP integration for IDEs</DocH1>
      <DocLead>
        Senix integrates with any MCP-compatible IDE. Use it in Cursor, Claude Code,
        Windsurf, and others.
      </DocLead>

      <DocH2>What is MCP?</DocH2>
      <DocP>
        The Model Context Protocol (MCP) is an open standard for AI tools to communicate with
        external services. IDEs that support MCP can connect to a server like Senix and
        expose its tools to your AI assistant. When you ask your IDE&apos;s AI to review your
        changes, it calls the Senix tool, sends the diff, and gets back our analysis — no
        pull request required.
      </DocP>

      <DocH2>Fastest setup: the dashboard</DocH2>
      <DocP>
        The quickest path is{' '}
        <DocLink href="/dashboard/connect">Dashboard → Connect IDE</DocLink>. It generates a
        token, gives you a one-click <strong>Add to Cursor</strong> button (or a copyable{' '}
        <InlineCode>claude mcp add</InlineCode> command for Claude Code), and a live{' '}
        <strong>Test connection</strong> button. The steps below are the manual equivalent.
      </DocP>

      <DocH2>Manual setup</DocH2>
      <DocOL>
        <li>
          Go to <strong>Dashboard → MCP tokens</strong> and click{' '}
          <strong>Generate token</strong>.
        </li>
        <li>Copy the token — it is shown once (with a 60-second recovery window).</li>
        <li>
          Add it to your IDE using the per-IDE instructions below, replacing{' '}
          <InlineCode>YOUR_TOKEN_HERE</InlineCode> with the copied token.
        </li>
      </DocOL>

      <DocH3>Cursor</DocH3>
      <DocP>
        Use the one-click <strong>Add to Cursor</strong> button on the{' '}
        <DocLink href="/dashboard/connect">Connect IDE</DocLink> page, or add this to your{' '}
        <InlineCode>~/.cursor/mcp.json</InlineCode> (global) or{' '}
        <InlineCode>.cursor/mcp.json</InlineCode> (per project).
      </DocP>
      <CodeBlock label="mcp.json">{cursorConfig}</CodeBlock>

      <DocH3>Claude Code</DocH3>
      <DocP>Run this in your terminal, then restart Claude Code:</DocP>
      <CodeBlock label="terminal">{claudeCodeCli}</CodeBlock>
      <DocP>
        Or add it to your <InlineCode>.mcp.json</InlineCode> manually:
      </DocP>
      <CodeBlock label=".mcp.json">{claudeCodeConfig}</CodeBlock>

      <DocH3>Windsurf</DocH3>
      <DocP>
        Add the following to your Windsurf MCP config at{' '}
        <InlineCode>~/.codeium/windsurf/mcp_config.json</InlineCode>.
      </DocP>
      <CodeBlock label="mcp_config.json">{windsurfConfig}</CodeBlock>

      <DocH2>How to use it in your IDE</DocH2>
      <DocP>Once connected, ask your IDE&apos;s AI in plain language:</DocP>
      <DocUL>
        <li>&quot;Review my changes with Senix&quot;</li>
        <li>&quot;Check this code for risks&quot;</li>
      </DocUL>
      <DocP>
        The AI calls Senix&apos;s <InlineCode>review_changes</InlineCode> tool with your
        before/after file contents. You&apos;ll see the behavioral summary, risk level, and
        focus areas right in your chat panel.
      </DocP>

      <DocH2>Differences from the GitHub bot</DocH2>
      <DocUL>
        <li>
          <strong>On-demand vs. automatic</strong> — MCP runs when you ask; the GitHub bot
          runs automatically on PR open and push.
        </li>
        <li>
          <strong>Uncommitted vs. committed</strong> — MCP works on uncommitted changes in
          your editor; the GitHub bot needs a pull request.
        </li>
        <li>
          <strong>Same brain</strong> — both use the same prompt and the same 8-flag risk
          taxonomy, so the analysis is consistent across surfaces.
        </li>
      </DocUL>
      <DocP>
        Need help generating a token? See <DocLink href="/docs/configuration">Configuration</DocLink>{' '}
        for managing MCP tokens.
      </DocP>
    </>
  );
}
