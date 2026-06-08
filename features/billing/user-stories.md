# Billing, User Stories

Billing owns plans and limits (`plan-limits.ts`), usage aggregation (`billing-usage.ts`), the Whop payment integration (`whop.ts`), checkout and cancel routes, the Whop webhook, and playground rate limiting. To beat CodeRabbit on adoption we need transparent usage, predictable limits, and frictionless upgrade.

## Story 1: Free user hits the review limit

1. Who: A user on the free plan.
2. What they expect: Clear communication when they reach the monthly review cap.
3. Success: `checkReviewLimit` enforces the cap before analysis runs, and the dashboard shows usage versus limit.
4. Failure and handling: At the cap, new PRs are not analyzed and the user is prompted to upgrade rather than silently ignored.

## Story 2: User upgrades to a paid plan

1. Who: A user ready to pay.
2. What they expect: A smooth checkout and immediate access to the higher limit.
3. Success: The checkout route creates a Whop checkout link for the selected plan; on payment the Whop webhook updates the user's plan and status.
4. Failure and handling: If the webhook is delayed, the user's plan reconciles on the next webhook; checkout failures show a clear error.

## Story 3: User cancels

1. Who: A paying user who wants to stop.
2. What they expect: A clean cancel that respects the remaining paid period.
3. Success: The cancel route calls Whop to cancel the membership and updates plan status.
4. Failure and handling: A failed cancel call surfaces an error and does not falsely mark the account canceled.

## Story 4: Repo connection limit is enforced

1. Who: A user connecting many repositories.
2. What they expect: To know when they exceed their plan's repo allowance.
3. Success: `checkRepoLimit` and `syncReposConnected` keep the connected count aligned with the plan on installation events.
4. Failure and handling: Over limit repos are handled per plan policy rather than causing analysis failures elsewhere.

## Story 5: Playground abuse is contained

1. Who: An anonymous visitor or a script hammering the public playground.
2. What they expect (we expect): Fair access without enabling abuse.
3. Success: `playground-rate-limit.ts` limits requests per client and returns a clear limit response.
4. Failure and handling: If the rate limit store is unavailable, the endpoint should fail closed for anonymous traffic to protect cost, which is tracked as a hardening item.

## Story 6: Whop sends a forged or replayed webhook

1. Who: An attacker targeting the billing webhook.
2. What they expect (we expect): Rejection.
3. Success: `verifyWhopSignature` validates the payload before any plan change.
4. Failure and handling: Invalid signatures are rejected and logged; no plan is changed.
