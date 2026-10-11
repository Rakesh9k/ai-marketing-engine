# Mitra onboarding — implementation compliance audit

Date: 2026-10-05 · Branch: `consolidate/phases-and-paddle-billing` · Scope: audit the current implementation against the
redesign specification, fix genuine gaps, verify. **Nothing was committed or deployed by this task.**

Evidence rule: a status below is only "IMPLEMENTED" where there is code and a test, or an observed result in a real browser.
Where something could not be exercised it says **BLOCKED** or **NOT APPLICABLE**, never PASS.

## 1. Executive summary

**Overall: READY WITH CONDITIONS** (for enabling `NEXT_PUBLIC_ONBOARDING_V2` in a controlled rollout; **not** for an automatic deploy).

The conversational onboarding (the Business Understanding Engine) is implemented end to end and holds its trust boundary
(draft → normalize → review → explicit confirmation → `createBusiness` → Business Brain). It was exercised in a real browser:
email signup → email verification → conversation → review → "Looks right" → completion → dashboard, for a cloud kitchen and a salon,
plus returning-user login and resume after a refresh and after closing the browser. The created Business Brain was inspected: owner
facts `USER_CONFIRMED`, phone `DERIVED_FROM_WHATSAPP` and E.164-normalised, cloud kitchen stored delivery-first.

Conditions before launch (all outside the audited onboarding core, or explicitly sequenced by the founder):

1. **Production smoke test** of one real campaign and one real vision analysis on the deployed Gemini models: waiting on the founder.
2. **Truth Check contract fix**: DONE locally and verified (docs/TRUTH_CHECK_CONTRACT.md); **not deployed**. See the addendum at the end.
3. **Telugu / regional-language leakage**: audited; not yet root-caused (section 12 finding 2); separate change.
4. **Credits 100 vs 140** mismatch (6 failing tests, all `Expected: 140`): known, separate launch fix, billing not touched.
5. **Google sign-in/consent** real-browser check: the founder's manual test (BLOCKED here).
6. **Deploy** of `generateMarketingPlan` with its newly bound Gemini secret (section 8): the code fix is local only.

Spec phases beyond the draft/engine/review core (logo intelligence, tagline discovery, brand colour and tone discovery, content
pillars, marketing objective in onboarding, mascot state set) are **MISSING by founder decision** (section 7), not forgotten.

## 2. Compliance by area

| Area | Status | Basis |
|---|---|---|
| Authentication | IMPLEMENTED (Google real-browser BLOCKED) | email signup/verify/login observed in browser; Google paths unit-tested only |
| Routing | IMPLEMENTED (one gap fixed) | `decidePostAuthDestination` tests; direct-URL gap to V2 with flag off fixed and tested |
| Conversational UX | IMPLEMENTED | observed: one or two questions per screen, reason shown under each |
| Adaptive engine | IMPLEMENTED | 11 industries each with a second-level list, data-driven; wording observed to adapt (cloud kitchen vs salon) |
| Business Brain | IMPLEMENTED (semantic coverage partial, section 4) | inspected stored Brain |
| Brand intelligence | MISSING (deferred) | no logo/tagline/colour/tone discovery in V2 |
| AI safety | IMPLEMENTED (+ hardening added) | injection flattening, sanitizer, free discovery, unavailable-on-failure |
| Campaign Brain | PARTIAL | separate by design; copy prompt still dumps the Brain as raw JSON |
| Persistence | IMPLEMENTED | refresh and close-browser resume observed |
| Security | IMPLEMENTED (+ hardening added) | rules tests pass; redaction and secret-binding gaps fixed |
| Analytics | IMPLEMENTED | server-side funnel events, no free text |
| Accessibility | IMPLEMENTED after fixes | axe: 0 serious/critical on 4 screens; keyboard verified |
| Mobile | IMPLEMENTED | 390x844 touch: no overflow on 11 screens, targets ≥ 44px |
| Testing | see section 13 | |

## 3. Requirement matrix

Legend: I = IMPLEMENTED, P = PARTIAL, M = MISSING, X = INCORRECT (fixed), D = intentional deviation, N/A.

