import type { Metadata } from 'next';
import { DocH1, DocH2, DocLead, DocP, DocUL } from '@/components/docs/doc-elements';

export const metadata: Metadata = {
  title: 'API reference — Senix Docs',
  description: 'The Senix REST API — coming soon.',
};

export default function ApiDocsPage(): React.ReactElement {
  return (
    <>
      <DocH1>API reference</DocH1>
      <DocLead>Coming soon.</DocLead>
      <DocP>
        A public REST API is on the roadmap. Today, Senix is consumed through the GitHub App
        and the MCP server — both cover the common workflows without writing API code.
      </DocP>

      <DocH2>What we&apos;re planning</DocH2>
      <DocUL>
        <li>
          <strong>GET /v1/analyses</strong> — list analyses for your repositories, with
          filtering by repo, risk level, and date.
        </li>
        <li>
          <strong>GET /v1/analyses/:id</strong> — fetch a single analysis, including the
          structural diff and risk flags.
        </li>
        <li>
          <strong>POST /v1/analyze</strong> — run an analysis on an arbitrary diff, the same
          surface the MCP tool uses.
        </li>
        <li>
          <strong>Webhooks</strong> — subscribe to analysis-completed events to pipe results
          into your own tools.
        </li>
        <li>
          <strong>API keys</strong> — scoped, revocable keys managed from the dashboard,
          mirroring MCP tokens.
        </li>
      </DocUL>

      <DocP>
        If a specific endpoint would unblock you, tell us via the Feedback button in the
        dashboard — it helps us prioritize.
      </DocP>
    </>
  );
}
