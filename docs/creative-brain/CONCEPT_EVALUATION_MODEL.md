# Concept Evaluation and Scoring Model (Phase 1F)

**Document Status**: Authoritative Specification  
**Project**: Mitra by BrainWise — Creative Brain Project (Phase 1F)  
**Location**: `docs/creative-brain/CONCEPT_EVALUATION_MODEL.md`  

---

## 1. Controlled Concept Flow

Creative Brain enforces a candidate-generation and evaluation pipeline rather than blindly generating and executing a single unverified idea.

```
Campaign Intent + Business Brain Context
                │
                ▼
      [Creative Opportunity]
                │
                ▼
     [Candidate Concepts (N = 3)]
                │
                ▼
   [Concept Evaluation & Scoring]  <--- (5 Scoring Dimensions + Hard Factual Gate)
                │
                ▼
   [Concept Selection (Winner)]    <--- (Highest Score >= 70 Pts + Diversity Filter)
                │
                ▼
       [Creative Blueprint]
```

---

## 2. Candidate Generation Parameters

* **Default Candidate Count ($N$)**: **3 Candidate Concepts** per campaign run.
* **Allowed Range**: Minimum **2**, Maximum **5**.
* **Configurability**: Configurable via `CreativeBrainInput` settings, with 3 as the system default. Generating 3 concepts balances creative variety against LLM token budget and execution latency (< 3.5 seconds for reasoning).
* **Diversity Requirement**: The $N$ generated candidate concepts MUST be structurally distinct:
  * At least **2 different narrative angles** (e.g., Direct Offer vs. Emotional Benefit vs. Social Proof).
  * At least **2 different visual emphasis types** (`product-led` vs. `offer-led` vs. `editorial`).

---

## 3. Necessary Scoring Dimensions & Weights

The scoring model avoids complex machine-learning dependencies in favor of a **structured, deterministic decision model** that incorporates historical performance signals. Total score is normalized to **100 Points**.

| Dimension | Max Points | Evaluation Type | Description & Criteria |
| :--- | :--- | :--- | :--- |
| **1. Factual Safety & Truth Alignment** | **25 Pts** | **100% Deterministic** | Checks strict factual alignment with `BusinessBrain.knowledge.facts` (exact prices, phone numbers, WhatsApp, location, delivery radius, min order). **HARD GATE**: Any discrepancy instantly sets dimension to 0 Pts and forces Total Score to 0 Pts. |
| **2. Brand & Tone Fit** | **20 Pts** | **Hybrid (Rules + AI)**| Alignment with `BrandKit` tone (`professional`, `friendly`, `premium`, etc.), visual colors, and active `SavedStyle` constraints. |
| **3. Audience & Local Relevance** | **20 Pts** | **Hybrid (Rules + AI)**| Resonance with target audience profile, locality preferences, and regional style (`hyderabadi`, `mumbai`, etc.). |
| **4. Offer & Objective Alignment** | **15 Pts** | **Deterministic Rules** | Directness of alignment with the requested `CampaignObjective` (`weekend_offer`, `new_dish`) and `OfferType`. |
| **5. Historical Performance Signal** | **10 Pts** | **Deterministic Heuristic**| Bonus/penalty derived from `CreativePreference` (`preferred` template = +5, `avoided` = -10) and `CampaignPerformance` historical CTR. |
| **6. Execution Feasibility** | **10 Pts** | **Deterministic Rules** | Compatibility with selected `CreativeTemplate` constraints, text density limits, and compositor asset capabilities. |

---

## 4. Quantitative Scoring Formula

$$\text{TotalScore} = \text{Score}_{\text{truth}} + \text{Score}_{\text{brand}} + \text{Score}_{\text{audience}} + \text{Score}_{\text{offer}} + \text{Score}_{\text{history}} + \text{Score}_{\text{feasibility}}$$

### Hard Factual Gating Rule
$$\text{If } \text{Score}_{\text{truth}} < 25 \implies \text{TotalScore} = 0 \quad (\text{Status: REJECTED\_TRUTH\_VIOLATION})$$

---

## 5. Viability Threshold & Winner Selection

1. **Minimum Viability Threshold**: A candidate concept is viable if $\text{TotalScore} \ge 70 \text{ Pts}$.
2. **Winner Selection**:
   * The candidate concept achieving the highest $\text{TotalScore} \ge 70$ is selected as the **Winning Concept**.
3. **Tie-Breaking Rules**:
   If two or more concepts achieve the exact same highest score:
   * **Rule 1 (Historical Preference)**: Select the concept whose template has a higher `CreativePreference` positive evidence count.
   * **Rule 2 (Factual Directness)**: Select the concept with the higher `Score_{\text{offer}}`.
   * **Rule 3 (Deterministic Fallback)**: Select the concept generated first in array order.

---

## 6. Explicit Rejection Reason Codes

Candidate concepts that fail evaluation are tagged with a specific rejection reason code logged in the trace:

* `REJECTED_TRUTH_VIOLATION`: Concept contained an unverified price, claim, or location mismatch ($S_{\text{truth}} < 25$).
* `REJECTED_BRAND_MISALIGNMENT`: Concept violated `BrandKit` tone boundary or `SavedStyle` prohibited elements.
* `REJECTED_TEMPLATE_INCOMPATIBLE`: Grammar steps or text density exceeded selected template constraints.
* `REJECTED_LOW_VIABILITY_SCORE`: Concept total score fell below minimum threshold ($\text{TotalScore} < 70$).
* `REJECTED_DUPLICATE_CONCEPT`: Concept duplicate of another higher-scoring concept.
