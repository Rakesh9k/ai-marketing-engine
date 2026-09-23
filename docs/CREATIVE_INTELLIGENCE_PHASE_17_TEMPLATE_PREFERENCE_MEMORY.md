# PHASE 17 — Template Preference Memory

## Purpose
Build a deterministic, tenant-scoped preference memory layer on top of `CreativeFeedback`. The system tracks which templates are historically approved (preferred) or rejected (avoided) by a specific business. This structured memory becomes contextual input for generation pipelines.

## Scope
Phase 17 focuses **only** on Template Preferences. While `CreativePreference` is stored generically against `templateId`, future extensions can introduce dimensions for `tone`, `localization`, or `visual_style`.

## Data Model

```ts
export type CreativePreferenceSource = 'explicit_user' | 'approval' | 'rejection';
export type CreativePreferenceState = 'preferred' | 'avoided' | 'none';

export interface CreativePreference {
  preferenceId: string;
  businessId: string;
  templateId: string;
  preference: CreativePreferenceState;
  confidence: number;
  evidenceCount: number;
  positiveEvidenceCount: number;
  negativeEvidenceCount: number;
  source: CreativePreferenceSource;
  createdAt: string;
  updatedAt: string;
}
```

## Evidence Aggregation
A deterministic state-machine runs inside a Firestore Transaction whenever a new `CreativeFeedback` event is processed.
1. It looks up the existing `CreativePreference` by `businessId` and `templateId`.
2. It increments `positiveEvidenceCount` or `negativeEvidenceCount` depending on feedback sentiment.
3. It increments `evidenceCount`.
4. It recalculates the net evidence score (`positive - negative`).

## Thresholds & Hysteresis
- A template achieves `preferred` status if its net score `(positive - negative) >= 2`.
- A template drops to `avoided` status if its net score `(positive - negative) <= -2`.
- To avoid flip-flopping (hysteresis), once a template is `preferred`, it requires accumulating negative evidence to bring the net score down to `< 2` to lose `preferred` status, and down to `<= -2` to become `avoided`.

## Confidence Bounds
Confidence is a bounded `[0.0, 1.0]` scalar derived without AI:
`confidence = min(1.0, |netScore| / 5) * min(1.0, totalEvidence / 10)`

## Provenance
Preferences track where their inference originated from using the `source` field. Aggregated feedback maps to `approval` or `rejection`.

## Security & Isolation
- Preferences are scoped tightly to a `businessId`.
- No cross-tenant reads or writes are permitted.
- The system enforces deterministic updates securely in a background cloud function (`submitCreativeFeedback`), shielding it from arbitrary client modifications.

## Business Brain Boundary
- **Business Brain Immutability**: Business facts (BrandKit, Products, Voice) remain completely untouched. Creative preferences are dynamically fetched and overlaid into the prompt context at generation time.
- **Context Selector**: The `SelectCreativeContext` phase now fetches `creativePreferences` and injects an explicit JSON mapping:
  ```json
  {
    "preferredTemplates": ["post-product-hero"],
    "avoidedTemplates": ["reel-offer"]
  }
  ```

## Precedence: User Choice First
If a user explicitly requests a generation from an `avoided` template, the generation pipeline respects the user's immediate choice and selects it regardless of historical preference memory. The preference acts as supplementary contextual memory, not a rigid constraint against explicit user requests.

## Future Work
- Style Preference Memory: expanding tracking for visual densities, color palettes, and CTA styles.
- Intelligent Recommendation: Using the preference state to recommend "For You" templates directly in the UI.
- Preference Confirmation UI: Allowing businesses to explicitly confirm or reject their inferred preference profiles.
