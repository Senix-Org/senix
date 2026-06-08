'use client';

import { useMemo, useState } from 'react';
import { CreditCard, GitPullRequest, Loader2, Sparkles, X, Zap } from 'lucide-react';
import { DailyBarChart, type DailyBucket } from '@features/billing/components/daily-bar-chart';
import { RiskMixDonut, type RiskMix } from '@features/billing/components/risk-mix-donut';
import { TopReposList, type RepoUsage } from '@features/billing/components/top-repos-list';
import type { UsageAnalysis } from '@features/billing/billing-usage';

export type BillingPlanName = 'free' | 'starter' | 'team' | 'pro';
export type BillingPlanStatus = 'active' | 'trialing' | 'cancelled' | 'past_due';

export type BillingTier = {
  plan: BillingPlanName;
  label: string;
  price: string;
  repos: number;
  reviews: number;
  support: string;
  trial: string;
};

export type BillingPlanData = {
  plan: BillingPlanName;
  planStatus: BillingPlanStatus;
  trialEndsAt: string | null;
  planExpiresAt: string | null;
  whopMembershipId: string | null;
  reviewsUsed: number;
  prReviewsThisMonth: number;
  mcpReviewsThisMonth: number;
  reviewLimit: number;
  reposConnected: number;
  repoLimit: number;
  reviewsResetAt: string;
};

type Props = {
  planData: BillingPlanData;
  tiers: BillingTier[];
  analyses: UsageAnalysis[];
};

type PeriodKey = 'cycle' | '7d' | '30d' | '90d';

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: 'cycle', label: 'This cycle' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
];

const PLAN_ORDER: BillingPlanName[] = ['free', 'starter', 'team', 'pro'];

