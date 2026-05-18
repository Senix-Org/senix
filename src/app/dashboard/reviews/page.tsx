import { GitPullRequest } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Placeholder for the dedicated Reviews page. The nav item links here so
 * the route exists, but the full reviews experience is not built yet.
 */
export default function ReviewsPage(): React.ReactElement {
  return (
    <div>
      <header>
        <h1 className="text-3xl font-semibold text-primary">Reviews</h1>
        <p className="mt-2 text-sm text-secondary">
          A dedicated view for every review Senix has posted.
        </p>
      </header>

      <div className="mt-8 flex flex-col items-center rounded-xl border border-surface-border bg-surface py-16 text-center">
        <GitPullRequest size={32} strokeWidth={1.5} className="text-muted" />
        <p className="mt-4 text-sm font-medium text-primary">Coming soon</p>
        <p className="mt-1 max-w-xs text-sm text-secondary">
          This page is not ready yet. For now, your recent reviews live on the Overview page.
        </p>
      </div>
    </div>
  );
}
