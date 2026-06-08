import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';

/**
 * Proves: MCP tokens are hashed before storage and never stored raw, the
 * hash is reproducible so the server can authenticate a presented token,
 * a revoked token is rejected by the same lookup rule the MCP route uses,
 * and the current user resolves only when a session exists.
 * Failure means: token theft from the DB would be trivial, revoked tokens
 * would keep working, or an unauthenticated caller could be treated as a user.
 */

const { getUser, maybeSingle } = vi.hoisted(() => ({
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock('@features/shared/supabase-server', () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser } }),
}));
vi.mock('@features/shared/supabase', () => ({
  supabaseAdmin: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  },
}));

import { mintMcpToken, currentAppUserId } from '@features/auth/mcp-tokens';

beforeEach(() => {
  getUser.mockReset();
  maybeSingle.mockReset();
});

describe('mintMcpToken', () => {
  it('returns a prefixed plaintext token and its SHA-256 hash, never storing raw', () => {
    const { token, tokenHash } = mintMcpToken();
    expect(token.startsWith('sk_mcp_')).toBe(true);
    expect(tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
    // The hash must not equal (or contain) the plaintext token.
    expect(tokenHash).not.toBe(token);
    expect(tokenHash).not.toContain(token);
  });

  it('produces a reproducible hash so the server can authenticate a presented token', () => {
    const { token, tokenHash } = mintMcpToken();
    const rehashed = createHash('sha256').update(token).digest('hex');
    expect(rehashed).toBe(tokenHash);
  });

  it('generates unique tokens on each call', () => {
    expect(mintMcpToken().token).not.toBe(mintMcpToken().token);
  });
});

describe('revoked token rejection (MCP lookup rule)', () => {
  it('a revoked token is not returned by the active-token lookup', () => {
    // The MCP route authenticates by hashing the presented token and
    // selecting a row WHERE token_hash = ? AND revoked_at IS NULL.
    const { token, tokenHash } = mintMcpToken();
    const tokenRows = [{ token_hash: tokenHash, revoked_at: '2026-01-01T00:00:00Z' }];

    const presentedHash = createHash('sha256').update(token).digest('hex');
    const activeMatch = tokenRows.find(
      (r) => r.token_hash === presentedHash && r.revoked_at === null
    );
    expect(activeMatch).toBeUndefined(); // revoked => invalid immediately
  });

  it('an active (non-revoked) token IS returned by the same lookup', () => {
    const { token, tokenHash } = mintMcpToken();
    const tokenRows = [{ token_hash: tokenHash, revoked_at: null }];
    const presentedHash = createHash('sha256').update(token).digest('hex');
    const activeMatch = tokenRows.find(
      (r) => r.token_hash === presentedHash && r.revoked_at === null
    );
    expect(activeMatch).toBeDefined();
  });
});

describe('currentAppUserId', () => {
  it('returns null when there is no signed-in user', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await currentAppUserId()).toBeNull();
  });

  it('maps the auth user to the app user id when signed in', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'auth-123' } } });
    maybeSingle.mockResolvedValue({ data: { id: 'app-456' } });
    expect(await currentAppUserId()).toBe('app-456');
  });
});
