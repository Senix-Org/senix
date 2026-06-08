import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Proves: the idempotency guard reports a delivery as duplicate only when a
 * processed row already exists for that delivery id, and fails OPEN (not a
 * duplicate) on a DB read error so real webhooks are never dropped.
 * Failure means: GitHub retries would create duplicate analyses / comments,
 * or a transient DB error would wrongly suppress a legitimate delivery.
 */

const maybeSingle = vi.fn();

vi.mock('@features/shared/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle }),
        }),
      }),
    }),
  },
}));

import { isDuplicateDelivery } from '@features/webhook/idempotency';

beforeEach(() => {
  maybeSingle.mockReset();
});

describe('isDuplicateDelivery', () => {
  it('returns true when a processed row already exists for the delivery id', async () => {
    maybeSingle.mockResolvedValue({
      data: { github_delivery_id: 'd-1', processed: true },
      error: null,
    });
    expect(await isDuplicateDelivery('d-1')).toBe(true);
  });

  it('returns false when no prior processed row exists (first delivery)', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await isDuplicateDelivery('d-new')).toBe(false);
  });

  it('fails open (returns false) when the lookup errors', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'db down' } });
    expect(await isDuplicateDelivery('d-err')).toBe(false);
  });
});
