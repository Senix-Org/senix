# GitHub Integration, User Stories

GitHub integration owns the outbound side of the GitHub App: installation scoped Octokit clients (`github-app.ts`), fetching PR files and file contents (`github-diff.ts`), and creating or updating Senix PR comments (`github-comments.ts`). CodeRabbit posts rich inline review comments; our near term parity goal is a clean, single, self updating summary comment, with inline comments as a roadmap item.

## Story 1: Org admin installs the GitHub App

1. Who: A repository or organization admin.
2. What they expect: To pick repositories and have Senix start analyzing new PRs automatically.
3. Success: Installation events create installation and repository rows, and an installation scoped Octokit client can read diffs.
4. Failure and handling: If the private key or app id is misconfigured, the failure surfaces in logs with a clear message rather than silently never posting.

## Story 2: Reviewer gets a comment on the PR, not just in a dashboard

1. Who: Anyone viewing the pull request on GitHub.
2. What they expect: A concise Senix comment with the summary, risk badge, and focus areas.
3. Success: The comment is posted when `POST_PR_COMMENTS=true`, and repeated pushes update the existing comment instead of spamming new ones.
4. Failure and handling: A comment post failure is recorded in `error_message` but never fails the whole analysis; the dashboard entry still exists.

## Story 3: Large PR still gets analyzed safely

1. Who: A team shipping a big refactor.
2. What they expect: Senix to handle many changed files without timing out or exploding cost.
3. Success: File content fetches are scoped to the structural diff cap, and the engine degrades gracefully past the cap.
4. Failure and handling: If GitHub rate limits or returns partial data, the run records what it could and reports the limitation.

## Story 4: Repo is disabled and should be skipped

1. Who: A user who toggled a repository off.
2. What they expect: No analysis and no comments for that repository.
3. Success: Disabled repositories are skipped before any GitHub API calls or LLM spend.
4. Failure and handling: A stale enabled flag is corrected on the next installation sync.

## Story 5: App is uninstalled

1. Who: An admin removing Senix.
2. What they expect: Senix stops working immediately and retains no active access.
3. Success: Uninstall soft deletes the installation, and queued jobs for that installation are skipped at processing time.
4. Failure and handling: Any in flight job checks `uninstalled_at` before posting, so a removed customer never receives a late comment.
