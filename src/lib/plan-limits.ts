export const PLAN_LIMITS = {
  free: { repos: 1, reviews: 30, label: 'Free' },
  starter: { repos: 3, reviews: 200, label: 'Starter' },
  team: { repos: 15, reviews: 1000, label: 'Team' },
  pro: { repos: -1, reviews: 5000, label: 'Pro' },
} as const;

export const PLAN_ORDER = ['free', 'starter', 'team', 'pro'] as const;

export type PlanName = keyof typeof PLAN_LIMITS;
export type PlanStatus = 'active' | 'trialing' | 'cancelled' | 'past_due';
export type ReviewSource = 'pr' | 'mcp';

export type UserPlan = {
  userId: string;
  plan: PlanName;
  planStatus: PlanStatus;
  trialEndsAt: string | null;
  prReviewsThisMonth: number;
  mcpReviewsThisMonth: number;
  reviewsResetAt: string;
  reposConnected: number;
  reviewsUsed: number;
  reviewLimit: number;
  repoLimit: number;
  limit: (typeof PLAN_LIMITS)[PlanName];
  effectivePlan: PlanName;
  effectiveLimit: (typeof PLAN_LIMITS)[PlanName];
};

type UserPlanRow = {
  plan: string | null;
  plan_status: string | null;
  trial_ends_at: string | null;
  pr_reviews_this_month: number | null;
  mcp_reviews_this_month: number | null;
  reviews_reset_at: string | null;
  repos_connected: number | null;
};

type LimitResult = { allowed: true } | { allowed: false; reason: string };

const MAX_COUNTER_ATTEMPTS = 3;

async function getSupabaseAdmin() {
  const { supabaseAdmin } = await import('@/lib/supabase');
  return supabaseAdmin;
}

function isPlanName(value: string | null | undefined): value is PlanName {
  return Boolean(value && value in PLAN_LIMITS);
}

function normalizePlan(value: string | null | undefined): PlanName {
  return isPlanName(value) ? value : 'free';
}

function normalizeStatus(value: string | null | undefined): PlanStatus {
  if (
    value === 'active' ||
    value === 'trialing' ||
    value === 'cancelled' ||
    value === 'past_due'
  ) {
    return value;
  }
  return 'active';
}

function currentMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function isBeforeCurrentMonth(value: string | null): boolean {
  if (!value) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return true;
  return date.getTime() < currentMonthStart().getTime();
}

function hasActiveTrial(status: PlanStatus, trialEndsAt: string | null): boolean {
  if (status !== 'trialing' || !trialEndsAt) return false;
  const endsAt = new Date(trialEndsAt);
  return !Number.isNaN(endsAt.getTime()) && endsAt.getTime() > Date.now();
}

function effectivePlan(plan: PlanName, status: PlanStatus, trialEndsAt: string | null): PlanName {
  const activeTrial = hasActiveTrial(status, trialEndsAt);
  if ((status === 'cancelled' || status === 'past_due') && !activeTrial) {
    return 'free';
  }
  if (status === 'trialing' && !activeTrial) {
    return 'free';
  }
  return plan;
}

