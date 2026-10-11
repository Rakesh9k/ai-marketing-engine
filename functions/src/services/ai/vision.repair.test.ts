/**
 * Vision robustness, found by running real models against real photos (see
 * docs/MODEL_BENCHMARK_2026-10.md):
 *   - a model answering "N/A" for a field that does not apply (a salon, a building) used to fail the
 *     whole analysis — for exactly the non-food businesses Mitra now serves;
 *   - the strict-enum reference-style analysis failed on most runs for every model, with no recovery.
 * Now: tolerant of "does not apply" answers, and one repair attempt that shows the model its own
 * answer and the exact errors. Anything still invalid after that is an error, never accepted.
 * (vision.test.ts keeps pinning the original error contract.)
 */
const generateContentMock = jest.fn();
const getGenerativeModelMock = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: (...args: unknown[]) => {
      getGenerativeModelMock(...args);
      return { generateContent: (...a: unknown[]) => generateContentMock(...a) };
    },
  })),
}));
global.fetch = jest
  .fn()
  .mockRejectedValue(new Error('no network in tests')) as unknown as typeof fetch;

import { GeminiVisionProvider, ReferenceStyleAnalysisSchema } from './vision';

const answer = (v: unknown) => ({
  response: { text: () => (typeof v === 'string' ? v : JSON.stringify(v)) },
});

const FOOD = {
  dishName: 'Paneer Biryani',
  confidence: 0.92,
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
  ambianceCues: ['restaurant'],
  suggestedCompositions: ['top-down'],
  qualityFlags: [],
};
const withAttrs = (over: Record<string, unknown>) => ({
  ...FOOD,
  visualAttributes: { ...FOOD.visualAttributes, ...over },
});

const META = { name: 'Our salon', price: 0, category: 'space' };
const BIZ = {
  name: 'Glow Studio',
  category: 'salon',
  location: { city: 'Mumbai', state: 'Maharashtra' },
};

describe('product analysis: tolerant of "does not apply"', () => {
  beforeEach(() => jest.clearAllMocks());
  const run = () => new GeminiVisionProvider().analyzeProductImages([], META, BIZ);

  it.each(['N/A', 'n/a', 'None', 'not applicable', 'Not Applicable', 'unknown', '', null])(
    'portionSize %p (a space, not a dish) is accepted as not_applicable, not a failure',
    async (value) => {
      generateContentMock.mockResolvedValue(answer(withAttrs({ portionSize: value })));
      const result = await run();
      expect(result.visualAttributes.portionSize).toBe('not_applicable');
      expect(generateContentMock).toHaveBeenCalledTimes(1); // no repair needed
    }
  );

  it('real portion sizes are untouched', async () => {
    for (const size of ['small', 'medium', 'large', 'family']) {
      generateContentMock.mockResolvedValue(answer(withAttrs({ portionSize: size })));
      expect((await run()).visualAttributes.portionSize).toBe(size);
    }
  });

  it('steam that does not apply is false, and null lists are empty lists', async () => {
    generateContentMock.mockResolvedValue(
      answer({
        ...withAttrs({ steamVisible: 'N/A', garnish: null, textureCues: null }),
        qualityFlags: null,
        ambianceCues: null,
      })
    );
    const r = await run();
    expect(r.visualAttributes.steamVisible).toBe(false);
    expect(r.visualAttributes.garnish).toEqual([]);
    expect(r.visualAttributes.textureCues).toEqual([]);
    expect(r.qualityFlags).toEqual([]);
    expect(r.ambianceCues).toEqual([]);
  });

  it('does NOT relax what should fail: a wrong confidence type is still rejected', async () => {
    generateContentMock.mockResolvedValue(answer({ ...FOOD, confidence: 'high' }));
    await expect(run()).rejects.toThrow(/schema validation failed/i);
  });

  it('a genuinely invalid portion size is not waved through (it triggers a repair instead)', async () => {
    generateContentMock.mockResolvedValue(answer(withAttrs({ portionSize: 'enormous' })));
    await expect(run()).rejects.toThrow(/schema validation failed/i);
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });
});

