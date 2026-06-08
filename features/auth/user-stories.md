# Auth, User Stories

Auth covers Supabase GitHub OAuth sign in, session handling, the mapping from a Supabase auth user to a Senix app user, and MCP personal access tokens for IDE access. CodeRabbit relies on GitHub identity too; our differentiator is a frictionless single click sign in plus first class IDE tokens.

## Story 1: New user signs in with GitHub

1. Who: A developer arriving from the landing page or pricing page.
2. What they expect: One click GitHub sign in, no password, no separate account.
3. Success: OAuth completes, the callback (`src/app/auth/callback/route.ts`) exchanges the code and ensures a row exists in `users`, and the user lands in the dashboard.
4. Failure and handling: If the OAuth exchange fails, the user is returned to login with a clear state rather than a blank or broken page.

## Story 2: Returning user keeps a fresh session

1. Who: An existing customer browsing the dashboard.
2. What they expect: Their session stays valid without surprise logouts.
3. Success: Middleware refreshes the Supabase session cookie on every non internal route and rotates cookies onto the response.
4. Failure and handling: If refresh fails, page level guards in the dashboard layout own the redirect to login; the middleware never hard blocks.

## Story 3: Developer connects an MCP capable IDE

1. Who: A Cursor, Claude Code, or Windsurf user who wants reviews inside the editor.
2. What they expect: To generate a personal access token, see it once, and paste it into their IDE config.
3. Success: The token is shown exactly once on generation, stored only as a SHA-256 hash (`features/auth/mcp-tokens.ts`), and authorizes `POST /api/mcp`.
4. Failure and handling: A lost token cannot be recovered, only revoked and regenerated; revoked tokens are rejected immediately.

## Story 4: Team member should only see their own data

1. Who: Any signed in user.
2. What they expect: To see only their installations, repositories, and analyses.
3. Success: Row level security scopes dashboard reads to the current user; the service role client is used only by trusted server paths.
4. Failure and handling: A missing or invalid session yields an empty, safe view and a redirect, never another tenant's data.

## Story 5: Internal team accesses internal tools

1. Who: The Senix team using `/internal/*` pages.
2. What they expect: Team only access separate from customer auth.
3. Success: Basic Auth gates `/internal/*` in middleware using `INTERNAL_PASSWORD`.
4. Failure and handling: If the password is unset, the gate fails open only in development convenience; production must set it. This is flagged in the quality checklist as a hardening item.
