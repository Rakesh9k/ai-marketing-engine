const generateContentMock = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: (...args: unknown[]) => generateContentMock(...args),
    }),
  })),
}));

// Vision fetches source images before analysis; avoid real network calls.
global.fetch = jest.fn().mockRejectedValue(new Error('no network in tests')) as unknown as typeof fetch;

import { GeminiVisionProvider } from './vision';

const VALID_RESPONSE = {
  dishName: 'Paneer Biryani',
  confidence: 0.92,
  visualAttributes: {
    platingStyle: 'copper handi',
    container: 'handi',
    garnish: ['mint', 'fried onions'],
    colorPalette: ['orange', 'brown'],
    lighting: 'warm',
    background: 'table',
    portionSize: 'medium',
    steamVisible: true,
    textureCues: ['fluffy'],
  },
  ambianceCues: ['restaurant setting'],
  suggestedCompositions: ['top-down shot'],
  qualityFlags: [],
};

describe('GeminiVisionProvider — runtime schema validation (no more unsafe cast)', () => {
  let provider: GeminiVisionProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new GeminiVisionProvider();
  });

  const metadata = { name: 'Paneer Biryani', price: 249, category: 'main' };
  const business = { name: 'Test Restaurant', category: 'restaurant', location: { city: 'Hyderabad', state: 'Telangana' } };

  it('valid structured response is returned as-is', async () => {
    generateContentMock.mockResolvedValue({ response: { text: () => JSON.stringify(VALID_RESPONSE) } });
    const result = await provider.analyzeProductImages([], metadata, business);
    expect(result).toEqual(VALID_RESPONSE);
  });

  it('missing required field is rejected by runtime validation, not silently passed through', async () => {
    const { confidence: _confidence, ...missingConfidence } = VALID_RESPONSE;
    generateContentMock.mockResolvedValue({ response: { text: () => JSON.stringify(missingConfidence) } });
    await expect(provider.analyzeProductImages([], metadata, business)).rejects.toThrow(
      /schema validation failed/i
    );
  });

  it('wrong field type is rejected by runtime validation', async () => {
    const bad = { ...VALID_RESPONSE, confidence: 'high' };
    generateContentMock.mockResolvedValue({ response: { text: () => JSON.stringify(bad) } });
    await expect(provider.analyzeProductImages([], metadata, business)).rejects.toThrow(
      /schema validation failed/i
    );
  });

  it('malformed JSON is a controlled failure', async () => {
    generateContentMock.mockResolvedValue({ response: { text: () => 'not json at all' } });
    await expect(provider.analyzeProductImages([], metadata, business)).rejects.toThrow(
      /Failed to parse vision response/
    );
  });
});
