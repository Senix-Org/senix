Senix needs three big additions, all coordinated: (1) an MCP server so IDE users (Cursor, Claude Code, Windsurf, etc.) can use Senix without GitHub, (2) updated pricing page reflecting both surfaces, (3) restructured docs with proper page-based navigation like Flutter/Stripe docs.

DESIGN PRINCIPLE:
The MCP server reuses the existing analysis pipeline — same prompt, same LLM, same risk flags. Only the input source changes. Docs become a real product reference (page-per-section, sidebar nav, scrollable content per page). Pricing acknowledges both surfaces are bundled together — no separate tiers.

CONTEXT TO READ FIRST:
1. src/lib/llm/index.ts — LLM dispatcher
2. src/lib/llm/deepseek.ts — primary provider
3. src/lib/prompts/pr-analysis.ts — the system + user prompts
4. src/lib/structural-diff.ts — diff parsing
5. src/lib/parser.ts — tree-sitter wrapper
6. src/lib/llm/types.ts — AnalysisInput, AnalysisResult shapes
7. src/app/api/internal/analyze-pr/route.ts — for understanding our serverless pattern
8. src/app/docs/page.tsx — current single-page docs
9. src/app/pricing/page.tsx — current pricing page
10. src/components/site-nav.tsx — nav for marketing pages
11. /mnt/skills/public/frontend-design/SKILL.md — follow this skill's guidance

CONVENTIONS:
- TypeScript strict, no `any` except SDK casts using `as unknown as T`
- Server components by default
- Tailwind only — dark zinc + green-500 brand palette
- Sentence case in copy
- Mobile responsive
- Use file-based routing for docs sub-pages (proper Next.js App Router structure)
- Don't change worker, queue, LLM providers, prompts, eval scripts, or existing analyze-pr route

================================================================
PART 1 — MCP SERVER
================================================================

Background on MCP:
Model Context Protocol (MCP) is Anthropic's open standard for AI tools to communicate with external services. IDEs like Cursor, Claude Code, and Windsurf can connect to MCP servers and expose their tools to the developer's AI assistant. When a developer asks their IDE's AI "review my changes," the AI can call our MCP tool, send the diff, and get back our analysis.

For our purposes: we build an HTTP-based MCP server at /api/mcp/route.ts. Cursor/Claude Code/etc. connect to this URL. They send MCP-formatted requests, we respond with MCP-formatted responses.

TASK 1 — Install MCP SDK.
Run `npm install @modelcontextprotocol/sdk`.

If the package is not available or the API is unstable, flag this and we'll handle the MCP protocol manually (it's just JSON-RPC over HTTP — not complex).

TASK 2 — Create MCP server at src/app/api/mcp/route.ts.

The server exposes one tool: `analyze_code_changes`.

Tool definition:
- name: "analyze_code_changes"
- description: "Analyze code changes and return a 3-sentence behavioral summary with risk level, detected risks, and focus areas. Use this before committing or pushing AI-generated code."
- inputSchema: {
    type: "object",
    properties: {
      changes: {
        type: "array",
        description: "Array of file changes to analyze",
        items: {
          type: "object",
          properties: {
            file_path: { type: "string", description: "Relative path to the file" },
            language: { type: "string", description: "Programming language (javascript, typescript, tsx, python)" },
            before: { type: "string", description: "File content before the change. Empty string for new files." },
            after: { type: "string", description: "File content after the change. Empty string for deletions." }
          },
          required: ["file_path", "before", "after"]
        }
      },
      context: {
        type: "string",
        description: "Optional context about the change (e.g., 'feature: adding payment processing')"
      }
    },
    required: ["changes"]
  }

