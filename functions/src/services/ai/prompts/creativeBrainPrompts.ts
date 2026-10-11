import type { CreativeBrainInput, CreativeOpportunity } from '../creativeBrain.types';

/**
 * Builds prompt for Stage 1 of Creative Brain: Opportunity Formation
 */
/** A fact the business gave, or the plain statement that it did not. Unknown is never filled in. */
const known = (value: unknown, format: (v: string) => string = (v) => v): string => {
  const text = value === undefined || value === null ? '' : String(value).trim();
  return text === '' || text === 'undefined' ? 'not provided' : format(text);
};

export function buildOpportunityFormationPrompt(input: CreativeBrainInput): string {
  const {
    businessBrain,
    vertical,
    intent,
    businessUnderstanding,
    productUnderstanding,
    conflictConstraints,
  } = input;
  const productName = input.productContext?.name || intent.offer.headline;
  const loc = businessBrain?.identity?.location;
  const place = [loc?.locality, loc?.city, loc?.state].filter(Boolean).join(', ');
  const rules = businessBrain?.businessRules;
  const originalPrice = intent.offer.originalPrice
    ? ` (Original: ₹${intent.offer.originalPrice})`
    : '';
  // Delivery terms are a food-delivery concept: other kinds of business are not asked about them unless the owner gave them.
  const deliveryLines =
    vertical === 'restaurant' || rules?.deliveryRadiusKm !== undefined || rules?.minimumOrder !== undefined
      ? `- Delivery radius: ${known(rules?.deliveryRadiusKm, (v) => `${v} km`)}
- Minimum order: ${known(rules?.minimumOrder, (v) => `₹${v}`)}
`
      : '';
  const validity =
    intent.offer.validityStart && intent.offer.validityEnd
      ? `${intent.offer.validityStart} to ${intent.offer.validityEnd}`
      : 'not provided';

  return `You are acting as the Creative Brain Strategic Reasoning Engine for a local ${vertical} business.

BUSINESS CONTEXT (anything marked "not provided" is UNKNOWN):
- Name: ${known(businessBrain?.identity?.name)}
- Category/Vertical: ${vertical} (${businessBrain?.identity?.industry || ''} / ${businessBrain?.identity?.subcategory || ''})
- Location: ${known(place)}
- Tone: ${known(businessBrain?.brand?.tone)}
- Target Customer: ${known(businessBrain?.audience?.targetCustomer || intent.localization.audienceDescription)}
- Positioning USP: ${known((businessBrain as any)?.positioning?.usp)}
${deliveryLines}
CAMPAIGN INTENT:
- Objective: ${intent.objective}
- Offer Headline: ${known(intent.offer.headline)}
- Offer Description: ${known(intent.offer.description)}
- Offer Pricing: ${intent.offer.price ? `₹${intent.offer.price}` : 'not provided'}${originalPrice}
- Offer Validity: ${validity}
- Target Audience Localities: ${known(intent.audience.localities.join(', '))}
- Target CTA: ${intent.cta}

STAGE 1 & 2 EXTRACTED KNOWLEDGE:
- Business Facts Summary: ${known(businessUnderstanding?.businessSummary)}
- Key Product/Service: ${productName}
- Product Visual Hints: ${known(productUnderstanding?.visualAttributes?.keyVisualElements?.join(', '))}

NON-NEGOTIABLE CONSTRAINTS:
${conflictConstraints.directives.length > 0 ? conflictConstraints.directives.map((d) => `- ${d}`).join('\n') : '- Respect exact business facts and prices.'}
- A fact marked "not provided" is unknown. You may suggest an angle that fits it, but never state an unknown as a fact: no price, discount, delivery distance, minimum order, date, opening time or claim that is not listed above.

TASK:
Analyze the strategic marketing opportunity for this specific business, product, and campaign.
Your goal is to FIND THE MARKETING OPPORTUNITY — not write finished ad copy, concepts, or visual template instructions.

Key Strategic Invariants:
1. Identify the core customer tension (the conflict between what the customer wants vs what creates friction/hesitation).
2. Connect customer desire & tension with legitimate business strengths and verified offers.
3. Provide explicit strategic fields:
   - audience: specific target group
   - problemOrDesire: what the customer wants/needs
   - marketingObjective: objective of campaign
   - productOrService: verified product
   - offer: verified offer terms
   - customerTension: specific friction/hesitation
   - businessDifferentiator: verified business strength
   - relevantProof: evidence supporting the claim
   - emotionalTerritory: emotional space (e.g. Relief + Togetherness)
   - creativeOpportunity: the strategic opening to exploit
   - strategicRecommendation: actionable strategic guidance
   - thingsToAvoid: strategic traps and unverified claims to avoid

NON-NEGOTIABLE FACTUAL RULES:
- NEVER invent business facts, prices, discounts, ratings, guarantees, delivery claims, certifications, or reviews.
- Distinguish industry possibilities from verified business facts.
- Respond strictly matching the output schema. "confidence" is an integer from 0 to 100.`;
}

