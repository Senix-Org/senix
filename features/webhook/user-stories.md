# Webhook, User Stories

The webhook feature is the inbound entry point for GitHub events. It verifies signatures (`signature.ts`), logs every delivery to `webhook_events`, and routes events (`route-event.ts`) to installation and pull request handlers. Reliability and security here directly determine whether reviews ever happen.

## Story 1: GitHub delivers a pull_request event

1. Who: GitHub, on PR opened, reopened, or synchronize.
2. What they expect: A fast 200 response and the review work to happen asynchronously.
3. Success: The handler verifies the signature, upserts the pull request, inserts a queued analysis row, and triggers analysis without blocking the response.
4. Failure and handling: Even if a handler throws, the route returns 200 so GitHub does not retry endlessly on our bugs; the error is logged and stored.

## Story 2: An attacker forges a webhook

1. Who: A malicious sender hitting the public endpoint.
2. What they expect (we expect): The request to be rejected.
3. Success: `x-hub-signature-256` is verified with a constant time comparison against `GITHUB_WEBHOOK_SECRET`; invalid signatures get 401 and are logged with `signature_valid=false`.
4. Failure and handling: Even rejected deliveries are recorded for audit before the 401 is returned.

## Story 3: A duplicate delivery arrives

1. Who: GitHub, retrying a delivery.
2. What they expect: No duplicate analyses or duplicate comments.
3. Success: Delivery ids are recorded, and the comment upsert logic updates the prior comment rather than creating a new one.
4. Failure and handling: This is a known hardening area; the checklist tracks idempotency on delivery id as an improvement.

## Story 4: An unsupported event type arrives

1. Who: GitHub, sending events we do not act on.
2. What they expect: A clean ignore.
3. Success: `route-event.ts` returns `ignored:<type>` and the event is still logged.
4. Failure and handling: No crash, no wasted LLM spend.

## Story 5: The downstream analyzer is momentarily unavailable

1. Who: The system under load or partial outage.
2. What they expect: The event is not lost.
3. Success: The analysis row is persisted as queued, and the Redis worker fallback can pick up jobs if the serverless trigger fails.
4. Failure and handling: Failed analyses can be requeued from the last 24 hours via the internal requeue route and script.
