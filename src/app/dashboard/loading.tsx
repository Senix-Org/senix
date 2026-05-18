/**
 * Dashboard skeleton shown while the page's server data fetches resolve.
 * Mirrors the real overview layout (heading, stats row, analyses list)
 * so the layout does not shift when content streams in.
 */
export default function DashboardLoading(): React.ReactElement {
  return (
    <div className="animate-pulse">
      <div className="h-9 w-72 rounded-md bg-surface-raised" />
      <div className="mt-2 h-4 w-60 rounded bg-surface-raised/60" />

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-surface-border bg-surface p-6"
          >
            <div className="h-7 w-12 rounded bg-surface-raised" />
            <div className="mt-2 h-3 w-24 rounded bg-surface-raised/60" />
          </div>
        ))}
      </div>

      <div className="mt-8 h-5 w-36 rounded bg-surface-raised" />
      <div className="mt-4 space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="space-y-3 rounded-xl border border-surface-border bg-surface p-6"
          >
            <div className="h-3 w-1/3 rounded bg-surface-raised/60" />
            <div className="h-4 w-2/3 rounded bg-surface-raised" />
            <div className="h-3 w-full rounded bg-surface-raised/40" />
            <div className="h-3 w-5/6 rounded bg-surface-raised/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
