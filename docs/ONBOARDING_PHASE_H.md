# Onboarding Phase H — review, confirm, create

The conversational onboarding now runs end to end:

```
Anonymous → Auth → Draft → Adaptive conversation → Business Brain review
  → Owner confirms → Normalize + validate → create business → Dashboard
```

## The trust boundary

`createBusiness` machinery only ever receives the **normalised, owner-confirmed Business Brain** —
never the raw draft, an unconfirmed guess, or anything a browser supplied.

```
onboarding_drafts/{uid}
   │  (server reads it; the browser sends only "which revision did I review")
   ▼
normalizeDraft()            confirmed facts only
   ▼
toBusinessCreation()        owner-confirmed facts → CreateBusinessData + provenance
   ▼
createBusinessSchema.parse  the same schema the public createBusiness callable enforces
   ▼
buildBusiness() → one Firestore transaction (limit check + business + user link + draft completed)
```

`confirmOnboardingBusiness` (the only entry point) refuses unless:

1. the email is verified (password accounts);
2. the draft exists, belongs to the caller (uid from the token) and is `ready_for_review` — which
   the server only grants when the review is shown **and** every required fact is confirmed;
3. `draft.revision === reviewedRevision` — the owner is committed to exactly what they saw. A late
   edit (another tab) forces a fresh review;
4. the plan limit has room, counted **inside** the transaction.

It is atomic and idempotent: a double-click or two tabs produce one business; a retry after
success returns the same business and re-mints the claims (also the recovery path if that step
failed). After success the draft keeps nothing personal (`facts` cleared).

## `general` is a real vertical

`restaurant | salon | real_estate | general`. Everything that is not one of the first three is
served by `general`, which has its own prompt context, objectives (`product_promotion`,
`new_product`, `service_promotion`, `new_service`, `discount`, `festival`, `weekend_offer`,
`brand_awareness`), CTAs, offer types and a Truth Check claim table (warranty, guarantee, money-back,
free installation, EMI, certified, 24x7, "best in"… are sent to the owner for review, never
published as fact). It is not a "not supported" placeholder.

The owner's actual line of work is kept separately — `businessBrain.identity.industry` /
`subcategory` plus `offerings`, `audience.primary`, `positioning.usp` — and the pipeline already
receives the whole Brain, so a trade can later get a specialised vertical without migrating any
Business Brain. The original wizard's silent "other → restaurant" now maps to `general`.

## Provenance

Only owner-confirmed information reaches the Brain. `businessBrain.knowledge.facts[path].source` is:

| source | meaning |
|---|---|
| `USER_CONFIRMED` | the owner said it, or kept a suggestion |
| `DERIVED_FROM_WHATSAPP` | phone copied from their WhatsApp number — **not** presented as typed by them |
| `DERIVED_FROM_SUBCATEGORY` | operating mode `delivery`, from choosing cloud kitchen / tiffin / caterer |

An explicit value replaces a derived one: in `updateBusiness`, a *different* phone the owner enters
becomes `USER_CONFIRMED`; leaving it alone keeps it derived (and following their WhatsApp number if
that changes); once it is theirs, a later WhatsApp change never overwrites it.

Phone numbers are validated and normalised **server-side** to E.164 (`+919876543210`), which is also
what a `wa.me` link needs. A number without a country code is read as Indian only if it is
unmistakably an Indian mobile; anything else is rejected rather than guessed. The browser carries a
parity-tested mirror so errors show at the question.

## Routing and the flag

`NEXT_PUBLIC_ONBOARDING_V2=true` sends new owners to `/onboarding/v2` and forwards every link to
the original wizard there. **Off by default** — customers see no change until it is switched on
(needs a rebuild).

## Funnel

`onboarding_started → industry → subcategory → discovery → review_shown → confirmed → complete`,
emitted server-side, once per milestone. Drop-off is derived (owners with `started` and no
`complete`, grouped by their last answered field); `ready_for_review` drafts that never confirm are
the "abandoned at review" segment.

