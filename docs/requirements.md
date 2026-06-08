# Requirements

This document defines what Senix must do (functional requirements) and how well it must do it (non functional requirements mapped to the seven quality criteria in `docs/quality-checklist.md`). The competitive reference is CodeRabbit: Senix must match its review usefulness while being provider agnostic, cheaper to run, and stronger on dashboard history and IDE integration.

## Functional Requirements

### Auth

1. Users sign in with GitHub via Supabase OAuth in one click.
2. Each Supabase auth user maps to exactly one row in `users`.
3. Sessions refresh automatically on normal routes.
4. Users generate, view once, and revoke MCP personal access tokens.
5. MCP tokens are stored only as SHA-256 hashes and authorize the MCP route.
6. Internal team pages are gated separately from customer auth.

### GitHub Integration

1. The app obtains installation scoped Octokit clients per installation.
2. The app fetches changed files and file contents for a PR.
3. The app posts a single Senix summary comment and updates it on later pushes.
4. Disabled repositories are skipped before any API or LLM cost.
5. Uninstalled installations stop receiving comments.

### Webhook

1. Verify `x-hub-signature-256` on every delivery.
2. Log every delivery to `webhook_events`, including invalid ones.
3. Route installation and pull request events to their handlers.
4. Only analyze pull request actions opened, reopened, and synchronize.
5. Always return 200 for valid deliveries even when a handler errors.

### Review Queue

1. Persist a queued analysis row for each analyzable PR.
2. Run analysis out of band from the webhook response.
3. Retry failed jobs up to a cap, then drop with the reason recorded.
4. Expose queue and failed analysis status to the internal team.
5. Allow requeue of failed analyses from the last 24 hours.

### AI Engine

1. Produce exactly a 3 sentence behavioral summary.
2. Assign a risk level of low, medium, or high calibrated by blast radius.
3. Emit risk flags only from the fixed taxonomy, with no invented flags.
4. Return up to 3 focus areas with file, line range, and reason.
5. Build structural diffs for JS, JSX, TS, TSX, and Python.
6. Route all model calls through one provider interface selected by `LLM_PROVIDER`.
7. Track tokens and cost per analysis and enforce a daily cost cap.
8. Serve the same contract to GitHub PR analysis, the MCP tool, and the playground.

### Dashboard

1. Show recent analyses scoped to the signed in user.
2. Show analysis detail including structural metadata.
3. Let users connect repositories and toggle them on or off.
4. Provide MCP token management UI.
5. Provide a feedback channel and IDE connect instructions.

### Billing

1. Define plans with review and repository limits.
2. Enforce review limits before analysis runs.
3. Aggregate and display usage versus limits.
4. Create Whop checkout links and apply plan changes on the verified Whop webhook.
5. Cancel memberships and update plan status.
6. Rate limit the public playground.

## Non Functional Requirements

Each maps to one or more of the seven criteria: Performance, Compatibility, Usability, Reliability, Security, Maintainability, Portability.

### Performance

1. Webhook responses return within GitHub's timeout, with heavy work deferred to the queue.
2. Time to first PR comment should target under 60 seconds for typical PRs (serverless `maxDuration=60`).
3. Per analysis LLM cost is tracked and capped daily.

### Compatibility

1. Support GitHub App webhooks and installation scoped access.
2. Support MCP clients including Cursor, Claude Code, and Windsurf.
3. Dashboard works on current evergreen browsers and is responsive.
4. Structural analysis supports the five listed languages and degrades gracefully on others.

### Usability

1. Sign in is one click; no separate password.
2. PR feedback is a single self updating comment, not comment spam.
3. The playground requires no signup.
4. Errors present friendly states, never raw stack traces to users.

### Reliability

1. If the LLM provider fails, persist structural results and record the error rather than failing the whole run.
2. If GitHub comment posting fails, the dashboard entry still exists.
3. If the primary analyze path fails, jobs remain queued and requeueable.
4. The worker drains in flight jobs on shutdown and retries transient failures with a cap.
5. Roadmap: automatic provider failover and webhook delivery id idempotency.

### Security

1. Verify GitHub and Whop webhook signatures before acting.
2. Enforce auth on every customer route and scope reads with RLS.
3. Hash MCP tokens at rest and show plaintext once.
4. Rate limit public endpoints and fail closed when limit stores are unavailable.
5. Internal pages must require a password in production.
6. Document handling of untrusted code content sent to third party LLM providers.

### Maintainability

1. Swapping the AI model is a single environment variable change with no call site edits.
2. Features are isolated; `shared` may not import from features.
3. Filenames are kebab case; imports use the `@/` and `@features/` aliases.
4. Each feature owns its components, logic, types, and tests.

### Portability

1. No hard coded infrastructure endpoints; all external services are configured by environment variables.
2. Queue, database, payment, and LLM providers sit behind interfaces or thin adapters so they can be replaced.
3. The worker and the web app share the same feature code and run in both serverless and long running containers.
