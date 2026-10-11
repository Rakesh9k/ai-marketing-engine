# Creative Brain Project — Phase 4 Dynamic Question Engine Architecture & Specification

**Document Status**: Authoritative Phase 4 Architecture Document  
**Project**: Mitra by BrainWise — Creative Brain Project (Phase 4)  
**Location**: `docs/creative-brain/PHASE_4_DYNAMIC_QUESTION_ENGINE.md`  
**Implementation Directory**: `functions/src/services/ai/creativeBrain/questions/`  

---

## 1. Executive Summary

Phase 4 introduces the **Dynamic Question Engine** to Mitra Creative Brain. The purpose of this engine is **NOT** to make Mitra ask more questions—its purpose is to make Mitra ask **fewer, better questions only when the answer can materially improve the strategic creative decision**.

---

## 2. Core Operating Principle

> **"Mitra should never ask a question because a workflow says it is time to ask one. It should ask only when the answer can materially improve the creative decision."**

The system explicitly distinguishes:
* `MISSING INFORMATION` (a variable is unpopulated)
* `USEFUL INFORMATION` (a variable could add context)
* `INFORMATION WORTH ASKING THE USER FOR` (the decision impact minus user effort exceeds threshold)

---

## 3. Decision & Question Hierarchy

The engine processes uncertainty using a strict evaluation hierarchy:

```
                      CURRENT CONTEXT
                            ↓
                 Is information missing?
                            ↓
                 Does it affect a decision?
                            ↓
                      Uncertainty
                            ↓
                   Creative relevance
                            ↓
                   Information Value
                            ↓
                      User effort
                            ↓
              ┌─────────────┴─────────────┐
              ▼                           ▼
          NOT WORTH ASKING            WORTH ASKING
              │                           │
        (SKIP / INFER)              Question Priority
                                          │
                                    Best Question
                                          │
                                   Best Input Type
```

---

## 4. Architectural Position

The Question Engine operates as an integrated evaluation service callable from the `AdaptiveCreativeBrainStateMachine` and `QuestionResolver`:

```
Business Brain
      ↓
Product Understanding
      ↓
Industry Creative Knowledge Model (ICKM)
      ↓
Adaptive Creative Brain State Machine
      ↓
Dynamic Question Engine  ───► (PROCEED / ASK / INFER / SKIP)
      ↓
Creative Opportunity
      ↓
Concept Generation ($N=3$)
      ↓
Concept Evaluation & Selection
      ↓
Creative Blueprint
      ↓
Existing Execution Engine
```

---

## 5. Module Structure

```
functions/src/services/ai/creativeBrain/questions/
├── creativeQuestion.types.ts            # Strongly typed interfaces & contracts
├── creativeQuestion.schema.ts           # Zod schemas for runtime validation
├── creativeQuestion.registry.ts         # Generic reusable question templates
├── creativeQuestion.candidateBuilder.ts # Candidate question builder
├── creativeQuestion.knowledgeResolver.ts # Fact normalization & conflict detector
├── creativeQuestion.scorer.ts           # Information Value formula & thresholds
├── creativeQuestion.selector.ts         # One Question Policy, budget, fatigue, & input types
├── creativeQuestion.answerEvaluator.ts  # Answer quality & specificity scorer
├── creativeQuestion.engine.ts           # Main DynamicQuestionEngine orchestrator
├── creativeQuestion.trace.ts            # Diagnostic trace generator
└── index.ts                             # Module exports
```

---

## 6. Authority Hierarchy & Information Normalization

Knowledge is normalized into a unified `KnownCreativeFact` map using a strict authority order:

```
BUSINESS_BRAIN       (100 - Authoritative Business Facts)
      ↓
CURRENT_CAMPAIGN     (95  - Authoritative Campaign Scope)
      ↓
PREVIOUS_ANSWER      (85  - Supporting User Answers)
      ↓
CREATIVE_PREFERENCE  (70  - Supporting Historical Preferences)
      ↓
AI_INFERENCE         (60  - Inferred Facts)
      ↓
CREATIVE_HYPOTHESIS  (40  - Working Hypotheses)
      ↓
INDUSTRY_KNOWLEDGE   (30  - Domain Advisory Guidance)
```

---

## 7. Information Value Formula & Thresholds

Information Value is calculated deterministically using the Phase 2.5 / Phase 3A model:

$$\text{InformationValue} = \max\left(0, \operatorname{round}\left(\frac{\text{DecisionImpact} \times \text{Uncertainty} \times \text{CreativeRelevance}}{10000} - 0.2 \times \text{UserEffort}\right)\right)$$

### Action Threshold Policy
* **$\text{IV} \le 25$**: `SKIP` (do not ask, do not infer).
* **$26 \le \text{IV} \le 50$**: `INFER` (if safe and uncertainty $\le 60$), otherwise `SKIP`.
* **$51 \le \text{IV} \le 70$**: `ASK` (if decision impact is meaningful).
* **$\text{IV} > 70$**: `HIGH PRIORITY ASK` (top-priority question).

---

## 8. UX Safeguards & Input Types

### 8.1 One Question Policy
The engine returns at most **0 or 1 question per decision cycle**. It never presents multi-question forms.

### 8.2 Session Question Budget
Configurable ceiling per session (`MAX_DYNAMIC_QUESTIONS_PER_SESSION = 3`).

### 8.3 Fatigue Protection
If a user skips questions or provides low-usefulness answers (`fatigueCount >= 2`), the engine raises the minimum required IV threshold to **75**, favoring `INFER` or `SKIP`.

### 8.4 Input Type Selection
* Bounded options ($\le 6$) $\rightarrow$ `single_select`
* Unbounded options $\rightarrow$ `multi_select`
* Product/service entity $\rightarrow$ `product_selector` / `service_selector`
* Offer entity $\rightarrow$ `offer_selector`
* High-confidence single inference $\rightarrow$ `confirmation`
* Open phrasing $\rightarrow$ `short_text` (`long_text` restricted to complex business stories)

---

## 9. Core Intelligence Metric

The primary success metric for Phase 4 is:

$$\text{Decision-Changing Question Rate (DCQR)} = \frac{\text{Questions asked whose answer materially changed downstream strategy}}{\text{Total questions asked}}$$

Target: **$\text{DCQR} \ge 80\%$**.

---

## 10. Zero Industry Branches Invariant

```
Industry-specific branches in Dynamic Question Engine: 0
Industry-specific branches in QuestionResolver: 0
Industry-specific branches in Adaptive State Machine: 0
LLM calls required for question selection: 0
```
