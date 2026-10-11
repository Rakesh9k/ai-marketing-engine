/**
 * The vertical contract: for salons and real-estate listings, the facts the copy may state and the
 * facts Truth Check verifies are the same set, taken from what the owner recorded.
 *
 *   business facts -> this contract -> generation prompt -> Truth Check
 *
 * A fact that is not on file is not stated, never filled in to make a check pass.
 */
import { unescapeJson } from './offerContract';

// ── Real estate ─────────────────────────────────────────────────────────────────────────────────

export interface Listing {
  title: string;
  bedrooms?: number;
  bathrooms?: number;
  areaSqft?: number;
  possessionStatus?: 'ready_to_move' | 'under_construction' | 'upcoming';
  amenities?: string[];
}

/** The listing a campaign is about: matched by title against the campaign's product name. */
export function findListing(
  properties: Listing[] | undefined,
  productName?: string
): Listing | undefined {
  const name = (productName ?? '').toLowerCase().trim();
  if (!name || !properties?.length) return undefined;
  return properties.find(
    (p) => p.title.toLowerCase().includes(name) || name.includes(p.title.toLowerCase())
  );
}

const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?';
const POSSESSION_DATE = new RegExp(
  `\\bpossession\\s*(?:date\\s*)?(?:is\\s+)?(?:(?:expected|likely|from|in|by|on)\\s+|[:-]\\s*)*(?:${MONTH}\\s+)?(?:\\d{1,2}(?:st|nd|rd|th)?\\s+)?(?:${MONTH}\\s+)?20\\d{2}\\b`,
  'i'
);

/** A possession DATE ("possession in March 2027"): no record holds one, so any such claim is unsupported. */
export function possessionDateClaim(text: string): boolean {
  return POSSESSION_DATE.test(unescapeJson(text));
}

const POSSESSION_WORDS: Record<string, string> = {
  ready_to_move: 'ready to move',
  under_construction: 'under construction',
  upcoming: 'upcoming',
};

// ── Salon ───────────────────────────────────────────────────────────────────────────────────────

/** Treatments a salon ad might name. A mention of one the owner never recorded is an unsupported claim. */
export const SALON_SERVICE_KEYWORDS: readonly string[] = [
  'keratin',
  'smoothening',
  'rebonding',
  'hair straightening',
  'hair spa',
  'hair treatment',
  'scalp treatment',
  'haircut',
  'hair colour',
  'hair color',
  'highlights',
  'balayage',
  'blow dry',
  'botox',
  'facial',
  'cleanup',
  'clean-up',
  'de-tan',
  'detan',
  'bleach',
  'waxing',
  'threading',
  'bridal makeup',
  'makeup',
  'manicure',
  'pedicure',
  'nail art',
  'massage',
  'body polish',
  'mehendi',
  'mehndi',
  'beard trim',
  'shaving',
];

interface BrainLike {
  verticalProfile?: {
    services?: Array<{ name: string }>;
    packages?: Array<{ name: string }>;
    properties?: Listing[];
  };
  offerings?: { signature?: string[] };
}

interface ContractInput {
  vertical?: string;
  businessName?: string;
  productName?: string;
  businessBrain?: BrainLike;
}

/** The owner's known salon offerings in their own words, without duplicates. */
function salonOfferingNames(input: ContractInput): { services: string[]; packages: string[] } {
  const brain = input.businessBrain;
  const unique = (names: Array<string | undefined>) => {
    const seen = new Set<string>();
    return names
      .map((n) => (n ?? '').trim())
      .filter((n) => {
        if (!n || seen.has(n.toLowerCase())) return false;
        seen.add(n.toLowerCase());
        return true;
      });
  };
  return {
    services: unique([
      ...(brain?.verticalProfile?.services ?? []).map((s) => s.name),
      ...(brain?.offerings?.signature ?? []),
      input.productName,
    ]),
    packages: unique((brain?.verticalProfile?.packages ?? []).map((p) => p.name)),
  };
}

/** Everything the owner has recorded that the copy may name, lower-cased for matching. */
export function knownSalonOfferings(input: ContractInput): string[] {
  const { services, packages } = salonOfferingNames(input);
  return [...services, ...packages].map((n) => n.toLowerCase());
}