| # | Requirement | Status | Evidence | Change made | Test |
|---|---|---|---|---|---|
| 6 | Real flow traced from code | I | `postAuthRouting.ts`, `OnboardingGate.tsx`, `ConversationShell.tsx`: signup → (verify-email) → gate → `/onboarding` (flag off) or `/onboarding/v2` (flag on) → conversation → review → `confirmOnboardingBusiness` → completion → `/dashboard` | none | browser S1 |
| 7 | Landing auth nudge | I (not browser-tested) | `AuthNudge.tsx` + `AuthNudge.test.tsx`; left alone as instructed | none | unit |
| 8 | Google signup/login/consent | I code, **BLOCKED** browser | `GoogleSignInButton`, consent protection unit tests | none | unit; needs real Google account |
| 8 | Email signup/verify/login; new→onboarding, returning→dashboard | I | browser S1, S3 | none | browser |
| 8 | Partial onboarding resumes | I | browser S4 | none | browser |
| 9 | Conversational, ≤2 questions, no 30-field form | I | engine test "never shows more than two questions at once"; observed screens | none | unit + browser |
| 10 | Name + role; role set Owner/Founder/Manager/Marketing/Team member/Other; Google name prefilled but unconfirmed | I | `OWNER_ROLE_IDS`; `saveOnboardingDraft` test "pre-fills … as an unconfirmed detection" | none | unit |
| 11 | Industries incl. `general`; Other not forced into restaurant; data-driven | I | `taxonomy.ts`, `verticals.general.test.ts` | none | unit |
| 12 | Adaptive questions: restaurant, cloud kitchen delivery-first, salon, real estate, general; skip; no re-asking; ≤2 at once | I | browser S1 (cloud kitchen: "where do you deliver from", operating mode `delivery`), S2 (salon wording); engine tests | none | unit + browser |
| 13 | Reusable question engine (not a React if/else chain) | I | `QuestionDefinition` registry in `questions.ts` with `purpose`, `condition`, `priority`, `input`; `engine.ts`; browser/server parity tests | none | unit |
| 14 | Business Brain semantic coverage | P | stored Brain has identity, owner, audience, offerings, positioning, knowledge (provenance), localization, businessRules, brand, products. No content strategy or brand tone from onboarding (deferred, section 7) | none | inspected |
| 15 | Business Brain vs Campaign Brain separation | I | Brain = stable facts; campaign objective/offer/product/CTA/duration are campaign inputs; `onboardingToCampaign` E2E tests | none | unit/emulator |
| 16 | Central context builder, structured not raw | P | existing `selectCreativeContext`, `brandCreativeContext`, `creativeTemplateContext` reused (no second builder). **But** the copy prompt (`pipeline.ts` ~1712) still embeds the Brain as raw JSON | owner/provenance now filtered before any model sees the Brain (`brainForGeneration`) | unit |
| 17–19 | Logo upload processing, boundaries, tagline/brand colour/tone discovery | M | no server logic for logo analysis exists (`vision.ts` has none); `BrandProfileSection` lets owners set brand after onboarding | none (founder decision) | n/a |
| 20 | Adaptive audience wording; USP free text; skip; raw truth preserved | I | observed "Who do you most want walking through your doors?" (salon) / "ordering from you?" (cloud kitchen); USP skippable | none | browser |
| 21 | Content pillars generated from the Brain | M | not present | none | n/a |
| 22 | Marketing objective separate from Brain; new objectives kept | P | `CampaignObjective` retains weekend_offer…`product_promotion`, `new_product`; the spec's 8 goal-style options are not offered in onboarding | none | types |
| 23 | Human-readable Brain review with per-row correction, no restart | I | review screen observed; "Change" per row; "I'd like to change something" | list markup corrected (X) | unit + axe + browser |
| 24 | Confirmation boundary: revision pin, stale tab, confirmed-only, idempotent, double-submit | I | `confirmOnboardingBusiness.test.ts` (18 tests); emulator runs pass | none | emulator |
| 25 | Completion never promises an action the plan cannot do | I | "Mitra knows your business now" → "Go to my dashboard" / "See what Mitra knows"; no first-campaign promise | none | unit + browser |
| 26 | Progressive learning | D | existing users with a business are never interrupted; no campaign-time capture added (founder: no more questions before the journey is validated) | none | n/a |
| 27 | Save/resume: refresh, close, logout, network, stale tab | I | `saveQueue.test.ts` (8), stale-tab test, browser S4 | none | unit + browser |
| 28 | AI error handling, no raw 500 | I | `explainConfirmError`, discovery `unavailable`, `customerSafeInternalMessage` | none | unit |
| 29 | Discovery safety: name not sent, injection flattened, claims/prices stripped, free, unavailable on failure | I | `discovery.test.ts`, `discoverOnboardingFacts.test.ts`; live-validated earlier (docs/ONBOARDING_PHASE_H.md) | none | unit + live |
| 30 | Model configuration central; no retired model in active paths | I (one image-model watch item) | `config/geminiModels.ts`; section 9 | none this task | unit |
| 31 | Truth Check contract | X (finding, not yet fixed) | section 12 | none (sequenced) | n/a |
| 32 | Regional language | X (finding, not yet fixed) | section 12 | fabricated Hyderabad default removed | unit |
| 33 | Credits/billing untouched | I | no billing code changed | none | n/a |
| 34 | Security: ownership, rules, no keys client-side/in logs | I (+hardening) | root suite incl. rules/storage tests passes; section 8 | secret redaction by value | unit |
| 35 | Database/migration: old data readable, no duplicate Brain, no destructive migration | I | additive Brain fields only; legacy users unaffected | none | unit |
| 36 | Existing user states | I/D | A: new → onboarding (S1). B: partially onboarded old users are not re-interrogated (D). C: fully onboarded → dashboard (S3) | none | browser |
| 37 | Analytics funnel | I | `analyticsService.ts` events started/answered/industry/subcategory/discovery/review/confirmed/complete; abandonment derivable (started without complete); no free text | none | unit |
| 38 | Accessibility | I after fixes | section 11 | 5 fixes | unit + browser axe |
| 39 | Responsive | I (tablet not tested) | desktop 1280x800 and mobile 390x844 | none | browser |
| 40 | Motion/mascot, reduced motion | I after fix | transform animations 1 → 0 under reduce | `MotionConfig reducedMotion="user"` | unit + browser |
| 41 | UX quality | I (subjective) | screenshots reviewed: calm, one idea per screen, plain language, "Why I'm asking" line | none | visual |
| 43 | Browser E2E scenarios | see section 15 | | | |

