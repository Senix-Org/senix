import { redirect } from 'next/navigation';
import { currentAppUserId } from '@/lib/mcp-tokens';
import { getUserPlan, PLAN_LIMITS } from '@/lib/plan-limits';
import { getBillingUsage } from '@/lib/billing-usage';
import { supabaseAdmin } from '@/lib/supabase';
import { BillingClient, type BillingPlanData, type BillingTier } from './billing-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type BillingUserRow = {
  plan_expires_at: string | null;
  whop_membership_id: string | null;
};

const TIERS: BillingTier[] = [
  {
    plan: 'free',
    label: PLAN_LIMITS.free.label,
    price: '$0',
    repos: PLAN_LIMITS.free.repos,
    reviews: PLAN_LIMITS.free.reviews,
    support: 'Community',
    trial: 'None',
  },
  {
    plan: 'starter',
    label: PLAN_LIMITS.starter.label,
    price: '$18',
    repos: PLAN_LIMITS.starter.repos,
    reviews: PLAN_LIMITS.starter.reviews,
    support: 'Community',
    trial: 'None',
  },
  {
    plan: 'team',
    label: PLAN_LIMITS.team.label,
    price: '$79',
    repos: PLAN_LIMITS.team.repos,
    reviews: PLAN_LIMITS.team.reviews,
    support: 'Email, 48 hour response',
    trial: 'None',
  },
  {
    plan: 'pro',
    label: PLAN_LIMITS.pro.label,
    price: '$199',
    repos: PLAN_LIMITS.pro.repos,
    reviews: PLAN_LIMITS.pro.reviews,
    support: 'Priority, 24 hour response',
    trial: 'None',
  },
];

export default async function BillingPage(): Promise<React.ReactElement> {
  const userId = await currentAppUserId();
  if (!userId) {
    redirect('/login?next=/dashboard/billing');
  }

  const [userPlan, billingUserResult, usage] = await Promise.all([
    getUserPlan(userId),
    supabaseAdmin
      .from('users')
      .select('plan_expires_at, whop_membership_id')
      .eq('id', userId)
      .maybeSingle() as unknown as Promise<{ data: BillingUserRow | null }>,
    getBillingUsage(userId),
  ]);

  const planData: BillingPlanData = {
    plan: userPlan.plan,
    planStatus: userPlan.planStatus,
    trialEndsAt: userPlan.trialEndsAt,
    planExpiresAt: billingUserResult.data?.plan_expires_at ?? null,
    whopMembershipId: billingUserResult.data?.whop_membership_id ?? null,
    reviewsUsed: userPlan.reviewsUsed,
    prReviewsThisMonth: userPlan.prReviewsThisMonth,
    mcpReviewsThisMonth: userPlan.mcpReviewsThisMonth,
    reviewLimit: userPlan.reviewLimit,
    reposConnected: userPlan.reposConnected,
    repoLimit: userPlan.repoLimit,
    reviewsResetAt: userPlan.reviewsResetAt,
  };

  return <BillingClient planData={planData} tiers={TIERS} analyses={usage.analyses} />;
}
