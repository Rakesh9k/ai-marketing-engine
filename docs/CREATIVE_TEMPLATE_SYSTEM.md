# Creative Template System

## 1. Overview
The Creative Template System is the architectural foundation that separates business knowledge from creative execution in Mitra.

A **template** is a reusable creative grammar that determines the structure and intent of a creative without containing business-specific content, generated media, or provider-specific prompts.

**The core distinction:**
- **Business Brain** = WHAT IS TRUE ABOUT THE BUSINESS (Factual constraints, Brand, Localization)
- **Template** = WHAT CREATIVE STRUCTURE TO USE (Grammar, Hook, CTA layout)
- **Saved Style** = HOW THE CREATIVE SHOULD FEEL / LOOK (Tone, Aesthetics, Reference extraction)
- **Product / Offer** = WHAT IS BEING MARKETED (The specific campaign subject)
- **Context Selector** = WHAT INFORMATION THE AI ACTUALLY NEEDS (Minimizing context windows)
- **Template Adaptation** = HOW THE TEMPLATE BECOMES A REQUEST-SPECIFIC CREATIVE PLAN
- **Generation Pipeline** = HOW THE CREATIVE IS ACTUALLY PRODUCED (Posts, Reels)
- **Truth Check** = FINAL FACTUAL / SAFETY AUTHORITY (Verification against the Business Brain)

## 2. System Architecture
The pipeline operates in a unidirectional data flow:

`mermaid
flowchart TD
    BB[Business Brain]
    T[Creative Template]
    S[Saved Style]
    C[Context Selector]
    A[Template Adaptation]
    G[Existing Generation Pipeline]
    V[Template Validation]
    TC[Truth Check]
    F[User Feedback]
    P[Preference Memory]
    AN[Analytics]

    BB --> C
    T --> C
    S --> C
    C --> A
    A --> G
    G --> V
    V --> TC
    TC --> F
    F --> P
    G --> AN
    F --> AN
`

## 3. Template vs Business Brain
**Business Brain ≠ Template.**

The Business Brain owns factual business knowledge. The Template owns creative structure.
A Template MUST NOT contain business names, phone numbers, product prices, customer identities, or private data unless it explicitly defines an abstract semantic role (e.g., "Role: ContactNumber").

## 4. Template vs Style
**Template = WHAT, Style = HOW.**

- **Template:** Describes semantic structure (e.g., Problem -> Solution -> Benefit -> CTA).
- **Style:** Describes the execution (e.g., Playful, minimalist, brand colors, moderate humor).

These systems remain independent. A business can run the *same* template in *different* styles.

## 5. Template Schema
Implemented in src/types/index.ts (CreativeTemplate):

- id (string)
- 
ame (string)
- 	ype ('post' | 'reel')
- description (string)
- objectives (CreativeObjective[])
- compatibleVerticals (string[] | 'all')
- structure (CreativeStructure)
- isualGrammar (VisualGrammar)
- daptationRules (AdaptationRule[])
- constraints (TemplateConstraints)
- ersion (number)
- ctive (boolean)

## 6. Template Types
Templates are strictly typed by format:
- **POST:** PostStructure
- **REEL:** ReelStructure

## 7. Creative Objectives
Supported objectives (CreativeObjective):
- wareness
- engagement
- conversion
- launch
- promotion
- etention

Objectives define the *goal* of the creative, driving the Context Selector and Template Adaptation. They do not force a recommendation.

## 8. Creative Grammar
Semantic grammar dictates the flow of the creative without writing the copy.
For example, a hook, followed by context, product features, and a CTA. The grammar ensures the AI understands the *purpose* of each segment.

## 9. Visual Grammar
Describes intent without dictating exact pixels or provider prompts.
Fields include compositionIntent, productProminence, and 	extDensity.
The system avoids embedding FFmpeg coordinates or Gemini prompts in templates.

## 10. Adaptation Rules
Adaptation transforms a reusable grammar into a request-specific plan without mutating the original template.
Output: AdaptedCreativePlan (e.g., hook, messaging, isuals).

## 11. Template Registry
Implemented in unctions/src/functions/templates/listCreativeTemplates.ts and src/features/campaign/constants.ts.
The authoritative source for immutable, versioned built-in templates.
**Registry ≠ Recommendation Engine.** The registry provides definitions; context dictates relevance.

## 12. Built-in Templates
Current templates include:
- post-product-hero: Focuses entirely on the product/brand presence (POST).
- post-offer: Drives direct conversions with a prominent deal/offer (POST).
- post-local-comedy: Highly localized humor to drive engagement (POST).
- eel-product-hero: Video equivalent of product showcase (REEL).
- eel-local-comedy: Short-form video engagement (REEL).

## 13. Template Versioning
Each template includes a ersion property. This ensures that previously generated creatives reference the exact schema version that built them, preserving historical lineage when templates evolve.

## 14. Context Architecture
**Context Selector** (unctions/src/services/ai/creativeContextSelector.ts) restricts context payload sizes.
The AI receives only what it needs. If a template doesn't require a Business Location, it is excluded to prevent AI hallucination.

## 15. Saved Styles
Implemented via SavedStyle schema.
Controls the aesthetic execution.
Users can save styles to reuse across campaigns. **Style ≠ Template.**

## 16. Reference Style Analysis
Users can upload an image for Inspiration.
- VisionAI extracts the visual intent (colors, density, hierarchy) into a ReferenceStyleProfile.
- This is converted into a SavedStyle and injected into the Context.
- The AI **must not copy** text, brands, or private content from the reference.

## 17. POST & REEL Generation
The Template System integrates with the **existing** Generation Pipeline (unctions/src/services/ai/pipeline.ts).
It does not create a new architecture.
- **POST**: Template Adaptation -> Pipeline -> Images -> Truth Check.
- **REEL**: Template Adaptation -> Script -> FFmpeg Renderer -> Truth Check.

## 18. Template Validation & Truth Check
- **Template Validation:** Verifies structural requirements (e.g., "Does this have a CTA?").
- **Truth Check:** The final factual authority. Template structure NEVER overrides Truth Check factual verification.

## 19. User Feedback
Users can approve or reject creatives (CreativeFeedback), providing structured reasons (e.g., "More premium").
Feedback attaches to the creative, not the template.

## 20. Preference Memory & Recommendation
- **Preference Memory:** Consolidates feedback into CreativePreference tracking patterns over time.
- **Recommendation:** Recommends templates based on preferences, but the user always retains control. Recommendation != Selection.

## 21. Performance Intelligence (Future)
Currently not implemented. When real-world analytics (clicks, conversions) are available, this will map outcomes to templates.

## 22. Analytics
Phase 21 implemented structured event logging in nalytics_events:
- creative_template_viewed
- creative_template_selected
- creative_generated
- \creative_approved\
- \creative_rejected\
- \creative_regenerated\
- \creative_style_saved\

## 23. Security
Tenant isolation is enforced via Firestore rules and Server-Authoritative checks. A business cannot read/write another business's templates, preferences, or styles.