## 4. What already existed (verified, not rebuilt)

Draft model `onboarding_drafts/{uid}` (owner-read, no client writes), field registry with provenance
(`USER_CONFIRMED | AI_DETECTED | AI_INFERRED | UNKNOWN`, `DERIVED_FROM_WHATSAPP`), question engine, free discovery callable with its
own model and 20 s cutoff, atomic idempotent `confirmOnboardingBusiness` over the shared `businessCreation` service, phone
normalization (server authoritative, browser mirror, parity test), the `general` vertical, review and completion screens,
email-verification gating, analytics, account-deletion cleanup, the feature flag and its routing.

## 5. What was fixed in this task

| # | Problem | File | Fix | Regression test |
|---|---|---|---|---|
| F1 | `/onboarding/v2` reachable by direct URL with the flag off: "controlled rollout" was not controlled; stale header comment claimed the flow could not create a business | `OnboardingGate.tsx`, `onboarding/v2/page.tsx` | flag off → redirect to `/onboarding` | `OnboardingGate.test.tsx` (failed first) |
| F2 | Reduce-motion ignored by the entrance transitions (only mascot/progress honoured it) | `onboarding/layout.tsx` | `<MotionConfig reducedMotion="user">` | `layout.test.tsx`; browser: transform animations 1 → 0 |
| F3 | `role="radio"` options without radio keyboard behaviour (every option a tab stop, no arrows) | `QuestionField.tsx` | roving tab stop; arrows/Home/End move focus, never select | `QuestionField.keyboard.test.tsx` (4 failed first); browser verified |
| F4 | Review recap was a `<dl>` holding buttons/paragraphs (axe serious: `definition-list`, `dlitem`) | `ReviewScreen.tsx` | list markup | `ReviewScreen.a11y.test.tsx` (failed first) + browser axe |
| F5 | Question screens had no `<h1>` | `ConversationShell.tsx` | visually hidden `h1` on question screens only | `ConversationShell.test.tsx` (failed first) |
| F6 | Secrets only redacted by shape; the production Gemini key is not `AIza…`-shaped, so a bare occurrence would not be redacted | `utils/logging.ts` | also redact configured `*_API_KEY/_SECRET/_TOKEN/_PASSWORD` values (≥ 12 chars) | `redactSecrets.test.ts` (2 failed first) |
| F7 | **`generateMarketingPlan` calls the text AI but declared no `GEMINI_API_KEY` secret**, so in production it runs with an empty key | `generateMarketingPlan.ts` | bind the secret | `aiSecretBinding.test.ts` guard over every AI-calling callable (failed first, found exactly this one) |
| F8 | Locked "non-negotiable facts" invented a city (Hyderabad), a phone (9876543210) and March-2026 dates when the business had none; the phone-forgery directive told the model to use the invented number | `conflictResolver.ts` | missing facts stay missing; directive says no phone is on file | `conflictResolver.noFabrication.test.ts` (3 failed first) |
| F9 | Calendar plan metadata hardcoded `aiModel: 'gemini-flash-latest'` | `calendarPlanningService.ts` | records the configured text model | `calendarPlanningService.test.ts` |
| F10 | Prettier errors from the Phase H type additions broke root lint | `src/types/index.ts` | format only (2 lines) | lint |

