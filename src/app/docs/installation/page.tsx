import type { Metadata } from 'next';
import {
  DocH1,
  DocH2,
  DocH3,
  DocLead,
  DocP,
  DocOL,
  DocTable,
  InlineCode,
} from '@/components/docs/doc-elements';

export const metadata: Metadata = {
  title: 'Installing the GitHub App — Senix Docs',
  description: 'Step-by-step guide to installing the Senix GitHub App.',
};

export default function InstallationPage(): React.ReactElement {
  return (
    <>
      <DocH1>Installing the GitHub App</DocH1>
      <DocLead>
        The GitHub App is the fastest way to get Senix running — once installed, every pull
        request in your selected repositories gets reviewed automatically.
      </DocLead>

      <DocH2>Step-by-step</DocH2>
      <DocOL>
        <li>
          Sign in to Senix at <InlineCode>senix-chi.vercel.app</InlineCode>.
        </li>
        <li>
          Click <strong>Install GitHub App</strong> from your dashboard.
        </li>
        <li>Choose where to install — your personal account or an organization.</li>
        <li>Select repositories — all repositories, or a specific subset.</li>
        <li>Authorize the requested permissions.</li>
        <li>
          You&apos;ll land on a confirmation page and be redirected back to your dashboard.
        </li>
      </DocOL>
      <DocP>
        Organization installs require admin permission. If you are not an owner on the
        organization, GitHub will route the install through an approval flow.
      </DocP>

      <DocH2>Required permissions</DocH2>
      <DocP>
        Senix asks for the minimum scopes needed to read diffs and post a review comment. It
        never writes to your code, opens PRs, or approves changes.
      </DocP>
      <DocTable
        head={['Permission', 'Why Senix needs it']}
        rows={[
          [
            <InlineCode key="c">read: code &amp; metadata</InlineCode>,
            'To understand what files changed in PRs',
          ],
          [
            <InlineCode key="p">read &amp; write: pull requests</InlineCode>,
            'To post and update the review comment',
          ],
        ]}
      />

      <DocH2>Revoking access</DocH2>
      <DocH3>Uninstall the GitHub App</DocH3>
      <DocOL>
        <li>
          Go to <InlineCode>github.com/settings/installations</InlineCode> — or the
          organization equivalent under your org settings.
        </li>
        <li>
          Find <strong>Senix-bot</strong> in the list.
        </li>
        <li>
          Click <strong>Configure</strong>, then <strong>Uninstall</strong>.
        </li>
      </DocOL>
      <DocP>
        Uninstalling pauses all analysis immediately. Your history is soft-deleted, so
        reinstalling later restores it.
      </DocP>
    </>
  );
}
