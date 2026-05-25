'use client';

import { useMemo, useState } from 'react';

export type DailyBucket = {
  date: string;
  reviews: number;
  tokens: number;
};

type Props = {
  data: DailyBucket[];
  metric: 'reviews' | 'tokens';
};

/**
 * Vertical bar chart for the main daily activity strip. Built as plain SVG
 * so we don't pull in a chart dependency; the dataset is at most ~90 bars.
 */
export function DailyBarChart({ data, metric }: Props): React.ReactElement {
  const [hover, setHover] = useState<number | null>(null);

  const { max, total } = useMemo(() => {
    let max = 0;
    let total = 0;
    for (const bucket of data) {
      const value = metric === 'reviews' ? bucket.reviews : bucket.tokens;
      if (value > max) max = value;
      total += value;
    }
    return { max: Math.max(1, max), total };
  }, [data, metric]);

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted">
        No activity in this period yet.
      </div>
    );
  }

  const labelFor = (bucket: DailyBucket): string => {
    const value = metric === 'reviews' ? bucket.reviews : bucket.tokens;
    const formatted =
      metric === 'tokens' ? formatCompact(value) : value.toLocaleString();
    return `${formatDate(bucket.date)} · ${formatted} ${
      metric === 'reviews' ? (value === 1 ? 'review' : 'reviews') : 'tokens'
    }`;
  };

  return (
    <div>
      <div className="relative h-48">
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {data.map((bucket, index) => {
            const value = metric === 'reviews' ? bucket.reviews : bucket.tokens;
            const heightPct = (value / max) * 100;
            const isHover = hover === index;
            return (
              <div
                key={bucket.date}
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
                className="group flex h-full flex-1 cursor-default flex-col justify-end"
              >
                <div
                  className={`w-full rounded-t-[2px] transition-colors ${
                    isHover ? 'bg-accent-hover' : 'bg-accent/70'
                  }`}
                  style={{ height: `${Math.max(heightPct, value > 0 ? 2 : 0)}%` }}
                />
              </div>
            );
          })}
        </div>
        {hover !== null && data[hover] && (
          <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-surface-border bg-surface-raised px-2.5 py-1 text-xs text-primary shadow-lg shadow-black/40">
            {labelFor(data[hover])}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>{formatDate(data[0]?.date ?? '')}</span>
        <span className="tabular-nums">
          Total: {metric === 'tokens' ? formatCompact(total) : total.toLocaleString()}
        </span>
        <span>{formatDate(data[data.length - 1]?.date ?? '')}</span>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toLocaleString();
}
