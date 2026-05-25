'use client';

export type RepoUsage = {
  repoFullName: string;
  reviews: number;
};

type Props = {
  repos: RepoUsage[];
  total: number;
};

/**
 * Mini horizontal bar list showing which repos consumed the most reviews
 * in the selected period. Helps the user see where their quota is going.
 */
export function TopReposList({ repos, total }: Props): React.ReactElement {
  if (repos.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted">
        No repo activity in this period yet.
      </div>
    );
  }

  const max = Math.max(...repos.map((r) => r.reviews), 1);

  return (
    <ul className="space-y-3">
      {repos.map((repo) => {
        const widthPct = (repo.reviews / max) * 100;
        const sharePct = total > 0 ? Math.round((repo.reviews / total) * 100) : 0;
        return (
          <li key={repo.repoFullName} className="text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate font-mono text-xs text-primary">
                {repo.repoFullName}
              </span>
              <span className="shrink-0 tabular-nums text-secondary">
                {repo.reviews.toLocaleString()}{' '}
                <span className="text-muted">· {sharePct}%</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-raised">
              <div
                className="h-full rounded-full bg-accent/70"
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
