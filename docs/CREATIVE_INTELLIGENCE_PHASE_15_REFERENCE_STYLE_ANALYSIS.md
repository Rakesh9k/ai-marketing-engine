# Creative Intelligence Phase 15: Reference-Image Style Analysis

## Purpose
Phase 15 introduces a reference-image inspiration workflow to Mitra. It analyzes an uploaded reference creative to extract a **structured creative style profile**, transforming it into a canonical `SavedStyle` for reuse. 

The core principle is: **Analyze the STYLE. Do not reproduce the CREATIVE.**
We extract characteristics (tone, composition, hierarchy) instead of exact text, prices, or branding.

## Architecture
```text
Reference Image
       ↓
VisionAI (analyzeReferenceStyle)
       ↓
Structured Reference Style Analysis
       ↓
SavedStyle
       ↓
Business Brain + Template + SavedStyle + Product / Offer
       ↓
Template Adaptation
       ↓
Existing Generation Pipeline
```

## Reference vs Template
- **Template**: Defines WHAT structure the creative follows (e.g. Hook -> Offer -> CTA).
- **Reference**: Provides inspiration for HOW the creative feels/looks (e.g. playful, centered composition, high product prominence). A reference image does NOT become a new template.

## Reference vs Style
The reference analysis workflow outputs structured data corresponding directly to the `SavedStyle` schema introduced in Phase 14.
We do not have a separate `ReferenceStyleProfile`. Instead, the system converges on `SavedStyle`. Both manual style creation and reference-derived style extraction use the same canonical schema.

## Extracted Style Fields
The `SavedStyle` model in Phase 14 has been extended with the following optional fields to support reference analysis:
- `composition`: centered, hero-focused, split-layout, editorial, grid, asymmetric, negative-space-heavy, left-aligned, right-aligned.
- `visualHierarchy`: order of prominence for elements (product, headline, cta, brand, supporting-copy).
- `ctaPlacement`: bottom, top, end-card, integrated, product-adjacent.
- `hookStructure`: question, bold-statement, visual-surprise, product-first, problem-first, offer-first, curiosity.
- `shotPacing`: slow, moderate, fast, dynamic, cinematic.
- `source`: Used to track origin (e.g. `'reference_analysis'`).

## Content Isolation
Reference content (exact headline, slogan, phone number, address, price, business name) is **strictly ignored**. Extracted properties are abstract creative characteristics only.
- **Brand Preservation:** BrandKit remains authoritative. Reference colors map to abstract `colorMode` (e.g. `vibrant`, `monochrome`) rather than overwriting brand hex codes.
- **Template Preservation:** Extracted style influences expression in the AI planner without removing required template grammar roles.
- **Truth Preservation:** User's `Offer` and `Product` remain authoritative. 

## VisionAI Integration
Integrated into `functions/src/services/ai/vision.ts` via `GeminiVisionProvider.analyzeReferenceStyle`.
We use a structured prompt that forces the Gemini model to output strict JSON mapping to `ReferenceStyleAnalysisSchema`. Unknown values are safely omitted.
- **No free-form prompts:** Output must strictly adhere to the Zod schema before becoming a SavedStyle.

## Upload / Storage / Security
Images are uploaded to standard tenant-isolated paths (e.g. `businesses/{businessId}/referenceImages/`).
The Firebase function `analyzeReferenceStyle`:
- Validates the user's business access.
- Validates that the requested storage path is within the business's scope (no cross-tenant access).
- Verifies image existence and signs a short-lived URL strictly for backend AI processing.
- Avoids logging private image URLs or Business data.

## Context Selector & Template Adaptation
- `creativeContextSelector.ts` passes the extended `SavedStyle` seamlessly.
- `templateAdaptation.ts` consumes the abstract parameters (tone, composition, etc.) dynamically during plan generation.

## POST & REEL Integration
Reference styles produce a standard `SavedStyle`, meaning they are natively compatible with `CampaignWizard` (POST) and `ReelWizard` (REEL) via the existing `SavedStylePicker` UI and backend routing logic.

## Known Limitations
- Current extraction is designed for static images. Video references (Reels) can be uploaded as static frame thumbnails, but full temporal analysis (true `shotPacing` extraction from video clips) is not yet implemented.
- Automatic extraction is purely manual (user-initiated). No automatic scraping of competitors or social media links is supported.
