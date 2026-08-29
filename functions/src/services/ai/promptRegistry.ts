import { z } from 'zod';

/**
 * Prompt Version Registry
 * Manages prompt versions for reproducibility and A/B testing
 */

export const PromptVersionSchema = z.object({
  name: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  stage: z.number().min(1).max(13),
  purpose: z.string(),
  inputSchema: z.any(),
  outputSchema: z.any(),
  systemPrompt: z.string(),
  template: z.string(),
  model: z.string(),
  temperature: z.number(),
  maxTokens: z.number(),
  createdAt: z.string().datetime(),
  createdBy: z.string(),
  changelog: z.string(),
  testCases: z
    .array(
      z.object({
        name: z.string(),
        input: z.any(),
        expectedOutput: z.any().optional(),
        mustContain: z.array(z.string()).optional(),
        mustNotContain: z.array(z.string()).optional(),
      })
    )
    .default([]),
});

export type PromptVersion = z.infer<typeof PromptVersionSchema>;
export type PromptTestCase = z.infer<typeof PromptVersionSchema>['testCases'][0];

/**
 * Prompt Registry - Centralized prompt version management
 */
export class PromptRegistry {
  private versions: Map<string, PromptVersion> = new Map();

  /**
   * Register a new prompt version
   */
  register(version: PromptVersion): void {
    const key = this.getKey(version.name, version.version);
    this.versions.set(key, version);
  }

  /**
   * Get a specific prompt version
   */
  get(name: string, version?: string): PromptVersion | undefined {
    if (version) {
      return this.versions.get(this.getKey(name, version));
    }
    // Return latest stable version
    const versions = Array.from(this.versions.values())
      .filter((v) => v.name === name)
      .sort((a, b) => this.compareVersions(b.version, a.version));
    return versions[0];
  }

  /**
   * Get all versions for a prompt name
   */
  getAllVersions(name: string): PromptVersion[] {
    return Array.from(this.versions.values())
      .filter((v) => v.name === name)
      .sort((a, b) => this.compareVersions(b.version, a.version));
  }

  /**
   * Get the latest stable version for a prompt
   */
  getLatest(name: string): PromptVersion | undefined {
    return this.get(name);
  }

  private getKey(name: string, version: string): string {
    return `${name}_v${version}`;
  }

  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      if (aPart !== bPart) return aPart - bPart;
    }
    return 0;
  }
}

// Export singleton instance
export const promptRegistry = new PromptRegistry();

/**
 * Pre-register core pipeline prompts
 */
