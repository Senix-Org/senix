'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@features/shared/supabase';
import { currentAppUserId } from '@features/auth/mcp-tokens';

/**
 * Server action backing the "Revoke" button in the dashboard token list.
 * Revoking deletes the row outright. Ownership is verified against the
 * signed-in user before the delete, and `supabaseAdmin` is used because
 * the `mcp_tokens` RLS policy set has no delete policy.
 */

type DeleteResult = { ok: true } | { ok: false; error: string };
type TokenOwnerRow = { id: string; user_id: string };

export async function deleteMcpToken(id: string): Promise<DeleteResult> {
  const userId = await currentAppUserId();
  if (!userId) {
    return { ok: false, error: 'Not signed in.' };
  }

  const { data: token } = (await supabaseAdmin
    .from('mcp_tokens')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle()) as unknown as { data: TokenOwnerRow | null };

  if (!token || token.user_id !== userId) {
    return { ok: false, error: 'Token not found.' };
  }

  const { error } = await supabaseAdmin.from('mcp_tokens').delete().eq('id', token.id);
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { ok: true };
}