/**
 * Builds prompt for Stage 2 of Creative Brain: Candidate Concept Generation
 */
export function buildCandidateConceptsPrompt(
  opportunity: CreativeOpportunity,
  input: CreativeBrainInput,
  candidateCount: number = 3
): string {
  const { businessBrain, vertical, intent, memory } = input;
  const savedStyleInfo = memory.activeSavedStyle
    ? `- Active Saved Style: Tone=${memory.activeSavedStyle.tone}, VisualDensity=${memory.activeSavedStyle.visualDensity}, Humor=${memory.activeSavedStyle.humor}, ColorMode=${memory.activeSavedStyle.colorMode}`
    : '';

  return `You are acting as the Creative Brain Concept Generator for a local ${vertical} business.

STRATEGIC CREATIVE OPPORTUNITY:
- Problem: ${opportunity.problem}
- Customer Tension: ${opportunity.tension}
- Customer Motivation: ${opportunity.motivation}
- Audience Insight: ${opportunity.audienceInsight}
- Strategic Opportunity Statement: ${opportunity.opportunityStatement}
- Desired Audience Response: ${opportunity.desiredAudienceResponse}
- Core Objective: ${intent.objective}

BUSINESS & BRAND CONTEXT:
- Business: ${businessBrain.identity.name} (${businessBrain.identity.location.city})
- Tone: ${businessBrain.brand?.tone || 'not provided'}
- Offer: ${intent.offer.headline}${intent.offer.price > 0 ? ` (Price: ₹${intent.offer.price})` : ''}
${savedStyleInfo}

TASK:
Generate exactly ${candidateCount} structurally diverse Candidate Creative Concepts that exploit this Opportunity.

CRITICAL DIVERSITY REQUIREMENT:
The ${candidateCount} concepts MUST represent meaningfully DIFFERENT creative strategies.
For example:
- Concept 1: Direct Value / Price-Led
- Concept 2: Emotional / Relatable Customer Story
- Concept 3: Local / Cultural / Urgency framing

For each concept, specify:
1. conceptId (e.g. "concept-1", "concept-2", "concept-3")
2. title (short descriptive name)
3. angle (strategic slant)
4. coreIdea (one sentence summary)
5. hookDirection (opening attention grabber)
6. emotionalDriver (one of: 'playful', 'serious', 'professional', 'warm', 'bold', 'premium', 'energetic')
7. audienceFraming (how the customer is addressed)
8. message (core value proposition)
9. offerFraming (how the offer is presented)
10. ctaDirection (CTA strategy)
11. visualPremise (emphasis: 'product-led'|'text-led'|'image-led'|'offer-led', composition: 'hero-product'|'split-composition'|'editorial'|'minimal'|'high-contrast', mood, compositionHints)
12. differentiation (why this concept stands out)
13. expectedResponse (psychological customer response)
14. templateId (e.g. "festival-offer-v1", "new-launch-v1", "value-promo-v1", "hero-spotlight-v1", "local-story-v1")

Respond strictly adhering to the JSON schema.`;
}
