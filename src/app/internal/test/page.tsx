import { supabaseAdmin } from '@/lib/supabase';
import RequeueButton from './requeue-button';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type AnalysisRow = {
  id: string;
  status: string;
  commit_sha: string | null;
  created_at: string;
  error_message: string | null;
  risk_flags: {
    file_count?: number;
    symbol_changes?: number;
  } | null;
};

const STATUS_COLOR: Record<string, string> = {
  queued: 'text-zinc-400',
  running: 'text-blue-400',
  completed: 'text-green-400',
  failed: 'text-red-400',
};

/**
 * Internal test panel — quick view of recent analyses with a manual
 * "requeue all failed" trigger. Protected by the Basic Auth middleware
 * (matcher `/internal/:path*` covers this route).
 */
export default async function TestPanelPage(): Promise<React.ReactElement> {
  const { data: rows } = await supabaseAdmin
    .from('analyses')
    .select('id, status, commit_sha, risk_flags, created_at, error_message')
    .order('created_at', { ascending: false })
    .limit(10);

  const analyses = (rows ?? []) as unknown as AnalysisRow[];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-mono text-sm">
      <h1 className="text-2xl font-bold mb-2">Test Panel</h1>
      <p className="text-zinc-500 mb-8">10 most recent analyses · manual recovery</p>

      <section className="mb-10">
        <h2 className="text-lg font-bold mb-3">Recent analyses</h2>
        <div className="space-y-2">
          {analyses.map((a) => {
            const color = STATUS_COLOR[a.status] ?? 'text-zinc-300';
            const flags = a.risk_flags ?? {};
            return (
              <div key={a.id} className="rounded-lg border border-zinc-800 p-3 bg-zinc-900/40">
                <div className="flex gap-4 text-zinc-300">
                  <span className="text-zinc-500 w-44">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                  <span className={`w-24 font-bold ${color}`}>{a.status}</span>
                  <span className="text-zinc-500 w-20">{a.commit_sha?.slice(0, 7) ?? '-'}</span>
                  <span className="text-zinc-400 text-xs">
                    files={flags.file_count ?? '?'} · symbol changes={flags.symbol_changes ?? 0}
                  </span>
                </div>
                {a.status === 'failed' && a.error_message && (
                  <div className="text-red-400 text-xs mt-2 ml-1 break-words">
                    {a.error_message}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">Actions</h2>
        <RequeueButton />
      </section>
    </main>
  );
}
