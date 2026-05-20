import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { DocH1, DocLead, DocLink } from '@/components/docs/doc-elements';

export const metadata: Metadata = {
  title: 'Frequently asked questions — Senix Docs',
  description: 'Answers to common questions about Senix — pricing, privacy, accuracy, and more.',
};

function FaqItem({
  question,
  children,
}: {
  question: string;
  children: ReactNode;
}): React.ReactElement {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-5">
      <h2 className="text-lg font-semibold text-zinc-100">{question}</h2>
      <div className="mt-2 text-zinc-300 leading-relaxed">{children}</div>
    </div>
  );
}

export default function FaqPage(): React.ReactElement {
  return (
    <>
      <DocH1>Frequently asked questions</DocH1>
      <DocLead>Short answers to the questions we hear most.</DocLead>

      <div className="mt-8 space-y-4">
        <FaqItem question="Is Senix free?">
          Yes. Senix has a permanent Free plan for one repo and 30 reviews per month.
          Starter, Team, and Pro are paid monthly plans. See the{' '}
          <DocLink href="/pricing">pricing page</DocLink> for details.
        </FaqItem>

        <FaqItem question="Does Senix store my code?">
          No. We persist the structural-diff metadata — added, modified, and removed symbols
          with file names and line ranges — and the generated summary. We do not persist your
          raw source files.
        </FaqItem>

        <FaqItem question="What data does Senix collect?">
          PR metadata (title, author, file counts), the structural diff, and the analysis
          result. The diff content is sent to the LLM provider for a single request and not
          retained for training. Account data covers your GitHub identity and installation
          settings.
        </FaqItem>

        <FaqItem question="Can I self-host Senix?">
          Not today. The pipeline is open source if you want to read or fork it, but the
          hosted product is the supported path. Reach out via the Feedback button if you have
          a hard self-host requirement.
        </FaqItem>

        <FaqItem question="What LLM does Senix use?">
          DeepSeek is the default analysis provider — it has the most reliable
          structured-output support at low cost. Anthropic, Gemini, and Groq are also
          supported as alternate providers.
        </FaqItem>

        <FaqItem question="How accurate is Senix?">
          The current prompt scores 94% on our internal eval set. We publish accuracy with
          each prompt revision and revert on regressions. Calibration drift is real — send us
          examples that look wrong and we fold them into the next eval run.
        </FaqItem>

        <FaqItem question="How does Senix differ from GitHub Copilot's review feature?">
          Copilot&apos;s review suggests line-level edits. Senix answers a different question
          — what behaviorally changed and how risky is it — in a 3-sentence summary with a
          fixed risk taxonomy. It is built for teams shipping AI-generated code who need a
          fast read on blast radius, not a list of nits.
        </FaqItem>

        <FaqItem question="Can I customize the risk flags?">
          Not yet. The 8-flag taxonomy is fixed today so the analysis stays consistent and
          comparable across PRs. Custom risk-flag configuration is planned for the Pro tier.
        </FaqItem>

        <FaqItem question="Is there an API?">
          Not yet — it&apos;s on the roadmap. See the{' '}
          <DocLink href="/docs/api">API reference</DocLink> for what we&apos;re planning.
        </FaqItem>
      </div>
    </>
  );
}