/** Treatment keywords the copy names that match none of the owner's known offerings. */
export function unsupportedSalonServices(
  text: string,
  knownLower: string[],
  businessName?: string
): string[] {
  let source = unescapeJson(text).toLowerCase();
  // The business's own name ("Glow Facial Studio") is not a claim about a service.
  const name = (businessName ?? '').toLowerCase().trim();
  if (name) source = source.split(name).join(' ');

  const supported = (keyword: string) =>
    knownLower.some((k) => k.includes(keyword) || (k.length >= 4 && keyword.includes(k)));
  const unsupported = SALON_SERVICE_KEYWORDS.filter((k) => source.includes(k) && !supported(k));
  // "bridal makeup" already covers "makeup"
  return unsupported.filter((k) => !unsupported.some((other) => other !== k && other.includes(k)));
}

// ── The prompt block ────────────────────────────────────────────────────────────────────────────

function salonBlock(input: ContractInput): string[] {
  const { services, packages } = salonOfferingNames(input);
  const lines: string[] = [];
  lines.push(
    services.length > 0
      ? `SERVICES: the owner's known services are: ${services.join(', ')}. Mention only these services, by these names. Do not name or promise any other treatment (for example keratin, bridal makeup, hair spa) unless it is in this list.`
      : 'SERVICES: no specific services are on file. Do not name any specific treatment or service; describe the salon in general terms.'
  );
  lines.push(
    packages.length > 0
      ? `PACKAGES: the owner's known packages are: ${packages.join(', ')}. If you mention a package, use one of these exact names.`
      : 'PACKAGES: none are on file. Do not mention a package.'
  );
  return lines;
}

function realEstateBlock(input: ContractInput): string[] {
  const listing = findListing(input.businessBrain?.verticalProfile?.properties, input.productName);
  if (!listing) {
    return [
      'LISTING FACTS: there are no recorded facts for this listing. Do not state bedrooms, bathrooms, area, possession status or amenities.',
    ];
  }
  const facts: string[] = [];
  const missing: string[] = [];

  if (listing.bedrooms !== undefined) facts.push(`${listing.bedrooms} bedrooms`);
  else missing.push('bedrooms');
  if (listing.bathrooms !== undefined) facts.push(`${listing.bathrooms} bathrooms`);
  else missing.push('bathrooms');
  if (listing.areaSqft !== undefined) facts.push(`${listing.areaSqft} sq ft`);
  else missing.push('area');
  if (listing.possessionStatus)
    facts.push(
      `possession: ${POSSESSION_WORDS[listing.possessionStatus] ?? listing.possessionStatus}`
    );
  else missing.push('possession status');
  if (listing.amenities && listing.amenities.length > 0)
    facts.push(`amenities: ${listing.amenities.join(', ')}`);
  else missing.push('amenities');

  const lines = [
    `LISTING FACTS (the owner's record for this listing): ${facts.join('; ')}.`,
    'State only these facts about the property. Do not state a bedroom count, bathroom count, area, possession status or amenity that is not listed above. Never state a possession date.',
  ];
  if (missing.length > 0) {
    lines.push(`Not recorded for this listing: ${missing.join(', ')} (do not state them).`);
  }
  if (listing.possessionStatus === 'upcoming') {
    lines.push('Do not say it is "ready to move" or "under construction".');
  }
  if (listing.possessionStatus === 'under_construction') {
    lines.push(
      'It is UNDER CONSTRUCTION: never call it "ready to move", "ready possession" or "immediate possession", and never ask or imply that it is (no "Ready to move?" stickers or hooks).'
    );
  }
  if (listing.possessionStatus === 'ready_to_move') {
    lines.push('Do not say it is "under construction" or "upcoming".');
  }
  return lines;
}

/** Rules about vertical facts for the copywriter; empty for verticals with no contract. */
export function buildVerticalContractPrompt(input: ContractInput): string {
  const lines =
    input.vertical === 'salon'
      ? salonBlock(input)
      : input.vertical === 'real_estate'
        ? realEstateBlock(input)
        : [];
  return lines.map((line) => `- ${line}`).join('\n');
}
