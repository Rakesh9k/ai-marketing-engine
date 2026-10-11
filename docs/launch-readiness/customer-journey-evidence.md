# Mitra AI Marketing Engine — Customer Journey Evidence

**Date:** 2026-10-09  
**Verified Release Commit:** `370c14e9eb609c1c810e708b8716e3b996b6733b`  
**Scope:** Core Customer Journeys A through I

---

## 1. Journey Execution Summary Table

| Journey ID | Flow Name | Environment | Result | Primary Evidence Reference |
| :---: | :--- | :---: | :---: | :--- |
| **J-01** | Signup & Authentication | Emulator / Auth | **PASS** | Firebase Auth User Doc Creation |
| **J-02** | Onboarding & Fact Persistence | Emulator / Firestore | **PASS** | `/onboarding_drafts/{userId}` Document |
| **J-03** | Interrupted Onboarding Resume | Emulator | **PASS** | `useDraftAutoSave` & Draft Model |
| **J-04** | Business Brain Setup & Updates | Emulator | **PASS** | `updateBusinessBrain` Admin Callable |
| **J-05** | Campaign Strategy & Copy Pipeline | Emulator / Live AI | **PASS** | `generateCampaignStrategy` Call Logs |
| **J-06** | Truth Check Fact Verification | Emulator | **PASS** | `metadata.truthCheckStatus == 'PASS'` |
| **J-07** | Deliverable Generation & Zip Packaging | Local Export | **PASS** | Generated SVG / PNG & ZIP Archive |
| **J-08** | Credit Reservation & Refund Plumbing | Emulator | **PASS** | `/usage/{userId}_{period}` Ledger |
| **J-09** | Failed Generation Refund Recovery | Emulator | **PASS** | Atomic Transaction Refund Logs |
| **J-10** | Cross-Tenant Security Isolation | Emulator Rules | **PASS** | `tests/security.tenant.test.ts` |

---

## 2. Journey Step Details & Verification Evidence

### Journey J-01 & J-02: Authentication, Onboarding & Fact Intake
- **Flow**: User registers via Firebase Auth, enters business facts (Category: Restaurant / Salon / Real Estate / Retail), and saves initial brand preferences.
- **Evidence**: `saveOnboardingDraft` validates Zod schema server-side and persists facts into `/onboarding_drafts/{userId}`. Post-auth routing redirects user to `/dashboard` upon completion.

### Journey J-03 & J-04: Interrupted Resume & Business Brain Management
- **Flow**: User closes browser mid-onboarding, returns, and completes the setup.
- **Evidence**: `onboardingDraftModel.ts` reloads partial facts cleanly. Business Brain updates persist to `/businesses/{businessId}` via Admin SDK callables without client field-injection vulnerabilities.

### Journey J-05 & J-06: Campaign Pipeline & Truth Check Gate
- **Flow**: User submits campaign prompt (*"20% OFF Weekend Special"*).
- **Execution Path**:
  1. `discoverOpportunity()` calls Gemini 2.5 API for strategic insight.
  2. `generateConceptCandidates()` calls Gemini 3.1 API for 3 candidate concepts.
  3. `scoreConcepts()` applies 5-dimension scoring and hard factual gates.
  4. `generateCampaignStrategy()` builds campaign blueprint and invokes `CompositionEngine`.
  5. `truthCheck.ts` evaluates generated copy against Business Brain Level 0 facts.
- **Evidence**: `metadata.truthCheckStatus` evaluates to `PASS`. Verified campaign saved to `/campaigns/{campaignId}`.

### Journey J-07 & J-08: Deliverables & Credit Accounting
- **Flow**: Customer views generated campaign and downloads ZIP pack.
- **Accounting Path**: `executeWithUsageControl()` checks credit balance before generation, reserves required credits, and finalizes usage inside an atomic Firestore transaction.
- **Evidence**: Credits deducted from `/usage/{userId}_{YYYY-MM}`. Deliverables zipping includes SVG posters, copy decks, and brand blueprint JSON.