The handler:
1. Authenticate via Bearer token. Each MCP user has a personal access token stored in a new `mcp_tokens` table (see TASK 4).
2. Parse the changes array. For each file, run it through the existing parser.ts and structural-diff.ts to build a FileStructuralDiff.
3. Build an AnalysisInput object matching the existing shape used by deepseek.ts (prMeta with file count, additions, deletions, etc. — fill in reasonable defaults since we don't have a real PR; use 'mcp-session' for things like author/title).
4. Call the LLM provider (use getLLMProvider() from src/lib/llm/index.ts).
5. Return the analysis as the MCP tool response.

Use MCP's JSON-RPC protocol. The route accepts POST requests with MCP-formatted JSON. Standard MCP message types to handle:
- "initialize" — return server capabilities
- "tools/list" — return the analyze_code_changes tool definition
- "tools/call" — actually run the analysis when called with name="analyze_code_changes"

If unfamiliar with MCP message shapes, reference the official MCP spec at modelcontextprotocol.io. The protocol is simple JSON-RPC 2.0.

TASK 3 — Add MCP token table.
Generate docs/migrations/006-mcp-tokens.sql:

CREATE TABLE mcp_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

ALTER TABLE mcp_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY mcp_tokens_select_self ON mcp_tokens
  FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY mcp_tokens_insert_self ON mcp_tokens
  FOR INSERT TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY mcp_tokens_update_self ON mcp_tokens
  FOR UPDATE TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

Don't run. Leave SQL file.

TASK 4 — Add MCP token management UI.
Create src/app/dashboard/mcp-tokens/page.tsx (auth-gated server component):

- Heading: "MCP access tokens"
- Subhead: "Connect Senix to your IDE. Generate a token, paste it into your IDE's MCP config."
- List of existing tokens for the user: name, masked token (sk_mcp_••••••••last4), last used, created date, "Revoke" button
- "Generate new token" button opens a modal:
  - Input: token name (e.g., "Cursor on my laptop")
  - On generate: server action creates a token, hashes it for storage, returns the plaintext token ONCE for the user to copy
  - Show plaintext token in a copy-to-clipboard field with a warning: "This is the only time you'll see this token. Copy it now."
- Instructions section below the token list with the MCP config snippet:

For Cursor users:
```json
{
  "mcpServers": {
    "senix": {
      "transport": "http",
      "url": "https://senix-chi.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_HERE"
      }
    }
  }
}
```

Server action `generateMcpToken(name)`:
- Generates random token: "sk_mcp_" + 32 random hex chars
- Hashes the token with SHA-256
- Inserts row into mcp_tokens with hashed value
- Returns plaintext token to display once

Server action `revokeMcpToken(id)`:
- Updates revoked_at to NOW() (don't delete — keep audit trail)
- The MCP route checks revoked_at IS NULL before accepting

TASK 5 — Update MCP route authentication.
Token verification in the MCP route:
1. Extract "Authorization: Bearer XXX" from request headers
2. Hash the token with SHA-256
3. Query mcp_tokens for matching token_hash where revoked_at IS NULL
4. If found, update last_used_at to NOW()
5. If not found, return 401

Use supabaseAdmin for these queries since the MCP route doesn't have a user session.

TASK 6 — Add app nav link.
In src/components/app-nav.tsx (or wherever the logged-in nav lives), add a link to "MCP tokens" pointing to /dashboard/mcp-tokens.

================================================================
PART 2 — PRICING UPDATE
================================================================

TASK 7 — Update src/app/pricing/page.tsx.

Keep the existing three-tier structure but update messaging to reflect bundled GitHub + MCP access:

- Add a subhead under the main heading: "One subscription. GitHub PR reviews + IDE integration via MCP."

- Update each tier's feature list:

Hobby ($9/mo):
- Up to 3 repos
- 50 PR analyses per month  
- MCP integration for IDEs
- 100 MCP analyses per month
- Community support

Team ($49/mo) — MOST POPULAR:
- Up to 10 repos
- 500 PR analyses per month
- MCP integration for IDEs
- 1,000 MCP analyses per month
- Email support
- Priority response

Pro ($199/mo):
- Unlimited repos
- 5,000 PR analyses per month
- MCP integration for IDEs
- 10,000 MCP analyses per month
- Priority support
- Custom risk flag configuration (coming soon)

Add a section below the cards: "What's the difference between PR and MCP analyses?"
Short explanation: "PR analyses run automatically when you open or update a pull request. MCP analyses run on-demand when you ask your IDE's AI (Cursor, Claude Code, Windsurf) to review your changes. Both use the same prompt and risk taxonomy."

================================================================
PART 3 — RESTRUCTURED DOCS
================================================================

TASK 8 — Convert docs from single-page to multi-page with sidebar nav.

Current /docs is one long scrollable page. New structure: each section is a SEPARATE PAGE under /docs/. Clicking a sidebar link routes to a new page. Each page is independently scrollable. Nav state persists across pages.

File structure:
- src/app/docs/layout.tsx — shared layout with sidebar (left) + content area (right)
- src/app/docs/page.tsx — landing page for /docs (the "Getting started" intro)
- src/app/docs/installation/page.tsx — Installing the GitHub App
- src/app/docs/how-it-works/page.tsx — How Senix analyzes PRs
- src/app/docs/risk-flags/page.tsx — Risk flag reference
- src/app/docs/mcp/page.tsx — MCP setup for IDEs
- src/app/docs/configuration/page.tsx — Configuration
- src/app/docs/troubleshooting/page.tsx — Troubleshooting
- src/app/docs/faq/page.tsx — FAQ
- src/app/docs/api/page.tsx — API reference (placeholder)

Layout structure (src/app/docs/layout.tsx):
- Top: existing SiteNav
- Below: two-column layout
  - Left sidebar (sticky, fixed width 240px on desktop, hidden on mobile with hamburger toggle):
    - Section groups with headings:
      - GETTING STARTED
        - Introduction (links to /docs)
        - Installation (links to /docs/installation)
      - USAGE
        - How it works (links to /docs/how-it-works)
        - Risk flags (links to /docs/risk-flags)
        - MCP for IDEs (links to /docs/mcp)
      - REFERENCE
        - Configuration (links to /docs/configuration)
        - Troubleshooting (links to /docs/troubleshooting)
        - FAQ (links to /docs/faq)
        - API (links to /docs/api)
    - Active link styling: text-green-400, others text-zinc-400 hover:text-zinc-100
    - Use `usePathname()` from next/navigation to determine active link (this requires a 'use client' wrapper for the sidebar — pull the sidebar into its own client component)
  - Right content area: each page renders its content here. The content area is independently scrollable (overflow-y-auto, max-height of viewport minus nav).

Page styling:
- H1 at the top of each page: text-4xl font-bold
- H2 for major sections within the page: text-2xl font-semibold mt-12 mb-4
- H3 for sub-sections: text-xl font-semibold mt-8 mb-3
- Body: text-zinc-300 leading-relaxed
- Code blocks: bg-zinc-900 border border-zinc-800 rounded-md p-4 font-mono text-sm overflow-x-auto
- Inline code: bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono
- Tables: full-width with subtle borders, alternating row colors

Content for each page:

DOCS LANDING (/docs/page.tsx) — Getting started:
- H1: "Welcome to Senix"
- Intro paragraph: Senix is an AI code reviewer for teams shipping with AI tools. We post 3-sentence behavioral summaries with risk levels on every pull request, and integrate directly with IDEs via MCP.
- Two cards side by side: "Install on GitHub" (links to /docs/installation) and "Connect to your IDE" (links to /docs/mcp)
- "What you can do with Senix" — bulleted list:
  - Automatic PR reviews within 30 seconds
  - Risk-tagged summaries (8 risk categories)
  - IDE integration for instant feedback
  - Works with JavaScript, TypeScript, Python (more languages coming)

INSTALLATION (/docs/installation/page.tsx):
- H1: "Installing the GitHub App"
- Step-by-step with sub-headings:
  1. Sign in to Senix at senix-chi.vercel.app
  2. Click "Install GitHub App"
  3. Choose where to install (personal account or organization)
  4. Select repositories (all repos, or specific ones)
  5. Authorize permissions
  6. Confirmation page
- "Required permissions" subsection with table:
  - read: code metadata — Why: To understand what files changed in PRs
  - read & write: pull requests — Why: To post review comments
- "Revoking access" subsection: Step-by-step uninstall instructions

HOW IT WORKS (/docs/how-it-works/page.tsx):
- H1: "How Senix analyzes pull requests"
- The pipeline (with a visual diagram suggestion as a comment for later): webhook → fetch PR diff → tree-sitter parse → structural diff → LLM analysis → comment posted
- "What is a structural diff?" — explain that we don't just compare text lines, we extract symbols (functions, classes, methods) and compare those
- "Supported languages" table: JavaScript ✓, TypeScript ✓, TSX ✓, Python ✓, Go (coming soon), Rust (coming soon)
- "What we send to the LLM" — be honest: function signatures, structural changes, removed/added symbols. NOT raw file contents.
- "Average latency" subsection: 20-40 seconds typical, up to 60 seconds for large PRs

RISK FLAGS (/docs/risk-flags/page.tsx):
- H1: "Risk flag reference"
- Intro: "Senix uses a fixed taxonomy of 8 risk flags. This page documents each one with examples."
- For each flag, a section with:
  - H2: the flag name as a code chip
  - "What it catches" paragraph
  - "Example" code block showing a triggering pattern
  - "Severity" — High / Medium / Low default

The 8 flags with examples (write real code examples, not Lorem Ipsum):
- sql-injection: Raw user input concatenated into SQL queries (High)
- auth-change: Modification of auth/authorization checks (High)
- removed-validation: Validation logic was removed (High)
- hardcoded-secret: API key/token in source (High)
- new-external-api: New outbound HTTP call (Medium)
- dependency-added: New npm package import (Medium)
- payment-logic-change: Money/price/discount logic changed (High)
- data-leak: Sensitive data exposed to unauthorized parties (High)

MCP (/docs/mcp/page.tsx):
- H1: "MCP integration for IDEs"
- Intro: "Senix integrates with any MCP-compatible IDE. Use it in Cursor, Claude Code, Windsurf, and others."
- "What is MCP?" — brief explanation
- "Setup" — step-by-step:
  1. Sign in to senix-chi.vercel.app
  2. Go to Dashboard → MCP tokens
  3. Click "Generate new token"
  4. Copy the token
  5. Add it to your IDE's MCP config (show snippets for Cursor, Claude Code, Windsurf)
- "How to use it in your IDE":
  - Ask your IDE's AI: "Review my changes with Senix" or "Check this code for risks"
  - The AI will call Senix's analyze_code_changes tool
  - You'll see the 3-sentence summary, risk level, and focus areas in your chat
- "Differences from the GitHub bot":
  - MCP runs on-demand (you ask) vs GitHub bot runs automatically (on PR open)
  - MCP works on uncommitted changes vs GitHub bot needs a PR
  - Both use the same prompt and risk taxonomy

CONFIGURATION (/docs/configuration/page.tsx):
- H1: "Configuration"
- "Managing connected repos" — how to enable/disable from dashboard
- "Managing MCP tokens" — how to view, revoke, regenerate
- "Notification settings" — coming soon placeholder
- "Risk threshold customization" — coming soon placeholder
- "Uninstalling Senix" — both GitHub App removal and account deletion

TROUBLESHOOTING (/docs/troubleshooting/page.tsx):
- H1: "Troubleshooting"
- Common issues as sub-sections, each with cause + fix:
  - "My PR didn't get a comment"
  - "The bot comment didn't update on a new push"
  - "I got an unexpected risk level"
  - "MCP tool not appearing in my IDE"
  - "MCP returns Unauthorized"
  - "Analysis took longer than 60 seconds"

FAQ (/docs/faq/page.tsx):
- H1: "Frequently asked questions"
- Q/A format:
  - Is Senix free?
  - Does Senix store my code?
  - What data does Senix collect?
  - Can I self-host Senix?
  - What LLM does Senix use?
  - How accurate is Senix?
  - How does Senix differ from GitHub Copilot's review feature?
  - Can I customize the risk flags?
  - Is there an API?

API (/docs/api/page.tsx):
- H1: "API reference"
- Placeholder: "Coming soon."
- "What we're planning:" bullet list of intended endpoints

================================================================
PART 4 — VERIFICATION
================================================================

TASK 9 — Verify everything builds.
Run `npx tsc --noEmit` and `npm run build`. Report results.

================================================================
OUTPUT REQUIREMENTS
================================================================

- Show each new file in full
- Show each modified file in full (not diffs)
- If MCP SDK is unstable or API differs from spec, FLAG and we handle JSON-RPC manually
- Don't change worker, queue, LLM providers, prompts, eval scripts, or RLS migrations from previous days
- Don't change the GitHub bot pipeline or analyze-pr route
- Don't change marketing pages other than pricing
- Test the MCP route logic by adding a small comment showing what an example MCP request/response looks like
- Make sure docs sidebar nav highlights the current page correctly using usePathname()