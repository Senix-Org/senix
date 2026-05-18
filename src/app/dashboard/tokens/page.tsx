import { createServerSupabaseClient } from '@/lib/supabase-server';
import { McpTokenManager, type McpTokenView } from '@/components/mcp-tokens/mcp-token-manager';

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
 * generate or revoke tokens for IDE integrations.
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
    <div>
      <header>
        <h1 className="text-2xl font-semibold text-primary">MCP Tokens</h1>
        <p className="mt-2 text-sm text-secondary">
          Tokens let your IDE connect to Senix.
        </p>
      </header>

      <section className="mt-8">
        <McpTokenManager tokens={tokens} />
      </section>
    </div>
  );
}
