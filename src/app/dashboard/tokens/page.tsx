import Link from 'next/link';
import { createServerSupabaseClient } from '@features/shared/supabase-server';
import { Reveal } from '@features/shared/components/reveal';
import { McpTokenManager, type McpTokenView } from '@features/dashboard/components/mcp-token-manager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type McpTokenRow = {
  id: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
};

/**
 * MCP token management. Lists the signed-in user's personal access
 * tokens (read through the RLS-scoped user client) and lets them
 * generate or revoke tokens for IDE integrations. Per-IDE config
 * snippets live on the Connect IDE page, which this page links to.
 */
export default async function TokensPage(): Promise<React.ReactElement> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('mcp_tokens')
    .select('id, name, last_used_at, created_at, revoked_at')
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as unknown as McpTokenRow[];
  const tokens: McpTokenView[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    lastUsedAt: r.last_used_at,
    createdAt: r.created_at,
    revokedAt: r.revoked_at,
  }));

  return (
    <div className="space-y-12">
      <Reveal>
        <section>
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-green-500/80">
            Integrations
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-[-0.02em]">
            MCP access tokens
          </h1>
          <p className="mt-3 text-zinc-400 max-w-xl leading-relaxed">
            Tokens let your IDE connect to Senix. Generate a token, then head to{' '}
            <Link href="/dashboard/connect" className="text-green-400 hover:text-green-300">
              Connect IDE
            </Link>{' '}
            for a ready-to-paste config snippet tailored to your editor.
          </p>
        </section>
      </Reveal>

      <Reveal delay={0.05}>
        <section>
          <McpTokenManager tokens={tokens} />
        </section>
      </Reveal>
    </div>
  );
}
