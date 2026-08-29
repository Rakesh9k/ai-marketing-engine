import {
  TruthValidationSchema,
  QualityValidationSchema,
  SafetyValidationSchema,
  type TruthValidationOutput,
  type QualityValidationOutput,
  type SafetyValidationOutput,
  type TruthViolation,
  type QualityIssue,
  type SafetyViolation,
} from './validation';
import { generateStructuredText } from './index';
import { z } from 'zod';

/**
 * Truth Validation Stage
 * Verifies no invented business facts in generated output
 */
export async function runTruthValidation(
  copyPack: any,
  generatedImages: any,
  businessContext: any,
  productContext: any,
  campaignInput: any
): Promise<TruthValidationOutput> {
  const prompt = buildTruthValidationPrompt(
    copyPack,
    generatedImages,
    businessContext,
    productContext,
    campaignInput
  );
  return generateStructuredText(prompt, {
    passed: z.boolean(),
    violations: z.array(
      z.object({
        assetId: z.string(),
        assetType: z.string(),
        field: z.string(),
        expected: z.string(),
        actual: z.string(),
        severity: z.enum(['critical', 'major', 'minor']),
        suggestion: z.string(),
      })
    ),
    assetStatus: z.record(z.enum(['passed', 'failed', 'warning'])),
  });
}

function buildTruthValidationPrompt(
  copyPack: any,
  generatedImages: any,
  businessContext: any,
  productContext: any,
  campaignInput: any
): string {
  return `SYSTEM RULES:
You are a fact-checker for restaurant marketing. Verify EVERY claim in the generated campaign against known business facts. Be strict — any invented fact is a violation.

KNOWN BUSINESS FACTS (GROUND TRUTH):
${JSON.stringify(businessContext?.businessFacts || [], null, 2)}

KNOWN PRODUCT FACTS (GROUND TRUTH):
${JSON.stringify(productContext?.productFacts || [], null, 2)}

CAMPAIGN INPUT (IMMUTABLE):
${JSON.stringify(campaignInput, null, 2)}

GENERATED CAMPAIGN PACK:
${JSON.stringify(copyPack, null, 2)}

GENERATED IMAGES: ${generatedImages ? 'Available' : 'Not available'}

CHECK FOR VIOLATIONS:
1. PRICES: Every price mention must match ₹${campaignInput?.offerPrice} exactly
2. PRODUCT NAMES: Must match ${campaignInput?.productName} exactly
3. BUSINESS NAME: Must match exactly
4. LOCATION: Must match ${campaignInput?.businessLocation?.locality || campaignInput?.businessLocation?.city}
5. CONTACT: WhatsApp number must match exactly
6. HOURS: No invented opening/closing times
7. DELIVERY: No invented radius, fees, times
8. CLAIMS: No "best", "famous", "authentic" unless in business facts
9. REVIEWS: No invented ratings, testimonials, customer quotes
10. GUARANTEES: No invented guarantees
11. AVAILABILITY: No "limited quantity" unless in offer terms
12. MEDICAL: No health claims (critical for future salon vertical)

OUTPUT FORMAT: Must match the provided JSON schema exactly.

Severity Rules:
- critical: Wrong price, wrong product, wrong contact → Asset FAILED
- major: Wrong location, invented hours, fake claim → Asset FAILED  
- minor: Slight phrasing deviation → WARNING`;
}

/**
 * Quality Validation Stage
 * Verifies brand compliance, format compliance, readability
 */
export async function runQualityValidation(
  copyPack: any,
  generatedImages: any,
  brandKit: any,
  campaignStrategy: any
): Promise<any> {
  const prompt = buildQualityValidationPrompt(
    copyPack,
    generatedImages,
    brandKit,
    campaignStrategy
  );
  return generateStructuredText(prompt, {
    passed: z.boolean(),
    issues: z.array(
      z.object({
        assetId: z.string(),
        assetType: z.string(),
        issue: z.string(),
        severity: z.enum(['high', 'medium', 'low']),
        suggestion: z.string(),
      })
    ),
    assetScores: z.record(z.number()),
  });
}

function buildQualityValidationPrompt(
  copyPack: any,
  generatedImages: any,
  brandKit: any,
  campaignStrategy: any
): string {
  return `Verify campaign pack quality against brand and platform standards.

BRAND KIT:
${JSON.stringify(brandKit, null, 2)}

CAMPAIGN STRATEGY:
${JSON.stringify(campaignStrategy, null, 2)}

COPY PACK:
${JSON.stringify(copyPack, null, 2)}

CHECK:
1. BRAND TONE: Consistent with ${brandKit?.tone || 'friendly'} across all assets
2. CHARACTER LIMITS: Instagram caption ≤2200, ad copy limits, headline ≤100
3. CTA PRESENCE: Every asset has clear CTA
4. HASHTAGS: Relevant (Hyderabad, category, offer, locality)
5. READABILITY: Short sentences, conversational, scannable
6. IMAGE PROMPTS: Specific, actionable, include brand colors, text overlays
7. FORMAT COMPLIANCE: Story frames 3-5, Reel scenes 3-4, all required fields
8. VISUAL CONSISTENCY: Brand colors, logo placement mentioned in prompts

OUTPUT FORMAT: Must match the provided JSON schema exactly.`;
}

/**
 * Safety Validation Stage
 * Checks for prohibited content, misleading claims, safety issues
 */
export async function runSafetyValidation(copyPack: any, generatedImages: any): Promise<any> {
  const prompt = buildSafetyValidationPrompt(copyPack, generatedImages);
  return generateStructuredText(prompt, {
    passed: z.boolean(),
    violations: z.array(
      z.object({
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
      })
    ),
  });
}

function buildSafetyValidationPrompt(copyPack: any, generatedImages: any): string {
  return `SAFETY CHECKLIST — FLAG ANY VIOLATION:

1. MEDICAL CLAIMS: Treatment, cure, health benefit, "doctor recommended", "clinically proven"
2. MISLEADING URGENCY: "Only 2 left", "Ends in 1 hour", "Last chance" — unless factual
3. FAKE SOCIAL PROOF: "Rated 5 stars", "1000+ customers love", "Best in city" — invented
4. GUARANTEED RESULTS: "Guaranteed weight loss", "100% satisfaction", "Risk-free"
5. COPYRIGHT: Celebrity names, brand names, movie/TV references, logos
6. HATE/DISCRIMINATION: Content targeting protected groups
7. ADULT/VIOLENCE: Sexual, violent, graphic content
8. ILLEGAL: Promotion of illegal activities
9. PII: Phone numbers, emails, addresses not from business context
10. POLITICAL/RELIGIOUS: Political messaging, religious proselytizing (except festival greetings)

GENERATED CONTENT:
${JSON.stringify(copyPack, null, 2)}

OUTPUT FORMAT: Must match the provided JSON schema exactly.`;
}