F7 correction: an earlier note of mine said `generateMarketingPlan` "uses no AI". That was wrong: it does, through
`calendarPlanningService`. There are no log entries for it in 30 days, so this is established from the code and the deployed
configuration (no secret bound), not from an observed failure.

## 6. What was added

New tests listed above, plus `geminiModels.ts` / its test and the vision repair tests from earlier in this session.

## 7. Intentionally not implemented (and why)

| Spec item | Reason |
|---|---|
| Logo upload/AI analysis, tagline discovery, brand colour and tone discovery in onboarding | Founder decisions: logo lives on the Business Brain, ungated; no extra questions before the core journey is validated. There is no server logic for logo analysis today; adding it is a feature, not a gap fix. |
| Content pillars, onboarding marketing objective, richer mascot state set | Same decision. The mascot is used purposefully on welcome/review/completion/error only. |
| Re-onboarding partially onboarded existing users | Existing owners with a business are never interrupted (production-safety rule). |
| Opening hours, regional language questions, salon services, real-estate properties, two-tab collaboration, Playwright-for-everything | Explicitly deferred by the founder. |

## 8. Security changes

F6, F7, F8 above. No Firebase rule or Storage rule was changed or weakened. No API key is client-side: Gemini is called only
from Cloud Functions. A key-shaped string in `errors.test.ts` was checked by hash against the real key: it is a synthetic fixture
(39 chars; the real key is a different length/format), not a leaked credential. **F7 is a production defect until deployed.**

## 9. AI changes (model audit)

Defaults `gemini-3.1-flash-lite` (text) / `gemini-3.5-flash-lite` (vision) / `gemini-flash-lite-latest` (discovery) are centralised
in `config/geminiModels.ts` with env overrides; empty overrides fall back (tested). Occurrences found:

| Occurrence | Class |
|---|---|
| `gemini-2.5-flash-image` (`services/ai/image.ts`, `index.ts`) | active production path (**image** generation, verified working for the key); a separate model family with its own retirement clock, flagged as a watch item |
| `gemini-1.5-pro` in `src/services/aiTraceService.ts` | mock trace display strings |
| `gemini-1.5-pro` in `tests/schemas.edgeCases.test.ts` | test fixture |
| `gemini-flash-lite-latest` / retired names in `*.live.test.ts`, docs | test / documentation |
| `modelRouting.ts` | dead code (unused), now uses the central defaults |
| `calendarPlanningService.ts` hardcoded label | fixed (F9) |

**Production note (corrected earlier):** production never ran `gemini-1.5-flash`; the deployed source hardcoded `gemini-flash-latest`.
The five Gemini functions were redeployed on 2026-10-05 with the three env vars set (docs/MODEL_BENCHMARK_2026-10.md).

## 10. Business Brain / adaptive engine

No schema change in this task. Inspected after a real confirmation: Brain keys `identity, products, brand, audience, owner,
offerings, positioning, knowledge, localization, businessRules, campaignHistory`; provenance per fact; `operatingMode: delivery`
for a cloud kitchen; phone `+919876543210` marked `DERIVED_FROM_WHATSAPP`; the draft keeps only a completed marker with the business
id (answers wiped) so a retry returns the same business.

