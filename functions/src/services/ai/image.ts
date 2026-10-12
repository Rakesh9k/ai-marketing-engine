import { getEnvConfig } from '../../config/env';
import type { ImageGenerationRequest, ImageGenerationResponse } from '../../types';
import { beginMeteredCall } from './usageMeter';
import { DEFAULT_IMAGE_MODEL, imageModel } from '../../config/geminiModels';

/**
 * Image AI provider backed by Google Gemini image generation, replacing the
 * former OpenAI DALL-E 3 implementation behind the same aiServices.image
 * abstraction.
 *
 * Uses the Gemini REST `generateContent` endpoint directly (the installed
 * @google/generative-ai 0.24 SDK has no image-output/responseModalities
 * typing, and adding a second Google SDK was avoided). The API key is sent
 * in the `x-goog-api-key` header — never in the URL — and never logged.
 *
 * Unlike DALL-E 3, Gemini accepts input images as multimodal `inlineData`
 * parts, so `sourceImageUrl` is fetched server-side and its actual bytes are
 * sent with the request (a URL written into the prompt text is NOT).
 */
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
export const DEFAULT_GEMINI_IMAGE_MODEL = DEFAULT_IMAGE_MODEL;
/** Image output tokens the reservation allows for: the largest (4K) output; resolution is not set in the request. UNVERIFIED count. */
const IMAGE_OUTPUT_TOKEN_CEILING = 2520;
const MAX_REFERENCE_IMAGE_BYTES = 7 * 1024 * 1024;
const SUPPORTED_REFERENCE_MIME = ['image/jpeg', 'image/png', 'image/webp'];

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  inline_data?: { mime_type: string; data: string };
}

class ImageProviderError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

function classifyHttpError(status: number, body: string): ImageProviderError {
  const lower = body.toLowerCase();
  if (
    status === 400 &&
    (lower.includes('api key not valid') || lower.includes('api_key_invalid'))
  ) {
    return new ImageProviderError('INVALID_API_KEY', 'Gemini rejected the configured API key');
  }
  if (status === 401 || status === 403) {
    return new ImageProviderError('UNAUTHORIZED', 'Gemini request was not authorized');
  }
  if (status === 402) {
    return new ImageProviderError(
      'BILLING_REQUIRED',
      'Gemini image generation requires billing to be enabled on the Google Cloud project'
    );
  }
  if (status === 404) {
    return new ImageProviderError(
      'MODEL_UNAVAILABLE',
      'Configured Gemini image model is unavailable'
    );
  }
  if (status === 429) {
    return new ImageProviderError('RATE_LIMITED', 'Gemini rate limit or quota exceeded');
  }
  if (status >= 500) {
    return new ImageProviderError('PROVIDER_UNAVAILABLE', `Gemini service error (${status})`);
  }
  return new ImageProviderError('INVALID_REQUEST', `Gemini rejected the request (${status})`);
}

export class GeminiImageProvider {
  private get apiKey(): string {
    return getEnvConfig().GEMINI_API_KEY || '';
  }

  private get model(): string {
    return imageModel();
  }

