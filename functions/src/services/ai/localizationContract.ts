/**
 * The localisation contract: the owner's own language and region decide what the copy is written in.
 *
 * A trace of a Mumbai / Hinglish salon showed the localisation stage hard-coding "You are a Hyderabadi
 * localization expert … Telugu-English" for every business (with Telugu CTAs and "Kondapur techies"), and
 * that output fed the copywriter, so the leak reached the ad even though the owner's localisation was correct
 * at the pipeline's entry. These prompts are now built from the resolved localisation, never name a language
 * the owner did not ask for, and Truth Check can see when copy still leaks one.
 */

export interface LocaleFacts {
  primaryLanguage?: string;
  secondaryLanguage?: string;
  languageMixing?: string;
  regionalStyle?: string;
  city?: string;
  locality?: string;
  state?: string;
}

type Lang = 'English' | 'Telugu' | 'Hindi';

const LANGUAGES_BY_CODE: Record<string, Lang[]> = {
  en: ['English'],
  te: ['Telugu'],
  hi: ['Hindi'],
  te_en: ['Telugu', 'English'],
  hi_en: ['Hindi', 'English'],
};

const MODE_BY_CODE: Record<string, string> = {
  en: 'English',
  te: 'Telugu',
  hi: 'Hindi',
  te_en: 'Telugu and English mixed naturally',
  hi_en: 'Hinglish (Hindi and English mixed naturally)',
};

/**
 * The languages the owner asked for, from the primary language code only. The secondary language is
 * derived from it, and legacy records can carry a stale Telugu default there, so it is not trusted.
 * Missing or unknown is English, never another language.
 */
export function allowedLanguages(locale?: LocaleFacts): Lang[] {
  return LANGUAGES_BY_CODE[locale?.primaryLanguage ?? ''] ?? ['English'];
}

export function languageMode(locale?: LocaleFacts): string {
  return MODE_BY_CODE[locale?.primaryLanguage ?? ''] ?? 'English';
}

export function placeOf(locale?: LocaleFacts): string {
  const parts = [locale?.locality, locale?.city].filter((p): p is string => !!p && p.trim() !== '');
  return parts.length > 0 ? parts.join(', ') : "the business's area";
}

const joinLanguages = (langs: Lang[]) => langs.join(' and ');

/** Says which languages to write in, without naming any language that is not wanted. */
export function languageGuardrail(locale?: LocaleFacts): string {
  const langs = allowedLanguages(locale);
  const base = `Write ONLY in ${joinLanguages(langs)} (${languageMode(locale)}). Use no words or phrases from any other language.`;
  // Names are facts. In Hindi or Telugu copy the model transliterates them ("Gyan Coaching" becomes Devanagari), and
  // then neither Truth Check nor the owner can verify the business name, product or place. Keep them as given.
  // Name only the owner's own native language(s): this prompt must never mention a language they did not ask for.
  const native = langs.filter((l) => l === 'Hindi' || l === 'Telugu');
  return native.length > 0
    ? `${base} Keep the business name, the product or service name and the place name EXACTLY as given, spelled in Latin letters, even inside ${native.join(' or ')} sentences: never transliterate or translate them.`
    : base;
}

const STYLE_GUIDE: Record<string, string> = {
  neutral: 'Region-neutral: clear, friendly and natural, with no regional slang.',
  hyderabadi:
    'Hyderabadi flavour: warm, local-pride humour, with Hyderabad references where they genuinely apply.',
  telangana:
    'Telangana flavour: warm and local, with Telangana references where they genuinely apply.',
  mumbai:
    'Mumbai flavour: brisk, casual and city-savvy, with Mumbai references where they genuinely apply.',
  bangalore:
    'Bengaluru flavour: relaxed and friendly, with Bengaluru references where they genuinely apply.',
  delhi:
    'Delhi flavour: confident, warm and direct, with Delhi references where they genuinely apply.',
  chennai:
    'Chennai flavour: warm and respectful, with Chennai references where they genuinely apply.',
  kolkata:
    'Kolkata flavour: warm and expressive, with Kolkata references where they genuinely apply.',
};

const styleGuide = (locale?: LocaleFacts) =>
  STYLE_GUIDE[locale?.regionalStyle ?? ''] ?? STYLE_GUIDE['neutral']!;

/** WhatsApp call-to-action examples, offered only in the languages the owner asked for. */
function ctaExamples(locale?: LocaleFacts): string {
  const langs = allowedLanguages(locale);
  const examples: string[] = [];
  if (langs.includes('Telugu'))
    examples.push('"WhatsApp cheyyandi!"', '"Order madi!"', '"Link lo undi"');
  if (langs.includes('Hindi'))
    examples.push('"WhatsApp karo!"', '"Abhi order karein"', '"Link neeche hai"');
  if (langs.includes('English'))
    examples.push('"Message us on WhatsApp"', '"Order now on WhatsApp"');
  return examples.join(', ');
}

/** Hyderabadi vocabulary examples, offered only when the owner asked for that style. */
function vocabularyExamples(locale?: LocaleFacts): string {
  return locale?.regionalStyle === 'hyderabadi' && allowedLanguages(locale).includes('Telugu')
    ? ' (for example "visit"→"aao", "order"→"WhatsApp cheyyandi")'
    : '';
}

