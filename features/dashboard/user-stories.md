# Dashboard, User Stories

The dashboard is the customer facing web surface: recent analyses, repository connection and toggles, analysis detail with structural metadata, MCP token management, feedback, and IDE connect instructions. CodeRabbit leans on the PR thread; our dashboard is a differentiator for history, search, and team visibility.

## Story 1: User reviews recent analyses

1. Who: A signed in customer.
2. What they expect: A quick list of recent PR analyses with risk at a glance.
3. Success: Recent analyses render with risk badges and relative timestamps, scoped to the user by RLS.
4. Failure and handling: An empty or errored fetch shows a friendly empty or error state, not a crash, via the route segment error and loading files.

## Story 2: User connects and toggles repositories

1. Who: A customer managing which repos Senix watches.
2. What they expect: An instant on or off toggle per repository.
3. Success: The toggle server action updates `repositories.enabled` and reflects immediately.
4. Failure and handling: A failed toggle surfaces an error and does not leave the UI in a false state.

## Story 3: User drills into one analysis

1. Who: A reviewer wanting detail.
2. What they expect: The summary, risk flags, focus areas, and structural diff metadata for one run.
3. Success: The detail page renders all stored fields including symbol level changes.
4. Failure and handling: A missing or unauthorized id renders the segment error boundary safely.

## Story 4: User manages MCP tokens from the dashboard

1. Who: An IDE user.
2. What they expect: Generate, view once, and revoke tokens.
3. Success: The token manager shows tokens, displays a new token once, and revokes on demand.
4. Failure and handling: Network errors during generate or revoke show inline feedback and do not lose existing tokens.

## Story 5: User gives feedback

1. Who: A customer in beta.
2. What they expect: A simple way to report quality issues.
3. Success: The feedback modal submits via a server action and confirms.
4. Failure and handling: A failed submission keeps the entered text and shows a retry path.
