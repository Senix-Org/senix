# GitHub App Configuration
   
   ## Identity
   - **App name:** [Project Name] (must be globally unique on GitHub)
   - **Homepage URL:** https://[name].vercel.app
   - **Description:** Translates AI-generated pull requests into plain-English behavioral summaries.
   
   ## URLs
   - **Webhook URL:** https://[name].vercel.app/api/webhooks/github
   - **Callback URL (OAuth):** https://[name].vercel.app/api/auth/github/callback
   - **Setup URL (post-install):** https://[name].vercel.app/setup
   
   ## Permissions (Repository)
   - Contents: Read (to fetch PR diffs)
   - Pull requests: Read & Write (to read PRs and post comment summaries)
   - Metadata: Read (mandatory)
   - Checks: Read & Write (to surface analysis as a check run — Day 11+)
   
   ## Permissions (Account)
   - Email addresses: Read (for account linking)
   
   ## Subscribed Events
   - Pull request
   - Pull request review
   - Installation
   - Installation repositories
   
   ## Where can this GitHub App be installed?
   - Any account (so external users can install it later)