## 11. Accessibility findings (axe-core in a real browser, settled screens)

Before: serious `definition-list`, `dlitem` (review); moderate `page-has-heading-one` (questions). After: **0 serious/critical** on
welcome, question, industry and review screens (mobile), and on the desktop role screen. Remaining: moderate `region` (2 nodes) from
site-wide chrome outside `<main>` (assistant launcher; in the local build also the emulator banner), not onboarding content.
Note: early scans flagged `color-contrast` while screens were mid-fade-in; re-measured after the animation settled they were clean
(measurement artefact, not a defect). Keyboard: one tab stop per option group, arrows/Home/End move focus, Space selects, 3 px
focus outline visible. Only the global "Mitra AI Partner" launcher is below 44 px (41 px wide); onboarding controls meet 44 px.
Not done: screen-reader (NVDA/VoiceOver) manual pass; tablet viewport.

## 12. Findings left open

1. **Truth Check contract (P1): FIXED locally after this audit, not deployed; see the addendum.** Original finding: `truthCheck.ts` requires facts the copy prompt never asks for:
   `checkOffer` FAILs unless the text contains the literal `NN%` (the prompt gives offer type and price, not a discount to state);
   `checkOfferValidity` wants a numeric date in the copy (the prompt only passes `duration`); `checkPrice` accepts only
   `₹N`/`Rs N`/`INR N` (the model often writes `999 INR`, a number-first form the regex does not match) while the prompt says
   "use ₹N" only once. Benchmark: 23 of 24 runs failed for these reasons regardless of model. Weakening Truth Check is the wrong
   fix; the contract (prompt requirements = output schema = Truth Check) must be aligned. A "no discount, no dates" campaign
   avoids the offer/date checks but can still fail on price format or prohibited claims.
2. **Regional language (P1, not fixed here).** Pure Hindi and pure Telugu requests return Latin script from both models; Telugu
   phrases appeared in a Mumbai Hinglish ad in the benchmark. No hardcoded Telugu text exists in generation prompts (Telugu strings
   are in the test matrix/eval suite only; the `hyderabadi` regional style adds Hyderabad cues to image and brief prompts). The
   cause is **not yet established**; the fix is to make the language requirement explicit in the context/prompt layer and test it.
3. **Credits 100 vs 140** (billing; separate): `usageControl` ×3, `onboardingToCampaignE2E`, `billingCopy`, `pricingParity`.
4. **Deployed source ≠ working tree ≠ HEAD.** Deploys must start from the deployed source; the working tree also holds
   uncommitted behaviour changes (e.g. refund when Truth Check discards a campaign) that production does not have.
