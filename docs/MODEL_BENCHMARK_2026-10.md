# Gemini model benchmark — 2026-10-05

Real `GenerationPipeline.execute()` and real `GeminiVisionProvider`, production Gemini key, synthetic data.
Harnesses are opt-in (`LIVE_GEMINI=1 BENCH=1` / `BENCH_VISION=1`). Prices are Google's published standard tier
as read on 2026-10-05 and should be re-checked before they are used for pricing decisions.

Context (corrected 2026-10-05): the working-tree code default `gemini-1.5-flash` is retired (404, as are the
1.5/2.0/2.5 families for our key) but was never deployed. Production ran source that hardcoded `gemini-flash-latest`
(text and vision), which is available but a larger, slower model. `gemini-3.5-flash` failed both ceiling runs here
(90 s call timeouts, 503s) and is not viable as a default. `gemini-flash-lite-latest` resolves to `gemini-3.5-flash-lite`.

## Production rollout (2026-10-05)

Deployed to the five functions that call Gemini (`generateCampaignStrategy`, `createCampaignFromCalendarItem`,
`regenerateAsset`, `generateReel`, `analyzeReferenceStyle`) with `GEMINI_TEXT_MODEL=gemini-3.1-flash-lite`,
`GEMINI_VISION_MODEL=gemini-3.5-flash-lite`, `GEMINI_DISCOVERY_MODEL=gemini-flash-lite-latest` set explicitly.
The deployed source matched neither HEAD nor the working tree, so the build was the **deployed source plus only**:
model selection read from env (text.ts, index.ts), the vision hardening (vision.ts) and config/geminiModels.ts.
Other working-tree changes and the onboarding functions were not deployed. Rollback revisions (previous): see the
session notes; each function can be returned to its prior Cloud Run revision.

## Text (N=2 per scenario, 6 scenarios = 12 runs per model)

| Model | Copy quality | JSON reliability | Truth Check compatibility | Telugu / Hindi | Latency | Cost / campaign |
|---|---|---|---|---|---|---|
| gemini-3.5-flash-lite | More energetic copy; but 7/12 runs contained prohibited claims (legendary, guaranteed, famous, best in, trusted, 100%), 3/12 invented discount percentages | 12/12 pipeline success; mean 3.8 repair calls | 0/12 pass; 12 FAIL | Latin script in pure-Hindi/Telugu scenarios (4/4 "BAD") | median 51 s, mean 67 s, **worst 173 s** | $0.042 (~Rs 3.6) |
| gemini-3.1-flash-lite | Plainer, more faithful; 1/12 prohibited claim ("trusted"), 0 invented discounts | 12/12 pipeline success; mean 4.5 repair calls | 0/12 pass; 1 REVIEW, 11 FAIL | Same: Latin script (4/4 "BAD") | median 73 s, mean 74 s, worst 89 s | $0.028 (~Rs 2.3) |

Both: 0 thinking tokens; 8/12 language checks ok (the 4 failures are the pure Hindi / pure Telugu scenarios, for both).

**Recommendation (text): `gemini-3.1-flash-lite`, pinned.** Weighted on quality, reliability, Truth Check
compatibility, local language, latency and cost it wins on compliance (the property that decides whether copy is
publishable), cost and tail latency; it loses on median latency (~22 s) and is an older model that will retire
sooner (pin the exact id, re-run this benchmark on retirement notice). Reliability and local-language quality are a
tie. The difference between the models is much smaller than the pipeline-level problems below, which dominate
both latency (12-16 sequential model calls per campaign) and Truth Check outcome.

## Vision (5 photos with ground truth + 1 mismatch case + 3 reference-style; hardened code)

| Vision model | Extraction | Brand/logo accuracy | Repair rate | Latency | Cost / call |
|---|---|---|---|---|---|
| gemini-3.5-flash-lite | 5/5; kept the business-supplied name for spaces ("Our salon floor") | not tested (no photo contains a logo) | not instrumented; 8/8 succeeded after hardening, vs 1/3 on reference style before | median 2.3 s | ~$0.0012 |
| gemini-3.1-flash-lite | 5/5 (was 3/5 before hardening); returned "not_applicable" / "Not applicable" as the subject name for 2 spaces | not tested | not instrumented; 8/8 succeeded after hardening | median 2.8 s (reference style 5.5 s) | ~$0.0008 |

Mismatch case (metadata says "Paneer Biryani", photo is coffee): 3.5-flash-lite reported the mismatch and dropped
confidence to 0.35; 3.1-flash-lite reported the photo but kept confidence 0.95 and raised no flag. Neither echoed the
wrong name.
**Recommendation (vision): `gemini-3.5-flash-lite`** (distinct from text). Gaps: logo accuracy untested, repair
rate not measured (the repair loop does not log), N is small.

## Findings (independent of model choice)

1. **Truth Check demands what the copy prompt never asks for.** Discount % and offer start date are required by Truth
   Check but absent from the copy prompt, so 23 of 24 runs failed whichever model ran. Until this is resolved,
   campaigns will mostly land in FAIL/REVIEW regardless of quality.
2. **Price format.** Models often write "999 INR"/"Rs" where Truth Check looks for the exact price string; about two
   thirds of runs show "Price mismatch ... found: none" for a price that is present in another form.
3. **Native script.** Pure Hindi / pure Telugu requests come back in Latin script from both models (4/4 each). The
   pipeline, not the model, is steering this; a Telugu-speaking owner asking for Telugu copy does not get Telugu script.
4. **Telugu phrases leak into the Mumbai Hinglish salon ad** (seen in both models, first pass).
5. **Owner name printed in an ad** — fixed (`brainForGeneration`, owner/provenance never reach a model).
6. **Latency** is dominated by the pipeline (12-16 sequential calls, 3-7 of them repairs), not by model speed.
