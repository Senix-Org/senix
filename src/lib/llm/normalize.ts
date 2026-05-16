import type { RiskLevel, RiskyFile, ShipDecision } from '@/lib/llm/types';

/**
 * Shared coercion helpers for the shipping-brief fields (ship decision,
 * risky files, verification steps).
 *
 * Providers disagree on JSON casing: Anthropic and Gemini emit snake_case
 * (`ship_decision`, `risky_files`), while Groq and DeepSeek emit camelCase
 * (`shipDecision`, `riskyFiles`). These helpers accept either casing and
 * return the canonical camelCase shape used by `AnalysisResult`, so each
 * provider can hand its raw parsed JSON straight through. They also guard
 * against missing or malformed fields, since the model can omit them.
 */

const SHIP_DECISIONS: ShipDecision[] = [
  'safe to ship',
  'ship after checking',
  'do not ship until fixed',
];

const MAX_VERIFICATION_STEPS = 5;

/**
 * Resolve the model's ship decision. When the model omits the field or
 * returns an unrecognized value, fall back to a decision derived from the
 * overall risk level so the response always carries a recommendation.
 */
export function resolveShipDecision(raw: unknown, riskLevel: RiskLevel): ShipDecision {
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase();
    const match = SHIP_DECISIONS.find((decision) => decision === normalized);
    if (match) return match;
  }

  if (riskLevel === 'high') return 'do not ship until fixed';
  if (riskLevel === 'medium') return 'ship after checking';
  return 'safe to ship';
}

/** Read the first non-empty string value across a set of candidate keys. */
function pickString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

/**
 * Coerce the model's `riskyFiles` / `risky_files` array into typed
 * `RiskyFile` entries. Entries without a file path are dropped.
 */
export function normalizeRiskyFiles(raw: unknown): RiskyFile[] {
  if (!Array.isArray(raw)) return [];

  const files: RiskyFile[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;

    const file = pickString(obj, 'file', 'file_path', 'filePath');
    if (!file) continue;

    const symbol = pickString(obj, 'symbol');
    files.push({
      file,
      lineRange: pickString(obj, 'lineRange', 'line_range'),
      ...(symbol ? { symbol } : {}),
      whatChanged: pickString(obj, 'whatChanged', 'what_changed'),
      whyRisky: pickString(obj, 'whyRisky', 'why_risky'),
      howToVerify: pickString(obj, 'howToVerify', 'how_to_verify'),
      suggestedFix: pickString(obj, 'suggestedFix', 'suggested_fix'),
    });
  }
  return files;
}

/**
 * Coerce the model's `verificationSteps` / `verification_steps` array into
 * a trimmed list of non-empty strings, capped at five entries.
 */
export function normalizeVerificationSteps(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((step): step is string => typeof step === 'string' && step.trim().length > 0)
    .map((step) => step.trim())
    .slice(0, MAX_VERIFICATION_STEPS);
}
