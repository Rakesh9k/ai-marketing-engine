# PHASE 13 — DATA CONSISTENCY REPORT

No `/docs/PRODUCT.md`, `ARCHITECTURE.md`, `DATABASE.md`, `AI_ARCHITECTURE.md`,
`SECURITY.md`, `MVP_SCOPE.md`, `TEST_PLAN.md`, or `PROMPT_SYSTEM.md` exist in
this repository (confirmed by direct listing — the same gap as every prior
phase). The actual implementation, read directly, is the source of truth.

## 1. Executive Summary

This phase audited the actual entity-relationship hierarchy
(User → Business → Business Brain / Product → Asset, Campaign → Product /
Creative, Credits, Payment, Analytics) as implemented in code, not as
assumed from a data-model diagram. Most of the ownership/tenant-isolation
work this phase would otherwise have needed to do from scratch was already
proven in Phase 10 (financial attribution) and Phase 11 (cross-tenant
Firestore/Storage isolation) — that work is reused, not repeated.

This phase's own new finding is significant: **Truth Check staleness
detection — a fully-built, correct backend mechanism from Phase 6
(`isVerificationStale`, exposed via the `getCampaign` Cloud Function) — was
never actually reachable from the product.** The Campaign Review page
(`[campaignId]/page.tsx`) has always read the campaign document directly
from Firestore via the client SDK, never through `getCampaign`. This means
a business owner could change their phone number, WhatsApp number,
location, or a product's price **after** a campaign was Truth-Check-PASS
verified, and the Campaign Review page would continue showing a plain
green "🟢 Verified" badge forever, with no indication that the underlying
facts had changed — exactly the "stale verified content presented as
current" harm this phase's central principle warns against. Fixed by
wiring the frontend to actually call `getCampaign` and display a clear,
non-destructive "may be outdated" warning when stale, without mutating the
historical Truth Check result itself.

Two further real hierarchy-validation checks were **confirmed already
correct** by direct testing (not assumed): `generateCampaignStrategy.ts`
already rejects a request combining a valid `businessId` with a
`productId` belonging to a *different* business, and the AI pipeline is
structurally guaranteed to receive only the single, authorized business's
Business Brain context (a single object reference from one Firestore read
— there is no code path that could merge in a second business's data).

No P0 cross-tenant data-leakage vulnerability was found this phase (Phase
11 already closed the ones that existed). No orphan-record cleanup was
necessary or attempted — see §19.

## 2. Actual Data Model

```
User (users/{uid})
  └─ businessIds: string[]  (custom claim + Firestore field, Phase 11-protected)
  └─ Business (businesses/{businessId})
       .userId → User                         [ownership]
       .agencyId?                             [optional, agency-managed]
       .businessBrain: { audience, brand, localization, businessRules,
                          campaignHistory[] }  [embedded, not a subcollection]
       ├─ Product (products/{productId})
       │    .businessId → Business            [ownership, server-validated]
       │    .status: 'active' | 'archived'    [soft delete]
       ├─ BrandKit (brand_kits/{businessId})  [1:1 with Business, doc ID = businessId]
       ├─ Campaign (campaigns/{campaignId})
       │    .businessId → Business            [ownership, server-validated]
       │    .userId → User                    [creator]
       │    .productId? → Product             [server-validated same-business]
       │    .metadata.truthCheckResult.sourceFingerprint  [Truth Check dependency]
       │    ├─ CampaignAsset (campaign_assets/{assetId})
       │    │    .campaignId → Campaign, .businessId → Business [both denormalized]
       │    │    .status: 'completed'|'failed'|'superseded'    [soft-delete-like]
       │    └─ (transactions/{operationId} — 1 reservation per generation/regeneration)
       ├─ Usage (usage/{userId}_{periodStart})
       │    .userId → User, .planId, .creditsUsed
       ├─ Subscription (subscriptions/{subscriptionId})
       │    .userId → User
       └─ analytics_events/{eventId}
            .userId, .businessId?, .campaignId?, .assetId?
```

Denormalized fields identified: `businessId` and `userId` appear on
`campaigns`, `campaign_assets`, `products`, `assets`, `transactions`,
`usage`, `subscriptions`, and `analytics_events` — each copy is written
once, server-side, at creation time, and never independently re-derived or
recomputed elsewhere; no code path updates a parent's ID field on a child
after creation (confirmed by grep across `functions/src/functions/`: no
`update...{businessId: ...}` call exists for any child collection).

## 3. Relationship Matrix

| Entity | Parent | Ownership Field | Server Validation | Status |
|---|---|---|---|---|
| Business | User | `userId` | `create`/`update` rule: `resource.data.userId == request.auth.uid` | PASS |
| BrandKit | Business | doc ID = `businessId` | `verifyBusinessAccess` | PASS |
| Product | Business | `businessId` | `verifyBusinessAccess` + create schema requires `businessId in token.businessIds` | PASS |
| CampaignAsset | Campaign + Business | `campaignId`, `businessId` | server-only writes (Admin SDK, `regenerateAsset`/pipeline), never client-supplied | PASS |
| Campaign | Business | `businessId` | `verifyBusinessAccess(userId, data.businessId)` | PASS |
| Campaign | Product | `productId` | **`existingProduct.businessId !== data.businessId` → reject** — proven with a real emulator test this phase | PASS |
| Transaction (reservation) | User/Campaign | `userId`, `metadata.operationId` | Phase 10, atomic, re-verified this phase | PASS |
| Payment/Subscription | User | `userId` | Phase 10, re-verified | PASS |
| Analytics event | User/Business/Campaign | `userId` (server-derived), `businessId`/`campaignId` (caller-supplied, informational) | Phase 9/10 | PASS |

## 4. User/Business Consistency

Reused from Phase 11 (re-run clean, not re-derived): `verifyBusinessAccess`
correctly grants the owning user and denies a different user, tested
directly against the emulator (`auth.test.ts`). No change needed.

## 5. Business Brain Consistency

`business.businessBrain` is read exactly once per generation, via
`getBusinessDoc(data.businessId)` — the same `businessId` `verifyBusinessAccess`
already validated. It is passed directly into the pipeline input
(`businessBrain: business.businessBrain`) with no merge, cache, or
secondary lookup that could introduce a second business's data. **Proven,
not just read**, this phase: a test seeds two businesses with distinctly
different `businessBrain.audience.targetCustomer` values, generates a
campaign for Business A, and asserts the mocked pipeline's actual received
input contains only Business A's brain content.

## 6. Product Consistency

Product creation/update already require `verifyBusinessAccess`; archival
(`archiveProduct.ts`) is soft-delete (`status: 'archived'`), never a hard
delete — confirmed by reading the function in full. **Campaign creation
against a foreign business's product is now proven rejected** (not just
assumed from reading the `if` statement) — see §14, Golden Test 2.

