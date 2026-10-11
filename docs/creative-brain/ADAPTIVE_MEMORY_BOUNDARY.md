# Adaptive Memory Boundary Specification (Phase 1L)

**Document Status**: Authoritative Specification  
**Project**: Mitra by BrainWise — Creative Brain Project (Phase 1L)  
**Location**: `docs/creative-brain/ADAPTIVE_MEMORY_BOUNDARY.md`  

---

## 1. Scope & Non-Goal Statement

**Phase 1 Non-Goal**: Phase 1 defines the boundaries, input structures, and learning constraints for future adaptation. **No machine learning models or active learning scripts are implemented during Phase 1.**

---

## 2. Ingestible Memory Sources

Future adaptive phases (Phase 3+) will ingest memory signals from five existing system sources:

1. **User Preferences (`CreativePreference`)**: Explicit user choices (e.g. marked preferred/avoided templates).
2. **Explicit Creative Feedback (`CreativeFeedback`)**: User feedback ratings (`positive`/`negative`) and reason codes (`more_premium`, `less_text`, `more_product_focused`).
3. **Selected / Rejected Concepts**: Historical records of concepts chosen as winners vs. discarded candidates.
4. **Real-World Campaign Performance (`CampaignPerformance`)**: Aggregated metrics including WhatsApp link clicks (`whatsappClicks`), inquiry counts, and Meta ad account engagement.
5. **Repeated User Behaviors & Patterns**: Historical choices regarding visual density, tone selections, and saved style usage.

---

## 3. Boundary Rules: What Creative Brain May Learn vs. Must NEVER Learn

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         WHAT CREATIVE BRAIN MAY LEARN                    │
│                                                                          │
│  ✓ "This business prefers minimal text density on posters"              │
│  ✓ "Emotional hooks outperform discount hooks for this salon"           │
│  ✓ "User repeatedly rejects dark comedy campaign styles"                 │
│  ✓ "High-contrast hero product layouts achieve 25% higher CTR"          │
│  ✓ "Hyderabadi regional phrasing resonates strongly with this audience" │
└──────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ (STRICT BOUNDARY)
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     WHAT CREATIVE BRAIN MUST NEVER LEARN AS FACT         │
│                                                                          │
│  ✗ NEVER learn business facts (e.g., "Paneer Biryani is ₹399")          │
│  ✗ NEVER learn contact details (e.g., "WhatsApp is +91-9876543210")      │
│  ✗ NEVER learn operating hours or delivery radius                       │
│  ✗ NEVER learn product catalog availability                              │
│  ✗ NEVER learn salon service prices or property square footage          │
└──────────────────────────────────────────────────────────────────────────┘
```

### The Immutable Truth Rule
All factual data regarding business identity, products, pricing, location, contact, and operating rules MUST come exclusively from **authoritative Level 0 sources** (`BusinessBrain.knowledge.facts`). Adaptive memory is strictly restricted to learning **creative preferences, messaging affinity, and performance heuristics**.

---

## 4. Impact Scope of Adaptive Learning

Future adaptive updates will dynamically influence six specific execution parameters:

| Execution Parameter | Modifiable by Learning? | Adaptation Mechanism |
| :--- | :---: | :--- |
| **Concept Ranking** | **YES** | Adjusts `Score_{\text{history}}` weight during candidate concept evaluation. |
| **Template Preference** | **YES** | Boosts selection score of templates with high positive evidence. |
| **Visual Direction** | **YES** | Recommends `visualEmphasis` (e.g. `product-led`) based on past CTR. |
| **Hook Preference** | **YES** | Prioritizes narrative hook structures (`question` vs. `offer-first`). |
| **Tone Preference** | **YES** | Fine-tunes brand tone intensity (e.g. `premium` vs. `casual`). |
| **CTA Preference** | **YES** | Selects preferred allowed CTA variant from `VerticalConfig.allowedCTAs`. |
| **Product Price / Fact** | **STRICTLY NO** | **IMMUTABLE**. Must come directly from Business Brain catalog. |
| **Tenant Access / Rules**| **STRICTLY NO** | **IMMUTABLE**. Enforced by security middleware. |
