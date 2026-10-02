import { GoogleGenerativeAI } from '@google/generative-ai';
import type { z } from 'zod';
import { getEnvConfig } from '../../config/env';

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
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<T> {
    const model = this.getClient().getGenerativeModel({
      model: 'gemini-flash-latest',
      generationConfig: {
        temperature: options?.temperature ?? 0.4,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: options?.maxTokens ?? 8192,
        responseMimeType: 'application/json',
      },
    });

    try {
      const genResult = await model.generateContent(prompt);
      const responseText = genResult.response.text();

      // Parse and validate against schema
      const parsed = JSON.parse(responseText);
      const parseResult = schema.safeParse(parsed);

      if (!parseResult.success) {
        throw new Error(`Schema validation failed: ${parseResult.error.message}`);
      }

      return parseResult.data;
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
    const model = this.getClient().getGenerativeModel({
      model: 'gemini-flash-latest',
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
