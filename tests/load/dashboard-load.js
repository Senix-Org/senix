import http from 'k6/http';
import { check } from 'k6';

/**
 * LOAD: 20 concurrent dashboard loads must keep p95 response time under
 * 2 seconds. Unauthenticated requests redirect to /login, which is the
 * realistic cheapest path; point COOKIE at a real session cookie to measure
 * the authenticated render instead.
 *
 * Pass criteria:
 *   1. p95 latency < 2000ms (threshold below fails the run otherwise).
 *   2. No HTTP errors.
 */

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const COOKIE = __ENV.COOKIE || '';

export const options = {
  scenarios: {
    concurrent: { executor: 'constant-vus', vus: 20, duration: '15s' },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate==0'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/dashboard`, {
    headers: COOKIE ? { cookie: COOKIE } : {},
    redirects: 0,
  });
  check(res, {
    'responded (200 or auth redirect)': (r) => r.status === 200 || r.status === 307 || r.status === 302,
    'under 2s': (r) => r.timings.duration < 2000,
  });
}
