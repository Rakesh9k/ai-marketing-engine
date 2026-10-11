import { z } from 'zod';
import { generateValidatedJson } from './text';

const schema = z.object({
  businessFacts: z.array(z.string()).min(3),
  tier: z.enum(['basic', 'premium']),
});

describe('generateValidatedJson (schema repair loop)', () => {
  it('returns first-try valid output without extra calls', async () => {
    const call = jest
      .fn()
      .mockResolvedValue(JSON.stringify({ businessFacts: ['a', 'b', 'c'], tier: 'basic' }));
    await expect(generateValidatedJson(call, 'P', schema)).resolves.toEqual({
      businessFacts: ['a', 'b', 'c'],
      tier: 'basic',
    });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('shows the model its own errors and accepts the corrected object', async () => {
    const call = jest
      .fn()
      .mockResolvedValueOnce(JSON.stringify({ businessFacts: ['a'], tier: 'Identity' }))
      .mockResolvedValueOnce(JSON.stringify({ businessFacts: ['a', 'b', 'c'], tier: 'premium' }));
    const out = await generateValidatedJson(call, 'ORIGINAL', schema);
    expect(out.tier).toBe('premium');
    const repairPrompt = call.mock.calls[1][0] as string;
    expect(repairPrompt).toContain('ORIGINAL');
    expect(repairPrompt).toContain('businessFacts');
    expect(repairPrompt).toContain('Identity');
  });

  it('repairs a non-JSON response too', async () => {
    const call = jest
      .fn()
      .mockResolvedValueOnce('Sure! here is the JSON')
      .mockResolvedValueOnce(JSON.stringify({ businessFacts: ['a', 'b', 'c'], tier: 'basic' }));
    await expect(generateValidatedJson(call, 'P', schema)).resolves.toBeDefined();
  });

  it('gives up after the bounded number of repairs and never accepts invalid data', async () => {
    const call = jest.fn().mockResolvedValue(JSON.stringify({ businessFacts: [], tier: 'x' }));
    await expect(generateValidatedJson(call, 'P', schema)).rejects.toThrow(
      /Schema validation failed/
    );
    expect(call).toHaveBeenCalledTimes(3); // 1 attempt + 2 repairs
  });
});
