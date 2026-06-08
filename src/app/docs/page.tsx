import type { Metadata } from 'next';
import {
  DocH1,
  DocH2,
  DocLead,
  DocP,
  DocUL,
  DocCard,
} from '@features/shared/components/docs/doc-elements';

export const metadata: Metadata = {
  title: 'Welcome to Senix — Docs',
  description: 'Getting started with Senix, the AI code reviewer for teams shipping with AI tools.',
};

export default function DocsIntroPage(): React.ReactElement {
  return (
    <>
      <DocH1>Welcome to Senix</DocH1>
      <DocLead>
        Senix is an AI code reviewer for teams shipping with AI tools. We post 3-sentence
        behavioral summaries with risk levels on every pull request, and integrate directly
        with IDEs via MCP.
      </DocLead>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DocCard
          href="/docs/installation"
          title="Install on GitHub"
          description="Add the GitHub App and get automatic reviews on every pull request."
        />
        <DocCard
          href="/docs/mcp"
          title="Connect to your IDE"
          description="Use Senix on uncommitted changes from Cursor, Claude Code, or Windsurf."
        />
      </div>

      <DocH2>What you can do with Senix</DocH2>
      <DocUL>
        <li>Automatic PR reviews within 30 seconds</li>
        <li>Risk-tagged summaries (8 risk categories)</li>
        <li>IDE integration for instant feedback</li>
        <li>Works with JavaScript, TypeScript, Python (more languages coming)</li>
      </DocUL>

      <DocP>
        New here? Start with installation to wire up the GitHub App, then read how Senix
        analyzes pull requests so the review output makes sense at a glance.
      </DocP>
    </>
  );
}