describe('one repair attempt', () => {
  beforeEach(() => jest.clearAllMocks());
  const run = () => new GeminiVisionProvider().analyzeProductImages([], META, BIZ);

  it('shows the model its own answer and the exact errors, and accepts the corrected one', async () => {
    generateContentMock
      .mockResolvedValueOnce(answer(withAttrs({ portionSize: 'enormous' })))
      .mockResolvedValueOnce(answer(FOOD));

    const result = await run();

    expect(result).toEqual(FOOD);
    expect(generateContentMock).toHaveBeenCalledTimes(2);
    const repairPrompt = String((generateContentMock.mock.calls[1]![0] as unknown[])[0]);
    expect(repairPrompt).toContain('YOUR PREVIOUS RESPONSE FAILED VALIDATION');
    expect(repairPrompt).toContain('enormous'); // its own answer
    expect(repairPrompt).toMatch(/portionSize/); // the exact error
  });

  it('recovers from malformed JSON the same way', async () => {
    generateContentMock
      .mockResolvedValueOnce(answer('Sure! Here is the analysis: {oops'))
      .mockResolvedValueOnce(answer(FOOD));
    await expect(run()).resolves.toEqual(FOOD);
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it('is bounded: a second failure is an error carrying the real reason, never an accepted answer', async () => {
    generateContentMock.mockResolvedValue(answer('not json at all'));
    await expect(run()).rejects.toThrow(/Failed to parse vision response/);
    expect(generateContentMock).toHaveBeenCalledTimes(2); // original + exactly one repair
  });

  it("does not repair a provider failure (network/quota): that is not the model's answer to fix", async () => {
    generateContentMock.mockRejectedValue(new Error('503 Service Unavailable'));
    await expect(run()).rejects.toThrow(/503/);
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it('a valid first answer costs nothing extra', async () => {
    generateContentMock.mockResolvedValue(answer(FOOD));
    await run();
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it('asks the model for JSON mode, like the text provider', async () => {
    generateContentMock.mockResolvedValue(answer(FOOD));
    await run();
    expect(getGenerativeModelMock).toHaveBeenCalledWith(
      expect.objectContaining({ generationConfig: { responseMimeType: 'application/json' } })
    );
  });
});

describe('reference-style analysis (strict enums)', () => {
  beforeEach(() => jest.clearAllMocks());
  const STYLE = {
    tone: 'warm',
    visualDensity: 'low',
    productProminence: 'balanced',
    textDensity: 'concise',
    colorMode: 'neutral',
    humor: 'none',
    ctaStyle: 'soft',
  };
  const run = () => new GeminiVisionProvider().analyzeReferenceStyle('https://example.com/ref.jpg');

  it('a photo with no text or call to action ("none") maps to the least assertive value, not a failure', () => {
    const parsed = ReferenceStyleAnalysisSchema.parse({
      ...STYLE,
      textDensity: 'none',
      ctaStyle: 'N/A',
      productProminence: 'none',
    });
    expect(parsed).toMatchObject({
      textDensity: 'minimal',
      ctaStyle: 'soft',
      productProminence: 'subtle',
    });
  });

  it('optional fields with an unusable value are omitted (the prompt says "omit what you cannot determine")', () => {
    const parsed = ReferenceStyleAnalysisSchema.parse({
      ...STYLE,
      composition: 'chaotic',
      ctaPlacement: null,
      hookStructure: 'N/A',
      shotPacing: 'frantic',
      visualHierarchy: ['product', 'logo', 'cta', 42],
    });
    expect(parsed.composition).toBeUndefined();
    expect(parsed.ctaPlacement).toBeUndefined();
    expect(parsed.hookStructure).toBeUndefined();
    expect(parsed.shotPacing).toBeUndefined();
    expect(parsed.visualHierarchy).toEqual(['product', 'cta']);
  });

  it('a required value that is simply wrong is still an error', () => {
    expect(() => ReferenceStyleAnalysisSchema.parse({ ...STYLE, tone: 'sparkly' })).toThrow();
    expect(() => ReferenceStyleAnalysisSchema.parse({ ...STYLE, tone: undefined })).toThrow();
  });

  it('valid answers pass through unchanged', () => {
    expect(ReferenceStyleAnalysisSchema.parse({ ...STYLE, composition: 'centered' })).toEqual({
      ...STYLE,
      composition: 'centered',
    });
  });

  it('a wrong required value is repaired once, and the corrected answer is accepted', async () => {
    generateContentMock
      .mockResolvedValueOnce(answer({ ...STYLE, tone: 'sparkly' }))
      .mockResolvedValueOnce(answer(STYLE));
    await expect(run()).resolves.toEqual(STYLE);
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it('is bounded, and the error keeps its original wording', async () => {
    generateContentMock.mockResolvedValue(answer({ ...STYLE, tone: 'sparkly' }));
    await expect(run()).rejects.toThrow(/Reference style schema validation failed/);
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });
});