export async function getUserPlan(userId: string): Promise<UserPlan> {
  const supabase = await getSupabaseAdmin();
  const { data, error } = (await supabase
    .from('users')
    .select(
      'plan, plan_status, trial_ends_at, pr_reviews_this_month, mcp_reviews_this_month, reviews_reset_at, repos_connected'
    )
    .eq('id', userId)
    .maybeSingle()) as unknown as { data: UserPlanRow | null; error: { message: string } | null };

  if (error) {
    throw new Error(`Failed to load user plan: ${error.message}`);
  }
  if (!data) {
    throw new Error('User not found.');
  }

  let prReviews = data.pr_reviews_this_month ?? 0;
  let mcpReviews = data.mcp_reviews_this_month ?? 0;
  let reviewsResetAt = data.reviews_reset_at ?? currentMonthStart().toISOString();

  if (isBeforeCurrentMonth(data.reviews_reset_at)) {
    reviewsResetAt = currentMonthStart().toISOString();
    prReviews = 0;
    mcpReviews = 0;

    const { error: resetError } = await supabase
      .from('users')
      .update({
        pr_reviews_this_month: 0,
        mcp_reviews_this_month: 0,
        reviews_reset_at: reviewsResetAt,
      })
      .eq('id', userId);

    if (resetError) {
      throw new Error(`Failed to reset monthly review counters: ${resetError.message}`);
    }
  }

  const plan = normalizePlan(data.plan);
  const planStatus = normalizeStatus(data.plan_status);
  const activePlan = effectivePlan(plan, planStatus, data.trial_ends_at);
  const limit = PLAN_LIMITS[plan];
  const effectiveLimit = PLAN_LIMITS[activePlan];
  const reviewsUsed = prReviews + mcpReviews;

  return {
    userId,
    plan,
    planStatus,
    trialEndsAt: data.trial_ends_at,
    prReviewsThisMonth: prReviews,
    mcpReviewsThisMonth: mcpReviews,
    reviewsResetAt,
    reposConnected: data.repos_connected ?? 0,
    reviewsUsed,
    reviewLimit: limit.reviews,
    repoLimit: limit.repos,
    limit,
    effectivePlan: activePlan,
    effectiveLimit,
  };
}

export async function checkReviewLimit(
  userId: string,
  source: ReviewSource
): Promise<LimitResult> {
  const counterField =
    source === 'pr' ? 'pr_reviews_this_month' : 'mcp_reviews_this_month';

  for (let attempt = 0; attempt < MAX_COUNTER_ATTEMPTS; attempt += 1) {
    const userPlan = await getUserPlan(userId);
    const limit = userPlan.effectiveLimit.reviews;

    if (userPlan.reviewsUsed >= limit) {
      return {
        allowed: false,
        reason: `Monthly review limit reached for the ${userPlan.effectiveLimit.label} plan.`,
      };
    }

    const nextValue =
      source === 'pr'
        ? userPlan.prReviewsThisMonth + 1
        : userPlan.mcpReviewsThisMonth + 1;

    const supabase = await getSupabaseAdmin();
    const { data, error } = (await supabase
      .from('users')
      .update({ [counterField]: nextValue })
      .eq('id', userId)
      .eq('pr_reviews_this_month', userPlan.prReviewsThisMonth)
      .eq('mcp_reviews_this_month', userPlan.mcpReviewsThisMonth)
      .select('id')
      .maybeSingle()) as unknown as {
      data: { id: string } | null;
      error: { message: string } | null;
    };

    if (error) {
      throw new Error(`Failed to reserve review usage: ${error.message}`);
    }
    if (data) {
      return { allowed: true };
    }
  }

  return {
    allowed: false,
    reason: 'Review usage changed while this request was being processed. Please retry.',
  };
}

export async function checkRepoLimit(userId: string): Promise<LimitResult> {
  const userPlan = await getUserPlan(userId);
  const limit = userPlan.effectiveLimit.repos;

  if (limit !== -1 && userPlan.reposConnected >= limit) {
    return {
      allowed: false,
      reason: `Repo limit reached for the ${userPlan.effectiveLimit.label} plan.`,
    };
  }

  return { allowed: true };
}

export async function syncReposConnected(userId: string): Promise<number> {
  const supabase = await getSupabaseAdmin();
  const { count, error } = await supabase
    .from('repositories')
    .select('id, installations!inner(installed_by_user_id, uninstalled_at)', {
      count: 'exact',
      head: true,
    })
    .eq('installations.installed_by_user_id', userId)
    .is('installations.uninstalled_at', null);

  if (error) {
    throw new Error(`Failed to count connected repos: ${error.message}`);
  }

  const reposConnected = count ?? 0;
  const { error: updateError } = await supabase
    .from('users')
    .update({ repos_connected: reposConnected })
    .eq('id', userId);

  if (updateError) {
    throw new Error(`Failed to update connected repo count: ${updateError.message}`);
  }

  return reposConnected;
}
