import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@features/shared/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/mcp/test?token=sk_mcp_...
 *
 * Lightweight connectivity check for the Connect IDE flow's "Test
 * connection" button. Verifies the presented token exists in `mcp_tokens`
 * and is not revoked, the same way the MCP route authenticates, and
 * reports a simple connected/not-connected result. It does no analysis and
 * burns no LLM cost. Responses are never cached.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get('token')?.trim();

  const noStore = { headers: { 'Cache-Control': 'no-store' } };

  if (!token) {
    return NextResponse.json(
      { connected: false, error: 'Missing token.' },
      { status: 400, ...noStore }
    );
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');

  const { data, error } = (await supabaseAdmin
    .from('mcp_tokens')
    .select('id')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .maybeSingle()) as unknown as { data: { id: string } | null; error: { message: string } | null };

  if (error) {
    return NextResponse.json(
      { connected: false, error: 'Could not verify the token right now. Try again.' },
      { status: 500, ...noStore }
    );
  }

  if (!data) {
    return NextResponse.json(
      { connected: false, error: 'This token is not valid or has been revoked.' },
      { status: 401, ...noStore }
    );
  }

  return NextResponse.json({ connected: true }, { status: 200, ...noStore });
}
