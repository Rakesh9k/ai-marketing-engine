import { z } from 'zod';

/**
 * Truth Validation Schema
 * Verifies no invented business facts in generated output
 */
export const TruthViolationSchema = z.object({
  assetId: z.string(),
  assetType: z.string(),
  field: z.string(),
  expected: z.string(),
  actual: z.string(),
  severity: z.enum(['critical', 'major', 'minor']),
  suggestion: z.string(),
});

export const TruthValidationSchema = z.object({
  passed: z.boolean(),
  violations: z.array(TruthViolationSchema),
  assetStatus: z.record(z.enum(['passed', 'failed', 'warning'])),
});

export type TruthViolation = z.infer<typeof TruthViolationSchema>;
export type TruthValidationOutput = z.infer<typeof TruthValidationSchema>;

/**
 * Quality Validation Schema
 * Verifies brand compliance, format compliance, readability
 */
export const QualityIssueSchema = z.object({
  assetId: z.string(),
  assetType: z.string(),
  issue: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
  suggestion: z.string(),
});

export const QualityValidationSchema = z.object({
  passed: z.boolean(),
  issues: z.array(QualityIssueSchema),
  assetScores: z.record(z.number()),
});

export type QualityIssue = z.infer<typeof QualityIssueSchema>;
export type QualityValidationOutput = z.infer<typeof QualityValidationSchema>;

/**
 * Safety Validation Schema
 * Checks for prohibited content, misleading claims, safety issues
 */
export const SafetyViolationSchema = z.object({
  assetId: z.string(),
  assetType: z.string(),
  category: z.enum([
    'medical',
    'misleading',
    'copyright',
    'hate',
    'adult',
    'illegal',
    'pii',
    'political',
  ]),
  description: z.string(),
  excerpt: z.string(),
  severity: z.enum(['critical', 'high', 'medium']),
});

export const SafetyValidationSchema = z.object({
  passed: z.boolean(),
  violations: z.array(SafetyViolationSchema),
});

export type SafetyViolation = z.infer<typeof SafetyViolationSchema>;
export type SafetyValidationOutput = z.infer<typeof SafetyValidationSchema>;
