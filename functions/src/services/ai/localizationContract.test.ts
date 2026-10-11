import {
  allowedLanguages,
  buildLocalizationStrategyPrompt,
  languageGuardrail,
  languageCheckFor,
  languageLeaks,
  localeFromInput,
  languageMode,
  placeOf,
  regionalInsightsLine,
} from './localizationContract';

/**
 * The owner's language and region are the contract. A trace of a Mumbai / Hinglish salon showed the
 * localisation stage hard-coding "You are a Hyderabadi localization expert … Telugu-English" (with Telugu
 * CTAs and "Kondapur techies") for every business, and that output then fed the copywriter. The stage is now
 * built from the owner's own localisation and never names a language the owner did not ask for.
 */

const FOREIGN_TO_MUMBAI =
  /telugu|hyderabad|telangana|kondapur|cheyyandi|madi\b|lo undi|biryani|ramzan|dum lagake|\baao\b/i;

const mumbai = {
  primaryLanguage: 'hi_en',
  secondaryLanguage: 'hi',
  languageMixing: 'natural',
  regionalStyle: 'mumbai',
  city: 'Mumbai',
  locality: 'Bandra',
  state: 'Maharashtra',
};
const hyderabad = {
  primaryLanguage: 'te_en',
  secondaryLanguage: 'te',
  languageMixing: 'natural',
  regionalStyle: 'hyderabadi',
  city: 'Hyderabad',
  locality: 'Kondapur',
  state: 'Telangana',
};
const english = {
  primaryLanguage: 'en',
  secondaryLanguage: 'en',
  regionalStyle: 'neutral',
  city: 'Pune',
  state: 'Maharashtra',
};

describe('which languages the owner asked for', () => {
  it.each([
    ['en', ['English']],
    ['te', ['Telugu']],
    ['hi', ['Hindi']],
    ['te_en', ['Telugu', 'English']],
    ['hi_en', ['Hindi', 'English']],
  ])('%s -> %j', (code, expected) => {
    expect(allowedLanguages({ primaryLanguage: code })).toEqual(expected);
  });

  it('a missing or unknown language is English, never another language', () => {
    expect(allowedLanguages(undefined)).toEqual(['English']);
    expect(allowedLanguages({})).toEqual(['English']);
    expect(allowedLanguages({ primaryLanguage: 'xx' })).toEqual(['English']);
  });

  it("describes the mode in the owner's terms", () => {
    expect(languageMode(mumbai)).toMatch(/Hinglish/);
    expect(languageMode(hyderabad)).toMatch(/Telugu/);
    expect(languageMode(english)).toBe('English');
  });

  it('names the place from what the business has', () => {
    expect(placeOf(mumbai)).toBe('Bandra, Mumbai');
    expect(placeOf({ city: 'Pune' })).toBe('Pune');
    expect(placeOf({})).toBe("the business's area");
  });
});

describe('the language guardrail', () => {
  it('says exactly which languages to write in, and names no other language', () => {
    const g = languageGuardrail(mumbai);
    expect(g).toMatch(/Hindi and English/);
    expect(g).toMatch(/no words or phrases from any other language/i);
    expect(g).not.toMatch(/telugu|tamil|kannada|bengali/i);
  });
});

describe('the localisation-stage prompt', () => {
  it("Mumbai / Hinglish: built from the owner's localisation, with nothing from Hyderabad or Telugu", () => {
    const p = buildLocalizationStrategyPrompt(mumbai);
    expect(p).toMatch(/Hinglish/);
    expect(p).toMatch(/Bandra, Mumbai/);
    expect(p).not.toMatch(FOREIGN_TO_MUMBAI);
  });

  it('English only: plain English, no regional slang, no other language', () => {
    const p = buildLocalizationStrategyPrompt(english);
    expect(p).toMatch(/English/);
    expect(p).not.toMatch(/telugu|hindi|hyderabad|cheyyandi|biryani/i);
  });

  it('Hyderabad / Telugu+English keeps its flavour, because the owner asked for it', () => {
    const p = buildLocalizationStrategyPrompt(hyderabad);
    expect(p).toMatch(/Telugu/);
    expect(p).toMatch(/Hyderabad/);
    expect(p).toMatch(/cheyyandi/i); // the Telugu CTA examples are offered only when Telugu is requested
  });

  it('Hindi examples appear only when Hindi is requested', () => {
    expect(buildLocalizationStrategyPrompt(mumbai)).toMatch(/karo|karein/i);
    expect(buildLocalizationStrategyPrompt(hyderabad)).not.toMatch(/karo|karein/i);
  });

  it('keeps the eight sections the output schema relies on', () => {
    const p = buildLocalizationStrategyPrompt(mumbai);
    for (const section of [
      'VOCABULARY',
      'PHRASING RULES',
      'HUMOR STYLE',
      'CTA PATTERNS',
      'SLANG GUIDE',
      'CULTURAL REFERENCES',
      'LANGUAGE MIXING',
      'AUDIENCE ADAPTATION',
    ]) {
      expect(p).toContain(section);
    }
  });

  it('with no localisation at all it is plain English, not Telugu', () => {
    const p = buildLocalizationStrategyPrompt(undefined);
    expect(p).not.toMatch(/telugu|hyderabad|cheyyandi/i);
  });
});

