'use client';

export type RiskMix = {
  low: number;
  medium: number;
  high: number;
};

type Props = { mix: RiskMix };

const SEGMENTS: Array<{
  key: keyof RiskMix;
  label: string;
  color: string;
}> = [
  { key: 'high', label: 'High', color: 'var(--color-risk-high)' },
  { key: 'medium', label: 'Medium', color: 'var(--color-risk-medium)' },
  { key: 'low', label: 'Low', color: 'var(--color-risk-low)' },
];

/**
 * Compact SVG donut showing the proportion of high / medium / low risk
 * reviews in the selected period. Sized to sit alongside the tokens chart.
 */
export function RiskMixDonut({ mix }: Props): React.ReactElement {
  const total = mix.low + mix.medium + mix.high;

  if (total === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted">
        No reviews to score yet.
      </div>
    );
  }

  const radius = 56;
  const stroke = 14;
  const center = 72;
  const circumference = 2 * Math.PI * radius;

  const dashes = SEGMENTS.map((segment) => (mix[segment.key] / total) * circumference);
  const arcs = SEGMENTS.map((segment, index) => {
    const dash = dashes[index];
    const offset = dashes.slice(0, index).reduce((sum, value) => sum + value, 0);
    return {
      ...segment,
      value: mix[segment.key],
      dasharray: `${dash} ${circumference - dash}`,
      dashoffset: -offset,
    };
  });

  return (
    <div className="flex items-center gap-6">
      <svg
        width={center * 2}
        height={center * 2}
        viewBox={`0 0 ${center * 2} ${center * 2}`}
        className="shrink-0"
        role="img"
        aria-label="Risk mix"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-surface-raised)"
          strokeWidth={stroke}
        />
        {arcs.map((arc) => (
          <circle
            key={arc.key}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={stroke}
            strokeDasharray={arc.dasharray}
            strokeDashoffset={arc.dashoffset}
            transform={`rotate(-90 ${center} ${center})`}
            strokeLinecap="butt"
          />
        ))}
        <text
          x={center}
          y={center - 4}
          textAnchor="middle"
          className="fill-(--color-primary) text-xl font-semibold"
        >
          {total.toLocaleString()}
        </text>
        <text
          x={center}
          y={center + 14}
          textAnchor="middle"
          className="fill-(--color-muted) text-[10px] uppercase tracking-wider"
        >
          Reviews
        </text>
      </svg>

      <ul className="flex-1 space-y-2 text-sm">
        {arcs.map((arc) => {
          const pct = total > 0 ? Math.round((arc.value / total) * 100) : 0;
          return (
            <li key={arc.key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-secondary">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: arc.color }}
                />
                {arc.label}
              </span>
              <span className="tabular-nums text-primary">
                {arc.value.toLocaleString()}{' '}
                <span className="text-muted">· {pct}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
