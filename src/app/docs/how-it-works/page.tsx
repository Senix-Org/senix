import type { Metadata } from 'next';
import {
  DocH1,
  DocH2,
  DocLead,
  DocP,
  DocUL,
  DocTable,
  CodeBlock,
  InlineCode,
} from '@features/shared/components/docs/doc-elements';

export const metadata: Metadata = {
  title: 'How Senix analyzes pull requests — Senix Docs',
  description: 'The Senix analysis pipeline, structural diffs, and supported languages.',
};

export default function HowItWorksPage(): React.ReactElement {
  return (
    <>
      <DocH1>How Senix analyzes pull requests</DocH1>
      <DocLead>
        Every review runs through the same pipeline: a webhook kicks it off, tree-sitter
        builds a structural diff, and the LLM turns that into a behavioral summary.
      </DocLead>

      <DocH2>The pipeline</DocH2>
      {/* TODO: replace with a rendered diagram once design assets are ready. */}
      <CodeBlock>
        {`webhook → fetch PR diff → tree-sitter parse → structural diff → LLM analysis → comment posted`}
      </CodeBlock>
      <DocP>
        When a PR opens or receives a new push, GitHub delivers a{' '}
        <InlineCode>pull_request</InlineCode> webhook. Senix verifies the signature, fetches
        the diff, parses each supported file, compares symbols, sends the result to the LLM,
        and posts a single comment back on the PR.
      </DocP>

      <DocH2>What is a structural diff?</DocH2>
      <DocP>
        A plain text diff tells you which lines changed. That is noisy — a reformatted file
        or a renamed variable looks like a big change but does nothing behaviorally. Senix
        does something different: it parses the before and after of each file into{' '}
        <em>symbols</em> — functions, classes, methods, top-level constants — and compares
        those.
      </DocP>
      <DocP>
        The model sees which symbols were added, removed, or modified, with their bodies. A
        pure rename or whitespace change produces no symbol-level difference, so it never
        reaches the model as a behavioral change.
      </DocP>

      <DocH2>Supported languages</DocH2>
      <DocP>
        Structural diffing depends on a tree-sitter grammar per language. PRs touching
        unsupported file types still get a review, just without symbol-level detail.
      </DocP>
      <DocTable
        head={['Language', 'Status']}
        rows={[
          ['JavaScript', '✓ Supported'],
          ['TypeScript', '✓ Supported'],
          ['TSX', '✓ Supported'],
          ['Python', '✓ Supported'],
          ['Go', 'Coming soon'],
          ['Rust', 'Coming soon'],
        ]}
      />

      <DocH2>What we send to the LLM</DocH2>
      <DocP>
        To be precise about it — the model does not receive your raw files. It receives:
      </DocP>
      <DocUL>
        <li>Function and method signatures of changed symbols</li>
        <li>Structural changes — which symbols were added, removed, or modified</li>
        <li>The body text of changed symbols (truncated for very large functions)</li>
        <li>PR metadata: file count, additions, deletions</li>
      </DocUL>
      <DocP>
        Unchanged symbols are skipped entirely. Files that did not change are never read.
      </DocP>

      <DocH2>Average latency</DocH2>
      <DocP>
        Most PRs complete in <strong>20-40 seconds</strong> end-to-end. Large PRs can take up
        to <strong>60 seconds</strong>; analysis is capped past that to keep cost and
        response time predictable.
      </DocP>
    </>
  );
}
