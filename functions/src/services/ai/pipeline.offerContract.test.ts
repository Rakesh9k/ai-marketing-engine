/**
 * The copywriter is given the same offer contract Truth Check verifies (offerContract.ts), built only
 * from the facts the campaign has. Runs the real pipeline and inspects the prompt the model receives.
 */
const generateStructuredTextMock = jest.fn().mockResolvedValue({});
jest.mock('./index', () => ({
  generateStructuredText: (...args: unknown[]) => generateStructuredTextMock(...args),
  analyzeProductImages: jest.fn(),
  generateImage: jest.fn().mockResolvedValue({
    success: true,
    imageUrl: 'https://provider.example.com/temp-hero.png',
    provider: 'openai',
    model: 'dall-e-3',
  }),
}));
jest.mock('./generatedAssetStorage', () => ({
  fetchAsBuffer: jest
    .fn()
    .mockResolvedValue({ buffer: Buffer.from('x'), contentType: 'image/png' }),
  uploadGeneratedAsset: jest.fn().mockResolvedValue({
    url: 'https://storage.example.com/x.png',
    storagePath: 'businesses/b/campaigns/c/generated/x.png',
  }),
}));

import { GenerationPipeline, type GenerationPipelineInput } from './pipeline';

const input = (over: Partial<GenerationPipelineInput> = {}): GenerationPipelineInput =>
  ({
    businessId: 'b1',
    campaignId: 'c1',
    businessName: 'The Higher Taste',
    businessCategory: 'restaurant',
    vertical: 'restaurant',
    businessLocation: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
    whatsappNumber: '+919876543210',
    businessBrain: {} as never,
    brandProfile: {},
    objective: 'weekend_offer',
    productName: 'Spring Roll',
    offerHeadline: 'Weekend Special',
    offerPrice: 180,
    offerType: 'fixed',
    offerValidityStart: '2026-10-10T00:00:00.000Z',
    offerValidityEnd: '2026-10-15T00:00:00.000Z',
    duration: { start: '2026-10-10T00:00:00.000Z', end: '2026-10-15T00:00:00.000Z' },
    audience: { localities: ['Kondapur'] },
    cta: 'order_whatsapp',
    localizationProfile: {} as never,
    campaignStyle: 'funny',
    ...over,
  }) as GenerationPipelineInput;

async function copyPromptFor(over: Partial<GenerationPipelineInput> = {}): Promise<string> {
  generateStructuredTextMock.mockClear();
  await new GenerationPipeline().execute(input(over));
  const prompt = generateStructuredTextMock.mock.calls
    .map((c) => String(c[0]))
    .find((p) => p.includes('1. 5 HEADLINES'));
  if (!prompt) throw new Error('the copywriter prompt was never sent');
  return prompt;
}

describe('the copywriter is given the offer contract', () => {
  it('a fixed-price campaign: exact price, the window, no discount, the prohibited list', async () => {
    const p = await copyPromptFor();
    expect(p).toContain('the offer price is ₹180');
    expect(p).toMatch(/no "INR" or "Rs"/);
    expect(p).toContain('10 Oct 2026');
    expect(p).toContain('15 Oct 2026');
    expect(p).toMatch(/DISCOUNT: none was provided/);
    expect(p).toMatch(/rejected automatically/);
    expect(p).toContain('famous');
  });

  it('a percentage campaign WITH an original price: asks for the real discount, derived not invented', async () => {
    const p = await copyPromptFor({
      offerType: 'percentage',
      offerPrice: 160,
      offerOriginalPrice: 200,
    });
    expect(p).toContain('exactly 20%');
    expect(p).toContain('"20% off"');
    expect(p).toContain('was ₹200');
  });

  it('a percentage campaign WITHOUT an original price: no discount is requested or invented', async () => {
    const p = await copyPromptFor({
      offerType: 'percentage',
      offerPrice: 160,
      offerOriginalPrice: undefined,
    });
    expect(p).toMatch(/original price was provided/);
    expect(p).not.toMatch(/\d+% off/);
  });

  it('a campaign with no dates is told not to mention any', async () => {
    const p = await copyPromptFor({ offerValidityStart: undefined, offerValidityEnd: undefined });
    expect(p).toMatch(/no dates were provided/i);
    expect(p).not.toMatch(/VALIDITY:/);
  });

  it('a free-delivery offer is allowed to say so; the phrase is not in its prohibited list', async () => {
    const p = await copyPromptFor({ offerType: 'free_delivery' });
    expect(p).toMatch(/state plainly that this is a free delivery offer/);
    const never = p.split('\n').find((l) => l.includes('NEVER WRITE'))!;
    expect(never).not.toContain('free delivery');
  });

  it('tells the model not to state hours when none are on file, and says nothing when they are', async () => {
    const none = await copyPromptFor();
    expect(none).toMatch(/no opening hours are on file/i);
    const some = await copyPromptFor({
      businessBrain: {
        businessRules: {
          openingHours: { monday: { open: '11:00', close: '23:00', closed: false } },
        },
      } as never,
    });
    expect(some).not.toMatch(/no opening hours are on file/i);
  });

  it('names the only contact number allowed (or says none is on file)', async () => {
    const withNumber = await copyPromptFor();
    expect(withNumber).toMatch(/only phone or WhatsApp number[^\n]*9876543210/i);
    const none = await copyPromptFor({ whatsappNumber: '', businessBrain: {} as never });
    expect(none).toMatch(/no phone or whatsapp number is on file/i);
  });

  it('a salon is told its known services; a restaurant is told nothing about services', async () => {
    const salon = await copyPromptFor({
      vertical: 'salon',
      businessCategory: 'salon',
      productName: 'Facial',
      businessBrain: {
        verticalProfile: { services: [{ name: 'Facial' }, { name: 'Haircut' }] },
      } as never,
    });
    expect(salon).toMatch(/SERVICES: the owner's known services are: Facial, Haircut/);
    expect(await copyPromptFor()).not.toMatch(/SERVICES:|LISTING FACTS/);
  });

  it('a real-estate listing is described by its recorded facts only', async () => {
    const p = await copyPromptFor({
      vertical: 'real_estate',
      businessCategory: 'real_estate',
      productName: '3BHK in Green Meadows',
      businessBrain: {
        verticalProfile: {
          properties: [
            { title: '3BHK in Green Meadows', bedrooms: 3, possessionStatus: 'ready_to_move' },
          ],
        },
      } as never,
    });
    expect(p).toMatch(/LISTING FACTS[^\n]*3 bedrooms; possession: ready to move/);
    expect(p).toMatch(/Never state a possession date/);
    expect(p).toMatch(/Not recorded for this listing: bathrooms, area, amenities/);
  });

  it('the old one-line price rule is replaced, not duplicated', async () => {
    const p = await copyPromptFor();
    expect(p).not.toContain('ALWAYS use exact offer price');
  });
});
