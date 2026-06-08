import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Proves: the daily cost cap correctly sums today's spend and reports when
 * the cap is exceeded, so the worker can skip LLM calls and stop runaway
 * spend.
 * Failure means: a loop or abuse could drain the LLM budget unbounded.
 */

const gte = vi.fn();

vi.mock('@features/shared/supabase', () => ({
  supabaseAdmin: {
    from: () => ({ select: () => ({ gte }) }),
  },
}));

import { isOverDailyCostCap, getTodayCostCents, DAILY_COST_CAP_CENTS } from '@features/ai-engine/cost-tracker';

beforeEach(() => gte.mockReset());

describe('cost cap enforcement', () => {
  it('sums cost across analyses, treating null cost as 0', async () => {
    gte.mockResolvedValue({ data: [{ cost_usd_cents: 100 }, { cost_usd_cents: null }, { cost_usd_cents: 50 }], error: null });
    expect(await getTodayCostCents()).toBe(150);
  });

  it('reports under cap when spend is below the limit', async () => {
    gte.mockResolvedValue({ data: [{ cost_usd_cents: DAILY_COST_CAP_CENTS - 1 }], error: null });
    expect(await isOverDailyCostCap()).toBe(false);
  });

  it('reports over cap when spend exceeds the limit (review must be rejected)', async () => {
    gte.mockResolvedValue({ data: [{ cost_usd_cents: DAILY_COST_CAP_CENTS + 1 }], error: null });
    expect(await isOverDailyCostCap()).toBe(true);
  });

  it('throws on a DB error so the caller does not silently keep spending blind', async () => {
    gte.mockResolvedValue({ data: null, error: { message: 'db down' } });
    await expect(getTodayCostCents()).rejects.toThrow(/Failed to load/);
  });
});
