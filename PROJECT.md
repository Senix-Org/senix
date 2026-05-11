# Senix Project Brief

This file is the compact handoff for agents working on Senix. It summarizes what the repo is building, how the system works, and where to look before making changes. Prefer reading this first, then open only the specific files referenced by the task.

## What Senix Is

Senix is a GitHub App that analyzes pull requests and explains the behavioral impact of code changes. The product is aimed at teams shipping with AI coding tools such as Cursor, Copilot, and Claude Code, where PR volume and code velocity make line-by-line review harder.

The core customer-facing output is a short GitHub PR comment and dashboard entry containing:

- An exactly 3-sentence behavioral summary.
- A `low`, `medium`, or `high` risk level.
- Fixed-vocabulary risk flags such as `sql-injection`, `auth-change`, `hardcoded-secret`, `payment-logic-change`, and `data-leak`.
- Up to 3 focus areas with file, line range, and reason.

The current public positioning is "AI code review for your pull requests" and "read every risk." The app is in public beta.

## Current Stack

- Framework: Next.js App Router, React 19, TypeScript.
- Styling: Tailwind CSS v4 via `src/app/globals.css`; lucide icons; framer-motion reveal components.
- Auth: Supabase Auth with GitHub provider, using `@supabase/ssr`.
- Database: Supabase Postgres with RLS for user-scoped dashboard reads.
- Queue: Upstash Redis lists.
- Worker: standalone Node/tsx process in `worker/`.
- GitHub integration: GitHub App webhooks plus installation-scoped Octokit clients.
- LLM providers: Anthropic, Gemini, Groq, and DeepSeek through a common provider interface.
- Structural parsing: tree-sitter for JavaScript, TypeScript, TSX, and Python.

Note: older docs mention Next 14, shadcn/ui, Clerk, and Anthropic as the main provider. The actual code currently uses Next 16, Supabase Auth, and configurable LLM providers with Groq default in app code and DeepSeek required by the worker env validation.

## Main Runtime Flow

1. A GitHub App webhook hits `src/app/api/webhooks/github/route.ts`.
2. The route verifies `x-hub-signature-256`, logs every delivery to `webhook_events`, and routes valid events through `src/server/handlers/index.ts`.
3. Installation events are handled by `src/server/handlers/installation.ts`.
   - Installs/upgrades upsert `installations` and `repositories`.
   - Uninstalls soft-delete by setting `installations.uninstalled_at`.
   - Suspends update `installations.suspended`.
4. Pull request events are handled by `src/server/handlers/pull-request.ts`.
   - Only `opened`, `synchronize`, and `reopened` are analyzed.
   - Disabled repos are skipped.
   - The handler upserts `pull_requests`, inserts an `analyses` row with status `queued`, and enqueues an `analyze-pr` job in Redis.
5. The worker in `worker/index.ts` polls the queue every 2 seconds.
6. `worker/handlers/analyze-pr.ts` processes jobs.
   - Skips jobs for uninstalled installations.
   - Marks the analysis `running`.
   - Fetches changed files and raw file contents from GitHub.
   - Builds tree-sitter structural diffs for supported files, capped at 50 files.
   - Calls `analyzePR()` from `src/lib/llm/index.ts`.
   - Optionally posts or updates the PR comment if `POST_PR_COMMENTS=true`.
   - Stores summary, risk, flags, focus areas, structural metadata, token usage, cost, comment IDs/URLs, and errors on the `analyses` row.

## Important Files

- `src/app/page.tsx`: marketing landing page and OAuth defensive redirect from `/`.
- `src/app/login/page.tsx`: auto-starts GitHub/Supabase OAuth through `AutoSignIn`.
- `src/app/auth/callback/route.ts`: exchanges Supabase OAuth code and ensures a row exists in `users`.
- `src/app/setup/page.tsx`: post-install GitHub App landing page; links a GitHub installation to the signed-in Supabase user.
- `src/app/dashboard/page.tsx`: customer dashboard showing recent analyses and connected repos.
- `src/app/dashboard/analysis/[id]/page.tsx`: analysis detail view, including structural diff metadata.
- `src/app/dashboard/actions.ts`: server action to toggle `repositories.enabled`.
- `src/middleware.ts`: Supabase session refresh on normal routes and Basic Auth for `/internal/*`.
- `src/app/internal/test/page.tsx`: Basic Auth internal analysis/test panel.
- `src/app/api/internal/queue/route.ts`: internal queue/failed-analysis status endpoint.
- `src/app/api/internal/requeue-failed/route.ts`: requeues failed analyses from the last 24 hours.
- `src/lib/prompts/pr-analysis.ts`: core prompt contract and risk taxonomy.
- `src/lib/llm/*`: provider adapters and the provider-agnostic analysis contract.
- `src/lib/parser.ts`, `src/lib/symbols.ts`, `src/lib/structural-diff.ts`: tree-sitter language detection, symbol extraction, and structural diffing.
- `src/lib/queue.ts`: Upstash Redis queue primitives.
- `src/server/github-diff.ts`: GitHub PR file and file-content fetch helpers.
- `src/server/github-comments.ts`: create/update Senix PR comments.
- `worker/index.ts`: worker boot, env validation, polling, heartbeat, shutdown.
- `worker/handlers/analyze-pr.ts`: main PR analysis orchestration.

