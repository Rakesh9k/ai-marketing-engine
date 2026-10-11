# Mitra — Business Brain & Information Flow Audit

Date: 2026-10-05. Scope: audit, fix, test, report. **Nothing deployed. No production data, credits or configuration touched.**
Live Gemini was used only on synthetic businesses through the benchmark harness (5 campaign runs, 1 single-call probe; the API key was
never printed and a scan of every log found no key).

## 1. Executive summary

**Verdict: READY WITH CONDITIONS** (section 22).

The architecture in the brief is the architecture in the code: the owner confirms a server-read draft, the server alone writes the Brain
and its provenance, generation reads the Brain through one filter (`brainForGeneration`), and one Truth Check reads the same contract
modules the prompts read. Clients cannot write `businesses`, `onboarding_drafts` or provenance (Firestore rules: `allow write: if false`).

The audit found and fixed **14 defects** (4 of them P1); one of them matters more than all the others:

> **The Creative Brain had never worked against the real model.** It asks for `confidence` on a 0–100 scale without saying so; the
> live model answers `0.9`; the code demands ≥ 50; so every real run was rejected as "confidence too low" and silently replaced by a
> generic fallback blueprint, which then *replaced the AI strategy stage*. Nothing was logged at campaign level, and the result object
> reported `fallbackTriggered: false`. Found by running the real model (3 of 3 runs fell back), confirmed by capturing the model's
> actual answer, fixed, and re-verified live (0 of 2 runs fall back; both pass Truth Check).

The other P1s: the failure above was invisible (reported as success, never logged); a general business (yoga studio, pottery) was
relabelled **"restaurant"** inside the Creative Brain and given food-photography / "Indian kitchen" image instructions; a Mumbai
business got `regionalStyle: "hyderabadi"` stored in its blueprint.

What I can **not** claim: that the Creative Brain is production-ready (it is untracked in git, belongs to another agent, and had never
run live before today), or that the build is green (section 17).

## 2. Current architecture (as implemented)

```text
Owner → Onboarding V2 (11 fields) → onboarding_drafts/{uid}   [server-stamped provenance, revisioned]
      → review (revision shown) → confirmOnboardingBusiness     [server re-reads the draft; client sends only the revision]
      → toBusinessCreation → createBusinessSchema → Business + Business Brain + knowledge.facts
      → generateCampaignStrategy (reads Brain; campaign-level offer/product/dates/language come from the request)
      → brainForGeneration (owner, provenance, placeholders removed) → GenerationPipeline
          conflictResolver → stage1 business → stage2 product → Creative Brain (2 calls) → strategy (derived from blueprint, else 1 call)
          → localisation → copy → image prompts → images → [truth | quality | safety validation in parallel] → deterministic Truth Check → assembly
```

## 3. Actual information-flow diagram — divergences from the target

| Target | Actual | Verdict |
| --- | --- | --- |
| Context Builder: "known / unknown / inferred, relevant facts only" | **No single context builder.** The Brain is JSON-dumped into stage 1 and every stage reads that stage's *output*; specialised builders feed the Creative Brain, template context, brief and image prompts | Divergence, partly intentional (section 8). Unknown is handled per prompt ("not provided"), not by one mechanism |
| Campaign Brain separate from Business Brain | Campaign facts (product, price, original price, offer type, validity, CTA, language, style) live on the campaign request/document; the pipeline never writes the Brain | **Matches** (proved by test, section 7) |
| Creative Brain never invents facts | Prompts forbid it and print "not provided"; fallback blueprint contained two injected claims (fixed) | Matches after fixes |

## 4. Field-level matrix (traced in code)

Onboarding V2 collects exactly: `owner.name`, `owner.role`, `identity.industry`, `identity.subcategory`, `identity.name`, `identity.city`,
`identity.state`, `contact.whatsapp`, `offering.signature` (≤5), `audience.primary` (≤5), `positioning.usp`. Everything else below is
collected elsewhere (wizard, Brain editors, legacy onboarding) or never.

