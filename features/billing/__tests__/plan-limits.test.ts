import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Proves: a user on the free plan is blocked once they reach their monthly
 * review limit, and is allowed (with usage reserved) while under it; and the
 * repo limit is enforced the same way.
 * Failure means: free users could consume unlimited paid LLM capacity.
 */

const { maybeSingle } = vi.hoisted(() => ({ maybeSingle: vi.fn() }));

const builder: Record<string, unknown> = {};
builder.select = () => builder;
builder.update = () => builder;
builder.eq = () => builder;
builder.is = () => builder;
builder.maybeSingle = maybeSingle;

vi.mock('@features/shared/supabase', () => ({
  supabaseAdmin: { from: () => builder },
}));

import { checkReviewLimit, checkRepoLimit } from '@features/billing/plan-limits';

const now = new Date().toISOString();
function freeUser(overrides: Record<string, unknown> = {}) {
  return {
    plan: 'free',
    plan_status: 'active',
    trial_ends_at: null,
    pr_reviews_this_month: 0,
    mcp_reviews_this_month: 0,
    reviews_reset_at: now,
    repos_connected: 0,
    ...overrides,
  };
}

beforeEach(() => maybeSingle.mockReset());

describe('checkReviewLimit (free plan)', () => {
  it('blocks a free user who has reached the 30-review monthly cap', async () => {
    maybeSingle.mockResolvedValueOnce({ data: freeUser({ pr_reviews_this_month: 30 }), error: null });
    const res = await checkReviewLimit('user-1', 'pr');
    expect(res.allowed).toBe(false);
    if (!res.allowed) expect(res.reason).toMatch(/limit reached/i);
  });

  it('allows a free user under the cap and reserves usage', async () => {
    // 1st call: getUserPlan. 2nd call: the optimistic usage reservation.
    maybeSingle
      .mockResolvedValueOnce({ data: freeUser({ pr_reviews_this_month: 5 }), error: null })
      .mockResolvedValueOnce({ data: { id: 'user-1' }, error: null });
    const res = await checkReviewLimit('user-1', 'pr');
    expect(res.allowed).toBe(true);
  });
});

describe('checkRepoLimit (free plan)', () => {
  it('blocks connecting a repo when the free repo limit (1) is reached', async () => {
    maybeSingle.mockResolvedValueOnce({ data: freeUser({ repos_connected: 1 }), error: null });
    const res = await checkRepoLimit('user-1');
    expect(res.allowed).toBe(false);
  });

  it('allows connecting a repo when under the limit', async () => {
    maybeSingle.mockResolvedValueOnce({ data: freeUser({ repos_connected: 0 }), error: null });
    const res = await checkRepoLimit('user-1');
    expect(res.allowed).toBe(true);
  });
});
