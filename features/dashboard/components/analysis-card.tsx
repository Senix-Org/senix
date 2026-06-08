import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { formatRelativeTime } from '@features/shared/relative-time';
import { GithubMark } from './github-mark';

const RISK_BADGE: Record<string, string> = {
  low: 'text-risk-low bg-risk-low/10',
  medium: 'text-risk-medium bg-risk-medium/10',
  high: 'text-risk-high bg-risk-high/10',
};

export type AnalysisCardData = {
  id: string;
  summary: string | null;
  risk_level: string | null;
  created_at: string;
  github_comment_url: string | null;
  pr_title: string;
  pr_number: number | null;
  repo_name: string;
};

export function AnalysisCard({ analysis }: { analysis: AnalysisCardData }): React.ReactElement {
  const summary = analysis.summary ?? '';
  const riskLabel = analysis.risk_level ? analysis.risk_level : 'unknown';
  const riskBadgeClass =
    (analysis.risk_level && RISK_BADGE[analysis.risk_level]) ??
    'text-muted bg-surface-raised';
  const created = new Date(analysis.created_at);

  return (
    <div className="group relative rounded-xl border border-surface-border bg-surface p-6 transition-all duration-150 hover:border-neutral-border hover:bg-surface-raised">
      <span
        className={`absolute right-6 top-6 rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wider ${riskBadgeClass}`}
      >
        {riskLabel}
      </span>

      <div className="pr-20">
        <div className="flex items-center gap-2 text-sm text-secondary">
          <span className="truncate font-mono">{analysis.repo_name}</span>
          {analysis.pr_number !== null && (
            <span className="text-muted">#{analysis.pr_number}</span>
          )}
        </div>
        <h3 className="mt-1 text-base font-semibold leading-snug text-primary">
          {analysis.pr_title}
        </h3>
      </div>

      {summary && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-secondary">{summary}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span
          className="text-xs text-muted"
          title={created.toISOString()}
          suppressHydrationWarning
        >
          {formatRelativeTime(created)}
        </span>
        <div className="flex items-center gap-2">
          {analysis.github_comment_url && (
            <a
              href={analysis.github_comment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface-raised px-2 py-1.5 text-sm text-secondary transition-colors duration-150 hover:text-primary"
            >
              <GithubMark size={13} />
              View on GitHub
            </a>
          )}
          <Link
            href={`/dashboard/analysis/${analysis.id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-surface-border bg-surface-raised px-2 py-1.5 text-sm text-secondary transition-colors duration-150 hover:border-neutral-border hover:text-primary"
          >
            Details
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