| Field | Collected | Canonical (Brain) | Provenance | Reaches the model? | Risk |
| --- | --- | --- | --- | --- | --- |
| owner name / role | onboarding | `owner.*` | USER_CONFIRMED | **No, by design** (a live run printed "Asha gari…" in an ad) | none |
| business name, industry, subcategory | onboarding | `identity.*` | USER_CONFIRMED | Yes | none |
| city, state | onboarding | `identity.location` (and `business.location`) | USER_CONFIRMED | Yes | duplicated pair, synced in `updateBusiness` |
| locality | wizard / editors only | `identity.location.locality` | none | Yes | not asked in onboarding |
| WhatsApp / phone | onboarding | `identity.contact` (and `business.contact`) | whatsapp USER_CONFIRMED; phone DERIVED_FROM_WHATSAPP | Yes | triple-held, behaviour below |
| products / services / packages | wizard, product editor; salon + real-estate profile | `products` collection; `verticalProfile` | none | Yes | onboarding's signature offerings are **not** offered as products (P2, section 11) |
| signature offerings | onboarding | `offerings.signature` | USER_CONFIRMED | Yes | wizard asks for a product again |
| operating mode | cloud-kitchen derivation, legacy wizard | `businessRules.operatingMode` | DERIVED_FROM_SUBCATEGORY | Only with provenance (onboarding Brains) | **was stored "dine-in" when unknown (fixed)** |
| delivery radius, minimum order | Brain editors | `businessRules.*` | none | Yes, only if present | stored only when given (fixed earlier) |
| opening hours | Brain editors | `businessRules.openingHours` | none | Yes | `{}` = unknown |
| audience (primary, locality) | onboarding / wizard | `audience.*` | USER_CONFIRMED (primary) | Yes | age range 18–65 was a placeholder (filtered) |
| USP / positioning | onboarding | `positioning.usp` | USER_CONFIRMED | Yes | none |
| language, secondary, regional style | **not asked in onboarding**; wizard | `localization.*` | **none** | Yes | stored `en`/`neutral` are placeholders (wizard now ignores them) |
| tone, colours, fonts, slang, mixing | not asked | `brand.*`, `localization.*` | none | Yes (colours/fonts also have prompt fallbacks) | P3: defaults are presented as the brand |
| logo, tagline | brand kit | `brand_kits` | none | logo composited, never described | none |
| price, original price, discount, validity, CTA, terms | **wizard (campaign level only)** | **not in the Brain** | n/a | Yes | validity is filled from the campaign duration (P2) |
| real estate: type, bedrooms, price, possession | property editor | `verticalProfile.properties` | none | Yes | possession date never invented (tested) |
| salon: services, packages, prices | service editor | `verticalProfile` | none | Yes | unknown services never invented (tested) |

Phone behaviour (verified by emulator tests in `createBusiness.atomic.test.ts`): WhatsApp changes → derived phone follows; an explicit
different phone replaces the derived one and becomes USER_CONFIRMED; an explicit phone is not overwritten by later WhatsApp changes.

## 5. Business Brain audit

- **USER_CONFIRMED**: only for the 11 onboarding facts; the server stamps it. AI guesses are excluded unless the owner confirmed them
  (`brainMapping.test.ts`: "never includes an unconfirmed AI guess", "a guess the owner then confirmed IS included").
- **AI_DETECTED / AI_INFERRED / UNKNOWN**: the type has only three sources (`USER_CONFIRMED`, `DERIVED_FROM_WHATSAPP`,
  `DERIVED_FROM_SUBCATEGORY`). Unconfirmed AI facts never reach the Brain, so those labels need not exist today. **UNKNOWN is
  represented by absence**, which is correct, but Mitra's own placeholders (language, colours, tone) are stored *without* a marker
  that says "default". That is the remaining gap (C3).
- Draft revisions, double confirm, retry, late edit, second tab: covered by `confirmOnboardingBusiness.test.ts` and
  `saveOnboardingDraft.test.ts` (emulator).

## 6. Campaign Brain audit

Campaign-level facts come from the request; `generateCampaignStrategy` reads the Brain and never writes it. Test
`pipeline.informationFlow.test.ts › campaign never rewrites the Business Brain` (deep-equal before/after a campaign with its own
price, offer and dates). A campaign stores its own input, so a later Brain edit cannot alter history.

## 7. Context Builder audit