5. **Pre-existing lint warning** in `CampaignWizard.tsx` (identical in HEAD) fails `--max-warnings 0`.
6. Copy prompt embeds the Brain as raw JSON (section 3 #16): structured context is a P2 improvement.
7. Global assistant launcher is 41 px wide (P2).

## 13. Tests run

Baseline recorded in CLAUDE.md: 38 suites / 687 tests / 127 skipped (long superseded by the phases since).

| Run | Suites | Tests |
|---|---|---|
| Functions, with Firestore/Auth/Storage emulators | 139 total: **131 passed**, 2 failed, 6 skipped | 1414: **1361 passed**, 4 failed, 49 skipped |
| Root (frontend + rules/storage/security), with emulators | 98 total: **96 passed**, 2 failed | 1452: **1443 passed**, 2 failed, 7 skipped |

All 6 failures are the known credits mismatch (`Expected: 140`): functions `usageControl` ×3 and `onboardingToCampaignE2E`; root
`billingCopy` and `pricingParity`. Fail-first was observed for F1–F8 before each fix.

## 14. Typecheck / lint / build

- Typecheck: functions `tsc --noEmit` exit 0; root `tsc --noEmit` exit 0.
- Lint: functions `eslint src` exit 0; root: 0 errors, 1 pre-existing warning (`CampaignWizard.tsx:343`), so `--max-warnings 0` exits 1.
- Build: `next build` succeeded (with `NEXT_PUBLIC_ONBOARDING_V2=true`); functions `tsc` build succeeded.

## 15. Browser QA (local: production build + Firebase emulators; headless Chromium)

| Scenario | Result |
|---|---|
| 1. signup (email) → verify → onboarding → restaurant → cloud kitchen → offering → audience → USP → review → confirm → dashboard | **TESTED, pass.** Business created, Brain inspected, draft answers wiped, 0 console errors |
| 2. salon → beauty parlour → … skip USP → review → confirm | **TESTED, pass** (salon wording verified). "Skip logo": NOT APPLICABLE, V2 has no logo step |
| 3. returning user login → dashboard | **TESTED, pass** |
| 4. answer several questions → refresh → close browser → log in → resume | **TESTED, pass** (same screen; earlier answers present; no re-asking) |
| 5. logo AI fails → skip → complete | NOT APPLICABLE (no logo AI in V2) |
| 6. tagline detected wrongly → corrected | NOT APPLICABLE (no tagline discovery in V2); the equivalent provenance rule (user answer beats AI guess) is unit-tested in `discoverOnboardingFacts` and `draftModel` |
| Google sign-in and consent | **BLOCKED** (needs a real Google account in the founder's browser) |
| Landing auth nudge | not browser-tested (unit tests exist) |
| Tablet viewport; screen-reader pass | **not done** |
| Whether AI discovery returned suggestions during the browser runs | **not inspected** (flow completed regardless; failure path is unit-tested) |
| Production smoke test (real campaign + vision) | **pending the founder** |

## 16. Deployment recommendation

**Do not auto-deploy.** READY WITH CONDITIONS applies to a controlled V2 rollout *after*: the production smoke test passes, the
Truth Check contract and regional-language fixes are done as separate changes, the credits mismatch is resolved, and Google
consent has been verified manually. When deploying, deploy only the functions that changed (F7 requires redeploying
`generateMarketingPlan`; F8 affects the five Gemini functions that share `conflictResolver`), built from the deployed source plus the
specific patches, not the whole working tree. The three onboarding functions remain undeployed and the V2 flag stays off until then.

## Addendum 2026-10-05: Truth Check contract fix (local, not deployed)

Contract in one place (`services/ai/offerContract.ts`, documented in docs/TRUTH_CHECK_CONTRACT.md). Changes: the copy prompt now
states the real price/discount/validity window/offer concept and the prohibited phrases it is held to; Truth Check accepts the same
fact in every normal spelling while keeping the amount/date exact, no longer demands facts the campaign does not have, tells
*missing* from *invalid* (`basis`), and checks hours and delivery as claims instead of words. `generateCampaignStrategy` now passes
the owner's original price to the pipeline (it never did). Nothing was removed or loosened to be easier to pass.

Real-Gemini check, `gemini-3.1-flash-lite`, one run per scenario, same six scenarios: Truth Check **before 0 PASS / 1 REVIEW / 11 FAIL
(12 runs); after 5 PASS / 1 REVIEW / 0 FAIL (6 runs)**. The REVIEW is correct by design (a percentage offer with no original price).
An intermediate run still produced 2 FAILs from the model itself (an invented "free delivery"; a possession status that contradicts the
listing), so expect run-to-run variance: N=1 per scenario is a small sample.

Tests: functions suite with emulators 135 of 143 suites, 1483 tests passed, only the 4 known credits failures; lint and typecheck clean.
New: `offerContract.test.ts`, `truthCheck.contract.test.ts`, `pipeline.offerContract.test.ts`, `generateCampaignStrategy.offerPlumbing.test.ts`.

Found and left open: (a) `createCampaignFromCalendarItem` invents a ₹499 price when an item has no product (needs a product decision);
(b) a wrong/other WhatsApp number is REVIEW_REQUIRED, not FAIL, and `businessPhone` is never passed to the check;
(c) salon "name a defined service" and real-estate "possession status" are vertical contract gaps of the same kind, not yet aligned;
(d) visible effect: wizard campaigns can now show the discount badge/was-price the owner asked for.

## Addendum 2 (2026-10-05): contract alignment completed, Telugu leak fixed (local, not deployed)

Done on top of the Truth Check contract: wrong contact numbers are now an invalid claim (FAIL) when presented as the contact;
salon and real-estate facts are given to the copywriter and verified by Truth Check from the same record; the calendar path no
longer invents a ₹499 price; and the Telugu leak is fixed at its source. Details: docs/TRUTH_CHECK_CONTRACT.md and
docs/LOCALIZATION_CONTRACT.md.

**Telugu trace result.** For a Mumbai / Hinglish salon with a correct localisation at the pipeline's entry, the pipeline's own
prompts injected Hyderabad / Telugu: the localisation stage was a fixed "Hyderabadi localization expert … Telugu-English" persona
(Telugu CTAs, "Kondapur techies") for every business and fed the copywriter; plus three smaller prompt sites, a copy-prompt
language line that mixed in a stale secondary "te", calendar-path defaults (Telangana / Hyderabad / "te"), wizard presets that
forced Telugu + Hyderabadi, Brain-editor defaults, and a trace check "Telugu requested" that was a fixed PASS. First incorrect
boundary: the localisation-stage prompt. Fixed at the prompt/context layer (built from the owner's own localisation; names no
other language), plus a real language check in Truth Check, with regression tests that run the real pipeline.

Live Gemini (default models), the Mumbai Hinglish salon, 2 runs: natural Hinglish copy, no Telugu script, no romanised Telugu, no
Hyderabad / Telangana words, Truth Check PASS in both. N=2.

Tests: root suite 99 of 101 suites (only the 2 known credits failures). Functions: the only failures are the 4 known credits tests and
the other in-progress Creative Brain work (below). A wrong fixture was corrected: the instruction-chain stub returned a Telugu-script
headline for every case including "Use Hinglish", which the new language check correctly rejects.

**Concurrent work.** Another agent is building a Creative Brain in the same files (new creativeBrain* modules, a creative_brain stage in
pipeline.ts). During this work it broke the build several times; at the end its own two new suites fail and
pipeline.observability.test.ts fails because the new stage adds model calls and swallows the first failure; its files also hold all
current functions lint errors. None of that is from this work, but it must be reconciled before anything is deployed, and its prompts
(defaults like "Delivery Radius 5km", "Special Price") should follow the same rule: missing facts stay missing.

## Addendum 3 (2026-10-05): the founder's decisions implemented (local, not deployed)

Wizard languages and styles expanded (stored preferences preserved); native script left as a later renderer capability; delivery
radius and minimum order no longer invented anywhere; quick-idea pills made vertical-aware and fact-free; a sparse-business
invariant test added; the Creative Brain reconciled with the same rule.

The invariant test found more leftovers, all fixed: the restaurant copywriter rule was "a Hyderabadi marketing copywriter … for a
Hyderabad restaurant … Telugu-English-Hinglish" for EVERY restaurant (a fifth Telugu source, missed by the salon trace); the
Creative Brain prompt and fallback blueprint printed "Delivery Radius 5km, Min Order ₹0", "Special Price", "Offer Validity:
undefined to undefined", "Contact: undefined", "Price: ₹0" and injected "Verified local business service" (a phrase Truth Check
rejects); the brief prompt carried borrowed examples ("Minimum order ₹200", "Delivery only within 5km"). The old wizard presets
manufactured prices, a discount and claims, and one click could publish a price the owner never set.

Tests: functions with emulators 151 of 153 suites, 1643 tests (only the 4 known credits tests fail); root 104 of 106 suites, 1541
tests (only the 2 known credits tests fail). Typecheck: functions 0 errors, root 0 errors. Lint: functions clean; root: the
pre-existing CampaignWizard warning only.

Tests whose premise was a defect were updated, not weakened: the Hyderabadi restaurant persona pin (verticals tests), the
"MVP language/style subset" pin (campaignWizard tests, which still assert every exposed value is backend-supported), and the
instruction-chain stub that returned Telugu for a Hinglish request.

**Creative Brain reconciliation.** The other agent's Creative Brain left the tree not compiling (26 suites failed to run): missing
type names, a dynamic import without its .js extension, an extra property the resolver's type does not accept, and 14 strictness
errors under the root tsconfig plus 18 lint errors. I applied only mechanical fixes (import extension, a renamed type import, an
extra property removed, non-null/bracket access, dead imports and locals), changed no behaviour, and removed its invented defaults
from the prompts. Its feature work (the stage itself, its tests) is otherwise untouched and passes. It should still be reviewed by
its author before deploy.
