import { GitPullRequest } from 'lucide-react';
import { createServerSupabaseClient } from '@features/shared/supabase-server';
import { RecentAnalyses } from '@features/dashboard/components/recent-analyses';
import type { AnalysisCardData } from '@features/dashboard/components/analysis-card';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type AnalysisRow = {
  id: string;
  status: string;
  summary: string | null;
  risk_level: string | null;
  created_at: string;
  github_comment_url: string | null;
  pull_requests: {
    github_pr_number: number;
    title: string;
    repositories: {
      full_name: string;
    } | null;
  } | null;
};

type RepoRow = {
  id: string;
  full_name: string;
  enabled: boolean;
};

/**
 * Customer dashboard overview. Reads the signed-in user's recent
 * analyses and connected repos through the user-context Supabase client
 * (so RLS enforces ownership). The /dashboard layout has already bounced
 * any unauthenticated visitor to /login by the time we get here.
 */
export default async function DashboardPage(): Promise<React.ReactElement> {
  const supabase = await createServerSupabaseClient();

  const [analysesResult, reposResult] = await Promise.all([
    supabase
      .from('analyses')
      .select(
        'id, status, summary, risk_level, created_at, github_comment_url, ' +
          'pull_requests(github_pr_number, title, repositories(full_name))'
      )
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('repositories')
      .select('id, full_name, enabled, installations!inner(account_login, uninstalled_at)')
      .is('installations.uninstalled_at', null)
      .order('full_name', { ascending: true }),
  ]);

  const analyses = (analysesResult.data ?? []) as unknown as AnalysisRow[];
  const repos = (reposResult.data ?? []) as unknown as RepoRow[];

  const enabledRepoCount = repos.filter((r) => r.enabled).length;
  const weeklyAnalysisCount = analyses.filter(
    (a) => Date.now() - new Date(a.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
  ).length;

  const analysisCards: AnalysisCardData[] = analyses.map((a) => ({
    id: a.id,
    summary: a.summary,
    risk_level: a.risk_level,
    created_at: a.created_at,
    github_comment_url: a.github_comment_url,
    pr_title: a.pull_requests?.title ?? '(untitled PR)',
    pr_number: a.pull_requests?.github_pr_number ?? null,
    repo_name: a.pull_requests?.repositories?.full_name ?? 'unknown',
  }));

  return (
    <div>
      <header>
        <h1 className="text-3xl font-semibold text-primary">Your reviews at a glance</h1>
        <p className="mt-2 text-sm text-secondary">
          {enabledRepoCount} {enabledRepoCount === 1 ? 'repo' : 'repos'} connected,{' '}
          {weeklyAnalysisCount} {weeklyAnalysisCount === 1 ? 'analysis' : 'analyses'} this
          week
        </p>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total reviews" value={analyses.length} />
        <StatCard label="This week" value={weeklyAnalysisCount} />
        <StatCard label="Repos connected" value={enabledRepoCount} />
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-primary">Recent analyses</h2>
        {analyses.length === 0 ? <AnalysesEmptyState /> : <RecentAnalyses analyses={analysisCards} />}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }): React.ReactElement {
  return (
    <div className="rounded-xl border border-surface-border bg-surface p-6">
      <div className="text-2xl font-bold tabular-nums text-primary">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-secondary">{label}</div>
    </div>
  );
}

function AnalysesEmptyState(): React.ReactElement {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <GitPullRequest size={32} strokeWidth={1.5} className="text-muted" />
      <p className="mt-4 text-sm font-medium text-primary">No reviews yet</p>
      <p className="mt-1 max-w-xs text-sm text-secondary">
        Open a pull request in a connected repo and Senix will review it within 30 seconds.
      </p>
    </div>
  );
}
