import {
  ADAPTED_PLAN_OUTPUT_FORMAT,
  AdaptedCreativePlanSchema,
  ReelShotSchema,
} from './templateAdaptation';

describe('template adaptation prompt output format', () => {
  it('names every top-level key of the schema the response is validated against', () => {
    for (const key of Object.keys(AdaptedCreativePlanSchema.shape)) {
      expect(ADAPTED_PLAN_OUTPUT_FORMAT).toContain(`"${key}"`);
    }
  });

  it('names every field of a reel shot', () => {
    for (const key of Object.keys(ReelShotSchema.shape)) {
      expect(ADAPTED_PLAN_OUTPUT_FORMAT).toContain(`"${key}"`);
    }
  });
});
