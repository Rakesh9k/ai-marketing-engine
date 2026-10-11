# Localisation contract: the owner's language and region reach the model unchanged

**Single source:** `functions/src/services/ai/localizationContract.ts`. The localisation-stage prompt, the strategy and
quality prompts, the copy prompt's language lines, Truth Check's language check and the trace's language check all read
it. Frontend defaults: `src/features/campaign/localizationDefaults.ts`.

## The trace (one Mumbai / Hinglish salon, real pipeline, model stubbed, every prompt scanned)

The owner's localisation was correct at the pipeline's entry (`hi_en`, Mumbai). It was changed into Telugu / Hyderabadi
**by the pipeline's own prompts**, at these boundaries (all hard-coded in the prompt builders, none from owner data):

| # | Boundary | What it said |
|---|---|---|
| 1 | **Localisation stage** (`buildLocalizationStrategyPrompt`) | "You are a **Hyderabadi localization expert** … natural **Telugu-English** marketing", vocabulary "generic→Hyderabadi" (`dum lagake`, `aao`, `WhatsApp cheyyandi`), CTAs `"Order madi!"`, `"Link lo undi"`, cultural references "Ramzan, Sunday family lunch, **Kondapur techies**, biryani culture", humour "food-obsessed". This output is item 4 ("LOCALIZATION STRATEGY") of the copy prompt, so it carried straight into the ad. **This is the first incorrect boundary.** It applied to every business, including English-only ones and salons. |
| 2 | Product prompt | example angles "Authentic Hyderabadi dum process", "Late-night craving solution" |
| 3 | Strategy prompt | "Uses regional insights for Hyderabad" |
| 4 | Quality prompt | "HASHTAGS: Relevant (Hyderabad, …)" |

Two more paths turn a stored non-Telugu preference into Telugu **before** the pipeline:

| # | Boundary | What happened |
|---|---|---|
| 5 | Copy prompt `Language:` line | concatenated primary + secondary, so a legacy record with primary `en` and a stale secondary `te` told the model to mix Telugu |
| 6 | `createCampaignFromCalendarItem` | defaulted state `Telangana`, city `Hyderabad` and secondary language `te` when absent or stale |
| 7 | Wizard quick-idea presets | defaulted every business to `te_en` + `hyderabadi` |
| 8 | Business Brain editor / `businessBrainService` | opened at Telugu / Hyderabadi when nothing was stored, so saving unchanged would persist it; the service fell back to `te` |
| 9 | `conflictResolver` "ignore my language" lock | with no configured language it locked the model to `te` |
| 10 | trace check "Telugu requested" | a fixed `PASS` with expected === actual: it asserted nothing |

Not a cause: onboarding-created Brains store primary `en`, secondary `en`, style `neutral` (this logic predates the
onboarding redesign).

## The contract

- The owner's languages come from the **primary language code only** (`en`, `te`, `hi`, `te_en`, `hi_en`); missing or
  unknown is English, never another language. The secondary language is derived from it.
- The localisation stage is written for the owner's language, place (`Bandra, Mumbai`) and regional style. Telugu CTA
  examples appear only when Telugu was asked for, Hindi ones only for Hindi; Hyderabadi vocabulary only for that style.
  No prompt names a language the owner did not ask for (the guardrail says "Use no words or phrases from any other
  language" without naming one).
- Truth Check: native script of a language not asked for is an invalid claim (FAIL); distinctive romanised Telugu in a
  business that did not ask for Telugu needs review. Silent when the owner's language is unknown. The trace's language
  check is now real (`languageCheckFor`).
- Frontend: defaults follow the business's own place (Telugu + Hyderabadi only for a business in Hyderabad / Telangana);
  everyone else is English / neutral.

## Regression tests

`pipeline.localeContract.test.ts` runs the real pipeline and asserts that for a Mumbai / Hinglish business **no prompt
contains** Telugu, Hyderabad, Telangana, Kondapur or Hyderabadi phrases, that an English business gets no Telugu or Hindi
persona, that a stale secondary `te` never reaches the copywriter, and (non-regression) that a Hyderabad Telugu+English
business keeps its flavour. Plus `localizationContract.test.ts`, `truthCheck.contract.test.ts`, the calendar tests and the
frontend defaults tests.

## Decisions taken (founder, 2026-10-05) and what they changed

1. **Wizard language and style options: expanded.** The wizard offers English, Hindi, Hinglish, Telugu and Telugu + English
   (every language the backend supports). Styles are driven by the language and the business's place
   (`regionalStylesFor` in `src/features/campaign/localizationDefaults.ts`): Neutral first, then Telugu -> Hyderabadi /
   Telangana, Hindi and Hinglish -> Mumbai / Delhi, then the style of the business's own city, then whatever the owner has stored.
   A Mumbai owner is never offered Hyderabadi unless it is what they stored. A stored language or style is understood as it
   is (`hi_en` stays `hi_en`); only a value that is not a language at all falls back to the place default.
2. **Native script: not required.** The requested language decides the language; native-versus-Latin script is a rendering
   capability decision. Telugu requested: Telugu allowed. Hindi requested: Hindi allowed. Hinglish: Latin-script Hindi is fine.
   A deterministic script-capability check comes later, once the renderer has verified fonts, glyph coverage, SVG, raster and MP4
   output and the fallback behaviour. (Truth Check only flags a script the owner did NOT ask for.)
3. **Quick-idea pills: vertical-aware, and they create no fact.** They are ideas per kind of business (restaurant, salon, real
   estate, general), each contributing an objective, an action and a headline suggestion with no number in it. They used to set
   prices, a "15% OFF" discount, dates, claims ("Free delivery within 3km") and the first product.
4. **Delivery radius and minimum order: unknown stays unknown.** createBusiness no longer stores 5 km / ₹0; the creative brief,
   the Business Brain screens and editors, and the Creative Brain prompt no longer invent them.

## The invariant

`pipeline.sparseFacts.test.ts` runs a deliberately sparse business through the whole real pipeline (every stage, including the
Creative Brain) and fails if any prompt asserts something the business never gave: a delivery radius, a minimum order, a phone
number, a discount, a "special price", broken values (`₹0`, `undefined`), another city's or language's flavour. Unknown is
not zero and not a reasonable default.

## Still open

- `operatingMode` ("dine-in") and `bookingRequired` (false) are stored as defaults when unknown (the legacy business-profile
  editor also shows "dine-in" as a baseline); the pipeline falls back to "dine-in & takeaway & delivery" in one trace field.
- The business-profile page and legacy onboarding wizard have their own language lists.
- Calendar items cannot be given a product after the plan is created.
