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
} from '@/components/docs/doc-elements';

export const metadata: Metadata = {
  title: 'MCP integration for IDEs — Senix Docs',
  description: 'Connect Senix to Cursor, Claude Code, Windsurf, and other MCP-compatible IDEs.',
};

const CURSOR_CONFIG = `{
  "mcpServers": {
    "senix": {
      "transport": "http",
      "url": "https://senix-chi.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_HERE"
      }
    }
  }
}`;

const CLAUDE_CODE_CONFIG = `{
  "mcpServers": {
    "senix": {
      "type": "http",
      "url": "https://senix-chi.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_HERE"
      }
    }
  }
}`;

const WINDSURF_CONFIG = `{
  "mcpServers": {
    "senix": {
      "serverUrl": "https://senix-chi.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_HERE"
      }
    }
  }
}`;

export default function McpDocsPage(): React.ReactElement {
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

      <DocH2>Setup</DocH2>
      <DocOL>
        <li>
          Sign in to Senix at <InlineCode>senix-chi.vercel.app</InlineCode>.
        </li>
        <li>
          Go to <strong>Dashboard → MCP tokens</strong>.
        </li>
        <li>
          Click <strong>Generate new token</strong> and give it a name.
        </li>
        <li>Copy the token — it is shown only once.</li>
        <li>
          Add it to your IDE&apos;s MCP config, replacing{' '}
          <InlineCode>YOUR_TOKEN_HERE</InlineCode> with the copied token.
        </li>
      </DocOL>

      <DocH3>Cursor</DocH3>
      <DocP>
        Add the following to your <InlineCode>~/.cursor/mcp.json</InlineCode> (global) or{' '}
        <InlineCode>.cursor/mcp.json</InlineCode> (per project).
      </DocP>
      <CodeBlock label="mcp.json">{CURSOR_CONFIG}</CodeBlock>

      <DocH3>Claude Code</DocH3>
      <DocP>
        Add Senix to your <InlineCode>.mcp.json</InlineCode>, or run the equivalent CLI
        command.
      </DocP>
      <CodeBlock label=".mcp.json">{CLAUDE_CODE_CONFIG}</CodeBlock>
      <CodeBlock label="terminal">
        {`claude mcp add --transport http senix https://senix-chi.vercel.app/api/mcp \\
  --header "Authorization: Bearer YOUR_TOKEN_HERE"`}
      </CodeBlock>

      <DocH3>Windsurf</DocH3>
      <DocP>
        Add the following to your Windsurf MCP config at{' '}
        <InlineCode>~/.codeium/windsurf/mcp_config.json</InlineCode>.
      </DocP>
      <CodeBlock label="mcp_config.json">{WINDSURF_CONFIG}</CodeBlock>

      <DocH2>How to use it in your IDE</DocH2>
      <DocP>Once connected, ask your IDE&apos;s AI in plain language:</DocP>
      <DocUL>
        <li>&quot;Review my changes with Senix&quot;</li>
        <li>&quot;Check this code for risks&quot;</li>
      </DocUL>
      <DocP>
        The AI will call Senix&apos;s <InlineCode>analyze_code_changes</InlineCode> tool with
        your before/after file contents. You&apos;ll see the 3-sentence summary, risk level,
        and focus areas right in your chat panel.
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