export function localizationSystemRules(locale?: LocaleFacts): string {
  return `You are a local-language marketing expert for ${placeOf(locale)}. Create marketing language rules — NOT translation rules. The output must enable natural, culturally resonant ${languageMode(locale)} marketing that sounds like a local recommending to a friend.
${languageGuardrail(locale)}
${styleGuide(locale)}`;
}

export function localizationTask(locale?: LocaleFacts): string {
  const place = placeOf(locale);
  const language = joinLanguages(allowedLanguages(locale));
  return `Generate localization rules for:
1. VOCABULARY: 20+ generic→local phrasing mappings in ${language}${vocabularyExamples(locale)}
2. PHRASING RULES: 5+ sentence patterns (short, punchy, conversational, question-led)
3. HUMOR STYLE: Light, friendly humour that suits this business — with examples
4. CTA PATTERNS: 5+ WhatsApp CTAs in ${language} (${ctaExamples(locale)})
5. SLANG GUIDE: Approved slang with usage levels and context — only ${language}, and none if the style is region-neutral
6. CULTURAL REFERENCES: Only references that genuinely apply to ${place} and to this business; none that belong to another city, region or kind of business
7. LANGUAGE MIXING: Natural code-switching rules with examples (${languageMode(locale)})
8. AUDIENCE ADAPTATION: How tone shifts for the different customers this business serves`;
}

/** The whole localisation-stage prompt, apart from the data sections the pipeline inserts. */
export function buildLocalizationStrategyPrompt(locale?: LocaleFacts): string {
  return `SYSTEM RULES:\n${localizationSystemRules(locale)}\n\nTASK:\n${localizationTask(locale)}`;
}

/** The strategy prompt's regional line: the business's own place, never a fixed city. */
export function regionalInsightsLine(locale?: LocaleFacts): string {
  return `Uses regional insights for ${placeOf(locale)}`;
}

// ── Leak detection ──────────────────────────────────────────────────────────────────────────────

const SCRIPTS: Array<{ name: string; range: RegExp; allowedBy?: Lang }> = [
  { name: 'Telugu', range: /[ఀ-౿]/, allowedBy: 'Telugu' },
  { name: 'Hindi', range: /[ऀ-ॿ]/, allowedBy: 'Hindi' },
  { name: 'Tamil', range: /[஀-௿]/ },
  { name: 'Kannada', range: /[ಀ-೿]/ },
  { name: 'Bengali', range: /[ঀ-৿]/ },
  { name: 'Malayalam', range: /[ഀ-ൿ]/ },
  { name: 'Gujarati', range: /[઀-૿]/ },
  { name: 'Punjabi', range: /[਀-੿]/ },
  { name: 'Odia', range: /[଀-୿]/ },
];

/** Distinctive romanised Telugu: words that are not English and not Hinglish. Kept deliberately short. */
const TELUGU_MARKERS = [
  'cheyyandi',
  'cheyandi',
  'bagundi',
  'baagundi',
  'meeru',
  'ippudu',
  'garu',
  'madi',
  'lo undi',
];

/**
 * Does the copy contain a language the owner did not ask for? Native-script characters are unambiguous;
 * romanised Telugu is matched only against a short list of distinctive words. When the owner's language is
 * not known, nothing is claimed to be a leak.
 */
export function languageLeaks(
  text: string,
  locale?: LocaleFacts
): { scripts: string[]; markers: string[] } {
  if (!locale?.primaryLanguage) return { scripts: [], markers: [] };
  const allowed = allowedLanguages(locale);
  const scripts = SCRIPTS.filter(
    (s) => s.range.test(text) && !(s.allowedBy && allowed.includes(s.allowedBy))
  ).map((s) => s.name);

  const lower = text.toLowerCase();
  const markers = allowed.includes('Telugu')
    ? []
    : TELUGU_MARKERS.filter((m) => new RegExp(`(?<![a-z])${m}(?![a-z])`).test(lower));
  return { scripts, markers };
}

/** The owner's localisation as the pipeline received it, with the business's own location as fallback. */
export function localeFromInput(input: {
  localizationProfile?: Partial<LocaleFacts> | null;
  businessLocation?: { city?: string; locality?: string; state?: string } | null;
}): LocaleFacts {
  const p = input.localizationProfile ?? {};
  const loc = input.businessLocation ?? {};
  return {
    primaryLanguage: p.primaryLanguage,
    secondaryLanguage: p.secondaryLanguage,
    languageMixing: p.languageMixing,
    regionalStyle: p.regionalStyle,
    city: p.city || loc.city,
    locality: p.locality || loc.locality,
    state: p.state || loc.state,
  };
}

/** A real, per-campaign check of the requested language (never a fixed PASS). */
export function languageCheckFor(
  text: string,
  locale?: LocaleFacts
): { status: 'PASS' | 'FAIL'; expected: string; actual: string } {
  const expected = languageMode(locale);
  const { scripts, markers } = languageLeaks(text, locale);
  if (scripts.length === 0 && markers.length === 0)
    return { status: 'PASS', expected, actual: expected };
  return {
    status: 'FAIL',
    expected,
    actual: `unrequested: ${[...scripts, ...markers].join(', ')}`,
  };
}