## Launch gates — before switching the flag on

1. **Real Google consent browser test** — new Google user sees the Terms step, it is recorded
   (`users/{uid}.termsAcceptedAt`), and they land in onboarding. *Not done: needs a real browser.*
2. **Real Gemini call and failure behaviour** — **DONE 2026-10-05**, see "Live Gemini verification"
   below. One related launch blocker found outside onboarding: the retired default text model.
3. **Credits mismatch (100 vs 140)** — fix separately. Onboarding already never promises a first
   campaign (the completion screen says "Go to my dashboard" / "See what Mitra knows").

Not blockers (product/legal): retention for abandoned drafts and the localStorage mirror.

## Known gaps

- A salon created this way has no `verticalProfile` (services/packages) and a real-estate business no
  properties; both are supported states and are added progressively after onboarding.
- Language and regional style default to `en` / `neutral` (not asked yet); brand colours, logo, tone,
  content pillars and the marketing objective come in later phases.
- Opening hours are not asked, so a restaurant's "open 24/7"-style claims are routed to review.
- `/onboarding/v2` has no Playwright coverage yet.

## Live Gemini verification (2026-10-05)

Opt-in tests (`LIVE_GEMINI=1` plus a real `GEMINI_API_KEY`; skipped everywhere else, so normal CI never
calls the provider or spends anything). Synthetic, non-sensitive data only.

```
# provider level (no emulator)
LIVE_GEMINI=1 npm --prefix functions run test -- src/onboarding/discovery.live
# through the real callable, on the emulator
LIVE_GEMINI=1 firebase emulators:exec --only firestore,auth --project demo-live \
  "npm --prefix functions run test -- src/functions/onboarding/discoverOnboardingFacts.live"
```

| Check | Result |
|---|---|
| 4 real calls (cloud kitchen, yoga, fashion retail, generic pottery) | ~1s each; clean, useful suggestions; nothing needed dropping |
| **Real model provoked into producing claims, prices, links and numbers** | model produced 12 items, **all 12** unsafe; sanitiser kept **0** |
| Adversarial business name (injection + claims + URL + phone) | model ignored it; nothing unsafe in output; injected text flattened to one data line |
| Invalid API key | rejected in <1s, not retried |
| Retired model (`gemini-1.5-flash`) | rejected in <1s |
| Unsatisfiable schema / truncated output | rejected after bounded repairs, never accepted |
| Through the callable: success | `completed`, stored as `AI_INFERRED`, unconfirmed, confidence ≤ 0.7 |
| **Credits** | subscription, usage and transactions byte-identical before/after, on success **and** on failure |
| Through the callable: retired model / invalid key | returns `unavailable` (no error), owner's answers untouched, no re-hammering inside the cool-down |
| **API key** | not in any repo file, client code or `NEXT_PUBLIC_` var; absent from all logs and returned values, real or fake |

Changes made because of the live run:

- Discovery now has its own model (`GEMINI_DISCOVERY_MODEL`, default the alias `gemini-flash-lite-latest`)
  instead of the general text model, and the whole attempt is cut off at 20s (below the client's 25s
  wait) so a slow provider becomes a clean, recorded `unavailable`.
- `generateStructuredText` accepts an optional per-call `model`; nothing else about it changed.

### Model configuration (found outside onboarding; CORRECTED 2026-10-05)

The working-tree code defaulted to `gemini-1.5-flash`, which the API answers with **404** for this key
(`gemini-2.0-flash`, `gemini-2.5-flash` and `-lite` are 404 too). **Production never ran that code**: the
deployed functions hardcoded `gemini-flash-latest` for text and vision (available, but a larger, slower model;
the larger 3.x flash models took up to ~24s and timed out under load). An earlier version of this note said
production campaigns would 404; that was inferred from the absence of env vars without reading the deployed source.
The model decision and the targeted production deploy are in docs/MODEL_BENCHMARK_2026-10.md.
`.env.example` documents the variables.
