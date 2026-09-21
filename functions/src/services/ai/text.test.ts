import { z } from 'zod';

const generateContentMock = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: (...args: unknown[]) => generateContentMock(...args),
    }),
  })),
}));

import { GeminiTextProvider } from './text';

const schema = z.object({
  headline: z.string(),
  price: z.number(),
});

function mockGeminiResponse(text: string) {
  generateContentMock.mockResolvedValue({ response: { text: () => text } });
}

describe('GeminiTextProvider.generateStructured — runtime structured output contract', () => {
  let provider: GeminiTextProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new GeminiTextProvider();
  });

  it('TEST 1: valid provider output -> success, correctly typed result', async () => {
    mockGeminiResponse(JSON.stringify({ headline: 'Weekend Special', price: 249 }));
    const result = await provider.generateStructured('a prompt', schema);
    expect(result).toEqual({ headline: 'Weekend Special', price: 249 });
  });

  it('TEST 2: malformed JSON -> controlled failure, not a crash', async () => {
    mockGeminiResponse('{not valid json');
    await expect(provider.generateStructured('a prompt', schema)).rejects.toThrow(
      'Text generation failed'
    );
  });

  it('TEST 3: missing required field -> schema validation failure', async () => {
    mockGeminiResponse(JSON.stringify({ headline: 'Weekend Special' })); // price missing
    await expect(provider.generateStructured('a prompt', schema)).rejects.toThrow(
      /Schema validation failed/
    );
  });

  it('TEST 4: wrong data type -> schema validation failure', async () => {
    mockGeminiResponse(JSON.stringify({ headline: 'Weekend Special', price: 'two forty nine' }));
    await expect(provider.generateStructured('a prompt', schema)).rejects.toThrow(
      /Schema validation failed/
    );
  });

  it('empty response -> controlled failure', async () => {
    mockGeminiResponse('');
    await expect(provider.generateStructured('a prompt', schema)).rejects.toThrow(
      'Text generation failed'
    );
  });

  it('provider throws (network/provider error) -> controlled failure, not silently swallowed', async () => {
    generateContentMock.mockRejectedValue(new Error('503 Service Unavailable'));
    await expect(provider.generateStructured('a prompt', schema)).rejects.toThrow(
      'Text generation failed'
    );
  });

  it('never returns malformed output cast as valid — result only returned after safeParse succeeds', async () => {
    // Wrong structure entirely (array instead of the expected object shape).
    mockGeminiResponse(JSON.stringify(['not', 'the', 'right', 'shape']));
    await expect(provider.generateStructured('a prompt', schema)).rejects.toThrow(
      /Schema validation failed/
    );
  });

  it('actually sends the given prompt to the model (regression guard for the reported bug)', async () => {
    mockGeminiResponse(JSON.stringify({ headline: 'x', price: 1 }));
    await provider.generateStructured('THE EXACT PROMPT TEXT', schema);
    expect(generateContentMock).toHaveBeenCalledWith('THE EXACT PROMPT TEXT');
  });
});
