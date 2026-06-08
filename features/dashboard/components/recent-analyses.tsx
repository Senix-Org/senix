'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnalysisCard, type AnalysisCardData } from './analysis-card';

const RISK_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

type RiskFilter = 'all' | 'high' | 'medium' | 'low';
type SortOrder = 'newest' | 'oldest' | 'risk';

export function RecentAnalyses({
  analyses,
}: {
  analyses: AnalysisCardData[];
}): React.ReactElement {
  const [risk, setRisk] = useState<RiskFilter>('all');
  const [sort, setSort] = useState<SortOrder>('newest');

  const visible = useMemo(() => {
    const filtered =
      risk === 'all' ? analyses : analyses.filter((a) => a.risk_level === risk);

    const sorted = [...filtered];
    if (sort === 'newest') {
      sorted.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sort === 'oldest') {
      sorted.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    } else {
      sorted.sort((a, b) => {
        const ra = a.risk_level ? RISK_RANK[a.risk_level] ?? 0 : 0;
        const rb = b.risk_level ? RISK_RANK[b.risk_level] ?? 0 : 0;
        if (rb !== ra) return rb - ra;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
    return sorted;
  }, [analyses, risk, sort]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Risk"
          value={risk}
          onChange={(v) => setRisk(v as RiskFilter)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' },
          ]}
        />
        <FilterSelect
          label="Sort"
          value={sort}
          onChange={(v) => setSort(v as SortOrder)}
          options={[
            { value: 'newest', label: 'Newest first' },
            { value: 'oldest', label: 'Oldest first' },
            { value: 'risk', label: 'Highest risk first' },
          ]}
        />
        <span className="ml-auto text-xs tabular-nums text-muted">
          {visible.length} of {analyses.length}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-secondary">
          No analyses match this filter.
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((a) => (
            <AnalysisCard key={a.id} analysis={a} />
          ))}
        </div>
      )}
    </div>
  );
}

type SelectOption = { value: string; label: string };

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: SelectOption[];
}): React.ReactElement {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-secondary">
      <span>{label}</span>
      <span className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="cursor-pointer appearance-none rounded-lg border border-surface-border bg-surface-raised py-1.5 pl-3 pr-8 text-xs text-secondary transition-colors duration-150 hover:text-primary focus:outline-none"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-surface-raised text-primary">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted"
        />
      </span>
    </label>
  );
}
