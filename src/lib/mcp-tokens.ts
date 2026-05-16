import { createHash, randomBytes } from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Shared server-side helpers for MCP personal access tokens.
 *
 * The token-creation API route and the dashboard token actions both need
 * to resolve the signed-in app user and mint tokens in the same format,
 * so that logic lives here rather than being duplicated. This module is
 * not a server-action file (no 'use server' directive), so it can export
 * plain synchronous helpers alongside the async ones.
 */

const TOKEN_PREFIX = 'sk_mcp_';
const TOKEN_RANDOM_BYTES = 16;

type AppUserRow = { id: string };

/**
 * Resolve the app `users.id` for the current session, or null when no
 * user is signed in. Uses the cookie-scoped client to read the session,
 * then `supabaseAdmin` to map the auth user to the app user row.
 */
export async function currentAppUserId(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data: appUser } = (await supabaseAdmin
    .from('users')
    .select('id')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle()) as unknown as { data: AppUserRow | null };

  return appUser?.id ?? null;
}

/**
 * Mint a new MCP token. Returns the plaintext token (shown to the user
 * exactly once) and its SHA-256 hash (the only form ever persisted). The
 * MCP route hashes presented tokens the same way to authenticate.
 */
export function mintMcpToken(): { token: string; tokenHash: string } {
  const token = TOKEN_PREFIX + randomBytes(TOKEN_RANDOM_BYTES).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

/** Format a date as "Nov 16, 2026", used for default token names and labels. */
export function formatTokenDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
