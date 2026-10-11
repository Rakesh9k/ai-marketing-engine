import { z } from 'zod';

export const CreativeQuestionInputTypeSchema = z.enum([
  'single_select',
  'multi_select',
  'ranking',
  'slider',
  'short_text',
  'long_text',
  'yes_no',
  'product_selector',
  'service_selector',
  'offer_selector',
  'image_upload',
  'asset_selector',
  'confirmation',
]);

export const InformationSourceSchema = z.enum([
  'BUSINESS_BRAIN',
  'CURRENT_CAMPAIGN',
  'PREVIOUS_ANSWER',
  'CREATIVE_PREFERENCE',
  'AI_INFERENCE',
  'CREATIVE_HYPOTHESIS',
  'INDUSTRY_KNOWLEDGE',
]);

export const AuthorityLevelSchema = z.enum([
  'AUTHORITATIVE',
  'SUPPORTING',
  'INFERRED',
  'HYPOTHESIS',
  'DOMAIN_GUIDANCE',
]);

export const CreativeQuestionOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  value: z.string().min(1),
  source: z.enum(['INDUSTRY_KNOWLEDGE', 'BUSINESS_BRAIN', 'CAMPAIGN_CONTEXT', 'SYSTEM']),
  confidence: z.number().min(0).max(1).optional(),
});

export const AnswerImpactSchema = z.object({
  decisionImpact: z.number().min(0).max(100),
  creativeRelevance: z.number().min(0).max(100),
  affectedDimensions: z.array(z.string()),
  affectedStates: z.array(z.string() as any),
  potentialStrategyChanges: z.array(z.string()).optional(),
});

export const CreativeQuestionSchema = z.object({
  id: z.string().min(1),
  dimension: z.string().min(1),
  question: z.string().min(1),
  purpose: z.string().min(1),
  inputType: CreativeQuestionInputTypeSchema,
  options: z.array(CreativeQuestionOptionSchema).optional(),
  required: z.boolean(),
  priority: z.number().min(0).max(100),
  userEffort: z.number().min(0).max(100),
  decisionImpact: z.number().min(0).max(100),
  creativeRelevance: z.number().min(0).max(100),
  affectsStates: z.array(z.string() as any),
  affectsDecisions: z.array(z.string()),
  answerImpact: AnswerImpactSchema,
  metadata: z
    .object({
      industryKnowledgeVersion: z.string().optional(),
      source: z.string().optional(),
    })
    .optional(),
});
