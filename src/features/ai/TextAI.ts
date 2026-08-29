/**
 * TextAI - Text generation abstraction
 *
 * Supports future needs such as:
 * - marketing copy
 * - captions
 * - headlines
 * - hooks
 * - CTAs
 * - offer copy
 * - WhatsApp messages
 * - campaign strategy
 * - local-language content
 * - business descriptions
 *
 * DO NOT implement all these features yet. Only establish the abstraction.
 */
export interface TextAI {
  /**
   * Generate text based on a prompt and context.
   *
   * The request/response types are defined by the application's
   * use cases, not hardcoded into this interface.
   */
  generateText(request: TextAIRequest): Promise<TextAIResponse>;
}

/**
 * TextAIRequest - Input for text generation
 *
 * Structured request that the application can control.
 * The AI provider only sees this formatted request.
 */
export type TextAIRequest = {
  readonly prompt: string;
  readonly context?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly model?: string;
  readonly systemInstruction?: string;
};

/**
 * TextAIResponse - Output from text generation
 *
 * The application controls what fields are important.
 * The provider returns what it can, application extracts what it needs.
 */
export type TextAIResponse = {
  readonly text: string;
  readonly usage?: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  readonly finishReason?: string;
  readonly model?: string;
};
