# Onboarding draft model and conversation engine (Phases D, E/G)

The conversational onboarding does not collect answers into its own data model. The draft is the
**temporary construction layer for the Business Brain**. The business is created only at the end,
and only after the owner has reviewed it:

```
owner answers / AI discovery
        ↓
onboarding_drafts/{uid}                (facts carry provenance; nothing here is a business yet)
        ↓
normalizeDraft()  = normalize + validate  → the Business Brain slots it feeds
        ↓
owner reviews and confirms             ← the confirmation boundary (Phase H)
        ↓
createBusiness  →  businessBrain
```

**`draft → createBusiness` directly is not allowed.** An AI-detected or AI-inferred value must never
become permanent business truth without the owner approving it. `normalizeDraft` therefore returns
confirmed values only, plus `unconfirmed` (guesses the review screen must show as suggestions to
accept or drop) and `ready` / `missing` (what stands between the draft and a reviewable Brain).

## The loop

```
answer → understand → choose the next question → update the draft → repeat
```

`selectNext(state)` (browser, `engine/engine.ts`) picks the next question from what is already
known, not from a fixed script:

- at most **two** questions at once, and a second only if it shares a group (name + role; city + state);
- the follow-up depends on the previous answer (industry → subcategory → offering → audience);
- wording adapts to the **industry and the subcategory** (a cloud kitchen is asked "What do people
  usually order from you?" and "Which city do you deliver from?", a fine-dining room is not);
- "something else" takes a free-text, own-words path instead of a preset list;
- anything below `required` can be skipped, and a skip is remembered so it is never re-asked;
- suggestions never change which question is next — a guess is a hint for answering, not a reason
  to skip asking.

## Provenance

| `source` | Meaning | Counts as known? |
|---|---|---|
| `USER_CONFIRMED` | the owner said it, or tapped a suggestion and continued | yes |
| `AI_DETECTED` | read directly from something the owner supplied (their Google profile name; later a logo) | no — shown pre-filled, still needs their Continue |
| `AI_INFERRED` | a guess derived from other facts (likely offerings/audiences for this type of business) | no — shown as "Mitra's guess" chips, never pre-selected |
| `UNKNOWN` | placeholder | no |

Rules, each with a test:

1. **A guess can never overwrite a confirmed fact** (`mergeFact`, the single place this lives).
2. The owner can always overwrite a guess, and always correct their own earlier answer.
3. Guess confidence is capped server-side (`AI_INFERRED` ≤ 0.7, `AI_DETECTED` ≤ 0.95).
4. Clients can only submit `USER_CONFIRMED` facts. Source/confidence/`confirmed` are stamped
   server-side; a forged value in the request is ignored. Firestore rules deny all client writes.
5. Closed registry: an unknown path or invalid value is rejected, so the draft cannot grow into a
   second data model beside `businessBrain` / `brand_kits`.
6. Changing an answer clears what was built on it (`DEPENDENT_FIELDS`): switching industry drops
   the subcategory, offerings and audience.
7. The uid always comes from the verified token.

## Free AI discovery (no credits)

`discoverOnboardingFacts` runs once the business type, name and city are saved. It proposes likely
offerings and audiences **for this type of business** and stores them as unconfirmed `AI_INFERRED`
guesses.

- **Free.** It does not go through `executeWithUsageControl`; a test asserts credit enforcement is
  never called. Credits are for generating content, not for teaching Mitra about the business.
- **Never blocks onboarding.** Provider error, timeout, malformed output, or nothing usable after
  sanitising all resolve to `unavailable` — not an error. The client swallows it; the owner never
  sees a message and the conversation continues with its built-in presets.
- **No repeat spend.** Identical inputs are answered from the saved result; a failure waits 5 minutes
  before another call; 20 calls/hour/user.
- **Output is untrusted.** Cleaned, de-duplicated and capped; phrases with claims (best, #1, award,
  certified…), prices, numbers, links or handles are dropped; then re-validated by the field schema.
- **Data minimisation.** Only the business type, name and city are sent to the model. The owner's own
  name is never sent. Owner-typed text is flattened before it enters the prompt (prompt injection).
- The one other "discovered" value is the first name on a Google account, pre-filled for one tap.

## Analytics funnel

```
onboarding_started → onboarding_industry_selected → onboarding_subcategory_selected
  → onboarding_discovery → onboarding_review_shown → onboarding_confirmed → onboarding_complete
```

plus `onboarding_answered {field, skipped?}` for every question. Emitted **server-side** from
`saveOnboardingDraft` / `discoverOnboardingFacts` (so it cannot be spoofed from a browser), once per
milestone per owner (deterministic ids), best-effort (a failed analytics write never fails a save).
`review_shown` and `confirmed` are reserved for Phase H.

Never carries free text: taxonomy ids and field names only; for subcategory only an `isCustom` flag.

**Reading drop-off.** "Abandoned" is deliberately not an event — a browser cannot reliably report that
it left. Derive it: owners with an `onboarding_started` event and no `onboarding_complete`, then
look at their last `onboarding_answered.field`. That field is where they stopped. Count owners per
last field to see the question that loses people.

## Two tabs

Last write wins **per field**. Each save sends the revision it last saw; if the server's is newer,
the response is flagged `stale` and the browser adopts the latest and shows a dismissible
"updated somewhere else" note. Nothing is rejected and nothing is lost. Proper optimistic
concurrency can build on the stored `revision` later.

## Where things live

| Piece | File |
|---|---|
| Field registry, value schemas, required fields, dependents, industry → vertical | `functions/src/onboarding/draftFields.ts` |
| Merge rules, system facts, normalize, funnel events | `functions/src/onboarding/draftModel.ts` |
| Discovery: prompt, sanitiser, confidence, Google-name seed | `functions/src/onboarding/discovery.ts` |
| Writers (callables, Admin SDK) | `functions/src/functions/onboarding/{saveOnboardingDraft,discoverOnboardingFacts}.ts` |
| Rules: owner read, no client write | `firestore.rules` (`onboarding_drafts/{userId}`) |
| Browser registry copy (parity-tested) | `src/features/onboarding/engine/fields.ts` |
| Questions, taxonomy, presets, selection engine | `src/features/onboarding/engine/` |
| Load, coalescing save queue, resume, suggestions, stale warning | `src/features/onboarding/draft/` |
| Conversation UI, route `/onboarding/v2` | `src/features/onboarding/components/` |
| Cleanup on account deletion | `functions/src/functions/auth/onUserCreated.ts` (`onUserDeletedHandler`) |

`tests/onboardingDraftParity.test.ts` fails if the two registries drift (paths, industries, roles,
required facts, dependents) — it was mutation-checked.

## Document shape

```
onboarding_drafts/{uid} {
  uid, schemaVersion: 1, status: 'in_progress' | 'ready_for_review' | 'completed',
  welcomed, facts: { owner__name: { value, source, confidence, confirmed, updatedAt }, ... },
  skipped: ['owner.role', ...],
  discovery?: { key, status: 'completed' | 'failed', at },   // server-set
  revision, createdAt, updatedAt
}
```

## Adding a question

1. Add the path + schema to `DRAFT_FIELDS` (server) and `DRAFT_FIELD_PATHS` (browser).
2. Add a `QuestionDefinition` in `engine/questions.ts`: a `purpose` (required — a test fails without
   one), `importance`, `priority`, and a `condition` on what is already known.
3. If it depends on an earlier answer, add it to `DEPENDENT_FIELDS` on both sides.
4. If the business cannot be created without it, add it to `REQUIRED_FIELDS` (parity-tested).
5. Map it in `normalizeDraft`.

## Deletion and retention

`onboarding_drafts/{uid}` is deleted by `onUserDeletedHandler` (first step, unconditional) on account
deletion, whether self-service or from the console. Tested. Retention for the drafts of owners who
never finish **and** never delete is undecided (founder/legal); see `LEGAL_DELETION_DATA_LIFECYCLE.md`.

## Phase H — review, confirm, create

See [ONBOARDING_PHASE_H.md](ONBOARDING_PHASE_H.md): the `general` vertical, the WhatsApp-derived
phone, `confirmOnboardingBusiness`, and the launch gates. `/onboarding/v2` now creates a business,
behind `NEXT_PUBLIC_ONBOARDING_V2` (off by default).

## Known gaps / next phases

- Suggestions are offered as chips. The "I found X — looks right?" confirm card for high-confidence
  `AI_DETECTED` values (logo tagline, colours) arrives with Phases J/K.
- Not yet asked: brand (logo, colours, tone), content pillars, formats, marketing objective.
