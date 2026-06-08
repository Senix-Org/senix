import { supabaseAdmin } from '@features/shared/supabase';

/**
 * Per-analysis row fetched for the billing usage view. Joined to the
 * installation chain so the admin client can filter to a single user.
 */
type AnalysisUsageRow = {
  id: string;
  created_at: string;
  tokens_used: number | null;
  risk_level: string | null;
  status: string | null;
  pull_requests: {
    repositories: {
      full_name: string;
      installations: {
        installed_by_user_id: string | null;
        uninstalled_at: string | null;
      } | null;
    } | null;
  } | null;
};

export type UsageAnalysis = {
  id: string;
  createdAt: string;
  tokensUsed: number;
  riskLevel: 'low' | 'medium' | 'high' | 'unknown';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'unknown';
  repoFullName: string;
};

export type BillingUsage = {
  analyses: UsageAnalysis[];
  windowDays: number;
};

const USAGE_WINDOW_DAYS = 90;

function normalizeRisk(value: string | null): UsageAnalysis['riskLevel'] {
  if (value === 'low' || value === 'medium' || value === 'high') return value;
  return 'unknown';
}

function normalizeStatus(value: string | null): UsageAnalysis['status'] {
  if (
    value === 'queued' ||
    value === 'running' ||
    value === 'completed' ||
    value === 'failed'
  ) {
    return value;
  }
  return 'unknown';
}

/**
 * Pull all analyses for the signed-in user inside the rolling window. The
 * client then aggregates this into the time-bucket the user picks (this
 * cycle, 7d, 30d, 90d), avoiding a server round-trip on every toggle.
 */
export async function getBillingUsage(userId: string): Promise<BillingUsage> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - USAGE_WINDOW_DAYS);

  const { data, error } = (await supabaseAdmin
    .from('analyses')
    .select(
      `id, created_at, tokens_used, risk_level, status,
       pull_requests!inner(
         repositories!inner(
           full_name,
           installations!inner(installed_by_user_id, uninstalled_at)
         )
       )`
    )
    .eq(
      'pull_requests.repositories.installations.installed_by_user_id',
      userId
    )
    .is('pull_requests.repositories.installations.uninstalled_at', null)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(5000)) as unknown as {
    data: AnalysisUsageRow[] | null;
    error: { message: string } | null;
  };

  if (error) {
    throw new Error(`Failed to load usage analyses: ${error.message}`);
  }

  const analyses: UsageAnalysis[] = (data ?? []).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    tokensUsed: row.tokens_used ?? 0,
    riskLevel: normalizeRisk(row.risk_level),
    status: normalizeStatus(row.status),
    repoFullName: row.pull_requests?.repositories?.full_name ?? 'unknown',
  }));

  return { analyses, windowDays: USAGE_WINDOW_DAYS };
}
