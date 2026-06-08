# Load Tests (k6)

These are k6 scripts. They run against a RUNNING Senix instance (local or
staging), not the unit/integration suite. They are excluded from Vitest.

## Install k6

1. Windows: `winget install k6` or `choco install k6`.
2. macOS: `brew install k6`.
3. Docs: https://k6.io/docs/

## Run

Set the target base URL (defaults to http://localhost:3000) and run:

```
k6 run -e BASE_URL=http://localhost:3000 tests/load/webhook-burst.js
k6 run -e BASE_URL=http://localhost:3000 tests/load/dashboard-load.js
k6 run -e BASE_URL=http://localhost:3000 tests/load/ai-cost-cap.js
```

For the webhook burst you must also pass a valid signing secret so the
signatures verify:

```
k6 run -e BASE_URL=... -e WEBHOOK_SECRET=$GITHUB_WEBHOOK_SECRET tests/load/webhook-burst.js
```

## What each script proves

1. webhook-burst.js: 50 concurrent deliveries are all accepted (zero dropped),
   and resending the same delivery ids is deduplicated (zero duplicate
   processing). Thresholds fail the run if any delivery errors or if a
   duplicate is processed instead of deduped.
2. dashboard-load.js: 20 concurrent dashboard loads keep p95 latency under
   2 seconds.
3. ai-cost-cap.js: 30 concurrent AI review requests do not bypass the limiter.
   Requests beyond the per-IP hourly cap are rejected (429), proving the cap
   holds under concurrency rather than only per single request.

## Note on autocannon

If you prefer autocannon for a quick HTTP throughput check:

```
npx autocannon -c 20 -d 10 http://localhost:3000/dashboard
```

k6 is preferred here because these scenarios need per-request bodies,
custom headers, and threshold based pass/fail, which k6 expresses directly.