describe('regional insights line', () => {
  it("uses the business's own place", () => {
    expect(regionalInsightsLine(mumbai)).toBe('Uses regional insights for Bandra, Mumbai');
    expect(regionalInsightsLine({})).toBe("Uses regional insights for the business's area");
  });
});

describe('language leaks in generated copy', () => {
  it('flags a script the owner did not ask for', () => {
    expect(languageLeaks('మీ కోసం ప్రత్యేక ఆఫర్', english).scripts).toEqual(['Telugu']);
    expect(languageLeaks('आज ही आइए', english).scripts).toEqual(['Hindi']);
    expect(languageLeaks('मीट మీరు', mumbai).scripts).toEqual(['Telugu']);
  });

  it('allows the scripts the owner asked for', () => {
    expect(languageLeaks('आज ही आइए', mumbai).scripts).toEqual([]);
    expect(languageLeaks('మీ కోసం', hyderabad).scripts).toEqual([]);
  });

  it('flags distinctive romanised Telugu in a business that did not ask for Telugu', () => {
    expect(languageLeaks('Order now, WhatsApp cheyyandi!', mumbai).markers).toContain('cheyyandi');
    expect(languageLeaks('Chala bagundi, Meeru randi', english).markers.length).toBeGreaterThan(0);
  });

  it('never flags romanised Telugu when Telugu was asked for', () => {
    expect(languageLeaks('WhatsApp cheyyandi!', hyderabad).markers).toEqual([]);
  });

  it('does not flag ordinary English or Hinglish words', () => {
    for (const text of [
      'Order now and manage your day',
      'Aaj ka special: ekdum mast!',
      'Madison Avenue style, andiron free',
    ]) {
      expect(languageLeaks(text, mumbai)).toEqual({ scripts: [], markers: [] });
    }
  });

  it("when the owner's localisation is unknown, nothing is claimed to be a leak", () => {
    expect(languageLeaks('మీ కోసం', undefined)).toEqual({ scripts: [], markers: [] });
  });
});

describe('the trace check for the requested language', () => {
  it('PASSES when the copy stays in the requested language(s)', () => {
    const c = languageCheckFor('Aaj ka special, abhi order karein!', mumbai);
    expect(c.status).toBe('PASS');
    expect(c.expected).toMatch(/Hinglish/);
  });

  it('FAILS, naming what leaked, when the copy uses a language nobody asked for', () => {
    const script = languageCheckFor('మీ కోసం ప్రత్యేక ఆఫర్', mumbai);
    expect(script.status).toBe('FAIL');
    expect(script.actual).toMatch(/Telugu/);
    const romanised = languageCheckFor('WhatsApp cheyyandi!', english);
    expect(romanised.status).toBe('FAIL');
    expect(romanised.actual).toMatch(/cheyyandi/);
  });

  it('is never a fixed PASS: the same copy passes for Hyderabad and fails for Mumbai', () => {
    expect(languageCheckFor('WhatsApp cheyyandi!', hyderabad).status).toBe('PASS');
    expect(languageCheckFor('WhatsApp cheyyandi!', mumbai).status).toBe('FAIL');
  });

  it('with no known localisation it claims nothing', () => {
    expect(languageCheckFor('మీ కోసం', undefined).status).toBe('PASS');
  });
});

describe('the locale the pipeline received', () => {
  it("takes the owner's profile and falls back to the business location for the place only", () => {
    expect(
      localeFromInput({
        localizationProfile: { primaryLanguage: 'hi_en', regionalStyle: 'mumbai' },
        businessLocation: { city: 'Mumbai', locality: 'Bandra', state: 'Maharashtra' },
      })
    ).toEqual({
      primaryLanguage: 'hi_en',
      secondaryLanguage: undefined,
      languageMixing: undefined,
      regionalStyle: 'mumbai',
      city: 'Mumbai',
      locality: 'Bandra',
      state: 'Maharashtra',
    });
  });

  it('never invents a language', () => {
    expect(localeFromInput({}).primaryLanguage).toBeUndefined();
    expect(allowedLanguages(localeFromInput({}))).toEqual(['English']);
  });
});

describe('names stay as given inside native-language copy (live: Hindi copy transliterated the business name, so Truth Check could not find it)', () => {
  it.each(['hi', 'te', 'te_en', 'hi_en'])('%s: the guardrail keeps the business, product and place names exact, in Latin letters', (code) => {
    expect(languageGuardrail({ primaryLanguage: code } as never)).toMatch(
      /business name, the product or service name and the place name EXACTLY as given, spelled in Latin letters/
    );
  });

  it('English copy needs no such rule', () => {
    expect(languageGuardrail({ primaryLanguage: 'en' } as never)).not.toMatch(/Latin letters/);
  });
});
