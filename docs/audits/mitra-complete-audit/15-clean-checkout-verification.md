# 15 — Clean-checkout verification of committed HEAD (2026-10-11)

## Result: committed HEAD does NOT build. The verified state exists only in the working tree.
Method: `git worktree add --detach ../_clean_head HEAD` (commit `1577655`, 0 uncommitted files), `node_modules` junctioned in, nothing else shared.

| Check (clean HEAD) | Result |
|---|---|
| `npx tsc --noEmit` (root) | **FAIL — 482 errors** (exit 2) |
| `npm --prefix functions run typecheck` equivalent (`cd functions && npx tsc --noEmit`) | **FAIL — 23 errors** (exit 2) |
| Jest / rules / build on clean HEAD | **Not run** — pointless until the code compiles |
For comparison the same code *with the working-tree modifications* passes: tsc clean (both), functions 248/2586, root 112/1594, `next build` OK (Pass 2B).

## Cause
Commit `9d6d19e` added ~966 previously untracked source files (Creative Brain, onboarding, Cashfree, businessCreation, …). Those files import symbols that only exist in **tracked files still carrying uncommitted edits**. Examples from the 23 functions errors:
- `services/entitlements.ts` must export `assertBusinessCapacity` (needed by `confirmOnboardingBusiness.ts`)
- `config/env.ts` must declare `CASHFREE_APP_ID/SECRET_KEY/ENVIRONMENT/WEBHOOK_SECRET/API_VERSION` (`cashfree.ts`, `createCashfreeCheckout.ts`)
- `types/index.ts` must export `BrainFactSource`, `BrainKnowledge`, add `general` to `BusinessCategory`, `industry`/`subcategory` on the business identity (`brainMapping.ts`, `businessCreation.ts`, Creative Brain resolvers)
- `services/analyticsService.ts` must define `ONBOARDING_CONFIRMED`; `services/ai/text.ts` options must accept `model`; `GenerationPipelineInput` must carry `offerValiditySource`
The remaining ~460 root errors are overwhelmingly the Creative Brain tree and its tests compiling against the old shared types.
Side effect already visible: my committed tests (`pipeline.scenarioMatrix`, `creditContract`, `security.rulesCoverage`) and `tests/pricingParity.test.ts` were written/verified against the working tree.

## What this means
- Anything deployed or tested "from the repo" at HEAD is not what was verified. CI (`ci-cd.yml`: lint → typecheck → test → build) would fail at typecheck.
- The two commits requested (rules `1addfb6`, pricing `1577655`) are correct and independently reviewed, but they cannot be validated in isolation until the type/config files they sit beside are committed.
- It is not an architectural defect; it is an unfinished consolidation: ~342 reviewed-in-aggregate-but-uncommitted modifications.

## Proposed path (needs your approval; nothing done)
1. Commit the remaining 342 tracked modifications in **dependency order**, each verified by tsc: (a) shared types + env + entitlements + analytics event + text options (the 23 functions errors), (b) functions services/pipeline/Creative Brain wiring, (c) frontend features/components/app, (d) config/CI/docs, keeping pure prettier churn in its own commit.
2. After each group: `tsc` in a clean worktree; after the last: full clean-checkout jest (emulators), rules tests, `next build`.
3. Only then fix the two P1 campaign-integrity issues (they edit `generateCampaignStrategy.ts`/`truthCheck.ts`, which are among the uncommitted files) so that the fixes are committed on a consistent base.

## Side findings recorded while checking the free-plan label
- Plan config says Free = `reelsPerMonth 0`, `storiesPerMonth 0`, `creativesPerMonth 5`; the pricing card shows "0 AI reels", "Story Concepts 0/mo". But a Free campaign still generates a poster, 3 stories and a reel asset: `requireStoryAllowance`/`requireReelAllowance`/creative-quota helpers are defined in `entitlements.ts` and exercised only by tests — **no production caller** (`generateReel` gates with `requirePlan`, `generateCampaignStrategy` gates only the campaign count). So per-feature quotas for stories/creatives are advertised but not enforced, and the Free card under-describes what Free delivers.
- Consequently the proposed copy ("1 poster, 3 stories, 1 reel concept; 140 credits") matches **actual delivery** but contradicts the plan's own entitlement numbers; a product decision is needed (change entitlements to match delivery, or enforce the quotas). The "reel concept" is the campaign's reel asset, not an AI video reel (those need Starter+ via `requirePlan`).
- 140 credits is a **recurring monthly allowance**: usage documents are per period, with the allowance computed from the plan (`getPeriodCreditAllowance`), and the free plan is 1 campaign/month. The signup `welcome` transaction records the first period's grant. The copy should say "140 credits every month", not a one-time grant.
- Free-plan label **not edited** (the pricing UI files carry uncommitted edits and the product decision above is open).

## Cleanup note
`../_clean_head` is a git worktree with directory junctions to `node_modules`. Remove with: delete the two junctions first (`cmd /c rmdir <junction>` — never recursive delete), then `git worktree remove ../_clean_head`.

---

# Update — dependency-ordered consolidation completed and verified (2026-10-11)

Commits (all on `consolidate/phases-and-paddle-billing`, none rewritten): `c7c8443` (1: shared types/config/entitlements/AI/callables), `61cf2ac` (2: remaining backend + tests), `f698463` (3: index exports), `1b8ec70` (4: deps/CI/config/infra/docs), `ea2b3b9` (scratch-file deletions), `6eb90b3` (5: frontend + tests), `490558d` (style fixes). Each of 1 and 5 was verified in an isolated worktree; the final head `490558d` was verified in full.