## Data Model

See `docs/schema.md` and migrations in `docs/migrations/`. Current important tables:

- `users`: maps Supabase auth users to GitHub identity.
- `installations`: one row per GitHub App installation. Includes `installed_by_user_id`, `suspended`, and `uninstalled_at`.
- `repositories`: repos available to an installation. Includes `enabled` toggle.
- `pull_requests`: cached PR metadata and commit SHAs.
- `analyses`: one analysis run per PR commit. Stores status, summary, risk, focus areas, structural metadata, LLM cost, and optional GitHub comment tracking.
- `webhook_events`: audit log of every webhook delivery.

RLS is intended for user-context dashboard reads. Service-role `supabaseAdmin` bypasses RLS and is used by webhook handlers, worker, setup linking, and internal tools.

## LLM Contract

The app routes all model calls through `src/lib/llm/types.ts`:

- Input: PR metadata plus structural diff.
- Output: `summary`, `riskLevel`, `riskFlags`, `focusAreas`, `tokensUsed`, `costUsdCents`, `provider`.

Provider selection comes from `LLM_PROVIDER` in `src/lib/llm/index.ts`. Valid values are `anthropic`, `gemini`, `groq`, and `deepseek`; default is `groq` in app code. The worker currently requires `DEEPSEEK_API_KEY` and `LLM_PROVIDER` at startup.

The prompt in `src/lib/prompts/pr-analysis.ts` is strict: exactly 3 summary sentences, fixed risk flag vocabulary, no invented flags, no over-flagging additive safety changes, and risk level calibrated by blast radius rather than diff size.

## Structural Diff Behavior

Supported languages are `.js`, `.jsx`, `.ts`, `.tsx`, and `.py`.

The structural diff parser extracts functions, classes, methods, and variable declarations. It hashes normalized symbol body text to identify added, removed, modified, and unchanged symbols while ignoring whitespace-only differences. Unsupported files still count in metadata but have no symbol-level detail.

## PR Comment Behavior

`formatPRComment()` renders a Markdown comment with badges, behavioral summary, optional detected risks, optional focus-area table, and footer metadata. The worker updates the most recent prior Senix comment for the PR when possible, so repeated pushes do not spam new comments. Posting is gated by `POST_PR_COMMENTS=true`.

The dashboard URL used in comments defaults to `https://senix.vercel.app`, but the current worker builds links to `/internal/test`; this may be intentional for beta/internal testing or a TODO before customer-facing release.

## Local Commands

- Install: `npm install`
- Dev app: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Worker: `npm run worker`
- Worker watch: `npm run worker:watch`
- Eval run: `npx tsx scripts/run-eval.ts <promptVersion>`
- Eval scoring: `npx tsx scripts/score-eval.ts eval/runs/<run>.json`
- Eval comparison: `npx tsx scripts/compare-eval.ts <old-run> <new-run>`

## Environment Variables

Do not read or paste `.env` / `.env.local` unless explicitly necessary; they likely contain secrets.

Important env vars referenced by code/docs:

- Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Upstash: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- GitHub App: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`.
- LLMs: `LLM_PROVIDER`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`.
- Comments and URLs: `POST_PR_COMMENTS`, `DASHBOARD_URL`.
- Internal pages/API: `INTERNAL_PASSWORD`.
- Worker logs: `WORKER_LOG_FORMAT=json` for structured logs.

## Deployment Notes

- The web app is intended for Vercel.
- The worker is intended as a long-running Docker process, documented in `docs/worker-deploy.md`.
- The `Dockerfile` builds the worker container.
- The GitHub App setup is documented in `docs/github-app-config.md`.
- Supabase GitHub OAuth setup is documented in `docs/auth-setup.md`.

## Eval And Prompt Iteration

Evaluation fixtures live in `eval/cases/`; saved runs live in `eval/runs/`.

The human-scored rubric in `eval/rubric.md` grades each case on accuracy, specificity, risk calibration, and conciseness. `docs/prompt-changelog.md` records prompt changes. The latest documented v2 prompt improved the scored result to about 94% when excluding a network-timeout case.

## Current Git State Observed

At the time this file was created, the worktree already had modified files:

- `src/app/auth/callback/route.ts`
- `src/app/login/page.tsx`
- `src/app/page.tsx`
- `src/app/setup/page.tsx`

Treat these as user or existing work unless you know you made the changes. Do not revert them casually.

## Agent Guidance

- Start with this file, then inspect the narrow code path relevant to the task.
- For webhook/queue/worker bugs, read `src/app/api/webhooks/github/route.ts`, `src/server/handlers/*`, `src/lib/queue.ts`, and `worker/handlers/analyze-pr.ts`.
- For auth/setup/dashboard bugs, read `src/lib/supabase-server.ts`, `src/middleware.ts`, `src/app/auth/callback/route.ts`, `src/app/setup/page.tsx`, and dashboard files.
- For analysis quality, read `src/lib/prompts/pr-analysis.ts`, `src/lib/llm/*`, `src/lib/structural-diff.ts`, and eval cases.
- For schema/RLS issues, check `docs/schema.md` plus migrations before changing app queries.
- Keep changes scoped. This project has active product, infra, and prompt surfaces tightly coupled through Supabase rows and queue payloads.
