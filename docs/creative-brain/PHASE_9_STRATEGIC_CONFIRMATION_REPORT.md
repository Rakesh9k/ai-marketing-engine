# PHASE 9 — STRATEGIC CONFIRMATION REPORT

**Phase status: PARTIAL.** The confirmation domain, hard gate, correction/alternative flows, view model and tests are
implemented and verified. The **production wiring and the UI screen are NOT done**, because they are blocked by an
architectural issue that belongs to a later phase (section 1.2). Per the project rule, it is documented here and
scope was not expanded.

---

## 1. Executive Summary

### 1.1 Delivered

- Strategic confirmation lives **inside the Phase 7 `CreativeBrainSession`** (`strategicConfirmation` field). No
  second session, document, Creative Brain, opportunity model or LLM call.
- No new top-level state: confirmation is a sub-state of the canonical `OPPORTUNITY` state. "That's right" moves
  the session `OPPORTUNITY → CONCEPT_GENERATION`.
- **Hard gate** at the service layer: concepts cannot be generated or persisted for a locked opportunity until it is
  confirmed, and only for the confirmed `opportunityId`.
- Idempotent confirm, refresh-safe view, stale-tab detection (`opportunityRevision`), server-side ownership /
  campaign checks, Business Brain protection, opportunity ledger (A → SUPERSEDED → B), max 2 alternatives.
- Deterministic view model: **0 additional LLM calls**.

### 1.2 Blocking finding (later phase — not fixed here)

Production does not have a pause point today:

1. `generateCampaignStrategy` is **one callable** that reserves credits, then runs all 13 pipeline stages
   (`pipeline.ts`): Opportunity → Concepts → Blueprint → copy → **image generation** → validation → assembly.
   `AdaptiveCreativeBrainStateMachine.executeAdaptiveFlow` calls `creativeBrainService.evaluateAndFormBlueprint`,
   which discovers the opportunity and generates concepts in a single call.
2. `CreativeBrainSessionService` is an **in-memory `Map`**. Nothing in production code calls it (only tests). A
   confirmation held there would not survive a request boundary, a cold start, or a refresh in production.
3. The frontend (`CampaignWizard.tsx`, `AssistantWorkspace.tsx`) calls that single function and has no Creative
   Brain step.

Making the confirmation real for users requires: (a) persisting sessions in Firestore, (b) splitting the callable
into "understand/lock opportunity" and "generate after confirmation", which changes **when credits are reserved**
(billing/credits are protected systems), and (c) the screen itself. Each is outside Phase 9's allowed scope.

**Open bypass until then:** the legacy one-shot path (`evaluateAndFormBlueprint` via the pipeline) still generates
concepts without confirmation. The new gated entry point `generateConceptsForConfirmedSession` is the only path
that enforces the invariant; the pipeline has not been moved onto it.

---

## 2. Existing Architecture Audit

| Existing | Reused as |
| :--- | :--- |
| `CreativeBrainSession` (Phase 7) | Holds all Phase 9 state (`strategicConfirmation`, `ownerUserId`) |
| `stateHistory` / `CreativeBrainStateTransition` | Audit trail for every transition (no new event store) |
| Canonical `OPPORTUNITY` / `CONCEPT_GENERATION` states | Sub-state + target state; no new enum value |
| `CreativeOpportunitySchema` (Phase 8) | Validates opportunities on lock/alternative; ledger schema |
| `resumeSession().nextRequiredAction` | Extended with `STRATEGIC_CONFIRMATION` |
| `scoreConcepts` already sets `concept.opportunityId` | Traceability Concept → Opportunity |
| `OpportunityEngine` / `discoverOpportunity` | Still the only producer of opportunities (alternatives/recompute) |

Searched and found **no** existing confirmation step, review screen, strategy summary or view-model pattern to
reuse (frontend has no Creative Brain code).

---

## 3. UX Flow

