# Creative Intelligence Phase 14: Saved Styles

## Purpose
Saved Styles allow a user/business to define and reuse a creative style across different templates. This enables them to standardize elements such as tone, visual density, product prominence, color mode, humor, text density, and CTA style, without needing to repeatedly configure these parameters.

## Template vs Style
- **Template** = what to create (structural requirements like having a Hook, Offer, and CTA).
- **Style** = how it should feel/look (creative expression preferences such as playful tone, direct CTA, or high product prominence).

## Schema
The canonical `SavedStyle` model resides in the central type system (`src/types/index.ts`):
```ts
export interface SavedStyle {
  styleId: string;
  businessId: string;
  name: string;
  description?: string;
  tone: SavedStyleTone;
  visualDensity: SavedStyleVisualDensity;
  productProminence: SavedStyleProductProminence;
  textDensity: SavedStyleTextDensity;
  colorMode: SavedStyleColorMode;
  humor: SavedStyleHumor;
  ctaStyle: SavedStyleCtaStyle;
  language?: SavedStyleLanguage;
  active: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}
```
Saved Styles use structured typed fields (enums) instead of open-ended string prompts.

## Ownership
Styles are tenant/user-owned. Each `SavedStyle` maps to a specific `businessId`. Ownership and access are strictly enforced server-side using Firestore rules and backend validation in Firebase Functions.

## Context
Integration into generation flows works sequentially without creating duplicate raw context models:
```text
SavedStyle
 ↓
SavedStyleContext (normalized format)
 ↓
Context Selector (conditionally injected task-by-task)
 ↓
Template Adaptation
```

## Precedence
During creative generation, priority cascades as follows:
```text
Authoritative business/brand constraints > Template requirements > Style preferences > AI interpretation
```
A Saved Style cannot override factual constraints from the Business Brain (like real prices) or structural constraints from a Template (like requiring a CTA).

## POST Integration
The UI in `CampaignWizard.tsx` allows users to select an optional `styleId`. This is mapped through `buildCampaignInput.ts` to `generateCampaignStrategy`, where it loads the style via `getSavedStyleDoc()` and injects `savedStyleId` and `savedStyleVersion` into the campaign metadata for deterministic storage.

## REEL Integration
Similarly, `ReelWizard.tsx` includes `SavedStylePicker`. When creating the Reel project (`createReelProject`), the backend verifies style ownership and activity status, then injects `savedStyleId` and `savedStyleVersion` into the `ReelProject` document.

## Security
- **Tenant Isolation:** Firestore paths `businesses/{businessId}/savedStyles/{styleId}` prevent cross-tenant reads and writes.
- **Backend Validation:** Creation/Update APIs (`createSavedStyle`, `updateSavedStyle`) verify business ownership.
- **Generation:** Only styles owned by the user's business can be applied during Campaign/Reel generation.

## Versioning
Styles track a numerical `version` that increments on edits. This ensures that historical campaigns retain the exact style footprint used at generation (via `savedStyleId` + `savedStyleVersion`), preserving determinism even if the style changes later.

## Testing
Comprehensive testing coverage includes:
- **Domain & Validation:** Validation of schema, required fields, enum boundaries.
- **Template Adaptation:** Ensures `TemplateAdaptationPlanner` integrates style configurations to influence output without breaking template requirements.
- **Context Routing:** Verification that the Context Selector injects `savedStyle` into relevant generation pipelines (Image Generation, Copy, Reel Shot Planning).
