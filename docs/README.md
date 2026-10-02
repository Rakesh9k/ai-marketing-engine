# Documentation Index

Mitra (AI Marketing Engine) has no single hand-maintained architecture bible — its real
source-of-truth is this collection of phase-by-phase implementation/verification reports plus a
small number of current-state reference documents. This index exists to make that collection
navigable. See `docs/DOCUMENTATION_AUDIT_REPORT.md` for the audit that produced this index and its
findings.

**A note on Phase-0-era planning docs**: `PRODUCT.md`, `ARCHITECTURE.md`, `DATABASE.md`,
`AI_ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `SECURITY.md`, `MVP_SCOPE.md`, `TEST_PLAN.md`,
`PROMPT_SYSTEM.md`, `OBSERVATION.md`, and `OBSERVATION_REPORT.md` are referenced by name in some
phase-brief templates but were never actually created in this repository (confirmed by direct
file-existence check, not a broken link). Do not search for them again — use the documents below
instead, which is what every phase since has actually relied on.

## Reference (current state — kept up to date, not historical)

| Document                                                                                         | What it covers                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [API.md](API.md)                                                                                 | Canonical Firebase Callable Function inventory: auth, App Check, rate limiting, error codes                                                                                        |
| [USER_GUIDE.md](USER_GUIDE.md)                                                                   | Customer-facing guide to the current Mitra product — onboarding, campaigns, Truth Check, credits, billing, troubleshooting, current limitations                                    |
| [SECURITY.md](SECURITY.md)                                                                       | Consolidated technical security reference: authentication, App Check, authorization, tenant isolation, Storage path ownership, credits, Truth Check, payments, secrets, known gaps |
| [ARCHITECTURE_AI_CONTEXT.md](ARCHITECTURE_AI_CONTEXT.md)                                         | Architecture context for AI-assisted development                                                                                                                                   |
| [ARCHITECTURE_DISCOVERY_REPORT.md](ARCHITECTURE_DISCOVERY_REPORT.md)                             | Architecture discovery/audit                                                                                                                                                       |
| [PRODUCTION_FRONTEND_DEPLOYMENT_ARCHITECTURE.md](PRODUCTION_FRONTEND_DEPLOYMENT_ARCHITECTURE.md) | Frontend hosting options audit (written before App Hosting was actually deployed — cross-check against the Phase 19C reports below for what actually happened)                     |
| [PERFORMANCE_ENGINE.md](PERFORMANCE_ENGINE.md)                                                   | The (unimplemented) campaign-performance learning engine — what exists today vs. what it would need                                                                                |
| [PERFORMANCE_DATA_READINESS.md](PERFORMANCE_DATA_READINESS.md)                                   | Per-metric readiness gate for the Performance Engine — **DATA NOT YET SUFFICIENT**                                                                                                 |
| [PERFORMANCE_OPTIMIZATION_AUDIT_REPORT.md](PERFORMANCE_OPTIMIZATION_AUDIT_REPORT.md)             | Runtime performance audit (frontend/backend/network/caching)                                                                                                                       |
| [OBSERVABILITY_AUDIT_REPORT.md](OBSERVABILITY_AUDIT_REPORT.md)                                   | Sentry/error-boundary/health-endpoint/logging audit                                                                                                                                |
| [DOCUMENTATION_AUDIT_REPORT.md](DOCUMENTATION_AUDIT_REPORT.md)                                   | This documentation phase's own audit report                                                                                                                                        |

## Security & Credits & Truth Check

| Document                                                                                                                                                                                                                                                                                                 | Covers                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [PHASE_10_CREDITS_PAYMENT_INTEGRITY_REPORT.md](PHASE_10_CREDITS_PAYMENT_INTEGRITY_REPORT.md)                                                                                                                                                                                                             | Credit reservation/finalization/refund integrity                                      |
| [PHASE_11_SECURITY_HARDENING_REPORT.md](PHASE_11_SECURITY_HARDENING_REPORT.md)                                                                                                                                                                                                                           | Security hardening pass                                                               |
| [PHASE_6_TRUTH_CHECK_REPORT.md](PHASE_6_TRUTH_CHECK_REPORT.md)                                                                                                                                                                                                                                           | Truth Check fact-verification design and invariants                                   |
| [PHASE_20A_APP_CHECK_INTEGRATION_REPORT.md](PHASE_20A_APP_CHECK_INTEGRATION_REPORT.md) / [PHASE_20B_APP_CHECK_AUTH_LOCAL_FIX_REPORT.md](PHASE_20B_APP_CHECK_AUTH_LOCAL_FIX_REPORT.md) / [PHASE_20C_REAL_FIREBASE_APPCHECK_ENVIRONMENT_REPORT.md](PHASE_20C_REAL_FIREBASE_APPCHECK_ENVIRONMENT_REPORT.md) | App Check integration, local fixes, real-environment verification (most recent = 20C) |
| [PHASE_38_RATE_LIMIT_PRECISION_AUDIT_REPORT.md](PHASE_38_RATE_LIMIT_PRECISION_AUDIT_REPORT.md) / [PHASE_38B_RATE_LIMIT_FOLLOWUP_REPORT.md](PHASE_38B_RATE_LIMIT_FOLLOWUP_REPORT.md)                                                                                                                      | Rate limiting precision/tuning (most recent = 38B)                                    |

## AI / Campaign Pipeline

| Document                                                                                                                                                                                                                                   | Covers                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| [PHASE_4_CAMPAIGN_CREATION_REPORT.md](PHASE_4_CAMPAIGN_CREATION_REPORT.md)                                                                                                                                                                 | Campaign creation flow                               |
| [PHASE_5_AI_GENERATION_REPORT.md](PHASE_5_AI_GENERATION_REPORT.md)                                                                                                                                                                         | AI strategy/copy generation                          |
| [PHASE_7_CREATIVE_GENERATION_REPORT.md](PHASE_7_CREATIVE_GENERATION_REPORT.md)                                                                                                                                                             | Image/creative generation                            |
| [PHASE_8_CAMPAIGN_REVIEW_REPORT.md](PHASE_8_CAMPAIGN_REVIEW_REPORT.md)                                                                                                                                                                     | Campaign review flow                                 |
| [PHASE_9_DOWNLOAD_WHATSAPP_REPORT.md](PHASE_9_DOWNLOAD_WHATSAPP_REPORT.md)                                                                                                                                                                 | Download + WhatsApp CTA                              |
| [PHASE_14_30_DAY_AI_MARKETING_CALENDAR_REPORT.md](PHASE_14_30_DAY_AI_MARKETING_CALENDAR_REPORT.md)                                                                                                                                         | 30-Day AI Marketing Calendar V1                      |
| [PHASE_29_MULTI_VERTICAL_FOUNDATION_REPORT.md](PHASE_29_MULTI_VERTICAL_FOUNDATION_REPORT.md) / [PHASE_30_SALON_MODE_REPORT.md](PHASE_30_SALON_MODE_REPORT.md) / [PHASE_31_REAL_ESTATE_MODE_REPORT.md](PHASE_31_REAL_ESTATE_MODE_REPORT.md) | Vertical expansion (restaurant → salon, real estate) |

## Testing

| Document                                                                                                                                | Covers                       |
| --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| [PHASE_15_TESTING_REPORT.md](PHASE_15_TESTING_REPORT.md)                                                                                | Testing foundation           |
| [PHASE_16_E2E_MVP_TEST_REPORT.md](PHASE_16_E2E_MVP_TEST_REPORT.md) / [PHASE_20_E2E_MVP_TEST_REPORT.md](PHASE_20_E2E_MVP_TEST_REPORT.md) | E2E MVP test passes          |
| [PHASE_35_FRONTEND_TEST_HARDENING_REPORT.md](PHASE_35_FRONTEND_TEST_HARDENING_REPORT.md)                                                | Frontend test hardening      |
| [PHASE_37_TESTING_QA_AUDIT_REPORT.md](PHASE_37_TESTING_QA_AUDIT_REPORT.md)                                                              | Most recent testing/QA audit |

## Operations / Deployment (read newest-first — this area changed the most recently)

| Document                                                                                                                                                                                                                                         | Covers                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| [PHASE_19C_FIREBASE_APP_HOSTING_PRODUCTION_REPORT.md](PHASE_19C_FIREBASE_APP_HOSTING_PRODUCTION_REPORT.md)                                                                                                                                       | **Current deployment target**: Firebase App Hosting (`mitra-web`), live-verified, some gates blocked on console config |
| [PHASE_19C_RECAPTCHA_APPCHECK_VERIFICATION_REPORT.md](PHASE_19C_RECAPTCHA_APPCHECK_VERIFICATION_REPORT.md)                                                                                                                                       | reCAPTCHA/App Check domain verification on the App Hosting host                                                        |
| [PHASE_19B_VERCEL_PREVIEW_DEPLOYMENT_REPORT.md](PHASE_19B_VERCEL_PREVIEW_DEPLOYMENT_REPORT.md) / [VERCEL_PREVIEW_DEPLOYMENT_REPORT.md](VERCEL_PREVIEW_DEPLOYMENT_REPORT.md) / [VERCEL_ENVIRONMENT_VARIABLES.md](VERCEL_ENVIRONMENT_VARIABLES.md) | **Historical/superseded** — Vercel was the originally intended host; App Hosting replaced it (see PHASE_19C above)     |
| [PHASE_19A_PRODUCTION_BLOCKER_FIXES_REPORT.md](PHASE_19A_PRODUCTION_BLOCKER_FIXES_REPORT.md) / [PHASE_19_PRODUCTION_READINESS_REPORT.md](PHASE_19_PRODUCTION_READINESS_REPORT.md)                                                                | Pre-deployment production-readiness fixes                                                                              |
| [PRODUCTION_DEPLOYMENT_ARCHITECTURE_AUDIT.md](PRODUCTION_DEPLOYMENT_ARCHITECTURE_AUDIT.md) / [PRODUCTION_FRONTEND_DEPLOYMENT_REPORT.md](PRODUCTION_FRONTEND_DEPLOYMENT_REPORT.md)                                                                | Deployment sequencing/rollback planning                                                                                |

## Product / Readiness Summary

| Document                                                                                     | Covers                                                                                                                 |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [PHASE_36_FINAL_MITRA_READINESS_REPORT.md](PHASE_36_FINAL_MITRA_READINESS_REPORT.md)         | **The single best current-status summary** — evidence-based PASS/PARTIAL/BLOCKED/FAIL/NOT IMPLEMENTED per product area |
| [PHASE_32_ANALYTICS_DASHBOARD_REPORT.md](PHASE_32_ANALYTICS_DASHBOARD_REPORT.md)             | Analytics dashboard                                                                                                    |
| [PHASE_33_BUSINESS_BRAIN_UI_REPORT.md](PHASE_33_BUSINESS_BRAIN_UI_REPORT.md)                 | Business Brain customer-facing UI                                                                                      |
| [PHASE_34_PERFORMANCE_DATA_PIPELINE_REPORT.md](PHASE_34_PERFORMANCE_DATA_PIPELINE_REPORT.md) | Performance data pipeline (feeds PERFORMANCE_ENGINE.md/PERFORMANCE_DATA_READINESS.md)                                  |
| [PHASE_28_GAP_AUDIT.md](PHASE_28_GAP_AUDIT.md)                                               | Gap audit before vertical expansion                                                                                    |

## Historical / Superseded (kept for the record, not current status)

`PHASE_12_ERROR_RECOVERY_REPORT.md`, `PHASE_13_DATA_CONSISTENCY_REPORT.md`,
`PHASE_14_OBSERVABILITY_REPORT.md`, `PHASE_17_LANDING_PAGE_REPORT.md`,
`PHASE_18_CLEANUP_DEAD_ROUTES_REPORT.md` — each describes work later superseded or folded into a
later phase's report; treat `PHASE_36_FINAL_MITRA_READINESS_REPORT.md` as authoritative for current
status of anything these touch.

## For a new contributor

Start with the root [README.md](../README.md) (setup, environment variables, commands), then
`docs/API.md` for the backend surface, then `PHASE_36_FINAL_MITRA_READINESS_REPORT.md` for what's
actually implemented today.
