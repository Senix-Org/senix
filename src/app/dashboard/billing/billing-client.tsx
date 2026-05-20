'use client';

import { useState } from 'react';
import { CreditCard, Loader2, X } from 'lucide-react';

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
  reviewLimit: number;
  reposConnected: number;
  repoLimit: number;
};

type Props = {
  planData: BillingPlanData;
  tiers: BillingTier[];
};

const PLAN_ORDER: BillingPlanName[] = ['free', 'starter', 'team', 'pro'];

export function BillingClient({ planData, tiers }: Props): React.ReactElement {
  const [currentPlanData, setCurrentPlanData] = useState(planData);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentTier = tiers.find((tier) => tier.plan === currentPlanData.plan) ?? tiers[0];
  const nextTier = getNextTier(currentPlanData.plan, tiers);
  const progress = Math.min(
    100,
    (currentPlanData.reviewsUsed / currentPlanData.reviewLimit) * 100
  );
  const progressTone =
    progress >= 90 ? 'bg-risk-high' : progress >= 70 ? 'bg-amber-500' : 'bg-accent';
  const paidPlan = currentPlanData.plan !== 'free';

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

      const payload = (await response.json()) as { checkoutUrl?: string; error?: string };
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
      <header>
        <h1 className="text-3xl font-semibold text-primary">Billing</h1>
        <p className="mt-2 text-sm text-secondary">
          Review usage, connected repos, and subscription status.
        </p>
      </header>

      <section className="mt-8 rounded-xl border border-surface-border bg-surface p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted">Current plan</div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-primary">{currentTier.label}</h2>
              <span className={statusBadgeClass(currentPlanData.planStatus)}>
                {statusLabel(currentPlanData.planStatus)}
              </span>
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
          </div>

          <div className="rounded-lg border border-surface-border bg-surface-raised px-4 py-3">
            <div className="text-xs uppercase tracking-wider text-muted">Repos connected</div>
            <div className="mt-1 text-lg font-semibold text-primary">
              {currentPlanData.reposConnected.toLocaleString()} of{' '}
              {currentPlanData.repoLimit === -1
                ? 'Unlimited'
                : currentPlanData.repoLimit.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="mt-7">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-primary">Reviews used this month</span>
            <span className="tabular-nums text-secondary">
              {currentPlanData.reviewsUsed.toLocaleString()} /{' '}
              {currentPlanData.reviewLimit.toLocaleString()}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-raised">
            <div
              className={`h-full rounded-full ${progressTone}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>{currentPlanData.reviewsUsed.toLocaleString()} used</span>
            <span>{currentPlanData.reviewLimit.toLocaleString()} included</span>
          </div>
        </div>
      </section>

      {nextTier && (
        <section className="mt-6 rounded-xl border border-surface-border bg-surface p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-accent">Recommended upgrade</div>
              <h2 className="mt-2 text-xl font-semibold text-primary">{nextTier.label}</h2>
              <p className="mt-2 text-sm text-secondary">
                {nextTier.price} per month, {formatRepos(nextTier.repos)},{' '}
                {nextTier.reviews.toLocaleString()} reviews per month.
              </p>
            </div>
            <button
              type="button"
              onClick={() => startCheckout(nextTier.plan)}
              disabled={checkoutBusy}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-wait disabled:opacity-60"
            >
              {checkoutBusy ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
              Upgrade to {nextTier.label}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAllPlans((value) => !value)}
            className="mt-5 text-sm text-secondary transition-colors hover:text-primary"
          >
            See all plans
          </button>

          {showAllPlans && <PlanTable tiers={tiers} />}
        </section>
      )}

      {paidPlan && (
        <section className="mt-6 rounded-xl border border-surface-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-primary">Manage subscription</h2>
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            className="mt-4 text-sm text-muted transition-colors hover:text-risk-high"
          >
            Cancel subscription
          </button>
        </section>
      )}

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
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-surface-border bg-surface p-6 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold text-primary">Cancel subscription</h2>
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
              Are you sure you want to cancel? You will be downgraded to the Free plan at
              the end of your billing period.
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

function PlanTable({ tiers }: { tiers: BillingTier[] }): React.ReactElement {
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
          {tiers.map((tier) => (
            <tr key={tier.plan}>
              <td className="px-4 py-3 font-medium text-primary">{tier.label}</td>
              <td className="px-4 py-3 text-secondary">{tier.price}</td>
              <td className="px-4 py-3 text-secondary">{formatRepos(tier.repos)}</td>
              <td className="px-4 py-3 text-secondary">
                {tier.reviews.toLocaleString()} per month
              </td>
              <td className="px-4 py-3 text-secondary">{tier.support}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function formatRepos(repos: number): string {
  if (repos === -1) return 'Unlimited repos';
  return `${repos.toLocaleString()} ${repos === 1 ? 'repo' : 'repos'}`;
}