## Results on a clean checkout of `490558d` (worktree, 0 uncommitted files, LF endings)
| Check | Result |
|---|---|
| `tsc --noEmit` root | 0 errors (was 482) |
| `tsc --noEmit` functions | 0 errors (was 23) |
| `eslint . --max-warnings 0` | exit 0 (was 10,959 on the CRLF working copy; 76 before the final style commit) |
| Root jest, all emulators | 113 suites passed, 0 failed; 1626 tests passed, 0 failed, 7 skipped |
| Functions jest, all emulators | 250 suites passed, 7 skipped; 2607 tests passed, 0 failed, 50 skipped |
| `next build --webpack` (local `.env.local`) | exit 0. Default Turbopack could not be tested: it rejects the junctioned `node_modules` of the temporary worktree (environment, not code) |
Skipped tests are not counted as passing. The build used the developer's local env file, not production secrets.

## Deliberately NOT committed (needs your decision)
- **Cashfree-era billing UI** (working-tree versions of `src/app/billing/page.tsx`, `billing/page.test.tsx`, `pricing/PricingPageClient.tsx`, `pricing/pricing.test.tsx`, `features/billing/components/CreditPackCards.tsx`) — they replace the Paddle checkout with hardcoded ₹ prices, `useCashfreeCheckout` and `cancelCashfreeSubscription`. Committed HEAD keeps the Paddle UI (formatted + unused import removed). Which provider the UI should drive is a product decision.
- **`functions/src/config/env.ts` working-tree version** (rewrites Paddle comments to "legacy / being migrated", calls Cashfree "Primary"). Committed: HEAD + only the CASHFREE_* variables.
- **`functions/src/index.ts`**: committed with the exports but a corrected payments comment; the working-tree comment ("Cashfree Primary") differs. **Deploying from HEAD now exports Cashfree, onboarding and the 8 Creative Brain callables.**
- Binary icons `src/app/icon.png`, `apple-icon.png`, `icon.svg`; untracked mascot images, `filelist.txt`, `functions/nul`.
The working-tree files above remain exactly as they were; nothing was discarded.

## Cleanup
`../_clean_head` still exists (kept for verification). Remove junctions first with `cmd /c rmdir`, then `git worktree remove`.

---

# Update — Free-plan contract and both P1 integrity fixes (2026-10-11)

Commits: `f2ba6d3` (Free plan entitlements = delivered), `850a928` (P1-A Truth Check risk policy), `904e25e` (P1-B offer validation), `afd6fe8` (RERA test expectation, caught by the full clean-checkout run).

**Clean checkout of `afd6fe8`:** tsc root 0 errors, tsc functions 0 errors, `eslint --max-warnings 0` exit 0; functions jest (emulators, `--maxWorkers=50%`) 255 suites passed / 7 skipped, 2667 tests passed / 0 failed / 50 skipped; root jest 113 suites, 1627 passed / 0 failed / 7 skipped (verified at `904e25e`; only a functions test changed afterwards).
One full run at default parallelism showed 3 failures: `verticals.test.ts` (real: the RERA expectation, fixed in `afd6fe8`) and two Creative Brain suites that hit their hard 60 s timeout under load and pass alone in 36 s and 53 s. They remain slow and load-sensitive; consider raising their timeout or trimming their work.

## Free plan contract (implemented)
1 campaign every month (recurring), 1 poster + 3 stories + 1 reel concept (= 5 social creatives), 140 credits every month (a campaign costs 100, leaving 40), no AI-generated video reels. Pinned by `freePlanContract.test.ts`, by `pricingParity` (card copy) and by the pipeline matrix, which asserts the DELIVERED assets are exactly 1 poster, 3 stories and 1 reel.

## P1-A Truth Check risk policy (implemented)
BLOCK (FAIL): an unsupported discount presented as a discount, legal approvals (RERA…), possession dates, bedroom/bathroom/area figures nobody recorded or the owner did not write in the listing (all mentions are checked; previously only the first, and an unrecorded bathroom count passed silently). REVIEW: non-essential or unverifiable details, bare percentages ("25% more chicken"), operational claims (delivery/hours — deliberately not escalated so honest restaurants are not blocked; **founder decision if you want them escalated**). PASS: honest copy that omits the phone number; a different number still FAILs. Owner-stated percentages/specs in the headline, description, terms or listing title are allowed. The FAIL summary now names up to three offending claims. End to end (`generateCampaignStrategy.truthBlock.test.ts`): a blocked campaign names the claim, is stored as failed with no assets, and costs 0 credits; honest copy is delivered and charged 100.

## P1-B offer validation (implemented)
`utils/offerValidation.ts`, run before the quota check, credit reservation and any AI call: "was" price below the price now; percentage offer with equal prices or a <1% difference; offer end before start; campaign end before start; offer over before the campaign starts; non-positive / non-finite / over-large / >2-decimal prices; a percentage offer's "was" price that disagrees with the chosen product's catalogue price. Rejections are `invalid-argument` with an actionable message and create no campaign, no credit transaction and no AI call (9 callable tests); boundary cases are accepted and charged once (24 pure tests).
Not done: the frontend wizard does not yet mirror these checks (the user sees the server message after submit); free-text Business Brain rules (`offerValidityRules`, `pricingRules`) cannot be compared deterministically.

## Still open
Cashfree vs Paddle UI decision and the five Cashfree-era billing UI files; working-tree `env.ts`/`index.ts` variants; icon assets and mascot images; live AI subset (cost estimate not yet reconciled with the raw 2026-10-05 benchmark); `../_clean_head` worktree cleanup.