export function BillingClient({
  planData,
  tiers,
  analyses,
}: Props): React.ReactElement {
  const [currentPlanData, setCurrentPlanData] = useState(planData);
  const [period, setPeriod] = useState<PeriodKey>('cycle');
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentTier =
    tiers.find((tier) => tier.plan === currentPlanData.plan) ?? tiers[0];
  const nextTier = getNextTier(currentPlanData.plan, tiers);
  const paidPlan = currentPlanData.plan !== 'free';

  const usage = useMemo(
    () => aggregateUsage(analyses, period, currentPlanData.reviewsResetAt),
    [analyses, period, currentPlanData.reviewsResetAt]
  );

  const reviewProgress = Math.min(
    100,
    (currentPlanData.reviewsUsed / Math.max(currentPlanData.reviewLimit, 1)) * 100
  );
  const reviewProgressTone =
    reviewProgress >= 90
      ? 'bg-risk-high'
      : reviewProgress >= 70
        ? 'bg-amber-500'
        : 'bg-accent';

  async function startCheckout(plan: BillingPlanName): Promise<void> {
    setCheckoutBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      if (response.status === 401) {
        window.location.assign('/login?next=/dashboard/billing');
        return;
      }

      const payload = (await response.json()) as {
        checkoutUrl?: string;
        error?: string;
      };
      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error ?? 'Checkout could not be started.');
      }

      window.location.assign(payload.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setCheckoutBusy(false);
    }
  }

  async function cancelSubscription(): Promise<void> {
    setCancelBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/billing/cancel', { method: 'DELETE' });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Subscription could not be cancelled.');
      }

      setConfirmCancel(false);
      setCurrentPlanData((value) => ({ ...value, planStatus: 'cancelled' }));
      setMessage('Subscription cancellation is scheduled.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCancelBusy(false);
    }
  }

  return (
    <div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-primary">Billing &amp; usage</h1>
          <p className="mt-2 text-sm text-secondary">
            Track reviews, tokens, and the repos consuming your quota.
          </p>
        </div>
        <PeriodSwitcher value={period} onChange={setPeriod} />
      </header>

      <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={<GitPullRequest size={16} className="text-accent" />}
          label="Reviews this cycle"
          value={currentPlanData.reviewsUsed.toLocaleString()}
          sub={`of ${currentPlanData.reviewLimit.toLocaleString()} included`}
          progress={reviewProgress}
          progressTone={reviewProgressTone}
        />
        <StatCard
          icon={<Zap size={16} className="text-accent" />}
          label={`Tokens · ${periodLabel(period)}`}
          value={formatCompact(usage.totalTokens)}
          sub={`${usage.totalReviews.toLocaleString()} ${
            usage.totalReviews === 1 ? 'review' : 'reviews'
          } analyzed`}
        />
        <StatCard
          icon={<Sparkles size={16} className="text-accent" />}
          label="Repos connected"
          value={currentPlanData.reposConnected.toLocaleString()}
          sub={
            currentPlanData.repoLimit === -1
              ? 'Unlimited on your plan'
              : `of ${currentPlanData.repoLimit.toLocaleString()} on your plan`
          }
        />
      </section>

      <section className="mt-6 rounded-xl border border-surface-border bg-surface p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium text-primary">
              Daily PR reviews
            </h2>
            <p className="mt-1 text-xs text-muted">
              {periodLabel(period)} ·{' '}
              {currentPlanData.mcpReviewsThisMonth.toLocaleString()} MCP{' '}
              {currentPlanData.mcpReviewsThisMonth === 1 ? 'review' : 'reviews'} this cycle
            </p>
          </div>
        </div>
        <div className="mt-5">
          <DailyBarChart data={usage.daily} metric="reviews" />
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-surface-border bg-surface p-6">
          <h2 className="text-sm font-medium text-primary">Tokens per day</h2>
          <p className="mt-1 text-xs text-muted">{periodLabel(period)}</p>
          <div className="mt-5">
            <DailyBarChart data={usage.daily} metric="tokens" />
          </div>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface p-6">
          <h2 className="text-sm font-medium text-primary">Risk mix</h2>
          <p className="mt-1 text-xs text-muted">
            Distribution across reviewed PRs
          </p>
          <div className="mt-5">
            <RiskMixDonut mix={usage.riskMix} />
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-surface-border bg-surface p-6">
        <h2 className="text-sm font-medium text-primary">Top repos</h2>
        <p className="mt-1 text-xs text-muted">
          Where your reviews are going this {periodLabel(period).toLowerCase()}
        </p>
        <div className="mt-5">
          <TopReposList repos={usage.topRepos} total={usage.totalReviews} />
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-surface-border bg-surface p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted">
              Current plan
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-primary">
                {currentTier.label}
              </h2>
              <span className={statusBadgeClass(currentPlanData.planStatus)}>
                {statusLabel(currentPlanData.planStatus)}
              </span>
              <span className="text-sm text-secondary">{currentTier.price}/mo</span>
            </div>
            {currentPlanData.planStatus === 'trialing' && currentPlanData.trialEndsAt && (
              <p className="mt-2 text-sm text-amber-300">
                Trial ends in {daysUntil(currentPlanData.trialEndsAt)} days
              </p>
            )}
            {currentPlanData.planStatus === 'cancelled' && (
              <p className="mt-2 text-sm text-red-300">
                {currentPlanData.planExpiresAt
                  ? `Plan cancelled. Access until ${formatDate(currentPlanData.planExpiresAt)}.`
                  : 'Plan cancelled. Access has ended.'}
              </p>
            )}
            <p className="mt-2 text-xs text-muted">
              Quota resets {formatDate(nextResetDate(currentPlanData.reviewsResetAt))}
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 lg:items-end">
            {nextTier && (
              <button
                type="button"
                onClick={() => startCheckout(nextTier.plan)}
                disabled={checkoutBusy}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-wait disabled:opacity-60"
              >
                {checkoutBusy ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CreditCard size={16} />
                )}
                Upgrade to {nextTier.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAllPlans((value) => !value)}
              className="text-sm text-secondary transition-colors hover:text-primary"
            >
              {showAllPlans ? 'Hide all plans' : 'See all plans'}
            </button>
            {paidPlan && (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="text-xs text-muted transition-colors hover:text-risk-high"
              >
                Cancel subscription
              </button>
            )}
          </div>
        </div>

        {showAllPlans && <PlanTable tiers={tiers} currentPlan={currentPlanData.plan} />}
      </section>

      {(message || error) && (
        <div
          className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
            error
              ? 'border-red-900/40 bg-red-950/30 text-red-200'
              : 'border-green-900/40 bg-green-950/30 text-green-200'
          }`}
        >
          {error ?? message}
        </div>
      )}

      {confirmCancel && (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-surface-border bg-surface p-6 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold text-primary">
                Cancel subscription
              </h2>
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                aria-label="Close"
                className="rounded p-1 text-secondary transition-colors hover:text-primary"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              Are you sure you want to cancel? You will be downgraded to the Free
              plan at the end of your billing period.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                className="rounded-lg px-3 py-2 text-sm text-secondary transition-colors hover:text-primary"
              >
                Keep subscription
              </button>
              <button
                type="button"
                onClick={cancelSubscription}
                disabled={cancelBusy}
                className="inline-flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200 transition-colors hover:bg-red-950/70 disabled:cursor-wait disabled:opacity-60"
              >
                {cancelBusy && <Loader2 size={15} className="animate-spin" />}
                Cancel subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PeriodSwitcher({
  value,
  onChange,
}: {
  value: PeriodKey;
  onChange: (next: PeriodKey) => void;
}): React.ReactElement {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-surface-border bg-surface p-1 text-sm">
      {PERIODS.map((p) => {
        const active = value === p.key;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange(p.key)}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              active
                ? 'bg-surface-raised text-primary'
                : 'text-secondary hover:text-primary'
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  progress,
  progressTone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  progress?: number;
  progressTone?: string;
}): React.ReactElement {
  return (
    <div className="rounded-xl border border-surface-border bg-surface p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums text-primary">
        {value}
      </div>
      <div className="mt-1 text-xs text-secondary">{sub}</div>
      {typeof progress === 'number' && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-raised">
          <div
            className={`h-full rounded-full ${progressTone ?? 'bg-accent'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

function PlanTable({
  tiers,
  currentPlan,
}: {
  tiers: BillingTier[];
  currentPlan: BillingPlanName;
}): React.ReactElement {
  return (
    <div className="mt-5 overflow-x-auto rounded-lg border border-surface-border">
      <table className="min-w-full divide-y divide-surface-border text-sm">
        <thead className="bg-surface-raised text-left text-xs uppercase tracking-wider text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Plan</th>
            <th className="px-4 py-3 font-medium">Price</th>
            <th className="px-4 py-3 font-medium">Repos</th>
            <th className="px-4 py-3 font-medium">Reviews</th>
            <th className="px-4 py-3 font-medium">Support</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {tiers.map((tier) => {
            const active = tier.plan === currentPlan;
            return (
              <tr key={tier.plan} className={active ? 'bg-surface-raised/50' : ''}>
                <td className="px-4 py-3 font-medium text-primary">
                  {tier.label}
                  {active && (
                    <span className="ml-2 text-xs text-accent">Current</span>
                  )}
                </td>
                <td className="px-4 py-3 text-secondary">{tier.price}</td>
                <td className="px-4 py-3 text-secondary">{formatRepos(tier.repos)}</td>
                <td className="px-4 py-3 text-secondary">
                  {tier.reviews.toLocaleString()} per month
                </td>
                <td className="px-4 py-3 text-secondary">{tier.support}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type AggregatedUsage = {
  daily: DailyBucket[];
  riskMix: RiskMix;
  topRepos: RepoUsage[];
  totalReviews: number;
  totalTokens: number;
};

function aggregateUsage(
  analyses: UsageAnalysis[],
  period: PeriodKey,
  cycleStartIso: string
): AggregatedUsage {
  const range = resolveRange(period, cycleStartIso);
  const filtered = analyses.filter((a) => {
    const ts = new Date(a.createdAt).getTime();
    return ts >= range.startMs && ts <= range.endMs;
  });

  const buckets = new Map<string, DailyBucket>();
  for (let day = 0; day < range.bucketCount; day += 1) {
    const date = new Date(range.startMs + day * 86_400_000);
    const key = isoDay(date);
    buckets.set(key, { date: key, reviews: 0, tokens: 0 });
  }

  const riskMix: RiskMix = { low: 0, medium: 0, high: 0 };
  const repoCounts = new Map<string, number>();
  let totalTokens = 0;

  for (const analysis of filtered) {
    const key = isoDay(new Date(analysis.createdAt));
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.reviews += 1;
      bucket.tokens += analysis.tokensUsed;
    }
    if (analysis.riskLevel !== 'unknown') {
      riskMix[analysis.riskLevel] += 1;
    }
    totalTokens += analysis.tokensUsed;
    repoCounts.set(
      analysis.repoFullName,
      (repoCounts.get(analysis.repoFullName) ?? 0) + 1
    );
  }

  const topRepos: RepoUsage[] = Array.from(repoCounts.entries())
    .map(([repoFullName, reviews]) => ({ repoFullName, reviews }))
    .sort((a, b) => b.reviews - a.reviews)
    .slice(0, 5);

  return {
    daily: Array.from(buckets.values()),
    riskMix,
    topRepos,
    totalReviews: filtered.length,
    totalTokens,
  };
}

function resolveRange(
  period: PeriodKey,
  cycleStartIso: string
): { startMs: number; endMs: number; bucketCount: number } {
  const endMs = Date.now();
  if (period === 'cycle') {
    const cycleStartMs = new Date(cycleStartIso).getTime();
    const start = Number.isNaN(cycleStartMs) ? endMs - 30 * 86_400_000 : cycleStartMs;
    const days = Math.max(1, Math.ceil((endMs - start) / 86_400_000));
    return { startMs: startOfDayMs(start), endMs, bucketCount: days };
  }
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  return {
    startMs: startOfDayMs(endMs - days * 86_400_000),
    endMs,
    bucketCount: days,
  };
}

function startOfDayMs(ms: number): number {
  const date = new Date(ms);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function periodLabel(period: PeriodKey): string {
  return PERIODS.find((p) => p.key === period)?.label ?? 'This cycle';
}

function nextResetDate(currentResetIso: string): string {
  const base = new Date(currentResetIso);
  if (Number.isNaN(base.getTime())) return currentResetIso;
  const next = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 1));
  return next.toISOString();
}

function getNextTier(plan: BillingPlanName, tiers: BillingTier[]): BillingTier | null {
  const index = PLAN_ORDER.indexOf(plan);
  const next = PLAN_ORDER[index + 1];
  return next ? tiers.find((tier) => tier.plan === next) ?? null : null;
}

function statusBadgeClass(status: BillingPlanStatus): string {
  const base =
    'rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider';

  switch (status) {
    case 'trialing':
      return `${base} border-amber-900/50 bg-amber-950/30 text-amber-200`;
    case 'cancelled':
      return `${base} border-red-900/50 bg-red-950/30 text-red-200`;
    case 'past_due':
      return `${base} border-red-900/50 bg-red-950/30 text-red-200`;
    case 'active':
    default:
      return `${base} border-green-900/50 bg-green-950/30 text-green-200`;
  }
}

function statusLabel(status: BillingPlanStatus): string {
  if (status === 'past_due') return 'Past due';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function daysUntil(value: string): number {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatRepos(repos: number): string {
  if (repos === -1) return 'Unlimited repos';
  return `${repos.toLocaleString()} ${repos === 1 ? 'repo' : 'repos'}`;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toLocaleString();
}
