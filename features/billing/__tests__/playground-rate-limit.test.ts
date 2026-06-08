import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Proves the SECURITY behaviour from the audit: the playground rate limiter
 * FAILS CLOSED. If the counter store is unreachable (error or non-numeric
 * response), it throws so the route returns 500 instead of letting the
 * request through to the LLM unmetered. Within the limit it allows; over the
 * limit it denies.
 * Failure means: a DB outage would become a free, unmetered path to paid LLM calls.
 */

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@features/shared/supabase', () => ({
  supabaseAdmin: { rpc },
}));

import { checkPlaygroundRateLimit, PLAYGROUND_HOURLY_LIMIT } from '@features/billing/playground-rate-limit';

beforeEach(() => rpc.mockReset());

describe('checkPlaygroundRateLimit', () => {
  it('allows a request within the hourly limit', async () => {
    rpc.mockResolvedValue({ data: 1, error: null });
    const res = await checkPlaygroundRateLimit('1.2.3.4');
    expect(res.allowed).toBe(true);
  });

  it('denies a request once the limit is exceeded', async () => {
    rpc.mockResolvedValue({ data: PLAYGROUND_HOURLY_LIMIT + 1, error: null });
    const res = await checkPlaygroundRateLimit('1.2.3.4');
    expect(res.allowed).toBe(false);
  });

  it('FAILS CLOSED (throws) when the counter store errors', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'connection refused' } });
    await expect(checkPlaygroundRateLimit('1.2.3.4')).rejects.toThrow(/rate limit lookup failed/);
  });

  it('FAILS CLOSED (throws) when the store returns a non-numeric count', async () => {
    rpc.mockResolvedValue({ data: 'oops', error: null });
    await expect(checkPlaygroundRateLimit('1.2.3.4')).rejects.toThrow();
  });
});
