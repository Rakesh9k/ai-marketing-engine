import { z } from 'zod';
import { describeZod, schemaInstruction } from './schemaPrompt';
import { BusinessUnderstandingSchema } from './pipeline';

describe('schemaInstruction', () => {
  it('renders keys, enums, optional markers and array bounds', () => {
    const shape = describeZod(
      z.object({
        name: z.string().min(5).max(20),
        tier: z.enum(['a', 'b']),
        tags: z.array(z.string()).min(2),
        note: z.string().optional(),
        n: z.number().default(1),
      })
    ) as Record<string, unknown>;
    expect(Object.keys(shape)).toEqual(['name', 'tier', 'tags', 'note?', 'n?']);
    expect(shape['tier']).toEqual({ enum: ['a', 'b'] });
    expect(shape['name']).toBe('string (min 5 chars, max 20 chars)');
    expect(shape['tags']).toEqual(['string', '(min 2 items)']);
  });

  it('exposes the real pipeline enums the model used to get wrong', () => {
    const text = schemaInstruction(BusinessUnderstandingSchema);
    expect(text).toContain('"identity"');
    expect(text).toContain('"policy"');
    expect(text).toContain('businessFacts');
    expect(text).toContain('Never invent facts');
  });

  it('never throws on unknown types', () => {
    expect(describeZod(z.date() as never)).toBe('any');
  });
});

describe('array lengths are stated to the model (the cause of most schema repairs)', () => {
  it('an exact-length array says "exactly N items"', () => {
    expect(describeZod(z.array(z.string()).length(5))).toEqual(['string', '(exactly 5 items)']);
  });

  it('min/max arrays still say min/max', () => {
    expect(describeZod(z.array(z.string()).min(3).max(5))).toEqual(['string', '(min 3, max 5 items)']);
  });

  it('every .length() array in the real pipeline schemas is announced with its count', async () => {
    const { CopyPackSchema, CampaignStrategySchema, ProductUnderstandingSchema, ImagePromptPackSchema } =
      await import('./pipeline');
    const text = [CopyPackSchema, CampaignStrategySchema, ProductUnderstandingSchema, ImagePromptPackSchema]
      .map((s) => JSON.stringify(describeZod(s as never)))
      .join('\n');
    // the counts that were being guessed wrong in live runs: marketingAngles 5, captions 5, keyMessages 5, story prompts 3
    expect((text.match(/exactly 5 items/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(text).toMatch(/exactly 3 items/);
  });
});