  /** Fetches the reference image server-side and validates type/size. */
  private async loadReferenceImage(url: string): Promise<{ mimeType: string; data: string }> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new ImageProviderError(
        'REFERENCE_IMAGE_UNAVAILABLE',
        `Reference image could not be loaded (${response.status})`
      );
    }
    const mimeType = (response.headers.get('content-type') || '')
      .split(';')[0]!
      .trim()
      .toLowerCase();
    if (!SUPPORTED_REFERENCE_MIME.includes(mimeType)) {
      throw new ImageProviderError(
        'UNSUPPORTED_IMAGE',
        `Reference image type "${mimeType || 'unknown'}" is not supported`
      );
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_REFERENCE_IMAGE_BYTES) {
      throw new ImageProviderError('IMAGE_TOO_LARGE', 'Reference image is too large');
    }
    return { mimeType, data: bytes.toString('base64') };
  }

  /** Builds the exact generateContent request body (exposed for tests). */
  async buildRequestBody(request: ImageGenerationRequest): Promise<Record<string, unknown>> {
    const parts: GeminiPart[] = [];
    if (request.sourceImageUrl) {
      const ref = await this.loadReferenceImage(request.sourceImageUrl);
      parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } });
    }
    let prompt = request.prompt;
    if (request.negativePrompt) {
      prompt += `\n\nAvoid: ${request.negativePrompt}`;
    }
    if (request.aspectRatio) {
      prompt += `\n\nAspect ratio: ${request.aspectRatio}.`;
    }
    parts.push({ text: prompt });

    return {
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    };
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const model = this.model;
    try {
      if (!this.apiKey) {
        throw new ImageProviderError('MISSING_API_KEY', 'GEMINI_API_KEY is not configured');
      }
      const body = await this.buildRequestBody(request);

      // Live-run budget: reserve this call's worst case first (a no-op unless a harness installed a meter).
      const ticket = beginMeteredCall('image', model, {
        estInputTokens:
          request.prompt.length +
          (request.negativePrompt?.length ?? 0) +
          200 +
          (request.sourceImageUrl ? 2000 : 0),
        outputTokenCeiling: IMAGE_OUTPUT_TOKEN_CEILING,
      });
      let response: Response;
      try {
        response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
          body: JSON.stringify(body),
        });
      } catch (networkError) {
        ticket?.failure(networkError);
        throw networkError;
      }
      if (!response.ok) {
        ticket?.failure(new Error(`HTTP ${response.status}`));
        // Body may echo request details; classify and discard, never log it.
        throw classifyHttpError(response.status, await response.text().catch(() => ''));
      }

      let json: {
        candidates?: Array<{ finishReason?: string; content?: { parts?: GeminiPart[] } }>;
        promptFeedback?: { blockReason?: string };
        usageMetadata?: import('./usageMeter').GeminiUsage;
      };
      try {
        json = (await response.json()) as typeof json;
      } catch (parseError) {
        ticket?.failure(parseError); // release the reservation; the call may still have been billed
        throw parseError;
      }
      // The call was made and billed whatever we do with the answer: measure it from reported usage.
      ticket?.success(json.usageMetadata);
      if (json.promptFeedback?.blockReason) {
        throw new ImageProviderError(
          'SAFETY_BLOCKED',
          'Gemini declined this request (safety policy)'
        );
      }
      const candidate = json.candidates?.[0];
      const imagePart = candidate?.content?.parts?.find((p) => p.inlineData || p.inline_data);
      const inline = imagePart?.inlineData
        ? imagePart.inlineData
        : imagePart?.inline_data
          ? { mimeType: imagePart.inline_data.mime_type, data: imagePart.inline_data.data }
          : undefined;
      if (!inline?.data) {
        const code = candidate?.finishReason === 'SAFETY' ? 'SAFETY_BLOCKED' : 'MALFORMED_RESPONSE';
        throw new ImageProviderError(code, 'Gemini returned no image data');
      }
      const decoded = Buffer.from(inline.data, 'base64');
      if (decoded.length === 0) {
        throw new ImageProviderError('MALFORMED_RESPONSE', 'Gemini returned an empty image');
      }

      return {
        success: true,
        imageData: { base64: inline.data, mimeType: inline.mimeType || 'image/png' },
        provider: 'gemini',
        model,
        metadata: { referenceImageSent: Boolean(request.sourceImageUrl) },
      };
    } catch (error) {
      const code = error instanceof ImageProviderError ? error.code : 'IMAGE_GENERATION_FAILED';
      const message =
        error instanceof ImageProviderError
          ? error.message
          : `Gemini image generation failed: ${error instanceof Error ? error.message : 'unknown error'}`;
      return { success: false, provider: 'gemini', model, error: { code, message } };
    }
  }
}

export const geminiImageProvider = new GeminiImageProvider();