export function registerCorePrompts(): void {
  // Stage 1: Business Understanding
  promptRegistry.register({
    name: 'business_understanding',
    version: '1.0.0',
    stage: 1,
    purpose: 'Extract structured business context from Business Brain for downstream stages',
    inputSchema: {},
    outputSchema: {},
    systemPrompt: 'You are a business analyst for an Indian local marketing AI...',
    template: `BUSINESS BRAIN DATA:\n{{JSON.stringify(businessBrain, null, 2)}}\n\nTASK:\nAnalyze the Business Brain and output structured JSON with:\n1. businessSummary: 2-3 sentence summary for campaign context\n2. businessFacts: Array of verified facts with category, fact, source, criticality\n3. missingInformation: Critical facts not provided\n4. constraints: Business rules that limit creative freedom\n5. verticalContext: Restaurant-specific context`,
    model: 'gemini-1.5-pro',
    temperature: 0.3,
    maxTokens: 4096,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
    changelog: 'Initial version',
    testCases: [],
  });

  // Stage 4: Campaign Strategy
  promptRegistry.register({
    name: 'campaign_strategy',
    version: '1.0.0',
    stage: 4,
    purpose: 'Determine the core marketing strategy, angle, and hook',
    inputSchema: {},
    outputSchema: {},
    systemPrompt: 'You are a senior marketing strategist for Indian local restaurants...',
    template: `CONTEXT HIERARCHY (HIGHEST AUTHORITY FIRST):
1. BUSINESS FACTS (TRUTH): {{JSON.stringify(businessContext.businessFacts, null, 2)}}
2. PRODUCT FACTS (TRUTH): {{JSON.stringify(productContext.productFacts, null, 2)}}
3. BRAND RULES: {{JSON.stringify(brandRules, null, 2)}}
4. CAMPAIGN INPUT (USER SELECTIONS): {{JSON.stringify(campaignInput, null, 2)}}

TASK: Create a campaign strategy that drives WhatsApp orders...`,
    model: 'gemini-1.5-pro',
    temperature: 0.5,
    maxTokens: 4096,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
    changelog: 'Initial version',
    testCases: [],
  });

  // Stage 6: Copy Generation
  promptRegistry.register({
    name: 'copy_generation',
    version: '1.0.0',
    stage: 6,
    purpose: 'Generate all text assets for the campaign pack',
    inputSchema: {},
    outputSchema: {},
    systemPrompt: 'You are a Hyderabadi marketing copywriter...',
    template: `CONTEXT HIERARCHY:
1. BUSINESS FACTS (IMMUTABLE): {{JSON.stringify(businessContext.businessFacts, null, 2)}}
2. PRODUCT FACTS (IMMUTABLE): {{JSON.stringify(productContext.productFacts, null, 2)}}
3. CAMPAIGN STRATEGY: {{JSON.stringify(campaignStrategy, null, 2)}}
4. LOCALIZATION STRATEGY: {{JSON.stringify(localizationStrategy, null, 2)}}
5. BRAND TONE: {{brandTone}}
6. CAMPAIGN STYLE: {{campaignStyle}}
7. CAMPAIGN INPUT: {{JSON.stringify(campaignInput, null, 2)}}

MANDATORY REQUIREMENTS:
- Prices: ALWAYS use exact offer price
- Business name: {{businessContext.businessSummary}}
- WhatsApp number: {{businessContext.businessFacts.contact.whatsapp}}
- Location: {{businessContext.businessFacts.location.locality}}
- Product: {{productContext.productSummary}}
- NO invented dishes, hours, reviews, guarantees, medical claims
- Language: {{localizationProfile.primaryLanguage}} + {{localizationProfile.secondaryLanguage}} with {{localizationProfile.languageMixing}} mixing
- Regional style: {{localizationProfile.regionalStyle}}
- Campaign style: {{campaignStyle}}`,
    model: 'gemini-1.5-pro',
    temperature: 0.7,
    maxTokens: 8192,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
    changelog: 'Initial version',
    testCases: [],
  });

  // Stage 9: Truth Validation
  promptRegistry.register({
    name: 'truth_validation',
    version: '1.0.0',
    stage: 9,
    purpose: 'Verify no invented business facts in generated output',
    inputSchema: {},
    outputSchema: {},
    systemPrompt:
      'You are a fact-checker for restaurant marketing. Be strict — any invented fact is a violation.',
    template: `KNOWN BUSINESS FACTS (GROUND TRUTH):
{{JSON.stringify(businessContext.businessFacts, null, 2)}

KNOWN PRODUCT FACTS (GROUND TRUTH):
{{JSON.stringify(productContext.productFacts, null, 2)}

CAMPAIGN INPUT (IMMUTABLE):
{{JSON.stringify(campaignInput, null, 2)}}

GENERATED CAMPAIGN PACK:
{{JSON.stringify(copyPack, null, 2)}}

CHECK FOR VIOLATIONS:
1. PRICES: Every price mention must match exactly
2. PRODUCT NAMES: Must match exactly
3. BUSINESS NAME: Must match exactly
4. LOCATION: Must match exactly
5. CONTACT: WhatsApp number must match exactly
6. HOURS: No invented opening/closing times
7. DELIVERY: No invented radius, fees, times
8. CLAIMS: No "best", "famous", "authentic" unless in business facts
9. REVIEWS: No invented ratings, testimonials, customer quotes
10. GUARANTEES: No invented guarantees
11. AVAILABILITY: No "limited quantity" unless in offer terms
12. MEDICAL: No health claims`,
    model: 'gemini-1.5-pro',
    temperature: 0.2,
    maxTokens: 4096,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
    changelog: 'Initial version',
    testCases: [],
  });

  // Stage 10: Quality Validation
  promptRegistry.register({
    name: 'quality_validation',
    version: '1.0.0',
    stage: 10,
    purpose: 'Verify brand compliance, format compliance, readability',
    inputSchema: {},
    outputSchema: {},
    systemPrompt: 'Verify campaign pack quality against brand and platform standards.',
    template: `BRAND KIT:
{{JSON.stringify(brandKit, null, 2)}}

CAMPAIGN STRATEGY:
{{JSON.stringify(campaignStrategy, null, 2)}}

COPY PACK:
{{JSON.stringify(copyPack, null, 2)}}

CHECK:
1. BRAND TONE: Consistent with {{brandKit.tone}} across all assets
2. CHARACTER LIMITS: Instagram caption ≤2200, ad copy limits, headline ≤100
3. CTA PRESENCE: Every asset has clear CTA
4. HASHTAGS: Relevant (Hyderabad, category, offer, locality)
5. READABILITY: Short sentences, conversational, scannable
6. IMAGE PROMPTS: Specific, actionable, include brand colors, text overlays
7. FORMAT COMPLIANCE: Story frames 3-5, Reel scenes 3-4, all required fields
8. VISUAL CONSISTENCY: Brand colors, logo placement mentioned in prompts`,
    model: 'gemini-1.5-pro',
    temperature: 0.3,
    maxTokens: 4096,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
    changelog: 'Initial version',
    testCases: [],
  });

  // Stage 11: Safety Validation
  promptRegistry.register({
    name: 'safety_validation',
    version: '1.0.0',
    stage: 11,
    purpose: 'Check for prohibited content, misleading claims, safety issues',
    inputSchema: {},
    outputSchema: {},
    systemPrompt: 'SAFETY CHECKLIST — FLAG ANY VIOLATION',
    template: `SAFETY CHECKLIST — FLAG ANY VIOLATION:

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
{{JSON.stringify(copyPack, null, 2)}}

OUTPUT FORMAT: Must match the provided JSON schema exactly.`,
    model: 'gemini-1.5-pro',
    temperature: 0.2,
    maxTokens: 4096,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
    changelog: 'Initial version',
    testCases: [],
  });
}
