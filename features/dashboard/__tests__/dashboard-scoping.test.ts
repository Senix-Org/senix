import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Proves: the dashboard reads analyses through the RLS-scoped user-context
 * client (createServerSupabaseClient), and surfaces ONLY the rows that client
 * returns for the authenticated user. Because the query carries no user
 * filter in app code, isolation depends on using this scoped client rather
 * than the service-role admin client (which bypasses RLS) — so this test also
 * fails loudly if the page ever reaches for supabaseAdmin.
 * Failure means: a user could see another user's analyses.
 */

const { fromSpy } = vi.hoisted(() => ({ fromSpy: vi.fn() }));

let analysesRows: unknown[] = [];
let repoRows: unknown[] = [];

function makeBuilder(table: string) {
  const data = table === 'analyses' ? analysesRows : repoRows;
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.order = () => b;
  b.limit = () => b;
  b.is = () => b;
  b.eq = () => b;
  b.then = (resolve: (v: { data: unknown[] }) => unknown) => resolve({ data });
  return b;
}

vi.mock('@features/shared/supabase-server', () => ({
  createServerSupabaseClient: async () => ({
    from: (t: string) => {
      fromSpy(t);
      return makeBuilder(t);
    },
  }),
}));

vi.mock('@features/shared/supabase', () => ({
  supabaseAdmin: new Proxy({}, { get() { throw new Error('dashboard must not use supabaseAdmin (RLS bypass)'); } }),
}));

import DashboardPage from '@/app/dashboard/page';

// Recursively find the first element in the rendered tree carrying an
// `analyses` array prop (the RecentAnalyses element).
function findAnalysesProp(node: unknown): Array<{ id: string }> | undefined {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findAnalysesProp(child);
      if (found) return found;
    }
    return undefined;
  }
  const props = (node as { props?: { analyses?: unknown; children?: unknown } }).props;
  if (props) {
    if (Array.isArray(props.analyses)) return props.analyses as Array<{ id: string }>;
    return findAnalysesProp(props.children);
  }
  return undefined;
}

beforeEach(() => fromSpy.mockClear());

describe('dashboard analyses scoping', () => {
  it("renders only the authenticated user's analyses returned by the RLS client", async () => {
    analysesRows = [
      { id: 'a1', status: 'completed', summary: 's1', risk_level: 'low', created_at: new Date().toISOString(), github_comment_url: null, pull_requests: { github_pr_number: 1, title: 'PR1', repositories: { full_name: 'me/repo' } } },
      { id: 'a2', status: 'completed', summary: 's2', risk_level: 'high', created_at: new Date().toISOString(), github_comment_url: null, pull_requests: { github_pr_number: 2, title: 'PR2', repositories: { full_name: 'me/repo' } } },
    ];
    repoRows = [{ id: 'r1', full_name: 'me/repo', enabled: true }];

    const el = await DashboardPage();
    expect(fromSpy).toHaveBeenCalledWith('analyses');

    const cards = findAnalysesProp(el);
    expect(cards?.map((c) => c.id)).toEqual(['a1', 'a2']);
  });

  it('a different user sees their own (different) analyses, never a shared/global set', async () => {
    analysesRows = [
      { id: 'b9', status: 'completed', summary: 'other', risk_level: 'low', created_at: new Date().toISOString(), github_comment_url: null, pull_requests: { github_pr_number: 9, title: 'PRB', repositories: { full_name: 'other/repo' } } },
    ];
    repoRows = [];

    const el = await DashboardPage();
    const cards = findAnalysesProp(el);
    expect(cards?.map((c) => c.id)).toEqual(['b9']);
  });
});
