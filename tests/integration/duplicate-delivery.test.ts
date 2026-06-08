import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * INTEGRATION (idempotency): the GitHub webhook route is hit twice with the
 * SAME x-github-delivery id. The first is routed and processed; the second
 * is recognized as a duplicate and skipped, so no second analysis (and thus
 * no double comment) is produced.
 * Proves the audit gap fix end to end at the route boundary.
 * Failure means: GitHub retries would double-review PRs and spam comments.
 */

const { verifyGithubSignature, routeEvent } = vi.hoisted(() => ({
  verifyGithubSignature: vi.fn(() => true),
  routeEvent: vi.fn(async () => 'pull_request:opened'),
}));

// webhook_events: first lookup finds nothing (not processed), second finds a
// processed row for the same delivery id.
let processedRowExists = false;

function makeQuery() {
  const obj: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'insert']) obj[m] = () => obj;
  obj.update = () => obj;
  obj.maybeSingle = () =>
    Promise.resolve({ data: processedRowExists ? { github_delivery_id: 'D1', processed: true } : null, error: null });
  obj.then = (resolve: (v: { data: null; error: null }) => unknown) => resolve({ data: null, error: null });
  return obj;
}

vi.mock('@features/webhook/signature', () => ({ verifyGithubSignature }));
vi.mock('@features/webhook/route-event', () => ({ routeEvent }));
vi.mock('@features/shared/supabase', () => ({ supabaseAdmin: { from: () => makeQuery() } }));

import { POST } from '@/app/api/webhooks/github/route';

function delivery(id: string) {
  return {
    text: async () => JSON.stringify({ action: 'opened' }),
    headers: new Headers({
      'x-hub-signature-256': 'sha256=sig',
      'x-github-delivery': id,
      'x-github-event': 'pull_request',
    }),
  } as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  process.env.GITHUB_WEBHOOK_SECRET = 'secret';
  processedRowExists = false;
  routeEvent.mockClear();
});

describe('webhook duplicate delivery', () => {
  it('routes the first delivery and dedupes the retry of the same delivery id', async () => {
    const first = await POST(delivery('D1'));
    expect(routeEvent).toHaveBeenCalledOnce();
    expect((await first.json()).ok).toBe(true);

    // Simulate the first delivery having been recorded as processed.
    processedRowExists = true;

    const second = await POST(delivery('D1'));
    const body = await second.json();
    expect(body.deduped).toBe(true);
    // routeEvent must NOT be called a second time.
    expect(routeEvent).toHaveBeenCalledOnce();
  });

  it('still rejects an invalid signature before any dedup/routing', async () => {
    verifyGithubSignature.mockReturnValueOnce(false);
    const res = await POST(delivery('D2'));
    expect(res.status).toBe(401);
    expect(routeEvent).not.toHaveBeenCalled();
  });
});
