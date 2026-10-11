import type { z } from 'zod';
import { defineEntitySchema, stringList } from './ontology-types';

/**
 * STYLE SYSTEM — a reusable expressive CHARACTERISTIC ("editorial", "warm", "premium", "founder-led").
 * Not brand design: no fonts, colours, spacing, logo placement or components (enforced by validation).
 */
export const StyleSystemSchema = defineEntitySchema('style_system', {
  expressiveQualities: stringList(1),
  risks: stringList(),
});
export type StyleSystem = z.infer<typeof StyleSystemSchema>;
