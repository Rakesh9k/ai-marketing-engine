# Phase 1B & 1C — Responsibility Boundaries and Input Model

**Document Status**: Authoritative Specification  
**Project**: Mitra by BrainWise — Creative Brain Project (Phase 1)  
**Location**: `docs/creative-brain/PHASE_1_BOUNDARIES_AND_INPUTS.md`  

---

## Phase 1B — Responsibility Boundary Definition

### 1. Core Definition & Purpose
**Creative Brain** is an adaptive strategic reasoning layer that transforms:
* **Business Brain context** (who the business is, verified facts, rules, identity),
* **Product/service context** (visual attributes, pricing, catalog metadata),
* **Historical creative intelligence** (preferences, feedback, past performance), and
* **User campaign intent** (objective, offer details, audience, CTA)

into a validated **Creative Opportunity** and a set of candidate **Creative Concepts**, ultimately emitting a single, structured **Creative Blueprint** for consumption by the existing campaign execution engine.

---

### 2. Primary Architectural Principle: System Separation

The system strictly isolates three non-overlapping architectural layers:

```
+-------------------------------------------------------------------------------+
|                                BUSINESS BRAIN                                 |
|                                                                               |
|  - Who the business is                                                        |
|  - Authoritative facts (Name, WhatsApp, Location, Operating Rules)           |
|  - Product/Service catalog & verified pricing                                 |
|  - Knowledge provenance & brand identity defaults                             |
+---------------------------------------+---------------------------------------+
                                        |  (Read-Only Context)
                                        v
+-------------------------------------------------------------------------------+
|                                CREATIVE BRAIN                                 |
|                                                                               |
|  - What marketing opportunity should be pursued                               |
|  - Which creative concept should win, and why                                 |
|  - Strategic opportunity formation & concept evaluation/scoring              |
|  - Emits: Creative Blueprint (Targeted directives for execution)             |
+---------------------------------------+---------------------------------------+
                                        |  (Execution Directives)
                                        v
+-------------------------------------------------------------------------------+
|                               EXECUTION ENGINE                                |
|                                                                               |
|  - How the selected concept becomes actual marketing assets                   |
|  - 13-stage GenerationPipeline execution                                      |
|  - Deterministic SVG compositing & asset generation                           |
|  - Deterministic Truth Check, Quality/Safety validation                       |
|  - Usage control, credit deduction, tenant isolation & Firestore persistence  |
+-------------------------------------------------------------------------------+
```

---

### 3. Non-Negotiable "Must NOT Own" Boundaries

Creative Brain is strictly forbidden from acquiring ownership of or responsibility for:

1. **Business Brain & Business Truth**: Creative Brain cannot modify, invent, or override business facts (phone, WhatsApp, location, product prices, operating hours).
2. **Payments & Billing**: No handling of Razorpay, PayU, Paddle, or subscription lifecycle.
3. **Usage Accounting & Credits**: No direct credit checking, reservation, deduction, or refunding (`usageControl.ts` remains sole owner).
4. **Authentication & Tenant Isolation**: No auth verification, JWT parsing, or custom claim management (`verifyBusinessAccess` remains sole owner).
5. **Asset Rendering**: No SVG generation, rasterization, image editing, canvas drawing, video encoding, or FFmpeg calls (`compositor.ts` and `videoRenderer.ts` remain sole owners).
6. **Persistence**: No direct writes to `campaigns`, `campaign_assets`, `users`, or `transactions` collections in Firestore.
7. **Truth Check & Safety**: No replacement or modification of `truthCheck.ts` or safety validation rules.
8. **Publishing & Infrastructure**: No social media OAuth, Meta Graph API publishing, or Cloud Run deployment orchestration.

---

## Phase 1C — Input Model Definition

The Creative Brain receives a consolidated, strongly-typed, read-only input struct from the host pipeline execution environment.

### TypeScript Contract: `CreativeBrainInput`

```typescript
import type {
  BusinessBrain,
  Product,
  LocalizationProfile,
  SavedStyleContext,
  CreativePreference,
  CreativeFeedback,
  CampaignPerformance,
  BusinessCategory,
  CampaignObjective,
  CTAType,
  OfferType,
} from '../types';
import type { BusinessUnderstandingOutput, ProductUnderstandingOutput } from './pipeline';

/**
 * Historical memory signals ingested by Creative Brain
 */
export interface CreativeBrainMemoryContext {
  /** Aggregated business template preferences (preferred vs. avoided) */
  readonly preferences: readonly CreativePreference[];
  /** Historical explicit user feedback records */
  readonly feedback: readonly CreativeFeedback[];
  /** Active user saved style profile (if selected for this run) */
  readonly activeSavedStyle?: SavedStyleContext;
  /** Real-world performance recommendations from past campaigns */
  readonly performanceRecommendations?: {
    readonly topPerformingAngles?: readonly string[];
    readonly topPerformingCTAs?: readonly string[];
    readonly historicalCTR?: number;
    readonly totalWhatsAppClicks?: number;
  };
}

/**
 * Campaign Intent passed into Creative Brain
 */
export interface CreativeBrainCampaignIntent {
  readonly campaignId?: string;
  readonly businessId: string;
  readonly objective: CampaignObjective;
  readonly templateId?: string;
  readonly styleId?: string;
  readonly offer: {
    readonly headline: string;
    readonly description?: string;
    readonly price: number;
    readonly originalPrice?: number;
    readonly type: OfferType;
    readonly validityStart: string;
    readonly validityEnd: string;
    readonly terms?: string;
  };
  readonly duration: {
    readonly start: string;
    readonly end: string;
  };
  readonly audience: {
    readonly localities: readonly string[];
    readonly ageRange?: { readonly min: number; readonly max: number };
    readonly occasion?: string;
  };
  readonly cta: CTAType;
  readonly localization: LocalizationProfile;
}

/**
 * Resolved conflict constraints produced by conflictResolver.ts
 */
export interface CreativeBrainConflictConstraints {
  readonly nonNegotiableRules: Record<string, string>;
  readonly directives: readonly string[];
  readonly detectedConflictsCount: number;
}

/**
 * Complete Input Struct passed into Creative Brain
 */
export interface CreativeBrainInput {
  /** Core Business Brain (Read-Only) */
  readonly businessBrain: BusinessBrain;
  
  /** Business Category / Vertical */
  readonly vertical: BusinessCategory;

  /** Target Product / Service Context (if selected or new) */
  readonly productContext?: {
    readonly productId?: string;
    readonly name: string;
    readonly description?: string;
    readonly price: number;
    readonly category?: string;
    readonly images: readonly string[];
  };

  /** Parsed Campaign Intent */
  readonly intent: CreativeBrainCampaignIntent;

  /** Stage 1 Business Understanding Output */
  readonly businessUnderstanding: BusinessUnderstandingOutput;

  /** Stage 2 Product/Visual Understanding Output */
  readonly productUnderstanding?: ProductUnderstandingOutput;

  /** Historical Memory & Intelligence Context */
  readonly memory: CreativeBrainMemoryContext;

  /** Resolved System & Business Constraints */
  readonly conflictConstraints: CreativeBrainConflictConstraints;
}
```
