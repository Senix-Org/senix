# Senix MCP And Product Improvements

Goal: make Senix MCP simple enough that a non-technical user can configure it and get value by typing a natural request like "Senix, review my changes."

Product standard: Senix is not just a code review bot. Senix is an AI change inspector. It should tell teams what the AI changed, whether the change matches the intended work, where the risky parts are, and what must be verified before shipping to production.

## The Senix Standard

Every Senix analysis should produce a shipping brief:

1. Change clarity: explain what changed in human language across all touched files.
2. Intent check: compare the change against the user's stated intent and call out unrelated behavior changes.
3. Risk evidence: show exact file, line range, function or symbol, and the pattern that caused concern.
4. Verification path: tell the developer what to test manually or with automation.
5. Ship decision: give a clear recommendation such as "safe to ship", "ship after checking X", or "do not ship until X is fixed".

This is the core difference from normal review tools. Senix should not stop at "possible issue in this file." It should say where the concern is, why it matters, how to prove it, and what a safe fix should preserve.

Example stronger output:

```text
Risk found in js/supabase.js:20-36

What changed:
The new updateUnits method writes inventory counts directly to Supabase.

Why this is risky:
The units value is accepted from callers without checking that it is a number, non-negative, and within expected inventory limits.

How to verify:
Try calling updateUnits("A+", -20) or updateUnits("A+", "abc"). If Supabase accepts it, inventory data can become invalid.

Suggested fix:
Validate units before writing. Reject non-numeric, negative, or unrealistic values.
```

North star promise:

> Every AI-generated change should come with a shipping brief.

## 1. Make Setup Obvious

- Add dashboard buttons for each IDE: Cursor, Antigravity, Claude Code, and Windsurf.
- Generate the MCP token and show a copy-ready config snippet for the selected IDE.
- Use one clear default server name: `senix`.
- Add a dashboard "Test connection" flow that confirms whether the MCP server is reachable.
- Show the expected successful tool list: exactly `analyze_code_changes`.
- Document exact config file locations per IDE.
- Add common setup mistakes:
  - Missing `Bearer` before the token.
  - Wrong server name.
  - Revoked or copied-wrong token.
  - IDE needs a full restart.
  - Another MCP server is being confused with Senix.

## 2. Improve Tool Discoverability

Right now Senix exposes one technically correct tool, `analyze_code_changes`, but that name is not as natural as the way users talk.

Expose kid-obvious tool aliases that all route to the same backend:

- `review_my_changes`
- `check_code_risks`
- `review_before_commit`
- `analyze_code_changes`

This helps IDE agents choose Senix when users say things like:

- "Use Senix to review my changes."
- "Check this before I commit."
- "Find risks in my code."
- "Review my AI-generated changes."

## 3. Strengthen Tool Descriptions

MCP clients use tool names and descriptions to decide when to call a tool. The description should be explicit and directive.

Suggested description:

> Use this tool whenever the user asks Senix to review code, check changes, review before commit, find risky code, inspect AI-generated code, or check a git diff. It returns a 3-sentence behavioral summary, risk level, detected risk flags, and focus areas.

## 4. Make Output Feel Productized

Return friendly, predictable text in addition to structured MCP content.

Suggested output shape:

```text
Senix reviewed 5 changed files.

Overall risk: HIGH

What changed:
- auth.ts: changed login/session validation
- billing.ts: updated discount calculation
- api/users.ts: added a user export endpoint
- dashboard.tsx: changed table rendering
- styles.css: visual-only updates

Behavioral summary:
...

Files needing review:
1. billing.ts: payment-logic-change
   Discount logic now applies before tax, which may change final totals.

2. api/users.ts: data-leak
   New export endpoint may expose email addresses without an admin check.

Checked but low concern:
- dashboard.tsx: UI-only rendering change
- styles.css: styling-only change
```

Keep the structured content fields stable:

- `summary`
- `riskLevel`
- `riskFlags`
- `focusAreas`

Add richer MCP/dashboard fields over time:

- `filesReviewed`
- `fileSummaries`
- `riskyFiles`
- `checkedLowConcernFiles`
- `verificationSteps`
- `shipDecision`

GitHub PR comments can stay concise, but MCP and dashboard views should provide more detail because the user is actively inspecting AI-generated work.

## 5. Make Risks Actionable

For every important risk, Senix should show:

- Exact file and line range.
- Function, method, class, or symbol when available.
- What changed.
- Why it is risky in production behavior.
- How to verify the problem.
- Suggested fix direction or guardrails.

This makes Senix harder to replace with a generic coding agent. The value is not just "there may be a risk"; it is actionable proof tied to the diff.

## 6. Add Better First-Run Debugging

The setup docs should include a test prompt:

```text
List the tools from the Senix MCP server only.
```

Expected result:

```text
analyze_code_changes
```

Then a second prompt:

```text
Use Senix to review my current uncommitted changes.
```

If the user sees unrelated tools like `create_project`, `generate_screen_from_text`, or `edit_screens`, they are connected to the wrong MCP server.

## 7. Ideal User Experience

1. User opens the Senix dashboard.
2. User clicks "Connect your IDE."
3. User chooses Cursor, Antigravity, Claude Code, or Windsurf.
4. Senix generates a token and config snippet.
5. User pastes the snippet and restarts the IDE.
6. User types: "Senix, review my changes."
7. The IDE calls Senix through MCP without manual prompting.
8. Senix returns a shipping brief: files reviewed, what changed, risk level, 3-sentence summary, risk flags, focus areas, verification steps, and ship decision.
