/**
 * Regression guard for the reported validationStages.ts bug: runTruthValidation/
 * runQualityValidation/runSafetyValidation were passing a raw object literal
 * (whose values happen to be Zod types) as the "schema" argument instead of
 * z.object({...}) — a plain object has no .safeParse method, so
 * GeminiTextProvider.generateStructured's `schema.safeParse(parsed)` call
 * would throw "schema.safeParse is not a function" for every invocation.
 */

const generateStructuredTextMock = jest.fn();

jest.mock('./index', () => ({
  generateStructuredText: (...args: unknown[]) => generateStructuredTextMock(...args),
}));

import { runTruthValidation, runQualityValidation, runSafetyValidation } from './validationStages';

describe('validationStages.ts schema shape', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    generateStructuredTextMock.mockResolvedValue({ passed: true, violations: [] });
  });

  it('runTruthValidation passes a real Zod schema (has .safeParse), not a plain object', async () => {
    await runTruthValidation({}, null, {}, {}, {});
    const [, schema] = generateStructuredTextMock.mock.calls[0];
    expect(typeof schema.safeParse).toBe('function');
    expect(typeof schema.parse).toBe('function'); // ZodObject-only method, proves it's a real schema
  });

  it('runQualityValidation passes a real Zod schema, not a plain object', async () => {
    await runQualityValidation({}, null, {}, {});
    const [, schema] = generateStructuredTextMock.mock.calls[0];
    expect(typeof schema.safeParse).toBe('function');
  });

  it('runSafetyValidation passes a real Zod schema, not a plain object', async () => {
    await runSafetyValidation({}, null);
    const [, schema] = generateStructuredTextMock.mock.calls[0];
    expect(typeof schema.safeParse).toBe('function');
  });

  it('the schema genuinely validates data (safeParse behaves correctly), proving it is a working ZodObject', async () => {
    await runTruthValidation({}, null, {}, {}, {});
    const [, schema] = generateStructuredTextMock.mock.calls[0];

    const valid = schema.safeParse({ passed: true, violations: [], assetStatus: {} });
    expect(valid.success).toBe(true);

    const invalid = schema.safeParse({ passed: 'not-a-boolean' });
    expect(invalid.success).toBe(false);
  });
});
