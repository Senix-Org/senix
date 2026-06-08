# AI Engine, User Stories

The AI engine turns a code change into a behavioral summary, a risk level, fixed-vocabulary risk flags, and focus areas. It is shared by GitHub PR analysis, the MCP IDE tool, and the public playground. Our competitive bar is CodeRabbit: we must be faster to first result, cheaper per review, and at least as accurate on risk calls, while staying provider agnostic.

## Story 1: Developer wants to understand a teammate's PR fast

1. Who: A reviewer who opened a pull request authored by a teammate or an AI coding tool.
2. What they expect: A 3 sentence plain language summary of what the change actually does to behavior, not a restatement of the diff.
3. Success: The summary names the real behavioral impact (for example "adds an unauthenticated admin route"), assigns a calibrated risk level, and points to the exact files and lines that matter.
4. Failure and handling: If the model returns malformed or empty output, normalization (`llm/normalize.ts`) repairs or rejects it, the run records an error message, and the structural diff metadata is still persisted so the review is not a total loss.

## Story 2: Security minded lead wants reliable risk flags

1. Who: A tech lead who cares about auth changes, secrets, SQL injection, payment logic, and data leaks.
2. What they expect: Risk flags drawn only from the fixed taxonomy in `prompts/pr-analysis.ts`, with no invented flags and no over flagging of safe additive changes.
3. Success: A real `sql-injection` or `hardcoded-secret` change is flagged with high or medium risk; a formatting only change is flagged low with no risk flags.
4. Failure and handling: Calibration regressions are caught by the eval harness (`eval/cases`, `scripts/run-eval.ts`) before a prompt ships; the prompt changelog records every change.

## Story 3: Engineering manager wants predictable cost

1. Who: An owner of the LLM budget.
2. What they expect: Cost per review tracked and capped so a runaway PR or a loop cannot drain the account.
3. Success: Token usage and cost are recorded per analysis; when the daily cap is hit (`cost-tracker.ts`), LLM analysis is skipped and the reason is recorded instead of silently spending.
4. Failure and handling: If cost tracking is unavailable, the engine should fail safe by treating the cap as not exceeded only when it can prove the day is under budget, and otherwise record the uncertainty.

## Story 4: Platform owner wants to swap the model with zero blast radius

1. Who: An operator deciding between DeepSeek, Groq, Gemini, and Anthropic.
2. What they expect: One environment variable (`LLM_PROVIDER`) changes the provider, and every surface (PR, MCP, playground) uses it without code changes.
3. Success: All providers implement the same `LLMProvider` contract in `llm/types.ts`; call sites only use `analyzePR()`.
4. Failure and handling: An invalid `LLM_PROVIDER` value throws a clear error naming the valid options; a missing key for an unused provider does not crash startup because providers are lazily instantiated.

## Story 5: Developer pastes a diff into the public playground

1. Who: A prospect evaluating Senix before installing the GitHub App.
2. What they expect: A real review of pasted code within seconds, no signup required.
3. Success: The playground returns the same quality result as the GitHub path using the same prompt and parser.
4. Failure and handling: Rate limiting (`features/billing/playground-rate-limit.ts`) protects the endpoint; abusive volume gets a clear limit message rather than an outage.
