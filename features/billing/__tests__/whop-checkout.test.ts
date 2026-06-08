import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createWhopCheckoutLink } from '@features/billing/whop';

/**
 * Proves: the Whop checkout-link builder reuses an existing matching plan's
 * checkout URL when one exists, creates a new plan and returns its URL when
 * none matches, and fails clearly when the API key is missing. The Whop HTTP
 * API is mocked via global fetch so no real network or credentials are used.
 * Failure means: paid upgrades could not be initiated, or a misconfiguration
 * would surface as an opaque error.
 */

const fetchMock = vi.fn();

function jsonResponse(payload: unknown, ok = true, status = 200) {
  return { ok, status, text: async () => JSON.stringify(payload) } as unknown as Response;
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  process.env.WHOP_API_KEY = 'whop-key';
  process.env.WHOP_COMPANY_ID = 'comp-1'; // skip the company-id lookup fetch
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.WHOP_COMPANY_ID;
});

const input = { plan: 'starter' as const, productId: 'prod_starter', redirectUrl: 'https://app/return', prefillEmail: null };

describe('createWhopCheckoutLink', () => {
  it('reuses an existing matching plan checkout URL', async () => {
    // Starter monthlyPrice is 18; the existing plan must match on price + trial.
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: [{ id: 'plan-1', renewal_price: 18, initial_price: 18, trial_period_days: 0, purchase_url: 'https://whop.com/checkout/existing' }] })
    );
    const url = await createWhopCheckoutLink(input);
    expect(url).toBe('https://whop.com/checkout/existing');
    expect(fetchMock).toHaveBeenCalledOnce(); // only the lookup, no create
  });

  it('creates a new plan and returns its checkout URL when none matches', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: [] })) // lookup: no match
      .mockResolvedValueOnce(jsonResponse({ purchase_url: 'https://whop.com/checkout/new' })); // create
    const url = await createWhopCheckoutLink(input);
    expect(url).toBe('https://whop.com/checkout/new');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Second call must be the plan creation POST.
    expect(fetchMock.mock.calls[1][1]?.method).toBe('POST');
  });

  it('throws a clear error when WHOP_API_KEY is missing', async () => {
    delete process.env.WHOP_API_KEY;
    await expect(createWhopCheckoutLink(input)).rejects.toThrow(/WHOP_API_KEY is not configured/);
  });

  it('throws when the Whop API returns an error status', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'rate limited' }, false, 429));
    await expect(createWhopCheckoutLink(input)).rejects.toThrow(/rate limited|429/);
  });
});
