import { GoogleGenerativeAI } from '@google/generative-ai';
import type { z } from 'zod';
import { getEnvConfig } from '../../config/env';
import { textModel } from '../../config/geminiModels';
import { schemaInstruction } from './schemaPrompt';
import { recordAiCall } from './aiCallLog';

/** Max extra model calls spent repairing a response that failed schema validation. */
export const MAX_SCHEMA_REPAIRS = 2;

function summarizeIssues(issues: z.ZodIssue[]): string {
  return issues
    .slice(0, 15)
    .map((i) => `- ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
}

/**
 * The model is only steered by prompt text (no response schema is sent), so strict schemas — minimum
 * list lengths, closed enums, required keys — fail intermittently on perfectly reasonable output and
 * took down the whole campaign generation on the first failure. On a validation failure the model is
 * shown its own response and the exact errors and asked once or twice for a corrected full object; a
 * response that still does not validate is an error, never accepted.
 */
export async function generateValidatedJson<T>(
  callModel: (prompt: string) => Promise<string>,
  prompt: string,
  schema: z.ZodType<T>,
  maxRepairs: number = MAX_SCHEMA_REPAIRS,
  meta: { model?: string } = {}
): Promise<T> {
  let currentPrompt = prompt;
  let lastProblem = 'no response';
  for (let attempt = 0; attempt <= maxRepairs; attempt++) {
    const startedAt = Date.now();
    let raw: string;
    try {
      raw = await callModel(currentPrompt);
    } catch (err) {
      recordAiCall({
        model: meta.model ?? 'unknown',
        attempt,
        repair: attempt > 0,
        ok: false,
        ms: Date.now() - startedAt,
        problem: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
    let problem: string;
    try {
      const result = schema.safeParse(JSON.parse(raw));
      if (result.success) {
        recordAiCall({ model: meta.model ?? 'unknown', attempt, repair: attempt > 0, ok: true, ms: Date.now() - startedAt });
        return result.data;
      }
      problem = summarizeIssues(result.error.issues);
    } catch {
      problem = 'The response was not valid JSON.';
    }
    recordAiCall({
      model: meta.model ?? 'unknown',
      attempt,
      repair: attempt > 0,
      ok: false,
      ms: Date.now() - startedAt,
      problem: problem.split('\n')[0],
    });
    lastProblem = problem;
    currentPrompt =
      prompt +
      '\n\nYOUR PREVIOUS RESPONSE FAILED VALIDATION.\nPrevious response:\n' +
      raw.slice(0, 6000) +
      '\n\nValidation errors:\n' +
      problem +
      '\n\nReturn the corrected, COMPLETE JSON object only. Fix every listed error; where an error lists allowed values, use only those; where a minimum count is required, provide at least that many items.';
  }
  throw new Error(`Schema validation failed: ${lastProblem}`);
}

/**
 * Text AI Provider using Google Gemini 1.5 Pro
 * Primary provider for structured text generation
 */
export class GeminiTextProvider {
  private get apiKey(): string {
    return getEnvConfig().GEMINI_API_KEY || process.env['GEMINI_API_KEY'] || '';
  }

  private getClient(): GoogleGenerativeAI {
    const key = this.apiKey;
    return new GoogleGenerativeAI(key);
  }

  /**
   * Generate structured text output using a Zod schema
   */
  async generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    options?: { temperature?: number; maxTokens?: number; model?: string }
  ): Promise<T> {
    // A caller may name a model for its own purpose (e.g. onboarding discovery); otherwise the
    // configured/default text model is used, exactly as before.
    const modelName = options?.model || textModel();
    const model = this.getClient().getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: options?.temperature ?? 0.4,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: options?.maxTokens ?? 8192,
        responseMimeType: 'application/json',
      },
    });

    try {
      return await generateValidatedJson(
        async (p) => (await model.generateContent(p)).response.text(),
        prompt + schemaInstruction(schema),
        schema,
        MAX_SCHEMA_REPAIRS,
        { model: modelName }
      );
    } catch (error) {
      throw new Error(
        `Text generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate free-form text
   */
  async generateText(
    prompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const modelName = textModel();
    const model = this.getClient().getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: options?.maxTokens ?? 4096,
      },
    });

    try {
      const genResult = await model.generateContent(prompt);
      return genResult.response.text();
    } catch (error) {
      throw new Error(
        `Text generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Export singleton instance
export const geminiTextProvider = new GeminiTextProvider();
