import type { Metadata } from 'next';
import {
  DocH1,
  DocH2,
  DocLead,
  DocP,
  DocOL,
  InlineCode,
  DocLink,
} from '@/components/docs/doc-elements';

export const metadata: Metadata = {
  title: 'Configuration — Senix Docs',
  description: 'Manage connected repos, MCP tokens, notifications, and uninstalling Senix.',
};

export default function ConfigurationPage(): React.ReactElement {
  return (
    <>
      <DocH1>Configuration</DocH1>
      <DocLead>
        Everything you can tune from the dashboard — which repos Senix watches, the tokens
        your IDEs use, and how to remove Senix entirely.
      </DocLead>

      <DocH2>Managing connected repos</DocH2>
      <DocP>
        Every repository connected through the GitHub App has a toggle on your dashboard.
        Switching a repo off pauses analysis for it without uninstalling the app — useful for
        repos full of generated code or noisy fixtures. Switching it back on resumes analysis
        on the next pull request.
      </DocP>

      <DocH2>Managing MCP tokens</DocH2>
      <DocP>
        Go to <strong>Dashboard → MCP tokens</strong> to manage the tokens your IDEs use.
      </DocP>
      <DocOL>
        <li>
          <strong>View</strong> — every token shows its name, creation date, and last-used
          date.
        </li>
        <li>
          <strong>Revoke</strong> — revoking a token immediately stops it from authenticating
          with the MCP server. The row is kept as an audit record.
        </li>
        <li>
          <strong>Regenerate</strong> — there is no in-place rotate. Generate a new token,
          update your IDE config, then revoke the old one.
        </li>
      </DocOL>
      <DocP>
        See <DocLink href="/docs/mcp">MCP for IDEs</DocLink> for the config snippets.
      </DocP>

      <DocH2>Notification settings</DocH2>
      <DocP>
        <span className="text-zinc-500">
          Coming soon. Slack and email digests for high-risk PRs are on the roadmap. For now,
          reviews appear as a comment on the PR and in your dashboard.
        </span>
      </DocP>

      <DocH2>Risk threshold customization</DocH2>
      <DocP>
        <span className="text-zinc-500">
          Coming soon. Custom risk-flag configuration — tuning which flags raise the overall
          risk level — is planned for the Pro tier. The default thresholds work for most
          teams today.
        </span>
      </DocP>

      <DocH2>Uninstalling Senix</DocH2>
      <DocP>
        Removing Senix has two independent parts. Do whichever applies to you:
      </DocP>
      <DocOL>
        <li>
          <strong>GitHub App</strong> — uninstall <strong>Senix-bot</strong> from{' '}
          <InlineCode>github.com/settings/installations</InlineCode>. This stops all PR
          analysis.
        </li>
        <li>
          <strong>Account deletion</strong> — to remove your Senix account and data
          entirely, use the <strong>Feedback</strong> button in the dashboard to request
          deletion. This also revokes all MCP tokens.
        </li>
      </DocOL>
    </>
  );
}
