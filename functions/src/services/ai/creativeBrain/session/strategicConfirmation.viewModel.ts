import type { CreativeOpportunity } from '../../creativeBrain.types';
import { StrategicConfirmationError } from './strategicConfirmation.types';

/**
 * Deterministic, LLM-free presentation of a locked CreativeOpportunity for the "Here's what I understood" step.
 * Only plain strings leave this module: no scores, confidence, authority labels or ids.
 * Every sentence is built from fields that already passed Phase 8's factuality gate; nothing is invented.
 */
export interface StrategicConfirmationViewModel {
  readonly headline: string;
  readonly campaignSummary: string;
  readonly opportunityLead: string;
  readonly opportunityStatement: string;
  readonly supportingReason?: string;
  readonly confirmationActions: {
    readonly confirm: string;
    readonly change: string;
    readonly exploreAlternative: string;
  };
}

const ACTIONS = {
  confirm: "That's right",
  change: 'Change something',
  exploreAlternative: "Let's explore another direction",
} as const;

// Objective code -> the owner's own words. Keyed by objective (a campaign input), never by industry.
const OBJECTIVE_PHRASES: Readonly<Record<string, string>> = {
  weekend_offer: 'bring in more weekend orders',
  new_dish: 'introduce something new',
  festival: 'make the most of the festive season',
  discount: 'drive sales with your offer',
  brand_awareness: 'get your business noticed',
  service_promotion: 'bring in more customers for your service',
  package_promotion: 'bring in more customers for your package',
  appointment_promotion: 'fill more appointments',
  new_service: 'introduce your new service',
  property_promotion: 'bring in more enquiries for your property',
  new_listing: 'get your new listing noticed',
  open_house: 'bring people to your open house',
  project_promotion: 'bring in more enquiries for your project',
  product_promotion: 'bring in more customers for your product',
  new_product: 'introduce your new product',
};

const clean = (value: string | undefined): string | undefined => {
  const trimmed = value?.replace(/\s+/g, ' ').trim();
  return trimmed ? trimmed : undefined;
};

const sentence = (value: string): string => (/[.!?]$/.test(value) ? value : `${value}.`);

const lowerFirst = (value: string): string => value.charAt(0).toLowerCase() + value.slice(1);

function humanize(code: string): string {
  return code.replace(/_/g, ' ').trim();
}

export function buildCampaignSummary(opportunity: CreativeOpportunity): string {
  const audience = clean(opportunity.audience);
  const product = clean(opportunity.productOrService);
  const offer = clean(opportunity.offer);
  const objectiveCode = clean(opportunity.marketingObjective);
  const objective = objectiveCode ? (OBJECTIVE_PHRASES[objectiveCode] ?? humanize(objectiveCode)) : undefined;

  // Product and offer are only mentioned when the opportunity actually carries them.
  const what = product && offer ? `${product} (${offer})` : (product ?? offer);

  const parts: string[] = [];
  if (objective && audience) parts.push(`${objective} from ${audience}`);
  else if (objective) parts.push(objective);
  else if (audience) parts.push(`reach ${audience}`);
  if (what) parts.push(`with your ${what}`);

  if (parts.length === 0) {
    // Safest available summary: say only what we are working from.
    return "Here's the campaign direction I'm working from.";
  }
  return `You're trying to ${parts.join(' ')}.`;
}

export function buildSupportingReason(opportunity: CreativeOpportunity): string | undefined {
  const desire = clean(opportunity.problemOrDesire);
  const tension = clean(opportunity.customerTension);
  const differentiator = clean(opportunity.businessDifferentiator);
  const recommendation = clean(opportunity.strategicRecommendation);

  const sentences: string[] = [];
  if (desire) sentences.push(sentence(desire));
  if (tension && tension !== desire) sentences.push(sentence(tension));
  if (differentiator) sentences.push(sentence(`Your edge: ${lowerFirst(differentiator)}`));
  if (recommendation) sentences.push(sentence(recommendation));

  // One concise explanation, not a dump of the object.
  return sentences.length > 0 ? sentences.slice(0, 3).join(' ') : undefined;
}

export function buildStrategicConfirmationViewModel(
  opportunity: CreativeOpportunity | undefined | null
): StrategicConfirmationViewModel {
  if (!opportunity) {
    throw new StrategicConfirmationError('NO_LOCKED_OPPORTUNITY', 'No locked opportunity to present.');
  }

  const statement = clean(opportunity.creativeOpportunity) ?? clean(opportunity.opportunityStatement);
  if (!statement) {
    throw new StrategicConfirmationError(
      'MALFORMED_OPPORTUNITY',
      'The opportunity has no strategic statement; refusing to render partial strategy.'
    );
  }

  return {
    headline: "Here's what I understood",
    campaignSummary: buildCampaignSummary(opportunity),
    opportunityLead: 'The strongest opportunity I see is',
    opportunityStatement: statement,
    supportingReason: buildSupportingReason(opportunity),
    confirmationActions: { ...ACTIONS },
  };
}
