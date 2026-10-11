# 19 — Gemini model inventory, prices and live-AI budget (for approval)

Status: **no live AI has been run. The ₹300 cap is NOT approved.** Prices verified 2026-10-11 against Google's
Gemini API pricing page (paid tier, Standard; page "last updated 2026-10-09 UTC"). Re-verify immediately before any approved run.

## 1. Model inventory (what the code can call)

| Use | Model ID (default) | Env override | In price page? | Input / output per 1M tokens | Worst-case per call (metered) |
|---|---|---|---|---|---|
| Text (strategy, copy, truth check, brain) | `gemini-3.1-flash-lite` | see `config/geminiModels.ts` | yes | $0.25 / $1.50 (output includes thinking) | $0.02 |
| Vision (image/logo analysis) | `gemini-3.5-flash-lite` | see `config/geminiModels.ts` | yes | $0.30 / $2.50 | $0.03 |
| Discovery alias | `gemini-flash-lite-latest` | — | **no** (alias; benchmark of 2026-10-05 showed it resolves to 3.5-flash-lite) | assumed $0.30 / $2.50 | $0.03 |
| Image | `gemini-3.1-flash-lite-image` | `GEMINI_IMAGE_MODEL` | yes | $0.25 in / $30 per 1M image tokens (1K image ≈ 1,120 tokens ≈ $0.034) | $0.05 |
| Image (dearer alternative, not default) | `gemini-3.1-flash-image` | `GEMINI_IMAGE_MODEL` | yes | $0.50 / $60 (1K ≈ $0.067) | $0.10 |

* Fallbacks: image generation has no cross-model fallback; a failed image call is charged as if made (conservative) and the run stops after 2 consecutive failures. Any model not listed is priced at the pessimistic default ($1.25 / $10, max $0.10).
* **Retired:** `gemini-2.5-flash-image` was shut down 2026-10-02 and was the previous default. It is replaced; a test fails if it returns as a default.
* Dead config: `modelRouting.ts` names `dall-e-3` / `gemini-imagen`; nothing calls them. No grounding/search or other paid tools are used (grep found none), so there is no per-request tool fee to meter.
* **Image resolution is not set in the request**; the model default is used. The price assumes 1K. If the model returns 2K/4K the cost per image is higher: the meter charges what `usageMetadata` reports, but the *reservation* ceiling ($0.05) would be exceeded by that single call. **UNVERIFIED** until one real call reports its output tokens.

## 2. What the meter covers

`services/ai/usageMeter.ts`: reserves the worst case before each call, replaces it with the cost measured from `usageMetadata`, charges the maximum when no usage is returned, counts failed calls and retries as full cost, stops safely when the next reservation would exceed the budget, and prints an audit table. Tests assert every default model has a price. It meters the harness path only after it is wired into the live runner (done only after you approve the prices and budget).

Known limit: a single call that reports **more** than its reserved maximum is still recorded, so the cap can be exceeded by that one call's excess. Keep a margin between the cap and what you are willing to lose.

## 3. Cost estimate (USD→INR at ₹90, deliberately above the market rate)

* **Expected per campaign:** ≈ ₹5–8 (measured text ≈ ₹2.3 in the 2026-10-05 benchmark; plus 2 images ≈ ₹6 at $0.034 each; vision only when a logo/photo is analysed).
* **Hard worst case per campaign:** up to ~39 text calls × $0.02 + 2 images × $0.05 + vision ≈ $0.9 ≈ **₹80**. This is a ceiling the meter reserves against, not an expectation (it assumes every call hits maximum input and output tokens).
* **Batch:** a ₹300 cap covers ~3–4 campaigns at worst case, or ~35–50 at expected cost. The meter stops the run when the *reservation* for the next call would breach the cap, so a worst-case-reserving run may stop early; this is the safe direction.

## 4. Recommendation (decision is yours)

1. Do not approve the full batch yet. Approve **one scenario** (one campaign, English, a small business, cheapest path) with a cap of **₹100**.
2. After it runs: compare measured vs reserved cost per call, confirm the image token count/resolution, and check the audit table. Only then decide the ₹300 batch.
3. Confirm you accept the discovery alias being priced by assumption, or exclude discovery from the first scenario.

Needed from you: (a) approve prices as stated, (b) the cap and the number of scenarios, (c) permission to wire the meter into the live harness. Nothing live runs before that.
