# 05 — Pass 2C: Campaign Matrix (MOCK MODE) — 2026-10-11

**Scope:** deterministic mock verification only. No live Gemini/image calls, no production access, no billing, no deploy.
**What this proves:** the real pipeline and real deterministic Truth Check behave to contract when the model is stubbed.
**What it cannot prove:** that a live model writes good copy or images. Those cells are `NOT TESTED`, never `PASS`.

## Commands and counts
| Command | Result |
|---|---|
| `cd functions && npx jest src/services/ai/pipeline.scenarioMatrix.test.ts` (set `MATRIX_OUT=<file>` for the JSON) | 13 tests passed |
| `firebase emulators:exec --project demo-mitra-audit --only auth,firestore,storage "cd functions && npx jest src/functions/campaigns/generateCampaignStrategy.creditContract.test.ts src/services/ai/pipeline.scenarioMatrix.test.ts"` | 21 passed (8 credit-contract + 13 matrix), 0 failed |
Files (commit `7ad115b`): `functions/src/services/ai/pipeline.scenarioMatrix.test.ts`, `functions/src/functions/campaigns/generateCampaignStrategy.creditContract.test.ts`.
Harness: `GenerationPipeline` is real; `generateStructuredText` is a fake keyed by schema identity (copy stage returns the scenario's authored copy, every other stage returns `{}`); image provider and storage are stubbed. Truth Check, offer contract, vertical contract, prompt builders and asset assembly are the real code.

## Scoreboard (36 recorded checks)
**PASS 24 · REVIEW 4 · FAIL 1 · NOT TESTED 7.** (Pass = contract met; Review = hard contract met but the ideal verdict was missed; Fail = hard contract broken.)

## Scenarios and fixtures
| # | Scenario | Fixture (summary) | Result |
|---|---|---|---|
| 1 | Restaurant offer | Kondapur Biryani House, Chicken Dum Biryani ₹299 fixed, number on file. Variants: honest / ₹199 / invented phone / invented "50% off" | honest PASS; wrong price FAIL (caught); invented phone FAIL (caught); **invented 50% off → REVIEW only** |
| 2 | Family meal | Family Combo ₹799, occasion family. Honest vs "#1 award-winning, 5 stars by 10,000 customers" | superlatives FAIL (caught); honest → **REVIEW** solely because the WhatsApp number is not printed in copy |
| 3 | Curiosity angle | styles `storytelling` vs `fomo` | style reaches the copywriter prompt: PASS. Strategy distinctness: NOT TESTED |
| 4 | Salon promotion | Keratin ₹2,499 (was ₹3,499), services Keratin+Haircut | honest PASS; "50% off" caught; prompt derives exactly 29% and lists known services: PASS |
| 5 | Salon premium | brandTone luxury | tone in prompts PASS (1 of 10 prompts); visuals + tone adherence NOT TESTED |
| 6 | Incomplete brief | price 0, no phone, empty brain | 10 prompts, 0 invented facts: PASS. Clarifying question: NOT TESTED (callable also requires price > 0) |
| 7 | Real-estate listing | 3BHK, bedrooms 3, ready_to_move | honest PASS; prompt limited to recorded facts PASS; **invented possession date / RERA / bathrooms / area → REVIEW only** |
| 8 | Real-estate lead | CTA call_now | correct number PASS; wrong number FAIL (caught) |
| 9 | Generic business | stationery shop, vertical general | honest PASS; **REVIEW**: safety prompt contains stale note "(critical for future salon vertical)" — harmless, cosmetic |
| 10 | Contradictory offer | original ₹249 < price ₹299, end < start, headline ₹199 | downstream copy mismatch FAIL (caught); no negative-discount prompt PASS; **contradiction not flagged before generation: FAIL** |
| 11 | Insufficient brain | empty brain, name + city only | 0 invented facts in prompts PASS; invented "since 1995 / 24/7 / 10,000 customers" FAIL (caught); Creative Brain behaviour NOT TESTED |
| 12 | Provider failure | image `success:false`, image throws, copy stage throws | all three abort with an error and no asset claims completion: PASS (credits: below) |
| — | Output integrity | normal run | 32 assets: text assets + poster, 3 stories, reel with image URLs, all `completed`: PASS. Pixel size/aspect/legibility: NOT TESTED |

## Findings from the matrix (prioritised)
1. **P1 — Material false claims only reach REVIEW, and are delivered and charged.** An invented discount on a fixed-price offer (S1) and an invented possession date / RERA / bathrooms (S7) produce `REVIEW_REQUIRED`, not `FAIL`. REVIEW campaigns are delivered, downloadable and charged (credit test). The UI only says "Some details couldn't be automatically confirmed" (`CampaignDetailContent.tsx:92`). Fix: classify unauthorised discount and unrecorded real-estate legal/possession claims as `FAIL` (regenerate, refund), or at least itemise the unverified claim in the UI.
2. **P1 — Contradictory offers are not rejected.** `generateCampaignStrategy.ts` offer schema has no cross-field validation (`grep refine` → 0): `originalPrice <= price`, `validityEnd < validityStart` are accepted and generation proceeds. Fix: zod `superRefine` + a clear user error; test.
3. **P2 — Honest copy that omits the phone number ends REVIEW** (S2). A WhatsApp-CTA campaign is expected to carry the number; if intentional, fine, but it means PASS is only reachable when the number is printed, and the user sees "Needs Review" on an accurate ad.
4. **P2 — An image-provider failure fails the whole campaign** (S12): no partial/text-only delivery. Safe (refunded, tested) but costly in user experience; decide if text-only degrade is wanted.
5. **P3 — Stale prompt text** "(critical for future salon vertical)" sent to the model for generic businesses.
6. **Known, unchanged from the 2026-10-05 live benchmark (not re-run):** native-script Telugu/Hindi, price format "INR/Rs", models inventing discounts — these need live runs.

## Credit contract results (emulator, mocked AI) — 8/8 pass
| Contract | Result |
|---|---|
| Flat price = 100 = 60 base + 2×20 images | PASS |
| Delivered campaign (PASS) charges exactly 100, one `completed` transaction | PASS |
| Delivered-for-review (REVIEW_REQUIRED) is also charged 100 | PASS (policy: delivered = charged) |
| Truth-Check FAIL nets 0 | PASS |
| Provider exception nets 0 and the reservation is `refunded` | PASS |
| Same idempotency key replayed after success is not charged twice | PASS |
| Refund called repeatedly stays a no-op; total refunded ≤ reserved (100); balance never negative | PASS |
| Free plan (140): one campaign charged 100, 40 left; second campaign refused, usage unchanged | PASS |
| Free plan, two simultaneous campaigns: exactly one succeeds, 100 charged | PASS |
Unused-image-slot refund: **not applicable** — pricing is flat by design (plans sell campaigns/month = credits ÷ 100).

## Mocked / untested provider behaviour
Gemini text (quality, JSON repair behaviour, native script, discount invention), Gemini image (content, text legibility, product fidelity, dimensions), vision analysis, Creative Brain reasoning (it returned no blueprint under the `{}` stub — Opportunity formation failed and the pipeline continued; real behaviour needs a model), Storage uploads, rendering/export, reel MP4, latency and cost. Language/tone adherence has no deterministic checker.

## IMPORTANT — the committed branch is not what was tested
`git diff` shows these **uncommitted** working-tree edits, which every test above ran against:
- `functions/src/config/pricing.ts`: working tree `campaignBaseCredits 60`, free `140`; **HEAD has `100` and free `100`** ⇒ at HEAD a campaign costs 140 and the free tier is 100: the free user cannot complete a campaign. The "100 vs 140" problem is real at HEAD and fixed only in the working tree.
- `firestore.rules`: working tree adds `allow create: if false` on `campaigns`, the `usage` missing-doc `get`, and `onboarding_drafts`; **HEAD still lets any signed-in user create a campaign already marked `verified`/PASS** (the forged-badge exploit the working-tree comment describes).
Consequences: (a) deploying from HEAD would ship the weaker rules and broken free tier; (b) a clean checkout of HEAD fails `tests/pricingParity.test.ts`, the new `security.rulesCoverage` "cannot create a campaign" test and the credit-contract price test, so CI (`ci-cd.yml` runs lint, typecheck, test, build) would very likely be red on HEAD (inferred from the diffs; I did not run a clean checkout of HEAD). **Recommendation: review and commit those two files first, as separate commits, before anything else.** I have not committed them.

## Follow-ups not done (by instruction)
- **Free-plan label:** Pricing UI shows "5 social creatives" (free) next to 1 campaign/month; creatives per campaign are 5 (free), 3 (starter), 2.5 (business) — the ratio is not constant, so the label is not a clean function of campaigns. `PricingPageClient.tsx`, `pricing/page.tsx`, `lib/config/pricing.ts`, `terms/page.tsx` all carry uncommitted edits, so I did not touch them. Proposed copy: "1 campaign (poster, 3 stories, 1 reel concept)" with the 100-credit rule stated once. Needs your wording approval.
- **Mascot assets, CSP, Cashfree:** unchanged; CSP/Cashfree wait for provider-status evidence, mascot waits for the render-size inspection.

## Proposed live-provider subset (NOT approved, nothing run)
Estimate basis — **assumptions, not verified prices; re-check Google's price list before approving**: ~10–12 text calls per campaign (benchmark: 10–12, repairs included), ~6k input + ~2k output tokens each; one hero-image call (`gemini-2.5-flash-image`, `MAX_IMAGE_GENERATION_CALLS_PER_CAMPAIGN = 1`); reference price points of $0.25–0.50/M input and $1.50–3/M output for the lite text models and ~$0.04 per generated image; ₹88–90 per $. Result: **≈ $0.06–0.15 ≈ ₹5–14 per campaign**; the 2026-10-05 benchmark doc has measured costs that should replace these assumptions.
| Run | Purpose | Calls (text + image) |
|---|---|---|
| L1 Restaurant offer (S1) ×2 | quality, price format, variance | ~24 + 2 |
| L2 Salon promotion (S4) | discount derivation, Hinglish | ~12 + 1 |
| L3 Real-estate listing (S7) | recorded-facts-only, RERA/possession | ~12 + 1 |
| L4 Contradictory offer (S10) | live behaviour on conflict | ~12 + 1 |
| L5 Insufficient brain (S11) | fabrication, Creative Brain | ~12 + 1 |
| L6 Telugu restaurant | native script (known weak) | ~12 + 1 |
Total ≈ 7 campaigns, ≈ 85 text calls, 7 images → **estimated ₹35–100; proposed hard cap ₹300** (≈3× upper estimate). Stop conditions: running spend (from `aiCallLog` token counts) ≥ ₹300; 2 consecutive provider errors/timeouts (90 s); any attempt to reach a non-Gemini host or a production Firebase project; any output containing a key pattern. Safeguards: key read from `functions/.env.local`, never printed (scan logs for `AIza`); Firestore/Storage on the local emulator; no credits or users in production touched; reuse the existing opt-in harness (`LIVE_GEMINI=1 BENCH=1`). Scores kept separate: factual correctness (Truth Check + manual), copy quality (manual 1–5), visual quality (manual), technical success (automatic).
