import type { DraftFieldPath, FactValue, IndustryId, Known } from './fields';
import { asString, OWNER_ROLE_IDS } from './fields';
import { normalizePhone } from './phone';
import {
  AUDIENCE_PRESETS,
  DELIVERY_FIRST_SUBCATEGORIES,
  INDUSTRIES,
  OFFERING_PRESETS,
  SUBCATEGORIES,
  type Option,
} from './taxonomy';

/**
 * How much a fact matters. The owner is never blocked by anything below `required`.
 *   required      we cannot build a useful Business Brain without it
 *   useful        noticeably better output with it; skippable
 *   optional      nice to have; only ever offered, never pushed
 *   discoverable  Mitra should find it (logo, menu, site) and ask only to confirm
 */
export type Importance = 'required' | 'useful' | 'optional' | 'discoverable';

/** text = one line, long = a few sentences, choice = pick one, multi = pick several (and add your own). */
export type InputKind = 'text' | 'long' | 'choice' | 'multi';

export const MAX_MULTI = 5;

type Resolvable<T> = T | ((known: Known) => T);

export interface QuestionDefinition {
  id: string;
  /** The draft field this answer fills. One question, one fact. */
  field: DraftFieldPath;
  /** Questions in the same group may appear together (never more than MAX_AT_ONCE). */
  group: string;
  /** Lower asks first. */
  priority: number;
  importance: Importance;
  /**
   * Why this question exists, shown to the owner as "why I'm asking". Every question must have
   * one; the engine test fails otherwise.
   */
  purpose: Resolvable<string>;
  input: Resolvable<InputKind>;
  prompt: Resolvable<string>;
  /** Short heading for this answer in the recap ("Your business"). */
  recapLabel: string;
  placeholder?: string;
  options?: (known: Known) => Option[];
  /** For choice questions: lets the owner type their own answer instead (the "Other" path). */
  allowCustom?: boolean;
  /** Returns a message when the current value is not acceptable, else undefined. */
  validate?: (value: string) => string | undefined;
  inputMode?: 'text' | 'tel';
  autoComplete?: string;
  maxLength?: number;
  /** Shown under a pre-filled value that Mitra read from the owner's own sign-in. */
  suggestionNote?: string;
  /** Only ask when this holds. Omitted = always eligible. */
  condition?: (known: Known) => boolean;
  /** Not eligible yet, but will be once earlier answers arrive; counted so progress doesn't jump. */
  expectedLater?: boolean;
}

const ROLE_LABELS: Record<(typeof OWNER_ROLE_IDS)[number], string> = {
  owner: 'Owner',
  founder: 'Founder',
  manager: 'Manager',
  marketing: 'Marketing',
  team_member: 'Team member',
  other: 'Other',
};

const industryOf = (known: Known): IndustryId =>
  (asString(known['identity.industry']) as IndustryId) ?? 'other';
const subcategoryOf = (known: Known): string | undefined => asString(known['identity.subcategory']);
const isDeliveryFirst = (known: Known): boolean =>
  industryOf(known) === 'restaurant_food' &&
  DELIVERY_FIRST_SUBCATEGORIES.includes(subcategoryOf(known) ?? '');

const OFFERING_PROMPTS: Partial<Record<IndustryId, string>> = {
  restaurant_food: 'What are you best known for?',
  salon_beauty: 'What service do customers come to you for most?',
  real_estate: 'What kind of properties do you want to sell most?',
  retail: 'What do customers mainly buy from you?',
};

const WALK_IN_INDUSTRIES: IndustryId[] = [
  'restaurant_food',
  'salon_beauty',
  'retail',
  'fitness',
  'hospitality',
  'health_wellness',
];

/** Same rules as the server (parity-tested), so the owner hears about a bad number right here. */
export function isPlausibleWhatsApp(value: string): string | undefined {
  return normalizePhone(value) === null
    ? 'Enter a mobile number like 98765 43210, or include the country code, e.g. +44 7700 900123.'
    : undefined;
}

