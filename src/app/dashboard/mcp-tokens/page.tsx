import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Reveal } from '@/components/reveal';
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

const CURSOR_CONFIG = `{
  "mcpServers": {
    "senix": {
      "transport": "http",
      "url": "https://senix-chi.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_HERE"
      }
    }
  }
}`;

/**
 * MCP token management. Lists the signed-in user's personal access
 * tokens (read through the RLS-scoped user client) and lets them
 * generate or revoke tokens for IDE integrations.
 */
export default async function McpTokensPage(): Promise<React.ReactElement> {
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
            Connect Senix to your IDE. Generate a token, paste it into your IDE&apos;s MCP
            config.
          </p>
        </section>
      </Reveal>

      <Reveal delay={0.05}>
        <section>
          <McpTokenManager tokens={tokens} />
        </section>
      </Reveal>

      <Reveal delay={0.1}>
        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">Connect your IDE</h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            Add the snippet below to your IDE&apos;s MCP configuration, replacing{' '}
            <code className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono">
              YOUR_TOKEN_HERE
            </code>{' '}
            with a token generated above. Once connected, ask your IDE&apos;s AI to
            &quot;review my changes with Senix.&quot;
          </p>
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
            Cursor
          </div>
          <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-4 font-mono text-sm overflow-x-auto text-zinc-300">
            {CURSOR_CONFIG}
          </pre>
          <p className="mt-4 text-sm text-zinc-400">
            Using Claude Code or Windsurf? See the{' '}
            <Link href="/docs/mcp" className="text-green-400 hover:text-green-300">
              MCP setup guide
            </Link>{' '}
            for per-IDE instructions.
          </p>
        </section>
      </Reveal>
    </div>
  );
}
