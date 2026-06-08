# Quality Checklist

This tracks seven quality criteria for every feature. Status legend: Pass means implemented and adequate, Partial means present but with gaps, Gap means missing or weak. This is a living document; update it with each feature change.

The seven criteria:

1. Performance: speed and resource usage.
2. Compatibility: GitHub, browsers, environments.
3. Usability: zero friction for developers.
4. Reliability: graceful failure if Supabase, the LLM provider, or GitHub is down (queue, retry, notify).
5. Security: webhook signature verification, input sanitization, auth checks on every route, rate limiting.
6. Maintainability: can swap the AI model without breaking anything else.
7. Portability: no hard coded infrastructure assumptions.

## Auth

1. Performance: Pass. Session refresh runs in middleware; token lookups are single hashed reads.
2. Compatibility: Pass. Standard GitHub OAuth via Supabase; works across browsers.
3. Usability: Pass. One click GitHub sign in; MCP tokens shown once with copy.
4. Reliability: Partial. Page guards handle session failures, but there is no explicit user facing notice when Supabase auth is down.
5. Security: Partial. RLS scopes reads and tokens are hashed, but `/internal/*` fails open when `INTERNAL_PASSWORD` is unset. Harden for production.
6. Maintainability: Pass. Auth is isolated from analysis logic.
7. Portability: Partial. Tied to Supabase Auth; provider swap would be non trivial.

## GitHub Integration

1. Performance: Partial. File content fetched per file; large PRs are capped but could batch better.
2. Compatibility: Pass. Uses official Octokit and GitHub App model.
3. Usability: Pass. Self updating single comment avoids noise.
4. Reliability: Pass. Comment failures are recorded and never fail the analysis; uninstall is checked before posting.
5. Security: Pass. Installation scoped tokens; no broad PAT.
6. Maintainability: Pass. Clean client and comment helpers.
7. Portability: Pass. No host specific assumptions beyond GitHub itself.

## Webhook

1. Performance: Pass. Verifies, logs, and returns fast; heavy work is deferred.
2. Compatibility: Pass. Standard GitHub webhook contract.
3. Usability: Not user facing.
4. Reliability: Partial. Always returns 200 to avoid retry storms, and events are logged, but there is no idempotency guard on delivery id yet.
5. Security: Pass. Signature verified before processing; invalid deliveries logged and rejected.
6. Maintainability: Pass. Routing is a simple switch; handlers are separated.
7. Portability: Pass. No infra assumptions in routing.

## Review Queue

1. Performance: Pass. Decouples webhook from analysis; serverless trigger is primary.
2. Compatibility: Pass. Upstash REST works in serverless and long running contexts.
3. Usability: Not user facing; internal status route exists.
4. Reliability: Partial. Retry with cap and graceful drain exist; dual path (serverless plus Redis fallback) needs clear ownership to avoid double processing.
5. Security: Partial. Internal routes are Basic Auth gated; queue payloads are trusted internally.
6. Maintainability: Pass. Queue primitives are small and isolated.
7. Portability: Partial. Tied to Upstash Redis; would need an adapter for another queue.

## AI Engine

1. Performance: Partial. Single LLM call per analysis; no caching of repeated diffs yet.
2. Compatibility: Pass. Supports JS, JSX, TS, TSX, and Python structurally; other files counted in metadata.
3. Usability: Pass. Output contract is consistent across PR, MCP, and playground.
4. Reliability: Partial. Output normalization and a daily cost cap exist; there is no automatic provider failover yet.
5. Security: Partial. Prompt is constrained, but untrusted code content goes to a third party model; document data handling.
6. Maintainability: Pass. One env var swaps providers behind a shared interface; this is the strongest criterion here.
7. Portability: Pass. Provider agnostic by design.

## Dashboard

1. Performance: Pass. Server components with route level loading and error states.
2. Compatibility: Pass. Modern browsers; responsive nav.
3. Usability: Pass. History, detail, toggles, and tokens in one place.
4. Reliability: Pass. Per segment error and loading boundaries.
5. Security: Pass. RLS scoped reads; server actions check the session.
6. Maintainability: Pass. Components colocated with the feature.
7. Portability: Pass. No infra assumptions beyond Supabase reads.

## Billing

1. Performance: Pass. Usage aggregation is read mostly.
2. Compatibility: Pass. Whop hosted checkout.
3. Usability: Partial. Limits enforced; clearer in product upgrade prompts would help.
4. Reliability: Partial. Plan reconciles on webhook; delayed webhooks create a temporary mismatch window.
5. Security: Partial. Whop signature verified; playground rate limit should fail closed when its store is down.
6. Maintainability: Pass. Plan limits centralized.
7. Portability: Partial. Tied to Whop as the payment provider.

## Cross Cutting Gaps To Address Next

1. Idempotency on webhook delivery id.
2. Provider failover in the AI engine (retry across providers in `analyzePR`).
3. Fail closed behavior for `/internal/*` and playground rate limiting in production.
4. Clear ownership between the serverless analyze path and the Redis worker to prevent double processing.
5. Documented data handling for untrusted code sent to LLM providers.
6. Per feature automated tests (see the `__tests__` placeholders to be added per feature).