## 7. Asset Consistency

`campaign_assets` writes are entirely server-only (Admin SDK,
`firestore.rules`: `allow write: if false`); every write site
(`regenerateAsset.ts`, the generation pipeline) derives `campaignId`/
`businessId` from already-authorized context, never from a client-supplied
value independent of that context. Read isolation (User A cannot read
User B's asset by ID) was proven in Phase 11.

## 8. Campaign Consistency

`businessId`, `userId`, and (when present) `productId` are all
server-derived or server-validated on `generateCampaignStrategy` — none
are trusted verbatim from the client beyond the authorization check
already performed. Re-parenting (`campaign.businessId` changed after
creation) is structurally impossible: the campaign `update` rule
(`firestore.rules`) does not permit `businessId` to change (the existing
Phase 6 rule already pins `status`/`creditsReserved`/`creditsUsed`/
`metadata.truthCheckStatus`; `businessId` itself was never listed as a
mutable field in any update code path — confirmed by reading every
`updateCampaignDoc` call site in `functions/src/functions/campaigns/`, none
of which ever includes `businessId` in the update payload).

## 9. Creative Consistency

`campaign_assets.campaignId`/`businessId` are set once, at creation, by
server-side code that already has the correct, authorized values in
scope (never re-derived from a client request afterward). A failed
regeneration's new asset version is persisted with `status: 'failed'` and
never marked as superseding the still-valid original (Phase 6/9/10,
unchanged, re-confirmed by reading `regenerateAsset.ts` again this phase).

## 10. Credit Consistency

Reused entirely from Phase 10 (re-run clean): reservations, finalizations,
and refunds are keyed to the authenticated `userId` and the specific
`operationId` (campaign generation) — proven atomic and race-safe.
No agency-shared-credit mechanism exists in the current codebase (no code
references a shared/agency credit pool anywhere in `usageControl.ts` or
`razorpayWebhook.ts`) — Agency Mode's billing model, if intended to be
shared, is not yet implemented; documented as a gap, not fabricated.

## 11. Payment/Entitlement Consistency

Reused entirely from Phase 10 (re-run clean): payment → entitlement →
credit grant is one-to-one, proven idempotent under sequential and
concurrent duplicate webhook delivery, and `verifyPayment` rejects
cross-user subscription verification.

## 12. Analytics Consistency

`trackEvent`'s `userId` is always server-derived from `request.auth.uid`
(Phase 9/11 fix), never client-supplied; `businessId`/`campaignId` are
supplied by the caller but only ever reach `trackEvent` from code paths
that already validated that `businessId`/`campaignId` against the
authenticated user in the same function (e.g. `generateCampaignStrategy`'s
`trackEvent(ANALYTICS_EVENTS.CAMPAIGN_STARTED, userId, data.businessId,
campaignId)` — `data.businessId` was already `verifyBusinessAccess`-checked
moments earlier in the same function). Analytics is read-only from the
authorization standpoint — no code path anywhere uses an analytics event
to decide whether an operation is allowed (confirmed by grep: no
`analytics_events` read in any authorization-relevant function).

## 13. Agency Consistency

Reused from Phase 11 (re-run clean): Agency A cannot read Agency B's
`agencies`/`clients`/`businesses`/`campaigns`/`campaign_assets` (15 passing
tests, `tests/phase27-authz.test.ts` + `tests/phase27-bulk-approval-auth-
roles.test.ts`'s Cross-Tenant Isolation suite). Storage's agency-managed-
business access branch was proven functionally correct against emulator
tests, but is not currently reachable in production because no upload
code path sets the `agencyId` Storage object metadata it depends on — a
pre-existing gap documented in the Phase 11 report, not new to this phase,
not re-litigated here.

## 14. Cross-Tenant Tests

**Golden Test 2 (Campaign → Product), proven this phase:** Business A
attempting to generate a campaign using Business B's product —
`businessId: A, productId: <B's product>` — is rejected with "Product does
not belong to this business" before any credits are reserved and before
any campaign document is created (`generateCampaignStrategy.consistency.test.ts`).

**Golden Test 12 (cross-tenant direct ID), reused from Phase 11:** User A
supplying Business B / Campaign B / Product B / Asset B IDs directly is
denied at every tested layer (Firestore rules + backend `verifyBusinessAccess`).

All other cross-tenant scenarios (User→User, Business→Business,
Campaign→Campaign, Asset→Asset, Agency→Agency) are reused from Phase 11's
25+10+9 passing emulator tests — not re-derived from scratch this phase,
per the explicit instruction not to duplicate existing, still-passing
verification work.

## 15. Deletion/Invalidation Tests

**Product deletion/archival:** soft-delete only (`status: 'archived'`);
the product document is never hard-deleted, so a campaign's `productId`
reference never becomes an orphan. `getProductsByBusiness` excludes
archived products (`where('status', '!=', 'archived')`), so archived
products correctly disappear from active selection UI while remaining
resolvable for historical campaigns and for the staleness check (§16).

**Business deletion:** not supported at all — `firestore.rules`:
`allow delete: if false` on `businesses`, and no Cloud Function deletes a
business. Structurally, a `Product`/`Campaign` with a nonexistent parent
`Business` cannot occur in this system's current lifecycle.

## 16. Stale Verification Tests

**Golden Test 10, proven this phase, end-to-end against a real emulator**
(`getCampaign.test.ts`): a campaign verified (Truth Check PASS) while a
product's price is ₹299 is *not* flagged stale immediately after
verification; after the product's price changes to ₹399,
`getCampaign` correctly reports `isVerificationStale: true` — and the
stored `metadata.truthCheckStatus` remains `'PASS'` throughout (the
historical record is never rewritten). This mechanism (Phase 6's
`isVerificationStale`) was previously **never actually invoked** by the
product — see §1's Executive Summary; wired up this phase.

## 17. Failure/Recovery Consistency

Reused from Phase 12 (re-run clean): a rejected/rate-limited/failed
generation request never creates a partial campaign document, never
leaves a stuck credit reservation, and never fires a misleading
`campaign_generated` analytics event (that event only fires after the
campaign document's final write succeeds — confirmed by reading the
line order in `generateCampaignStrategy.ts`, unchanged this phase). The
Product/Business cross-tenant rejection added this phase (§14) was
explicitly verified to leave **zero** campaign documents and **zero**
credit consumption behind (`generateCampaignStrategy.consistency.test.ts`
asserts both).

## 18. AI Context Isolation

Covered in §5 (Business Brain) and reused from Phase 10/11 for the rest of
the generation input (offer/audience/localization all come directly from
the validated request body, scoped to the single campaign being created —
there is no code path that merges in a second campaign's or business's
data). Campaign history isolation: `business.businessBrain.campaignHistory`
is part of the SAME single `Business` document read that supplies
everything else in §5 — structurally, Business A's pipeline call can never
see Business B's campaign history for the identical reason it can never
see Business B's brand/audience data (one document read, one business).

## 19. Orphan/Mismatch Audit

No standalone orphan-audit script was built. Rationale (per the explicit
instruction to document this decision when a script would add nothing
beyond what tests already cover): this environment has no accessible
production Firestore instance to audit — only a local emulator seeded
fresh for each test run — so a "scan production for orphans" script would
have nothing to scan and could not produce a real finding here. Instead,
the *structural* question ("can an orphan be created going forward?") was
answered directly: every child-creating code path (`createProductDoc`,
`createCampaignDoc`, `createCampaignAssets`, `createTransactionDoc`-
equivalent reservation writes) is called only after its parent reference
was already validated to exist and be owned by the caller in the same
function invocation (traced through every relevant file this phase and in
Phase 10/11/12) — so no *new* orphan-creation path was found. Whether
*historical* production data already contains orphans is unknown and
unknowable from this environment; if the team has production Firestore
access, a read-only version of the same relationship checks in
`getCampaignStrategy.consistency.test.ts`/`getCampaign.test.ts` could be
adapted into a one-time audit script against real data — not built here
since it would need production credentials this environment doesn't have.

## 20. Tests Executed

| Test | Result | Evidence |
|---|---|---|
| Campaign → Product cross-business rejection (Golden Test 2) | **PASS** | `generateCampaignStrategy.consistency.test.ts`, real emulator |
| Business Brain scoped to single authorized business | **PASS** | same file — asserts actual pipeline input |
| Truth Check staleness detection on product price change (Golden Test 10) | **PASS** | `getCampaign.test.ts`, real emulator |
| Cross-tenant `getCampaign` access denied | **PASS** | same file |
| Stale-verification UI warning (does not alter underlying badge) | **PASS** | `CampaignDetailContent.test.tsx` (2 new tests) |
| User/Business/Campaign/Asset/Agency cross-tenant isolation | **PASS** (reused) | Phase 11's `security.test.ts`, `storage.test.ts`, `phase27-*.test.ts` — re-run clean this phase |
| Credit reservation/finalize/refund attribution & concurrency | **PASS** (reused) | Phase 10's `usageControl*.test.ts` — re-run clean |
| Payment/webhook entitlement idempotency | **PASS** (reused) | Phase 10's `razorpayWebhook.test.ts`, `verifyPayment.test.ts` — re-run clean |
| Generation failure leaves no partial campaign/credit state | **PASS** (reused + extended) | Phase 12's `generateCampaignStrategy.recovery.test.ts` — re-run clean |

## 21. Commands Executed

```
npm run lint                     → PASS
npm run typecheck                → PASS
npm test                         → PASS (13 suites, 158 passed, 7 skipped, 0 failed)
npm run build                    → PASS (17 routes)
npm run functions:build          → PASS
FIRESTORE_EMULATOR_HOST=localhost:8080 npx jest (functions/)
                                  → PASS (19 suites, 138 passed, 0 failed)
```

Firestore emulator: started for real (`firebase emulators:start --only
firestore --project demo-test-project`) — every emulator-gated test in
this report actually ran, none left on SKIPPED.

## 22. Files Changed

- `src/app/campaigns/[campaignId]/page.tsx` — now calls the `getCampaign`
  Cloud Function (best-effort, non-blocking) to fetch `isVerificationStale`
  alongside the existing direct Firestore reads.
- `src/components/campaign/CampaignDetailContent.tsx` — new
  `isVerificationStale` prop; displays a non-destructive "may be outdated"
  warning without altering the underlying Truth Check badge/status.
- New tests: `functions/src/functions/campaigns/getCampaign.test.ts`,
  `functions/src/functions/campaigns/generateCampaignStrategy.consistency.test.ts`,
  `src/components/campaign/CampaignDetailContent.test.tsx` (2 new cases).

## 23. Remaining Risks

- No production-data orphan audit was possible in this environment (§19) —
  the structural, going-forward guarantee was verified instead.
- Agency Mode has no shared-credit-pool implementation to audit (§10) —
  each business's credits remain fully independent; if shared agency
  billing is an intended future feature, it does not exist yet, so there
  is nothing to have introduced an inconsistency into.
- Storage's agency-access branch remains unreachable in production
  (pre-existing Phase 11 finding, not new, not re-fixed this phase — see
  that report).
- The stale-verification warning depends on the `getCampaign` call
  succeeding; if it fails (network, rate limit), the page silently shows
  no staleness warning rather than blocking the page — a deliberate
  best-effort choice (consistent with Phase 12's non-blocking-failure
  principle for the business/WhatsApp fetch), but it does mean a stale
  campaign could occasionally render without the warning if that specific
  call fails. Acceptable given the underlying Truth Check result itself is
  never falsified either way.

## 24. Final Verdict

PHASE 13 IMPLEMENTED BUT PARTIALLY VERIFIED
