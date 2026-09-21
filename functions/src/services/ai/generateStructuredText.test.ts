import { z } from 'zod';

/**
 * Proves the reported bug (generateStructuredText silently dropping the
 * prompt and passing the schema in the prompt's position) is fixed, by
 * mocking the underlying provider methods and asserting the exact
 * arguments — and argument order — they receive. This is the "unit-level
 * argument verification" required alongside the real provider test.
 */

const generateStructuredMock = jest.fn();
const generateTextMock = jest.fn();
const analyzeProductImagesMock = jest.fn();
const generateImageMock = jest.fn();

jest.mock('./text', () => ({
  geminiTextProvider: {
    generateStructured: (...args: unknown[]) => generateStructuredMock(...args),
    generateText: (...args: unknown[]) => generateTextMock(...args),
  },
}));

jest.mock('./vision', () => ({
  geminiVisionProvider: {
    analyzeProductImages: (...args: unknown[]) => analyzeProductImagesMock(...args),
  },
}));

jest.mock('./image', () => ({
  openAIImageProvider: {
    generateImage: (...args: unknown[]) => generateImageMock(...args),
  },
}));

import { generateStructuredText, generateText, analyzeProductImages, generateImage } from './index';

describe('generateStructuredText argument flow', () => {
  const schema = z.object({ ok: z.boolean() });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes the actual prompt as the first argument to the provider (not the schema)', async () => {
    generateStructuredMock.mockResolvedValue({ ok: true });

    const prompt = 'ANALYZE THIS SPECIFIC BUSINESS BRAIN CONTEXT';
    await generateStructuredText(prompt, schema);

    expect(generateStructuredMock).toHaveBeenCalledTimes(1);
    const [calledPrompt, calledSchema] = generateStructuredMock.mock.calls[0];

    // The prompt argument must be the real prompt string, not the schema object.
    expect(calledPrompt).toBe(prompt);
    expect(typeof calledPrompt).toBe('string');

    // The schema argument must be the actual Zod schema, not the prompt string.
    expect(calledSchema).toBe(schema);
    expect(typeof calledSchema.safeParse).toBe('function');
  });

  it('passes caller-supplied options through rather than discarding them', async () => {
    generateStructuredMock.mockResolvedValue({ ok: true });

    const options = { temperature: 0.9, maxTokens: 1234 };
    await generateStructuredText('prompt text', schema, options);

    const [, , calledOptions] = generateStructuredMock.mock.calls[0];
    expect(calledOptions).toEqual(options);
  });

  it('never calls the provider with the schema in the prompt position', async () => {
    generateStructuredMock.mockResolvedValue({ ok: true });
    await generateStructuredText('a real prompt', schema);

    const [calledPrompt] = generateStructuredMock.mock.calls[0];
    // A Zod schema is an object; the real bug produced an object here instead
    // of a string. Guard against regression explicitly.
    expect(calledPrompt).not.toBe(schema);
    expect(calledPrompt).not.toHaveProperty('safeParse');
  });

  it('generateText forwards the prompt (not swapped) and options', async () => {
    generateTextMock.mockResolvedValue('free form output');
    await generateText('free form prompt', { temperature: 0.7 });

    expect(generateTextMock).toHaveBeenCalledWith('free form prompt', { temperature: 0.7 });
  });

  it('analyzeProductImages forwards images, product metadata, and business context unchanged', async () => {
    const visionResult = {
      dishName: 'Paneer Biryani',
      confidence: 0.9,
      visualAttributes: {
        platingStyle: 'copper handi',
        container: 'handi',
        garnish: ['mint'],
        colorPalette: ['orange'],
        lighting: 'warm',
        background: 'table',
        portionSize: 'medium',
        steamVisible: true,
        textureCues: ['fluffy'],
      },
      ambianceCues: [],
      suggestedCompositions: [],
      qualityFlags: [],
    };
    analyzeProductImagesMock.mockResolvedValue(visionResult);

    const images = ['https://example.com/a.jpg'];
    const productMetadata = { name: 'Paneer Biryani', price: 249, category: 'main' };
    const businessContext = {
      name: 'Test Restaurant',
      category: 'restaurant',
      location: { city: 'Hyderabad', state: 'Telangana' },
    };

    const result = await analyzeProductImages(images, productMetadata, businessContext);

    expect(analyzeProductImagesMock).toHaveBeenCalledWith(images, productMetadata, businessContext);
    expect(result).toEqual(visionResult);
  });

  it('generateImage forwards the request unchanged and returns the provider result', async () => {
    const request = { prompt: 'a poster', generationMode: 'poster' as const };
    const response = { success: true, imageUrl: 'https://example.com/img.png', provider: 'openai', model: 'dall-e-3' };
    generateImageMock.mockResolvedValue(response);

    const result = await generateImage(request as never);

    expect(generateImageMock).toHaveBeenCalledWith(request);
    expect(result).toEqual(response);
  });
});