```text
READY → Opportunity → lockOpportunity (PENDING, revision n)
      → "Here's what I understood" (getStrategicConfirmation → view model)
          ├─ That's right ........ confirmStrategy → CONFIRMED → CONCEPT_GENERATION → gated generation
          ├─ Change something .... requestChange → (material) CHANGE_REQUESTED → engine re-run
          │                                         → lockOpportunity(new) → PENDING, revision n+1
          │                         (cosmetic) noted, nothing recomputed
          │                         (fact conflict) routed to Business Brain correction, nothing absorbed
          └─ Explore another ..... requestAlternative → registerAlternative (≤2) → chooseDirection
                                                        → PENDING (revision n+1 if B chosen)
```

UI copy is produced by `buildStrategicConfirmationViewModel` (headline, summary, "The strongest opportunity I see
is", statement, supporting reason, three button labels). **The screen component is not built** (section 1.2).

---

## 4. Confirmation Data Model

Files: `session/strategicConfirmation.types.ts`, `session/creativeBrainSession.schema.ts` (Zod).

- `StrategicConfirmationState { status, lockedOpportunityId, opportunityRevision, events[], corrections[], ledger[], confirmedAt?, confirmedEventId?, recomputeRequired?, conceptGenerationStartedAt? }`
- `status`: `PENDING | CONFIRMED | CHANGE_REQUESTED | ALTERNATIVE_REQUESTED`
- `StrategicConfirmationEvent { id, campaignId?, sessionId, opportunityId, opportunityRevision, action, createdAt, metadata? }`
  — actions `CONFIRMED | REQUESTED_CHANGE | EXPLORE_ALTERNATIVE` as specified, plus `DIRECTION_SELECTED` (records the
  A-or-B choice; the spec's `creative_opportunity_alternative_selected` analytics event needs a record to exist).
- `OpportunityLedgerEntry { opportunity, role: ACTIVE | ALTERNATIVE | SUPERSEDED, recordedAt, supersededAt?, supersededReason? }`
- `CampaignCorrection` — campaign-level learning, never Business Brain knowledge.
- Session additions: `ownerUserId`, `strategicConfirmation`. Timestamps are ISO strings, matching the rest of the session.

## 5. State Machine Changes

| Trigger | Session `currentState` | `status` | Confirmation |
| :--- | :--- | :--- | :--- |
| `lockOpportunity` | → `OPPORTUNITY` | `WAITING_FOR_USER` | `PENDING`, revision+1 |
| `confirmStrategy` | → `CONCEPT_GENERATION` | `ACTIVE` | `CONFIRMED` |
| `requestChange` (material) | → `OPPORTUNITY` | `WAITING_FOR_USER` | `CHANGE_REQUESTED` + `recomputeRequired` |
| `requestChange` (cosmetic / fact conflict) | unchanged | unchanged | unchanged (+ event / correction) |
| `requestAlternative` | unchanged | `WAITING_FOR_USER` | `ALTERNATIVE_REQUESTED` |
| `chooseDirection` (B) | → `OPPORTUNITY` | `WAITING_FOR_USER` | `PENDING`, revision+1, A `SUPERSEDED` |
| `chooseDirection` (A) | unchanged | `WAITING_FOR_USER` | `PENDING`, same revision |

`AdaptiveCreativeBrainStateMachine` was **not modified** (it is the legacy one-shot path; see 1.2).

## 6. Confirmation Gate

Enforced in `CreativeBrainSessionService.assertConfirmed`, reached from:

- `saveConcepts` — rejects when a locked opportunity exists and is not confirmed, or any concept's `opportunityId`
  ≠ the confirmed id;
- `assertConceptGenerationAllowed` / `beginConceptGeneration`;
- `CreativeBrainService.generateConceptsForConfirmedSession` — calls `beginConceptGeneration` **before** any LLM call.

Confirmed = `status === CONFIRMED` ∧ no pending `recomputeRequired` ∧ active opportunity id = confirmed id.

Proof (tests): `locked + unconfirmed ⇒ blocked at every layer, nothing persisted`; `NEGATIVE: unconfirmed ⇒ no LLM
call, no concepts, no claim` (`generate` mock never called, `concepts` empty); a material correction after
confirmation blocks generation again; swapping the opportunity via `saveOpportunity` is rejected.
Blocking happens before any generation, so no credits/assets are involved; billing code was not touched.
**Caveat:** this holds for the gated path only (1.2).

## 7. Change Flow

`requestChange` → `triageCorrection` (deterministic; the UI supplies the dimension chip).

- `wording` ⇒ COSMETIC: recorded, **no recompute, no revision bump**.
- `audience / objective / offer / direction / other` ⇒ MATERIAL: affected strategic fields listed (e.g. audience →
  audience, customerTension, emotionalTerritory, creativeOpportunity, strategicRecommendation), status
  `CHANGE_REQUESTED`, confirmation cleared, cannot be confirmed until the caller re-runs the existing Opportunity
  Engine and calls `lockOpportunity(new)`. `getCampaignCorrections` feeds the engine.
- The old opportunity is kept unchanged in the ledger as `SUPERSEDED`; concepts/selection tied to it are cleared.

Limitation: "interpret the correction" is deterministic triage by the user-chosen dimension, not free-text NLU.

## 8. Alternative Direction Flow

`requestAlternative` keeps A active and untouched → caller obtains B from the existing Opportunity Engine →
`registerAlternative` (own id required, ≤ `MAX_ALTERNATIVE_DIRECTIONS` = 2, idempotent) → `chooseDirection`.
Choosing B supersedes A in the ledger (still stored verbatim) and requires confirmation again. No concepts are
generated at any point in this flow. Factuality of B is the Opportunity Engine's existing gate; Phase 9 adds no
generator. **Producing B (calling the engine with an "exclude A's angle" instruction) is not implemented** — it needs
the engine call that belongs with the wiring phase.

## 9. Session Persistence

Phase 7 session reused; all writes go through Zod validation and bump `version`/`updatedAt`. `resumeSession`
returns `nextRequiredAction = STRATEGIC_CONFIRMATION` for a locked, unconfirmed opportunity; the same opportunity
and revision are returned after refresh (`refresh: same opportunity, same revision, no regeneration`).
**The store is still in-memory (Phase 7 design); production persistence is part of 1.2.**

## 10. Authority Audit

- No Phase 9 code reads or writes `BusinessBrain`; the session only holds references (Phase 7 invariant).
- A price claim not backed by `knownPrices` is classified `BUSINESS_FACT_CONFLICT`: logged as an event with
  `routedTo: BUSINESS_BRAIN_CORRECTION`, **not** stored as campaign context, strategy unchanged. Test asserts the
  brain object is byte-identical and the opportunity unchanged.
- Corrections are campaign-level only. Truth Check untouched and still authoritative downstream.
- Limitation: only **price** conflicts are detected. Other factual claims (hours, location, product facts) typed
  into "Change something" are not classified as fact conflicts yet.

## 11. Industry Branch Audit

`grep` for `industry/vertical/category ===` and vertical names across `strategicConfirmation.*.ts`: **0 matches**.
The objective-phrase map is keyed by campaign objective code, not industry. The view-model test runs all four
verticals through the same code.

## 12. Idempotency Audit

- `confirmStrategy` ×2 (concurrent): exactly one `CONFIRMED` event; one call returns `alreadyConfirmed`.
- `lockOpportunity` with the same id: no-op; `registerAlternative` same id: no-op.
- `beginConceptGeneration` claim: concurrent `generateConceptsForConfirmedSession` ×2 ⇒ **1** LLM generation, a later
  retry also ⇒ still 1; a failed run releases the claim so retry works.
- After generation starts, change/alternative requests are refused (`INVALID_TRANSITION`).
- In-memory only: cross-instance atomicity needs a Firestore transaction when persistence lands.

## 13. Resume / Refresh Audit

Covered by tests (resume action; same view model and revision after refresh). The server never regenerates an
opportunity on view. Real browser refresh is unverified — there is no UI/persistence yet.

## 14. Staleness / Invalidation Audit

Every action carries `{opportunityId, opportunityRevision}`; the server compares against the session. Mismatch ⇒
`STALE_OPPORTUNITY` with "Current strategy has changed. Let's refresh what I understood." Revision increments on
each opportunity change (re-lock, chosen alternative). Tested with a stale tab confirming old A after B was chosen;
state stays `PENDING`.

## 15. Accessibility Audit

**Not applicable yet — no UI was built.** Requirements to carry into the screen phase: semantic headings, focus
order, visible focus, full-width tap targets on mobile, the opportunity understandable as text, `prefers-reduced-motion`,
mascot via the existing asset abstraction. The view model is plain text with no motion/colour dependency.

## 16. Test Results

```text
Baseline (CLAUDE.md, stale):  38 suites / 687 tests passed / 127 skipped
Baseline (measured today):    134 passed + 44 skipped suites; 1595 passed, 282 skipped, 0 failed
After Phase 9:                135 passed + 44 skipped suites; 1636 passed, 282 skipped, 0 failed
New suite:                    creativeBrain/__tests__/strategicConfirmation.test.ts — 41/41 passed
TypeScript (tsc --noEmit):    PASS (0 errors)
ESLint (eslint src --ext .ts): PASS (0 output)
Frontend tests / next build:  NOT RUN — no frontend files changed
```

The CLAUDE.md baseline numbers no longer describe the repository; the measured pre-change baseline above was used
for comparison. The full run executes some suites that call the live model, so timing varies.

Spec test coverage mapping: 37.1–37.4, 37.5 (service level), 37.6–37.16 covered; 37.10 refresh and 37.11 resume at
the session-model level only. "Frontend renders" (37.1) is not covered (no UI).

## 17. Protected Systems

Unchanged: billing, credits, PayU/Paddle, usage accounting, Truth Check, safety, quality validation, compositor,
image generation, video renderer, asset persistence, campaign asset schema, storage cleanup, Firestore rules,
`pipeline.ts`, `generateCampaignStrategy.ts`, `adaptiveStateMachine.ts`.

## 18. Changed Files

- `functions/src/services/ai/creativeBrain/session/strategicConfirmation.types.ts` (new)
- `functions/src/services/ai/creativeBrain/session/strategicConfirmation.correction.ts` (new)
- `functions/src/services/ai/creativeBrain/session/strategicConfirmation.viewModel.ts` (new)
- `functions/src/services/ai/creativeBrain/session/creativeBrainSession.{types,schema,service}.ts`, `session/index.ts`
- `functions/src/services/ai/creativeBrainService.ts` (adds `generateConceptsForConfirmedSession`)
- `functions/src/services/ai/creativeBrain/__tests__/strategicConfirmation.test.ts` (new)
- this report

Analytics: the event-name mapping (`STRATEGIC_CONFIRMATION_ANALYTICS`) is defined but **not wired** to
`analyticsService`; confirmation rate, change rate, alternative rate etc. can be derived from `events`, to be emitted
when the callable exists. Confirmation rate is a diagnostic, not a target.

## Security findings

- No new vulnerabilities found in the changed code. All Phase 9 actions deny by default: sessions with no
  `ownerUserId` cannot use them (`FORBIDDEN`); campaign and opportunity id/revision are re-checked server-side.
- **Open (pre-existing, not introduced):** the legacy one-shot pipeline bypasses confirmation (1.2).
- **Open:** fact-conflict detection covers prices only (section 10).
- **Open:** in-memory store means no cross-instance idempotency/ownership guarantees until persisted.

## Final Product Verdict

**PASS WITH CONDITIONS — phase PARTIAL.** Domain logic and gate are tested and correct; users cannot yet see or
exercise the confirmation, and the production path is not gated. Required before this is user-facing:

1. Persist `CreativeBrainSession` (Firestore, with transactions for confirm / generation claim, rules reviewed).
2. Split the generation callable at the opportunity boundary and move credit reservation to the post-confirmation
   step (billing review), routing production through `generateConceptsForConfirmedSession`.
3. Build the confirmation screen (a11y, motion, mascot, mobile) on `getStrategicConfirmation`.
4. Wire the "explore another direction" engine call and the analytics events.