export const QUESTIONS: QuestionDefinition[] = [
  {
    id: 'owner-name',
    field: 'owner.name',
    group: 'about-you',
    priority: 10,
    importance: 'required',
    purpose: 'So I can talk to you like a person, not a form.',
    input: 'text',
    prompt: 'What should I call you?',
    recapLabel: 'You',
    placeholder: 'Your first name',
    autoComplete: 'given-name',
    maxLength: 60,
    suggestionNote: 'From your Google account. Change it if you go by something else.',
  },
  {
    id: 'owner-role',
    field: 'owner.role',
    group: 'about-you',
    priority: 11,
    importance: 'useful',
    purpose: 'It helps me pitch ideas at the right level for how you work.',
    input: 'choice',
    prompt: "And what's your role in the business?",
    recapLabel: 'Your role',
    options: () => OWNER_ROLE_IDS.map((id) => ({ id, label: ROLE_LABELS[id] })),
  },
  {
    id: 'identity-industry',
    field: 'identity.industry',
    group: 'business',
    priority: 20,
    importance: 'required',
    purpose: 'Everything I write starts from knowing your line of work.',
    input: 'choice',
    prompt: 'What kind of business are we working with?',
    recapLabel: 'Your business',
    options: () => INDUSTRIES,
  },
  {
    id: 'identity-subcategory',
    field: 'identity.subcategory',
    group: 'business-detail',
    priority: 30,
    importance: 'required',
    purpose: (known) => SUBCATEGORIES[industryOf(known)].why,
    input: (known) => (SUBCATEGORIES[industryOf(known)].options.length > 0 ? 'choice' : 'text'),
    prompt: (known) => SUBCATEGORIES[industryOf(known)].prompt,
    recapLabel: 'More specifically',
    placeholder: 'e.g. Home-style tiffins, delivered',
    maxLength: 80,
    options: (known) => SUBCATEGORIES[industryOf(known)].options,
    allowCustom: true,
    // Depends on the previous answer: the next question is chosen from what Mitra now knows.
    condition: (known) => known['identity.industry'] !== undefined,
    expectedLater: true,
  },
  {
    id: 'identity-name',
    field: 'identity.name',
    group: 'identity',
    priority: 40,
    importance: 'required',
    purpose: 'So I write as your business, not about one.',
    input: 'text',
    prompt: "What's your business called?",
    recapLabel: 'Business name',
    placeholder: 'e.g. Biryani House',
    autoComplete: 'organization',
    maxLength: 100,
  },
  {
    id: 'identity-city',
    field: 'identity.city',
    group: 'location',
    priority: 50,
    importance: 'required',
    purpose: 'Offers and local references should sound like where you actually are.',
    input: 'text',
    prompt: (known) =>
      isDeliveryFirst(known) ? 'Which city do you deliver from?' : 'Which city are you based in?',
    recapLabel: 'City',
    placeholder: 'e.g. Hyderabad',
    autoComplete: 'address-level2',
    maxLength: 80,
  },
  {
    id: 'identity-state',
    field: 'identity.state',
    group: 'location',
    priority: 51,
    importance: 'required',
    purpose: 'Regional language and festivals differ by state.',
    input: 'text',
    prompt: 'And which state?',
    recapLabel: 'State',
    placeholder: 'e.g. Telangana',
    autoComplete: 'address-level1',
    maxLength: 80,
  },
  {
    id: 'contact-whatsapp',
    field: 'contact.whatsapp',
    group: 'contact',
    priority: 60,
    importance: 'required',
    purpose: "It's where your customers will message you. I put it on your campaigns.",
    input: 'text',
    prompt: "What's your WhatsApp number?",
    recapLabel: 'WhatsApp',
    placeholder: '98765 43210',
    inputMode: 'tel',
    autoComplete: 'tel',
    maxLength: 20,
    validate: isPlausibleWhatsApp,
  },
  {
    id: 'offering-signature',
    field: 'offering.signature',
    group: 'offering',
    priority: 70,
    importance: 'useful',
    purpose: 'These become the first things I write about, so I get your business right.',
    input: 'multi',
    prompt: (known) =>
      isDeliveryFirst(known)
        ? 'What do people usually order from you?'
        : (OFFERING_PROMPTS[industryOf(known)] ?? "What's the main thing people come to you for?"),
    recapLabel: 'Known for',
    placeholder: 'Add your own',
    options: (known) => OFFERING_PRESETS[industryOf(known)].map((label) => ({ id: label, label })),
    allowCustom: true,
    condition: (known) => known['identity.subcategory'] !== undefined,
    expectedLater: true,
  },
  {
    id: 'audience-primary',
    field: 'audience.primary',
    group: 'audience',
    priority: 80,
    importance: 'useful',
    purpose: 'It decides my tone, the offers I suggest, and where I tell you to post.',
    input: 'multi',
    prompt: (known) =>
      isDeliveryFirst(known)
        ? 'Who do you most want ordering from you?'
        : industryOf(known) === 'real_estate'
          ? 'Who are you mainly trying to reach?'
          : WALK_IN_INDUSTRIES.includes(industryOf(known))
            ? 'Who do you most want walking through your doors?'
            : 'Who do you most want to reach?',
    recapLabel: 'Your customers',
    placeholder: 'Add your own',
    options: (known) => AUDIENCE_PRESETS[industryOf(known)].map((label) => ({ id: label, label })),
    allowCustom: true,
    condition: (known) => known['identity.industry'] !== undefined,
    expectedLater: true,
  },
  {
    id: 'positioning-usp',
    field: 'positioning.usp',
    group: 'positioning',
    priority: 90,
    importance: 'useful',
    purpose: "I'll use your own words. I won't invent claims you haven't made.",
    input: 'long',
    prompt: 'There are probably a lot of businesses like yours. Why do your customers choose you?',
    recapLabel: 'Why customers choose you',
    placeholder: 'In your own words, e.g. "Our biryani is cooked dum style"',
    maxLength: 300,
  },
];

export function resolve<T>(value: Resolvable<T>, known: Known): T {
  return typeof value === 'function' ? (value as (k: Known) => T)(known) : value;
}

/** Choices to show for a question, with Mitra's own guesses appended and flagged (never preselected). */
export function optionsWithGuesses(
  question: QuestionDefinition,
  known: Known,
  guess: FactValue | undefined
): Array<Option & { guess?: boolean }> {
  const base: Array<Option & { guess?: boolean }> = question.options?.(known) ?? [];
  if (!Array.isArray(guess)) return base;
  const have = new Set(base.map((o) => o.label.toLowerCase()));
  const extra = guess
    .filter((g) => !have.has(g.toLowerCase()))
    .map((label) => ({ id: label, label, guess: true as const }));
  return [...base, ...extra];
}
