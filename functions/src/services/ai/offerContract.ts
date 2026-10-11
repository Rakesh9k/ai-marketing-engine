/**
 * The offer contract: what the campaign copy is told to state, and what Truth Check then verifies.
 *
 * The copy prompt and Truth Check used to be written independently. Truth Check demanded the literal
 * "NN%", a numeric date and a ₹-first price; the prompt never asked for any of them, so most campaigns
 * failed no matter which model wrote them. Both now read this module:
 *
 *   - a fact is REQUIRED only when the campaign actually has it (an original price makes a discount;
 *     a validity window makes dates). Nothing is ever asked for, or invented, to satisfy a check;
 *   - the same fact is accepted in every normal way of writing it ("₹999", "Rs. 999", "999 INR", …),
 *     while the amount/date itself is still verified exactly;
 *   - the prohibited-phrase list the model is shown is the list Truth Check rejects.
 */

// ── Text normalisation ──────────────────────────────────────────────────────────────────────────

/** Truth Check is given JSON.stringify(copyPack): undo the escapes so "\n999 INR" is read as " 999 INR". */
export const unescapeJson = (text: string): string => text.replace(/\\[nrt"]/g, ' ');

// ── Prices ──────────────────────────────────────────────────────────────────────────────────────

const NUM = String.raw`(\d{1,3}(?:,\d{2,3})+|\d+)(?:\.(\d+))?`;
// "₹999", "₹ 999", "Rs 999", "Rs. 999", "Rs.999", "INR 999"
const PREFIXED = new RegExp(String.raw`(?:₹|\brs\.?|\binr)\s*${NUM}`, 'gi');
// "999 INR", "999 rupees", "999 Rs", "999/-"
const SUFFIXED = new RegExp(
  String.raw`(?<![\d.,])${NUM}\s*(?:\/-|\binr\b|\brupees?\b|\brs\b)`,
  'gi'
);

const toAmount = (whole: string, fraction?: string): number =>
  parseFloat(`${whole.replace(/,/g, '')}${fraction ? `.${fraction}` : ''}`);

/**
 * Every price written with a currency marker, in reading order. A bare number is never a price.
 * Supports comma grouping ("₹1,999", "Rs 12,34,567") and decimals.
 */
export function extractQualifiedPrices(text: string): number[] {
  const source = unescapeJson(text);
  const found: Array<{ index: number; amount: number }> = [];
  const prefixSpans: Array<[number, number]> = [];

  for (const m of source.matchAll(PREFIXED)) {
    const index = m.index ?? 0;
    prefixSpans.push([index, index + m[0].length]);
    found.push({ index, amount: toAmount(m[1]!, m[2]) });
  }
  for (const m of source.matchAll(SUFFIXED)) {
    const index = m.index ?? 0;
    // "Rs. 999/-" is one price, not two.
    if (prefixSpans.some(([from, to]) => index >= from && index < to)) continue;
    found.push({ index, amount: toAmount(m[1]!, m[2]) });
  }
  return found.sort((a, b) => a.index - b.index).map((f) => f.amount);
}

export function priceAppears(text: string, amount: number): boolean {
  return extractQualifiedPrices(text).some((p) => Math.abs(p - amount) < 0.005);
}

/** The real discount percentage, or null when there is no real discount to state. */
export function discountPercentFor(price: number, original?: number | null): number | null {
  if (!price || !original || original <= price) return null;
  const percent = Math.round(((original - price) / original) * 100);
  return percent >= 1 ? percent : null;
}

// ── Dates ───────────────────────────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const MONTH_NUMBER: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};
const MONTH = String.raw`(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)`;

const DAY_MONTH = new RegExp(
  String.raw`\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?${MONTH}\b(?:[,\s]+(\d{4})\b)?`,
  'gi'
);
const MONTH_DAY = new RegExp(
  String.raw`\b${MONTH}\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b(?!\s*(?:%|inr|rs\b|rupees|\/-|:|\d))(?:,?\s*(\d{4})\b)?`,
  'gi'
);
// Numeric forms only with a four-digit year: "24/7", "4-5 people" and "4.5 stars" are not dates.
const NUMERIC_DMY = /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\b/g;
const NUMERIC_ISO = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g;

export interface DateMention {
  day: number;
  month: number;
  year?: number;
}

const valid = (day: number, month: number) => day >= 1 && day <= 31 && month >= 1 && month <= 12;

export function extractDateMentions(text: string): DateMention[] {
  const source = unescapeJson(text);
  const mentions: DateMention[] = [];
  const add = (day: number, month: number, year?: number) => {
    if (valid(day, month)) mentions.push({ day, month, ...(year ? { year } : {}) });
  };
  for (const m of source.matchAll(DAY_MONTH)) {
    add(Number(m[1]), MONTH_NUMBER[m[2]!.toLowerCase()]!, m[3] ? Number(m[3]) : undefined);
  }
  for (const m of source.matchAll(MONTH_DAY)) {
    add(Number(m[2]), MONTH_NUMBER[m[1]!.toLowerCase()]!, m[3] ? Number(m[3]) : undefined);
  }
  for (const m of source.matchAll(NUMERIC_DMY)) add(Number(m[1]), Number(m[2]), Number(m[3]));
  for (const m of source.matchAll(NUMERIC_ISO)) add(Number(m[3]), Number(m[2]), Number(m[1]));
  return mentions;
}

/** Calendar date of an instant in India, where every customer reads it. */
function indiaDate(iso: string): { year: number; month: number; day: number } | null {
  const time = new Date(iso);
  if (Number.isNaN(time.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(time);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/** "10 Oct 2026": the form the copy is asked to use. */
export function formatDateForCopy(iso: string): string | null {
  const d = indiaDate(iso);
  return d ? `${d.day} ${MONTH_NAMES[d.month - 1]} ${d.year}` : null;
}

export function dateMentionMatches(mention: DateMention, iso: string): boolean {
  const d = indiaDate(iso);
  if (!d) return false;
  return (
    mention.day === d.day &&
    mention.month === d.month &&
    (mention.year === undefined || mention.year === d.year)
  );
}

const ymd = (year: number, month: number, day: number) => year * 10000 + month * 100 + day;

/** True when the mentioned date falls inside the campaign's validity window (inclusive). */
export function dateMentionInWindow(
  mention: DateMention,
  startIso?: string,
  endIso?: string
): boolean {
  const start = startIso ? indiaDate(startIso) : null;
  const end = endIso ? indiaDate(endIso) : null;
  if (!start && !end) return true;
  const from = start ? ymd(start.year, start.month, start.day) : -Infinity;
  const to = end ? ymd(end.year, end.month, end.day) : Infinity;
  const years = mention.year
    ? [mention.year]
    : [...new Set([start?.year, end?.year].filter((y): y is number => y !== undefined))];
  return years.some((y) => {
    const n = ymd(y, mention.month, mention.day);
    return n >= from && n <= to;
  });
}

// ── Offer types ─────────────────────────────────────────────────────────────────────────────────

/** Offer types that are a concept rather than a number, with the words that communicate each. */
export const OFFER_TYPE_CONCEPTS: Record<string, { wording: string; pattern: RegExp }> = {
  bogo: {
    wording: 'buy one get one (BOGO) offer',
    pattern:
      /buy\s*(?:1|one)\s*,?\s*get\s*(?:1|one)|\bbogo\b|\b1\s*\+\s*1\b|\b2\s*for\s*1\b|two\s*for\s*one/i,
  },
  combo: { wording: 'combo offer', pattern: /\bcombos?\b|\bmeal deal\b|\bbundle\b/i },
  free_delivery: {
    wording: 'free delivery offer',
    pattern:
      /free\s+(?:home\s+)?delivery|delivery\s+(?:is\s+|for\s+)?free|delivered\s+free|no\s+delivery\s+(?:charge|fee)s?/i,
  },
  loyalty: {
    wording: 'loyalty / rewards offer',
    pattern: /loyalty|\brewards?\b|\bpoints\b|\bmembers?\b|membership/i,
  },
};

export function offerConceptPresent(text: string, offerType: string): boolean {
  const concept = OFFER_TYPE_CONCEPTS[offerType];
  return concept ? concept.pattern.test(unescapeJson(text)) : false;
}

// ── Prohibited phrases ──────────────────────────────────────────────────────────────────────────

/** Never written in an ad: unverifiable superlatives, guarantees, awards, hours, ratings, returns. */
export const PROHIBITED_CLAIM_PHRASES: readonly string[] = [
  'best in',
  'best restaurant',
  'best food',
  'number 1',
  '#1',
  'no. 1',
  'top rated',
  'highest rated',
  'most popular',
  'famous',
  'renowned',
  'legendary',
  'iconic',
  'guaranteed',
  'guarantee',
  'risk-free',
  'risk free',
  '100%',
  'hundred percent',
  'doctor recommended',
  'clinically proven',
  'expert recommended',
  'award winning',
  'award-winning',
  'awarded',
  'certified',
  'verified',
  'trusted',
  'free delivery',
  'free home delivery',
  'open 24/7',
  'open 24x7',
  '24/7',
  '24x7',
  'round the clock',
  'always open',
  'unlimited',
  'unlimited refills',
  '1000+ customers',
  '1000+ reviews',
  'rated 5 star',
  '5 star rating',
  '5/5',
  // real estate financial/investment overclaims
  'best property',
  'guaranteed investment',
  'highest returns',
  'guaranteed returns',
  'assured returns',
  'guaranteed appreciation',
];

/** Phrases the offer itself authorises: a free-delivery offer has to say "free delivery". */
const EXEMPT_BY_OFFER_TYPE: Record<string, readonly string[]> = {
  free_delivery: ['free delivery', 'free home delivery'],
};

/** Phrases that only make sense for one kind of business; shown to the model only for that kind. */
const VERTICAL_ONLY: Record<string, readonly string[]> = {
  'best restaurant': ['restaurant'],
  'best food': ['restaurant'],
  'best property': ['real_estate'],
};

/**
 * The phrases to reject. With no `vertical` this is every phrase (what Truth Check enforces). Given a
 * vertical it drops the phrases that belong to other kinds of business, so a yoga studio's prompt is not
 * told about restaurants — Truth Check still rejects them all.
 */
export function prohibitedPhrasesFor(offerType?: string, vertical?: string): string[] {
  const exempt = new Set(EXEMPT_BY_OFFER_TYPE[offerType ?? ''] ?? []);
  return PROHIBITED_CLAIM_PHRASES.filter((phrase) => {
    if (exempt.has(phrase)) return false;
    const only = VERTICAL_ONLY[phrase];
    return !vertical || !only || only.includes(vertical);
  });
}

// ── What the business has on file ───────────────────────────────────────────────────────────────

interface RulesLike {
  openingHours?: Record<string, { open?: string; close?: string; closed?: boolean } | undefined>;
  deliveryRadiusKm?: number;
  operatingMode?: string;
}

/** Hours are "on file" only when some day is actually open with times. */
export function hasDefinedOpeningHours(rules: RulesLike | undefined): boolean {
  return Object.values(rules?.openingHours ?? {}).some(
    (day) => day && !day.closed && day.open && day.close
  );
}

/** Delivery claims are supported by a delivery radius or by the owner saying the business delivers. */
export function deliverySupportedBy(rules: RulesLike | undefined): boolean {
  return (rules?.deliveryRadiusKm ?? 0) > 0 || rules?.operatingMode === 'delivery';
}

const CLOCK_TIME = /\b\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)(?![a-z])/;
const OPENS_OR_CLOSES =
  /\b(?:open(?:s|ed|ing)?|clos(?:e|es|ed|ing))\s+(?:daily|every\s?day|all\s+(?:day|week)|24\s*(?:\/|x)\s*7|7\s+days|late|early|till|until|from|at|now|today|tonight|tomorrow|between|on\s+(?:mon|tue|wed|thu|fri|sat|sun)|(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*|\d)/;
const HOURS_PHRASE =
  /\b(?:business|working|opening|closing|store|shop|office|operating)\s+hours\b|\btimings?\b|\b24\s*(?:\/|x)\s*7\b/;

/**
 * Does the copy make a claim about when the business is open? Looks for claims (a clock time, "open
 * daily / late / till …", "business hours", "timings"), not for the words "open" or "close", which also
 * appear in "open house", "close to the metro" and "opening soon".
 */
export function mentionsHoursClaim(text: string): boolean {
  const source = unescapeJson(text).toLowerCase();
  return CLOCK_TIME.test(source) || OPENS_OR_CLOSES.test(source) || HOURS_PHRASE.test(source);
}

// ── Contact numbers ─────────────────────────────────────────────────────────────────────────────

const digitsOf = (value: string): string => value.replace(/\D/g, '');
const lastTen = (value: string): string => digitsOf(value).slice(-10);

// An Indian mobile number: optional +91 / (+91) / 91 / 0, then ten digits starting 6-9 (one space or hyphen allowed).
const MOBILE = String.raw`(?:\(?\+?91\)?[\s-]?|0)?([6-9]\d{4}[\s-]?\d{5})`;
// A number counts as "presented as the contact" only after a cue word, or inside a wa.me / tel: link.
const CUED_NUMBER = new RegExp(
  String.raw`\b(?:whats\s?app|call|phone|contact|mobile|dial|reach\s+us|text|message|msg)\b[^\d.!?]{0,40}?` +
    MOBILE,
  'gi'
);
const WA_LINK = /wa\.me\/(?:\+?91)?([6-9]\d{9})/gi;
const TEL_LINK = /tel:\+?(?:91)?([6-9]\d{9})/gi;

/**
 * The ten-digit numbers the copy presents AS the business's contact: after "WhatsApp", "call", "phone"…,
 * or in a wa.me / tel: link. A number with no such cue (a count, a reference) is not a contact claim.
 */
export function extractPresentedContactNumbers(text: string): string[] {
  const source = unescapeJson(text);
  const found = new Set<string>();
  for (const m of source.matchAll(CUED_NUMBER)) found.add(lastTen(m[1]!));
  for (const m of source.matchAll(WA_LINK)) found.add(m[1]!);
  for (const m of source.matchAll(TEL_LINK)) found.add(m[1]!);
  return [...found];
}

interface ContactSource {
  whatsappNumber?: string;
  businessPhone?: string;
  businessBrain?: { identity?: { contact?: { phone?: string; whatsapp?: string } } };
}

/** Every number the business actually has: the input's and the Business Brain's, as ten digits. */
export function contactNumbersOnFile(source: ContactSource): string[] {
  const contact = source.businessBrain?.identity?.contact;
  const all = [source.whatsappNumber, source.businessPhone, contact?.phone, contact?.whatsapp]
    .filter((n): n is string => typeof n === 'string')
    .map(lastTen)
    .filter((n) => n.length === 10);
  return [...new Set(all)];
}

// ── The copy prompt ─────────────────────────────────────────────────────────────────────────────

export interface OfferFacts {
  offerPrice?: number;
  offerOriginalPrice?: number;
  offerType?: string;
  validityStart?: string;
  validityEnd?: string;
  /** The business's vertical, so only relevant prohibited phrases are shown. */
  vertical?: string;
  /** Whether the Business Brain has real opening hours. Only `false` adds a rule. */
  hoursOnFile?: boolean;
  /** The business's own contact numbers (ten digits). Omit to say nothing about contact numbers. */
  contactNumbers?: string[];
}

/**
 * The rules the copywriter is given about the offer. Built only from facts the campaign has: it never
 * asks for a price, discount or date that was not provided.
 */
export function buildOfferContractPrompt(facts: OfferFacts): string {
  const {
    offerPrice,
    offerOriginalPrice,
    offerType,
    validityStart,
    validityEnd,
    vertical,
    hoursOnFile,
    contactNumbers,
  } = facts;
  const lines: string[] = [];

  if (offerPrice && offerPrice > 0) {
    lines.push(
      `PRICE: the offer price is ₹${offerPrice}. Write it exactly like that: rupee sign directly before the number, no "INR" or "Rs". Use it in the ad copies, the captions and the WhatsApp message.`
    );
  } else {
    lines.push('PRICE: no price was provided. Do not state any price.');
  }

  const percent =
    offerType === 'percentage' ? discountPercentFor(offerPrice ?? 0, offerOriginalPrice) : null;
  if (percent !== null && offerOriginalPrice) {
    lines.push(
      `DISCOUNT: this is a percentage offer. The original price is ₹${offerOriginalPrice} and the discount is exactly ${percent}%. Write it as "${percent}% off" and show the original price once, as "was ₹${offerOriginalPrice}". Do not write any other percentage.`
    );
  } else if (offerType === 'percentage') {
    lines.push(
      'DISCOUNT: the offer is marked as a percentage discount but no original price was provided, so the amount of the discount is unknown. Do not write any percentage, "off", "save" or "was" price; describe the offer with its price and headline only.'
    );
  } else if (offerOriginalPrice && offerPrice && offerOriginalPrice > offerPrice) {
    lines.push(
      `DISCOUNT: no percentage discount is authorised. You may show the original price once, as "was ₹${offerOriginalPrice}". Do not write any percentage.`
    );
  } else {
    lines.push(
      'DISCOUNT: none was provided. Do not write any percentage, "off", "save", "sale" or "was" price.'
    );
  }

  const concept = OFFER_TYPE_CONCEPTS[offerType ?? ''];
  if (concept) lines.push(`OFFER TYPE: state plainly that this is a ${concept.wording}.`);

  const from = validityStart ? formatDateForCopy(validityStart) : null;
  const to = validityEnd ? formatDateForCopy(validityEnd) : null;
  if (from && to) {
    lines.push(
      `VALIDITY: the offer runs from ${from} to ${to}. State it once, in the post caption, with exactly these dates (for example "valid ${from} to ${to}"). There is no other date: do not mention any other date.`
    );
  } else if (to) {
    lines.push(
      `VALIDITY: the offer is valid till ${to}. State it once, in the post caption, with exactly this date. There is no other date: do not mention any other date.`
    );
  } else {
    lines.push('DATES: no dates were provided. Do not mention any specific date or deadline.');
  }

  if (hoursOnFile === false) {
    lines.push(
      'HOURS: no opening hours are on file. Do not state opening or closing times, days open, or phrases like "open late", "open till", "open daily".'
    );
  }

  if (contactNumbers) {
    lines.push(
      contactNumbers.length > 0
        ? `CONTACT: the only phone or WhatsApp number you may write is ${contactNumbers.map((n) => `+91${n}`).join(' or ')}. Write no other phone number.`
        : 'CONTACT: no phone or WhatsApp number is on file. Do not write any phone number or WhatsApp link.'
    );
  }

  lines.push(
    `NEVER WRITE any of these phrases (the campaign is rejected automatically if one appears): ${prohibitedPhrasesFor(offerType, vertical ?? 'general').join(', ')}.`
  );
  return lines.map((line) => `- ${line}`).join('\n');
}
