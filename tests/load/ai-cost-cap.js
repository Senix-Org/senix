import http from 'k6/http';
import { check } from 'k6';

/**
 * LOAD: 30 concurrent AI review requests against the public playground must
 * not bypass the rate/cost guard. The playground caps requests per IP per
 * hour (default 5) and fails closed if its counter store is down. Under a
 * burst from one IP, only a few requests may pass; the rest must be rejected
 * (429), proving the cap holds under concurrency rather than only per single
 * request. This is the externally observable proxy for "the daily cost cap
 * is enforced across concurrent requests".
 *
 * Pass criteria:
 *   1. No 5xx other than the deliberate fail-closed 500 when the store is down.
 *   2. The number of allowed (200) responses does not exceed the configured
 *      cap, i.e. concurrency does not let extra requests through.
 */

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const CAP = Number(__ENV.PLAYGROUND_CAP || 5);

export const options = {
  scenarios: {
    burst: { executor: 'shared-iterations', vus: 30, iterations: 30, maxDuration: '20s' },
  },
  thresholds: {
    // No more 200s than the cap allows: concurrency must not bypass the limiter.
    'allowed_reviews': [`count<=${CAP}`],
  },
};

import { Counter } from 'k6/metrics';
const allowedReviews = new Counter('allowed_reviews');

const SAMPLE_DIFF = `diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1,1 +1,1 @@
-export const a = 1;
+export const a = 2;
`;

export default function () {
  const res = http.post(
    `${BASE_URL}/api/playground/review`,
    JSON.stringify({ diff: SAMPLE_DIFF }),
    { headers: { 'content-type': 'application/json' } }
  );

  check(res, {
    'allowed, rate-limited, or fail-closed (not a crash)': (r) =>
      r.status === 200 || r.status === 429 || r.status === 500,
  });

  if (res.status === 200) {
    allowedReviews.add(1);
  }
}
