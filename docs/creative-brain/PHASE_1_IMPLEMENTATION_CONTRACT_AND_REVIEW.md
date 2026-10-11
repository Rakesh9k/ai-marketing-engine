# Phase 1M & 1N — Implementation Contract and Final Architecture Review

**Document Status**: Authoritative Specification  
**Project**: Mitra by BrainWise — Creative Brain Project (Phase 1)  
**Location**: `docs/creative-brain/PHASE_1_IMPLEMENTATION_CONTRACT_AND_REVIEW.md`  

---

## Phase 1M — Implementation Contract

This document defines the strict TypeScript service contract that future implementation phases (Phase 2+) MUST adhere to when implementing the `CreativeBrainService`.

### 1. Primary Service Interface: `ICreativeBrainService`

```typescript
import type { CreativeBrainInput } from './PHASE_1_BOUNDARIES_AND_INPUTS';
import type { CreativeOpportunity } from './PHASE_1_OPPORTUNITIES_CONCEPTS_AND_SCORING';
import type { CreativeConcept } from './PHASE_1_OPPORTUNITIES_CONCEPTS_AND_SCORING';
import type { CreativeBlueprint } from './PHASE_1_BLUEPRINT_AND_LIFECYCLE';

export class CreativeBrainError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_INPUT' | 'OPPORTUNITY_FORMATION_FAILED' | 'CONCEPT_EVALUATION_FAILED' | 'SCORE_BELOW_THRESHOLD',
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CreativeBrainError';
  }
}

export interface ICreativeBrainService {
  /**
   * Main entry point: Transforms input context into a validated Creative Blueprint.
   * Guarantees fallback emission on error — never throws unhandled exceptions.
   */
  evaluateAndFormBlueprint(input: CreativeBrainInput): Promise<CreativeBlueprint>;

  /**
   * Discovers and evaluates strategic marketing opportunities from business context.
   */
  discoverOpportunity(input: CreativeBrainInput): Promise<CreativeOpportunity>;

  /**
   * Generates candidate creative concept variants for a given opportunity.
   */
  generateConceptCandidates(
    opportunity: CreativeOpportunity,
    input: CreativeBrainInput
  ): Promise<readonly CreativeConcept[]>;

  /**
   * Scores and ranks candidate concepts using the 5-dimension scoring model.
   */
  scoreConcepts(
    concepts: readonly CreativeConcept[],
    input: CreativeBrainInput
  ): Promise<readonly CreativeConcept[]>;
}
```

---

### 2. Integration Contract within `GenerationPipeline`

In future implementation phases, `CreativeBrainService` will be invoked inside `functions/src/services/ai/pipeline.ts` after Stage 2 and before Stage 3:

```typescript
// FUTURE INTEGRATION TARGET (DO NOT IMPLEMENT IN PHASE 1)
// Location: functions/src/services/ai/pipeline.ts -> GenerationPipeline.execute()

/*
  // Stage 1 & 2 complete:
  const businessUnderstanding = await this.runStage1(input);
  const productUnderstanding = await this.runStage2(input, businessUnderstanding);

  // Creative Brain Insertion Point:
  const brainInput: CreativeBrainInput = {
    businessBrain: input.businessBrain,
    vertical: input.vertical || input.businessCategory,
    intent: parseCampaignIntent(input),
    businessUnderstanding,
    productUnderstanding,
    memory: await assembleMemoryContext(input.businessId, input.savedStyleContext),
    conflictConstraints: resolveUserInstructionConflicts(input),
  };

  const creativeBrain = new CreativeBrainService();
  const blueprint = await creativeBrain.evaluateAndFormBlueprint(brainInput);

  // Pass Blueprint into Stage 3 Execution:
  stageResults.blueprint = blueprint;
  stageResults.campaignStrategy = await this.runStage3WithBlueprint(input, blueprint);
*/
```

---

## Phase 1N — Final Architecture Review

The proposed Creative Brain architecture has been thoroughly reviewed against all system safeguards and project principles.

### Architectural Compliance Checklist

| Safeguard / Principle | Compliance | Verification Evidence & Guarantee |
| :--- | :---: | :--- |
| **1. Business Brain Preservation** | **PASS** | Business Brain remains 100% read-only. Creative Brain consumes facts via `CreativeBrainInput` but cannot mutate `businesses/{businessId}`. |
| **2. Campaign Pipeline Preservation** | **PASS** | `GenerationPipeline` structure, stage execution order, and trace mechanisms remain untouched in Phase 1. |
| **3. Usage & Credit Control** | **PASS** | `executeWithUsageControl` remains sole owner of credit reservation, deduction, and refunding. Creative Brain has no billing privileges. |
| **4. Tenant Isolation & Auth** | **PASS** | `verifyBusinessAccess` and Zod schema validation remain strictly enforced at the Cloud Function entry point. |
| **5. Deterministic Truth Check** | **PASS** | `truthCheck.ts` remains the final, non-negotiable factual gating authority before campaign persistence or credit charging. |
| **6. SVG Compositor Protection** | **PASS** | `compositor.ts` remains sole owner of SVG composition. Creative Brain outputs visual text overlay directives, not image files. |
| **7. Reel & Video Renderer Protection**| **PASS** | `VideoRenderer` and FFmpeg pipelines remain completely independent of Creative Brain reasoning. |
| **8. Firestore Security Rules** | **PASS** | `firestore.rules` remain unedited and fully active across all collections. |
| **9. Zero Code Changes in Phase 1** | **PASS** | Zero production code files modified. All Phase 1 deliverables consist of architecture specification documents. |
| **10. Structural Separation** | **PASS** | Business Brain (Who), Creative Brain (What/Why), Execution Engine (How) strictly decoupled. |

---

## Conclusion

The architecture of **Creative Brain** is fully defined, typed, mapped, and ready for future implementation without introducing any technical debt, breaking changes, or security risks to the existing Mitra marketing engine.
