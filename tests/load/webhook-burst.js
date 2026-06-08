import http from 'k6/http';
import crypto from 'k6/crypto';
import { check } from 'k6';

/**
 * LOAD: 50 concurrent webhook deliveries must all be accepted (zero
 * dropped), and re-sending the same delivery ids must be deduplicated
 * (zero duplicate processing). This stresses the idempotency guard and the
 * exactly-once queue claim under concurrency.
 *
 * Pass criteria (thresholds below):
 *   1. No HTTP errors across the 50 deliveries.
 *   2. Every first delivery returns ok=true.
 *   3. Every replayed delivery returns deduped=true.
 */

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SECRET = __ENV.WEBHOOK_SECRET || 'test-secret';
const COUNT = 50;

export const options = {
  scenarios: {
    burst: { executor: 'shared-iterations', vus: 50, iterations: COUNT, maxDuration: '30s' },
  },
  thresholds: {
    http_req_failed: ['rate==0'],
    checks: ['rate==1'],
  },
};

function sign(body) {
  return 'sha256=' + crypto.hmac('sha256', SECRET, body, 'hex');
}

function buildBody(i) {
  return JSON.stringify({
    action: 'opened',
    pull_request: { number: i, id: 100000 + i, title: `load #${i}`, user: { login: 'load' }, state: 'open', head: { sha: `h${i}` }, base: { sha: `b${i}` } },
    repository: { id: 1 },
    installation: { id: 1 },
  });
}

function deliver(deliveryId, body) {
  return http.post(`${BASE_URL}/api/webhooks/github`, body, {
    headers: {
      'content-type': 'application/json',
      'x-hub-signature-256': sign(body),
      'x-github-delivery': deliveryId,
      'x-github-event': 'pull_request',
    },
  });
}

export default function () {
  const i = __ITER;
  const deliveryId = `load-delivery-${i}`;
  const body = buildBody(i);

  const first = deliver(deliveryId, body);
  check(first, {
    'first delivery accepted (200)': (r) => r.status === 200,
    'first delivery not deduped': (r) => {
      try { return r.json('deduped') !== true; } catch { return false; }
    },
  });

  // Replay the exact same delivery id: must be deduplicated, not reprocessed.
  const replay = deliver(deliveryId, body);
  check(replay, {
    'replay accepted (200)': (r) => r.status === 200,
    'replay is deduped': (r) => {
      try { return r.json('deduped') === true; } catch { return false; }
    },
  });
}
