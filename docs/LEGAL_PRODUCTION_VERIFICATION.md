# Legal Production Verification Matrix

Generated 2026-09-22. **Deployment did not proceed this session** — see
`docs/LEGAL_COMPLIANCE_AUDIT_REPORT.md`'s "Production Verification & Deletion Cascade Closure"
section for why (Gate B failed: active Razorpay subscriptions are not protected from account
deletion). This matrix records the actual, currently-true state, not an aspirational one.

Evidence for "Deployed" column: `firebase functions:list --project brainwise-ai-marketing-engine`
(read-only, run this session) cross-checked against `firebase hosting`/App Hosting state confirmed
live in an earlier session's audit. Evidence for "Production HTTP" column: direct `curl` against
`https://www.brain-wise.com` for each route, run this session.

| Capability | Local | Build | Deployed | Production HTTP | Browser Verified | Backend Verified | Status |
|---|---:|---:|---:|---:|---:|---:|---|
| Terms (`/terms`) | Yes | Yes (static, confirmed this session's prior pass) | **No** | 404 | No | N/A | STATICALLY GENERATED ONLY, NOT DEPLOYED |
| Privacy (`/privacy`) | Yes | Yes | **No** | 404 | No | N/A | STATICALLY GENERATED ONLY, NOT DEPLOYED |
| Refund (`/refund`) | Yes | Yes | **No** | 404 | No | N/A | STATICALLY GENERATED ONLY, NOT DEPLOYED |
| Cancellation (`/cancellation`) | Yes | Yes | **No** | 404 | No | N/A | STATICALLY GENERATED ONLY, NOT DEPLOYED |
| Contact (`/contact`) | Yes | Yes | **No** | 404 | No | N/A | STATICALLY GENERATED ONLY, NOT DEPLOYED |
| Support (`/support`) | Yes | Yes | **No** | 404 | No | N/A | STATICALLY GENERATED ONLY, NOT DEPLOYED |
| Consent (`recordConsentAcceptance`) | Yes | Yes (`tsc`/`functions build` clean) | **No** — confirmed absent from `firebase functions:list` output this session | N/A (callable, not an HTTP route) | N/A | **No** — cannot be backend-verified without deployment | IMPLEMENTED LOCALLY, NOT PRODUCTION VERIFIED |
| Subscription cancellation (`cancelSubscription`) | Yes | Yes | **No** — confirmed absent from `firebase functions:list` | N/A | N/A | **No** | IMPLEMENTED LOCALLY, NOT PRODUCTION VERIFIED. Additionally **BLOCKED on Razorpay test credentials** — `RAZORPAY_KEY_SECRET` confirmed not to exist in this GCP project's Secret Manager (404 on access attempt), and `apphosting.yaml`'s public key is a literal placeholder string — even once deployed, this cannot be end-to-end tested against real Razorpay in this environment. |
| Account deletion (`requestAccountDeletion`) | Yes | Yes | **No** — confirmed absent from `firebase functions:list` | N/A | N/A | **No** | IMPLEMENTED LOCALLY, NOT PRODUCTION VERIFIED. The active-subscription gap documented in `docs/LEGAL_DELETION_DATA_LIFECYCLE.md` is **now fixed locally** (deletion blocks on an active, still-renewing subscription) — the pre-deployment gate now passes; deployment itself is still pending explicit authorization |

## Currently-live production state (for contrast — what production actually runs today)

Confirmed via `firebase functions:list` this session: `createCampaign` **is still deployed and
live** in production right now, meaning the credit-loss defect (F2 in the main audit report) is
still reachable by any authenticated client in production as of this writing — the local fix (C2,
removing its export) has not been deployed. `onUserDeletedHandler` and `onUserCreatedHandler` (the
pre-existing v1 Auth triggers) are deployed and live. `razorpayWebhook` is deployed and live, running
the *pre-fix* `===` signature comparison (C3's `timingSafeEqual` fix has not been deployed either).

## Explicit distinction (per this audit's own rule)

```
STATICALLY GENERATED  ≠  DEPLOYED  ≠  PRODUCTION ROUTABLE  ≠  BROWSER VERIFIED
```

Every legal page and every new callable in this report is **STATICALLY GENERATED / BUILDS CLEAN**
only. None has cleared any of the later three bars. This matrix will be updated once deployment is
authorized and actually performed.