| Place | Consumer | Included | Excluded | Unknown handling |
| --- | --- | --- | --- | --- |
| `brainForGeneration` (pipeline entry) | every stage, trace | whole Brain | owner, provenance, bookkeeping, **placeholders (new)** | filter, not prose |
| stage-1 prompt | business understanding | filtered Brain JSON | — | "missingInformation" instruction |
| `buildCreativeBrainInput` | Creative Brain | selected Brain + intent | — | `known()` → "not provided" |
| `creativeTemplateContext` / `creativeContextSelector` | template path | per-task slices | — | optional |
| `buildCreativeBrief`, `imagePromptBuilder` | image prompts | brand, product, localisation | — | conditional sections |
| contracts (`offerContract`, `verticalContract`, `localizationContract`) | copy prompt **and** Truth Check | offer facts, vertical facts, language | — | same module on both sides |
| `conflictResolver` | trace, directives | name, price, place, phone | — | empty, never invented (`/\D/g` bug fixed) |

Divergence: there is **no single builder**; the specialised ones are intentional, but the stage-1 JSON dump of the whole Brain is
accidental (every stored field is a candidate to leak). The filter above is the guard; I did not consolidate.

Context efficiency (measured on a rich Hyderabad business, 9 prompts, 1.6–4.4 k chars each): no user id, billing, credits, owner name
or provenance in any prompt. Removed this audit: `lastSyncedAt`, empty `campaignHistory`, the 18–65 placeholder, an unprovenanced
`operatingMode`.

## 8. Creative Brain audit

Reviewed: input build, 2 model calls (opportunity, concepts), deterministic scoring, blueprint, fallback, failure handling.

| # | Finding | Sev | Status |
| --- | --- | --- | --- |
| CB1 | **Confidence scale mismatch: every real run fell back** (live: `0.9` vs `≥ 50`) | P1 | Fixed: prompt states 0–100, code reads ≤ 1 as a probability, 10 tests |
| CB2 | **Fallback masked as success**: state machine hard-coded `fallbackTriggered: false`; pipeline logged nothing | P1 | Fixed: result propagated, pipeline logs a WARNING with the reason and stores `trace.fallbackTriggered/fallbackReason` |
| CB3 | General vertical treated as **restaurant** (`vertical` fallback, config fallback, "local restaurant business", craving / local-pride territories) | P1 | Fixed: real `general` config, fallback = general |
| CB4 | a fallback to the 'hyderabadi' regional style was stored in the blueprint of a Mumbai business | P1 | Fixed → `'neutral'` |
| CB5 | Fallback blueprint injected "Special price ₹X" and "Verified local business service" | P2 | Fixed: neutral price wording; differentiator = the owner's USP or the business name |
| CB6 | Creative Brain asked every vertical about delivery radius / minimum order | P3 | Fixed: only restaurants, or when the owner gave them |
| CB7 | `price: offerPrice \|\| 0`, `cta \|\| 'call_now'`, `'Special Offer'`, `campaignStyle \|\| 'funny'`, `validityStart \|\| now` in `buildCreativeBrainInput` | P3 | Not changed: guarded in the prompts ("not provided"), and the campaign endpoint requires a price. Types should become optional |
| CB8 | `restaurant.knowledge.ts` says "Authentic Hyderabadi / regional style pride" for every restaurant | P2 | **Open**: not reaching a prompt in any test (industry context is not printed), but it is a Hyderabad default in shared knowledge. Belongs to the Creative Brain's author |
| CB9 | With a blueprint, the strategy stage is skipped (derived). Saves a call, but means the strategy now comes from the Creative Brain | info | Intended design; first time it is real |

`OPPORTUNITY_FORMATION_FAILED` investigation: in unit tests the stub returns `{}`, so it is an expected, loud-but-harmless log. In
production it was CB1, a real failure that had been silent. Both causes are now accounted for.

Live check after the fix (default models, synthetic Mumbai Hinglish salon and Hyderabad Telugu+English restaurant): Creative Brain
fallbacks **0 of 2** (was 3 of 3), Truth Check **PASS** both, model `gemini-3.1-flash-lite` throughout, no invented price, language ok.
The salon run's "invented phone `1499917`" is a false positive of the benchmark detector (two adjacent prices, ₹14,999 and ₹17,999,
read as one number); the text contains no phone and "17% off" is exact arithmetic on the two real prices.
**Two scenarios is not enough to call the Creative Brain safe**: it is now influencing real strategy for the first time.

