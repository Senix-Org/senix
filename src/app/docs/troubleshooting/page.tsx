import type { Metadata } from 'next';
import {
  DocH1,
  DocH2,
  DocLead,
  DocP,
  InlineCode,
  DocLink,
} from '@features/shared/components/docs/doc-elements';

export const metadata: Metadata = {
  title: 'Troubleshooting — Senix Docs',
  description: 'Common Senix issues, their causes, and how to fix them.',
};

export default function TroubleshootingPage(): React.ReactElement {
  return (
    <>
      <DocH1>Troubleshooting</DocH1>
      <DocLead>
        Common issues and how to resolve them. If none of these match, use the{' '}
        <strong>Feedback</strong> button in your dashboard.
      </DocLead>

      <DocH2>My PR didn&apos;t get a comment</DocH2>
      <DocP>
        <strong>Cause:</strong> the repo is disabled on your dashboard, webhook delivery
        failed, or the PR only touches unsupported file types.
      </DocP>
      <DocP>
        <strong>Fix:</strong> confirm the repo toggle is on. Then open the installation at{' '}
        <InlineCode>github.com/settings/installations</InlineCode> and check{' '}
        <strong>Recent Deliveries</strong> for failed webhooks. PRs with no JS, TS, TSX, or
        Python files still get a review, just without structural detail.
      </DocP>

      <DocH2>The bot comment didn&apos;t update on a new push</DocH2>
      <DocP>
        <strong>Cause:</strong> Senix updates the existing comment in place rather than
        posting a new one, so GitHub does not bubble it to the top of the thread.
      </DocP>
      <DocP>
        <strong>Fix:</strong> refresh the PR page. If the comment body still looks stale,
        analysis for the latest push may still be running — it completes within ~60 seconds.
      </DocP>

      <DocH2>I got an unexpected risk level</DocH2>
      <DocP>
        <strong>Cause:</strong> risk level is calibrated by impact-if-shipped-wrong, not by
        diff size. A one-line change to pricing logic is high; a 500-line refactor with no
        behavior change is low.
      </DocP>
      <DocP>
        <strong>Fix:</strong> check the risk flags on the comment — they explain the level.
        If it still looks wrong, send the PR URL via the <strong>Feedback</strong> button and
        we&apos;ll fold it into the next eval run. See the{' '}
        <DocLink href="/docs/risk-flags">risk flag reference</DocLink>.
      </DocP>

      <DocH2>MCP tool not appearing in my IDE</DocH2>
      <DocP>
        <strong>Cause:</strong> the MCP config is malformed, in the wrong file, or the IDE
        has not reloaded it.
      </DocP>
      <DocP>
        <strong>Fix:</strong> verify the JSON is valid and the <InlineCode>url</InlineCode> is{' '}
        <InlineCode>https://senix-chi.vercel.app/api/mcp</InlineCode>. Fully restart the IDE
        so it re-reads the config. Check your IDE&apos;s MCP panel for a connection error.
      </DocP>

      <DocH2>MCP returns Unauthorized</DocH2>
      <DocP>
        <strong>Cause:</strong> the token is missing, mistyped, revoked, or the{' '}
        <InlineCode>Authorization</InlineCode> header is not formatted as{' '}
        <InlineCode>Bearer &lt;token&gt;</InlineCode>.
      </DocP>
      <DocP>
        <strong>Fix:</strong> go to <strong>Dashboard → MCP tokens</strong>, generate a fresh
        token, and paste the whole <InlineCode>sk_mcp_…</InlineCode> string. Tokens are shown
        only once — if you lost it, generate a new one and revoke the old.
      </DocP>

      <DocH2>Analysis took longer than 60 seconds</DocH2>
      <DocP>
        <strong>Cause:</strong> very large diffs, or the LLM provider is slow or rate-limited.
      </DocP>
      <DocP>
        <strong>Fix:</strong> large PRs are capped to keep cost predictable — splitting a
        huge PR into smaller ones both speeds up analysis and produces sharper summaries. If
        a normal-sized PR consistently times out, report it via <strong>Feedback</strong>.
      </DocP>
    </>
  );
}
