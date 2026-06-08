import { GoogleGenAI, Type, type Schema } from '@google/genai';
import { buildSystemPrompt, buildUserPrompt } from '@features/ai-engine/prompts/pr-analysis';
import {
  normalizeRiskyFiles,
  normalizeVerificationSteps,
  resolveShipDecision,
} from '@features/ai-engine/llm/normalize';
import type {
  AnalysisInput,
  AnalysisResult,
  FocusArea,
  LLMProvider,
  RiskLevel,
} from '@features/ai-engine/llm/types';

type GeminiAnalysisJson = {
  summary: string;
  risk_level: RiskLevel;
  risk_flags: string[];
  focus_areas: FocusArea[];
  ship_decision?: unknown;
  risky_files?: unknown;
  verification_steps?: unknown;
};

const MODEL = 'gemini-2.5-flash-lite';
const TEMPERATURE = 0;
const REQUEST_TIMEOUT_MS = 60_000;
const CHARS_PER_TOKEN_ESTIMATE = 4;

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: 'Exactly 3 sentences describing the behavioral change.',
    },
    risk_level: {
      type: Type.STRING,
      enum: ['low', 'medium', 'high'],
      description: 'Production-impact risk level, not diff size.',
    },
    risk_flags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Short kebab-case risk labels that apply to this PR.',
    },
    focus_areas: {
      type: Type.ARRAY,
      maxItems: '3',
      items: {
        type: Type.OBJECT,
        properties: {
          file: { type: Type.STRING },
          lines: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
        required: ['file', 'lines', 'reason'],
      },
      description: 'Up to 3 file/line ranges that deserve reviewer attention.',
    },
    ship_decision: {
      type: Type.STRING,
      enum: ['safe to ship', 'ship after checking', 'do not ship until fixed'],
      description: 'Ship recommendation, consistent with risk_level.',
    },
    risky_files: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          file: { type: Type.STRING, description: 'File path exactly as given in the diff.' },
          line_range: { type: Type.STRING, description: 'Affected lines, e.g. "20-36" or "45".' },
          symbol: {
            type: Type.STRING,
            description: 'Function, method, or class name involved, when one applies.',
          },
          what_changed: {
            type: Type.STRING,
            description: 'One sentence on what the code now does.',
          },
          why_risky: { type: Type.STRING, description: 'One sentence on the production impact.' },
          how_to_verify: {
            type: Type.STRING,
            description: 'A concrete test the developer can run.',
          },
          suggested_fix: {
            type: Type.STRING,
            description: 'The direction of a safe fix, not full code.',
          },
        },
        required: [
          'file',
          'line_range',
          'what_changed',
          'why_risky',
          'how_to_verify',
          'suggested_fix',
        ],
      },
      description: 'Files with real production risk. Empty when nothing risky was found.',
    },
    verification_steps: {
      type: Type.ARRAY,
      maxItems: '5',
      items: { type: Type.STRING },
      description: 'Up to 5 concrete checks to run before shipping. Empty for trivial changes.',
    },
  },
  required: [
    'summary',
    'risk_level',
    'risk_flags',
    'focus_areas',
    'ship_decision',
    'risky_files',
    'verification_steps',
  ],
};

/**
 * LLMProvider backed by Google's Gemini API via the @google/genai SDK.
 *
 * Uses structured-output mode (`responseMimeType: 'application/json'` plus
 * a `responseSchema`) to guarantee JSON output. Cost is reported as 0
 * because the Gemini free tier is the intended target during development.
 */
export class GeminiProvider implements LLMProvider {
  private client: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (this.client) return this.client;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('[gemini] GEMINI_API_KEY must be set to call the Gemini API');
    }
    this.client = new GoogleGenAI({ apiKey });
    return this.client;
  }

  /**
   * Send a structural diff to Gemini and return a typed behavioral analysis.
   * Throws with a `[gemini]` prefix on missing key, timeout, or schema-shape
   * violations in the model's JSON output.
   */
  async analyzePR(input: AnalysisInput): Promise<AnalysisResult> {
    const { prMeta, structuralDiff } = input;
    const userPrompt = buildUserPrompt(prMeta, structuralDiff);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let responseText: string | undefined;
    let usage: { promptTokenCount?: number; candidatesTokenCount?: number } | undefined;
    try {
      const response = await this.getClient().models.generateContent({
        model: MODEL,
        contents: userPrompt,
        config: {
          systemInstruction: buildSystemPrompt(),
          temperature: TEMPERATURE,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          abortSignal: controller.signal,
        },
      });
      responseText = response.text;
      usage = response.usageMetadata;
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        throw new Error('Gemini analysis timed out after 60s');
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`[gemini] generateContent failed: ${message}`);
    } finally {
      clearTimeout(timer);
    }

    if (!responseText) {
      throw new Error('[gemini] response contained no text content');
    }

    let parsed: GeminiAnalysisJson;
    try {
      parsed = JSON.parse(responseText) as GeminiAnalysisJson;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`[gemini] failed to parse JSON output: ${message}`);
    }

    if (
      typeof parsed.summary !== 'string' ||
      typeof parsed.risk_level !== 'string' ||
      !Array.isArray(parsed.risk_flags) ||
      !Array.isArray(parsed.focus_areas)
    ) {
      throw new Error('[gemini] JSON output was missing required fields');
    }

    const promptTokens = usage?.promptTokenCount;
    const candidateTokens = usage?.candidatesTokenCount;
    const tokensUsed =
      typeof promptTokens === 'number' && typeof candidateTokens === 'number'
        ? promptTokens + candidateTokens
        : Math.ceil((userPrompt.length + responseText.length) / CHARS_PER_TOKEN_ESTIMATE);

    return {
      summary: parsed.summary,
      riskLevel: parsed.risk_level,
      riskFlags: parsed.risk_flags,
      focusAreas: parsed.focus_areas,
      shipDecision: resolveShipDecision(parsed.ship_decision, parsed.risk_level),
      riskyFiles: normalizeRiskyFiles(parsed.risky_files),
      verificationSteps: normalizeVerificationSteps(parsed.verification_steps),
      tokensUsed,
      costUsdCents: 0,
      provider: 'gemini',
    };
  }
}