## 9. Localization audit

Re-verified in the new test file: Mumbai Hinglish restaurant (no regional style on file) → no Hyderabad, Telangana, Telugu, Kondapur
or romanised Telugu in **any** prompt (9 prompts, including the Creative Brain's two). Hyderabad Telugu+English keeps its flavour.
Changing a business from Hyderabad/Telugu to Mumbai/Hinglish leaves no trace of the first. Fixed this audit: copy prompt printed
`Regional style: undefined`; blueprint default `hyderabadi`; wizard prefill pinned onboarding Brains to the stored placeholder `en`
(Hyderabad owner stuck on English): `ownerStatedLocalization` now ignores a placeholder unless provenance says the owner confirmed it.
`hi_en` stays `hi_en` (tests).

## 10. Hyderabad / Telangana / Telugu / `te` / Kondapur occurrences (backend code that can reach a model)

| Where | Class |
| --- | --- |
| `pipeline.ts` `regionalStyle \|\| 'hyderabadi'` | **dangerous default — fixed** |
| `creativeBrief.ts`, `imagePromptBuilder.ts` `regionalStyle === 'hyderabadi'` | legitimate: conditional on the owner's style |
| `localizationContract.ts` | legitimate: Telugu/Hyderabadi only when asked |
| `instructionChain.ts`, `evalSuite.ts` | test/eval fixtures |
| `creativeBrain/industry/restaurant.knowledge.ts` | **P2 open (CB8)** |
| `updateBusinessBrain`, `generateCampaignStrategy`, `updateCampaign`, `businessCreation`, `creativeBrain.types` | enum lists of supported styles (legitimate) |
| `observationBuilder.ts` | keyword classifier on free text (legitimate) |
| `createCampaignFromCalendarItem.ts` | a comment saying nothing is defaulted |
| frontend marketing pages, landing, about | copy, not defaults |
| `localizationDefaults.ts`, `constants.ts` | Hyderabad default only for a business actually in Hyderabad/Telangana |

## 11. Information loss report

| Field | Lost at | Cause | Sev | Fix |
| --- | --- | --- | --- | --- |
| Signature offerings | onboarding → wizard | stored as `offerings.signature`, not as products; wizard makes the owner pick/create a product again | P2 | **Open**: offer them as one-click product starts |
| Language / style | onboarding | never asked; placeholder stored | P2 | Wizard fixed; asking (or marking default) is a product call |
| Offer validity | wizard | validity always = campaign duration; no "no end date" | P2 | **Open** (product decision) |
| Calendar item product | plan → campaign | cannot attach after creation | P2 | **Open** (known) |
| Owner name | by design | not sent to the model | — | intended |
| Colours / tone / fonts | onboarding | defaults stored as the brand | P3 | mark as default |

Nothing the owner *did* tell Mitra is dropped between draft and Brain (`brainMapping.test.ts`: provenance for exactly the facts held).

## 12. Information duplication report

| Fact | Copies | Canonical | Sync |
| --- | --- | --- | --- |
| contact | `business.contact`, `businessBrain.identity.contact` | `business.contact`; pipeline reads it for the number | `updateBusiness` merges identity (code-read; derived-phone rules emulator-tested). **No test asserts the identity copy after an update** (P3) |
| location | `business.location`, `identity.location`, `localizationProfile` | business | same |
| delivery / minimum | `settings.*`, `businessRules.*` | Brain rules | written together at creation; updated by different callables (`updateBusiness` settings vs `updateBusinessBrain` rules) — **can diverge** (P2, unchanged) |
| language | Brain `localization`, campaign `localizationProfile` | campaign snapshot for that campaign; Brain = default | intentional |
| age range | Brain, campaign audience | campaign | Brain value was a placeholder |

## 13. Invented-facts report (searched `|| 0`, `|| 5`, `499`, `'te'`, `Hyderabad`, `Special Price`, `5 km`)

| Value | Class |
| --- | --- |
| `\|\| 0` on counters, sizes, metrics (≈45 hits) | safe computational default |
| `ProductForm price \|\| 0` (UI field) | UI placeholder |
| `offerPrice \|\| 0` (Creative Brain input) | sentinel, guarded in prompts (CB7) |
| `regionalStyle \|\| 'hyderabadi'` | dangerous — **fixed** |
| `operatingMode \|\| 'dine-in'` (Brain creation) | dangerous — **fixed** |
| `ageRange 18–65` (Brain creation) | placeholder — hidden from the model |
| `localization en/neutral` (onboarding) | placeholder — wizard ignores it |
| fallback blueprint "Special price", "Verified local business service" | dangerous — **fixed** |
| "No delivery radius defined" example in every vertical's stage-1 prompt | dangerous — **fixed** |
| "Professional food photography / Indian kitchen / appetizing lighting" for every vertical | dangerous — **fixed** (per-vertical) |
| "NO invented dishes", "fact-checker for restaurant marketing" for every vertical | wrong persona — **fixed** |
| `phoneStr.replace(/D/g,'')` (lost backslash from my earlier patches) | bug — **fixed**; broke the wa.me link for any formatted number |
| `admin eval page averageAiCostInr \|\| 0.42` | admin display fallback (P3) |

Quick-idea pills are vertical-aware and fact-free (tested earlier, unchanged). `₹499`, `15% OFF`, `5 km`: no occurrence in production code.

## 14. AI efficiency report

Measured live (gemini-3.1-flash-lite, two scenarios, wall clock per stage, from the new `stageTimingsMs`):

| Stage | Calls | Credits | Latency | Required | Skippable / combinable |
| --- | ---: | --- | ---: | --- | --- |
| business understanding | 1 | in 100 | 4.5–7.7 s | yes | — |
| product understanding | 1 | | 8.9–11.0 s | for photos; **for an existing product it only restates metadata** | candidate to make deterministic (P2) |
| Creative Brain | 2 | | 9.4–12.3 s | design choice | now succeeds; **it replaces the strategy call** |
| campaign strategy | 0 (1 if no blueprint) | | ≈0 s | | derived from the blueprint |
| localisation | 1 | | 10.4–12.5 s | | **could be merged into the copy prompt** (saves ~11 s, changes the architecture) |
| copy | 1 | | 25–28 s | yes | largest single cost |
| image prompts | 1 | | 14.7–19.2 s | yes | |
| image generation | 0–2 provider calls | 20 each | provider | on demand | stubbed in these runs |
| truth / quality / safety validation | 3 | | **3.1–6.1 s total** | yes | **now parallel (was ~21.6 s sequential)** |
| deterministic Truth Check | 0 | | <10 ms | yes | |

Total: 15 calls, **6 of them schema repairs (40%)**, ~87 s. Top three contributors: **copy (~26 s, 30%)**, **image prompts (~17 s,
19%)**, **localisation (~11.5 s, 13%)**; repairs are the hidden fourth. Credits: one reservation (`campaign_generation` = 100 = 60 +
2 × 20), taken once at the endpoint; the Creative Brain's 2 calls and the 3 validations are inside it; onboarding discovery spends
none and is rate-limited; no second pricing registry (the earlier frontend duplicate was removed).

Change made: the three validations read the generated campaign and nothing from each other (proved by test), so they run together.
Same scenario, before/after: 87.7 s → 67.5 s (with the Creative Brain still failing at that point), validation block 21.6 s → 4.9 s.
After the Creative Brain fix the total is ~87 s again because it now does real work (≈10 s) and image prompts grew. Single runs;
LLM variance is large, the validation saving is mechanical.

## 15. Performance report

Measured: per-stage (above). **Not measured**: onboarding completion time, Brain confirmation latency, context-construction time
(all in-memory, sub-millisecond by inspection), asset generation (provider stubbed). I will not report numbers I did not measure.

## 16. Security report

No findings. Verified: `onboarding_drafts` and `businesses` are server-write only; the confirm callable takes only a revision and
re-reads the draft; provenance is stamped server-side; `owner` and provenance never reach a model; no secret in client code and no
key in any log from five live runs; `NEXT_PUBLIC_*` holds only public identifiers (note: `NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN` must be
unset in production — P3); AI output is schema-validated and Truth-Checked, and cannot write Brain facts (there is no code path from
a model result to `businessBrain`). Not tested by me this round: prompt-injection attempts through free-text answers (existing
`adversarialUser.test.ts` covers the pipeline).

## 17. Test results (what actually ran)

| Kind | Command | Result |
| --- | --- | --- |
| Functions, emulators (deterministic + emulator) | `firebase emulators:exec … "npx jest"` | **161 suites passed, 1 failed** (see below), 6 skipped; 1712 tests passed, 49 skipped |
| Root, emulators | same | **106 of 106 suites**, 1548 passed, 7 skipped |
| Functions typecheck | `tsc --noEmit` | 0 errors |
| Root typecheck | `tsc --noEmit -p .` | **65 errors, all in one file** (below); **0 errors with only that file excluded** (scratch tsconfig, deleted) |
| Functions lint | `eslint src` | 1 error, same foreign file; my files clean |
| Root lint (campaign folder) | `eslint` | 0 errors, 1 pre-existing `exhaustive-deps` warning |
| Live Gemini | benchmark harness, 5 campaign runs + 1 probe | see 8, 14 |
| Browser / Playwright | **not run this round** (run earlier in the session for onboarding) | — |
| Production | **none** | — |

**The one failing suite and the build:** `functions/src/services/ai/creativeBrain/__tests__/creativeBrain.e2eValidation.test.ts` is a
*new, in-progress file by the other agent* (edited minutes before the run; it does not compile: wrong enum values, a missing module,
65 type errors). It fails the functions suite, fails root `tsc`, and therefore **fails `next build`** (`Failed to type check`). I did not
edit it. Until its author fixes it, the production-build gate is **BLOCKED** (not failed by my changes). Baseline in CLAUDE.md (38
suites / 687 tests) is far below the current counts; no previously passing test fails because of my changes.

New tests: `pipeline.informationFlow.test.ts` (20: Creative Brain path really exercised; Mumbai Hinglish; Hyderabad rich with every
fact; five single-fact mutations; campaign never mutates the Brain; yoga studio with no restaurant words; real-estate with no
possession date; AI-failure visibility; stage timings; validations independent, concurrent, still fail the campaign),
`creativeBrainService.confidenceScale.test.ts` (10), plus additions to `brainForGeneration`, `conflictResolver.noFabrication`,
`businessCreation.unknownFacts`, `localizationDefaults`. Tests whose premise changed by design were updated, not weakened:
`brainForGeneration` ("and nothing else" now also removes the placeholder operating mode), `verticals.general` (slots may be lists),
`CampaignWizard.localeDefaults` (source guard names the new helper).
A tooling accident to be aware of: my generated test regexes lost their backslashes twice (`\b`, `\s`, `\d` silently became other
characters), which made two guards vacuous until the failures exposed them; fixed and the repo scanned for stray control characters.

## 18. Remaining gaps

1. Creative Brain: untracked in git, other agent's, never run live before today, 2 live scenarios only, CB7/CB8 open, its own e2e test broken.
2. Build and root typecheck blocked by that file.
3. Onboarding Brains store unmarked placeholders (colours, fonts, tone, slang, language, style). Recommended: a `DEFAULT` provenance value.
4. Wizard fills offer validity from the campaign duration; no "no end date".
5. Onboarding's signature offerings are not offered as products (the owner is asked again).
6. `settings.delivery*` vs `businessRules.delivery*` can diverge (two update paths).
7. No test asserts `businessBrain.identity` after `updateBusiness`.
8. Calendar items cannot get a product after the plan exists; business-profile page and legacy wizard keep their own language lists.
9. Not measured: onboarding/confirm/asset latency; browser journey not re-run; prompt injection not re-tested.
10. Efficiency ideas not taken (they change architecture): deterministic product understanding for existing products, merge localisation into copy, cut the 40% repair rate.

## 19. Files changed in this audit (mine; the other agent's Creative Brain files are listed separately in git status)

Source: `functions/src/services/ai/{conflictResolver,pipeline,creativeBrainService,brainForGeneration}.ts`,
`.../creativeBrain/{verticalConfigs,adaptiveStateMachine}.ts`, `.../prompts/creativeBrainPrompts.ts`,
`functions/src/config/{verticals,brainDefaults(new)}.ts`, `functions/src/services/businessCreation.ts`,
`src/features/campaign/{localizationDefaults.ts,components/CampaignWizard.tsx}`.
Tests: `pipeline.informationFlow.test.ts` (new), `creativeBrainService.confidenceScale.test.ts` (new), `brainForGeneration.test.ts`,
`conflictResolver.noFabrication.test.ts`, `businessCreation.unknownFacts.test.ts`, `config/verticals.general.test.ts`,
`localizationDefaults.test.ts`, `CampaignWizard.localeDefaults.test.ts`.
Four files in that list (`pipeline.ts`, `creativeBrainService.ts`, `adaptiveStateMachine.ts`, `creativeBrainPrompts.ts`) are also being
edited by the other agent; I used anchored edits and re-verified every one of my changes is still present at the end.
Earlier today (credit registry, not repeated here): frontend `CREDIT_COSTS.BASE_CAMPAIGN` 100→60, duplicate registry removed, tests derive from the backend.

## 20. Exact fixes

See sections 8, 13, 14 (each row marked "fixed"). Behavioural summary: the Creative Brain now succeeds with a real model and reports
honestly when it does not; general businesses are general all the way down; no restaurant or Hyderabad assumption survives for a
business that is not one; generation never sees a placeholder it could read as a fact; a Hyderabad owner is no longer pinned to
English by a default; validations run concurrently; every campaign stores where its time went.

## 21. Deployment considerations

**Nothing is deployed and the smoke-test gate is unchanged.** Production source ≠ HEAD ≠ working tree; the Creative Brain is not in
git at all, so any deploy must start from the deployed source and include it deliberately. The Creative Brain fix changes production
behaviour materially (real strategy instead of the generic fallback): it needs its own live QA on several businesses and an explicit
owner decision before it ships. The earlier gates stand: smoke test → Truth Check/Telugu/localisation → generateMarketingPlan secret.

## 22. Final verdict

**READY WITH CONDITIONS.** The information flow is sound where it is built (owner → draft → confirmation → Brain → generation, with
server-owned provenance and Truth Check on the same contract), and unknown stays unknown in every prompt I could scan. The conditions:
(1) the Creative Brain must be reviewed by its author and QA'd live on more than two businesses; (2) its broken e2e test must be fixed
so the build and typecheck gates can pass; (3) the smoke test and the staged deploy procedure still apply; (4) the placeholder
defaults in the Brain (item 3 of the gaps) should get a provenance marker before beta. This is not "flawless": it is a system whose
largest hidden defect was found only by running the real model.

---

# Addendum 2026-10-06 — stabilization and release-gate pass (supersedes sections 17–22 where they differ)

**Verdict: READY WITH CONDITIONS.** Nothing deployed; no production data, configuration or credits touched.

## Phase status
0 baseline PASS · 1 build/test gate PASS · 2 Creative Brain contract PASS · 3 live matrix PASS (with named conditions) · 4 provenance PASS · 5 information trace PASS · 6 Business vs Campaign Brain PASS · 7 unknown/sparse PASS (one REVIEW-caught claim) · 8 duration vs validity PASS · 9 localisation/vertical PASS · 10 Truth Check PASS · 11 context builder PASS (documented, not rebuilt) · 12 efficiency measured PASS · 13 repair analysis PASS · 14 failure handling PASS · 15 mutation PASS · 16 regression PASS · 17 technical gate PASS · 18 report PASS · 19 smoke test **PENDING — AUTHENTICATED PRODUCTION SMOKE TEST REQUIRED** (expected 140 − 15 − 100 = 25; not performed, not inferred from Firestore).

## Defects fixed this pass (all with regression tests)
1. Creative Brain `confidence`: one canonical scale (integer 0–100) enforced by the schema and stated in the prompt; fractions/strings/out-of-range are rejected and repaired, never reinterpreted.
2. Creative Brain outcome is a recorded fact: `campaignPack.metadata.creativeBrain` = `{status: success|fallback|failed, reason, detail}`; includes the new OpportunityEngine's deterministic opportunity (`OPPORTUNITY_FALLBACK`) and `NO_VIABLE_CONCEPT`. A fallback blueprint no longer stands in for the AI strategy stage.
3. Campaign duration ≠ offer validity: wizard has three explicit choices (none / whole campaign / own dates); schemas, calendar creation, brief, conflict resolver and Creative Brain intent no longer derive validity from duration; `validitySource` is recorded and traced.
4. `SYSTEM_DEFAULT` provenance: every placeholder Mitra writes (language, style, tone, colours, fonts, age range, slang, mixing) is recorded as such; generation drops them; the wizard does not treat them as a choice.
5. Derived-strategy padding no longer invents "guaranteed / zero hidden charges / limited time" claims.
6. Schema repairs: `.length(n)` arrays were never described to the model (zod `exactLength`) — the cause of most repairs; fixed. Restaurant-only `foodies` segment removed from the schema every business fills. Concept id made optional (assigned by Mitra).
7. Possession status wording (live: "Ready to move?" on an under-construction listing); names stay Latin in Hindi/Telugu copy so Truth Check can verify them (live: transliterated business name FAILED); phone detector now handles "(+91) 98765 43210"; OpportunityEngine gate no longer rejects "stress-free" as "free" or "₹14.99" as "4.9".
8. Per-call AI log (`aiCalls`, `aiCallSummary`) and per-fact source list (`factSources`) stored with every campaign. Wizard stale-closure warning fixed.

## Live Creative Brain matrix (real Gemini `gemini-3.1-flash-lite`, synthetic businesses, key never logged)
Final run, 10 scenarios: Creative Brain **10 success, 0 fallback**; Truth Check **5 PASS, 5 REVIEW_REQUIRED, 0 FAIL** (REVIEW = no WhatsApp number on the synthetic business, correct); no restaurant leakage into yoga/pottery/boutique/coaching; no Hyderabad/Telugu leakage into Mumbai/English/Hindi; no invented price, phone or possession date. Earlier runs on the same matrix failed on real defects (listed above); each was fixed and re-run. Across 4 runs the Creative Brain fell back once (an over-strict gate, fixed). **One open finding:** scenario 6 (sparse) copy says "delivered" with no delivery fact on file; Truth Check caught it as REVIEW_REQUIRED (operations), so it cannot publish unreviewed, but the generator should not say it (P2).

## AI call inventory and latency (measured, 10 live runs)
10–12 model calls per campaign (was 15), **repairs 0–2 (was 6; 2 of 109 calls)**; 8 failed calls were transient provider fetch errors, retried successfully. Wall clock 47–101 s (avg 84 s on the last run, 57–66 s on the two before; the spread is provider speed). Average stage seconds: creative_brain 18.8, copy 16.8, creative_direction 13.6, localisation 10.1, validations (parallel) ~9, business/product understanding ~7 each. Top contributors: Creative Brain (2 calls, now real work), copy, image prompts. Not optimised further: localisation-into-copy merge and deterministic product understanding change architecture (P3, listed).

## Technical gate (final)
Root `tsc` 0 errors · functions `tsc` 0 errors · root lint `--max-warnings 0` clean · functions lint clean · production build compiled · functions suite under emulators **171 suites passed, 7 skipped, 0 failed (1827 tests)** · root suite **108 of 108 (1561 tests)**. The functions suite showed one load-related timeout in the other agent's `creativeBrain.e2eValidation` Scenario 5 on one run (it calls the model un-mocked; passes alone and on the full run): P3, belongs to its author.

## Remaining conditions
1. Authenticated production smoke test (user) before any deploy; deployment must start from the production source.
2. Creative Brain, OpportunityEngine, session files are untracked/in-flight work of another agent; review before deploy. `restaurant.knowledge.ts` still says "Hyderabadi" for all restaurants (not printed in any prompt tested).
3. Sparse-business "delivered" wording (P2). Signature offerings are not offered as products in the wizard (P2). `settings.delivery*` vs `businessRules.delivery*` can diverge (P2).
4. Not run this pass: browser journey, production anything.
