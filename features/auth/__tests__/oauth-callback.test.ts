import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Proves: the OAuth callback exchanges the code for a session, ensures a
 * `users` row exists for the signed-in auth user, and redirects onward; and
 * that a missing code or a failed exchange redirects to an auth-failed page
 * without creating any user row.
 * Failure means: sign-in would silently break, or RLS-gated dashboard reads
 * would return nothing because no users row was created.
 */

const { exchangeCodeForSession, getUser, upsert } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
  upsert: vi.fn(async (_row?: Record<string, unknown>) => ({ error: null })),
}));

vi.mock('@features/shared/supabase-server', () => ({
  createServerSupabaseClient: async () => ({ auth: { exchangeCodeForSession, getUser } }),
}));
vi.mock('@features/shared/supabase', () => ({
  supabaseAdmin: { from: () => ({ upsert }) },
}));

import { GET } from '@/app/auth/callback/route';

const ORIGIN = 'http://localhost:3000';
function req(query: string) {
  return {
    nextUrl: { searchParams: new URLSearchParams(query), origin: ORIGIN },
  } as unknown as Parameters<typeof GET>[0];
}

beforeEach(() => {
  exchangeCodeForSession.mockReset();
  getUser.mockReset();
  upsert.mockClear();
});

describe('OAuth callback', () => {
  it('redirects to auth_failed when no code is present', async () => {
    const res = await GET(req(''));
    expect(res.headers.get('location')).toContain('error=auth_failed');
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('redirects to auth_failed when the code exchange fails', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'bad code' } });
    const res = await GET(req('code=abc'));
    expect(res.headers.get('location')).toContain('error=auth_failed');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('exchanges the code, ensures a users row, and redirects to the dashboard', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    getUser.mockResolvedValue({
      data: { user: { id: 'auth-1', email: 'dev@example.com', user_metadata: { user_name: 'devgh', provider_id: '42' } } },
    });

    const res = await GET(req('code=abc'));

    expect(upsert).toHaveBeenCalledOnce();
    const row = upsert.mock.calls[0][0];
    expect(row).toMatchObject({ auth_user_id: 'auth-1', github_username: 'devgh', github_user_id: 42, email: 'dev@example.com' });
    expect(res.headers.get('location')).toBe(`${ORIGIN}/dashboard`);
  });

  it('honours the next param to resume the setup flow', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(req('code=abc&next=/setup'));
    expect(res.headers.get('location')).toBe(`${ORIGIN}/setup`);
  });
});
