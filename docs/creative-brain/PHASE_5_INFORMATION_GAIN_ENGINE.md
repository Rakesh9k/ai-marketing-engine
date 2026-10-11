# Creative Brain Project — Phase 5 Information Gain Engine Architecture & Specification

**Document Status**: Authoritative Phase 5 Architecture Document  
**Project**: Mitra by BrainWise — Creative Brain Project (Phase 5)  
**Location**: `docs/creative-brain/PHASE_5_INFORMATION_GAIN_ENGINE.md`  
**Implementation Directory**: `functions/src/services/ai/creativeBrain/questions/`  

---

## 1. Executive Summary

Phase 5 implements the **Information Gain Engine** for Mitra Creative Brain. Sitting between candidate question scoring (Phase 4 Dynamic Question Engine) and final question selection, the Information Gain Engine provides a deterministic evaluation layer that calculates:

> **"Before Mitra asks a question, determine whether different answers could materially change the downstream creative decision."**

If candidate answer paths do not produce material changes in downstream strategic decisions (e.g. positioning, creative territory, copy direction, visual direction, or CTA), the question receives an **Information Gain score of 0** and recommendation **`SKIP`**.

---

## 2. Core Governing Principles

1. **Zero-Gain Question Rule**:  
   If all counterfactual answer paths yield identical or cosmically equivalent downstream creative decisions, $\text{InformationGain} = 0$. The question MUST NOT be asked.

2. **Zero Industry-Specific Branches (Invariant)**:  
   The Information Gain Engine contains **0 hardcoded industry checks** (`if (vertical === 'restaurant')` / `switch`). All decision evaluations and counterfactual paths operate on generic domain-agnostic decision definitions.

3. **100% Deterministic Execution**:  
   Question selection and Information Gain evaluation require **0 LLM calls**. Counterfactual path simulation and materiality evaluation use rule-based matrix metrics and domain entropy.

4. **Protected System Isolation**:  
   Billing, credit deduction, Firestore security rules, image compositor, video renderer, and persistence schemas remain 100% untouched.

---

## 3. Mathematical & Evaluative Framework

### 3.1 Information Gain Formula

$$\text{InformationGain}(Q) = \text{CurrentUncertainty}(D) - \sum_{a \in A} P(a) \cdot \text{UncertaintyAfterAnswer}(D, a)$$

Where:
* $D$ is the set of affected downstream creative decisions.
* $A$ is the set of plausible counterfactual answer paths.
* $P(a)$ is the prior probability of answer path $a$.

### 3.2 Decision Materiality Metric

$$\text{MaterialDivergence}(D) = \frac{\sum_{d \in D} w_d \cdot \text{Divergence}(d_{\text{path}_1}, d_{\text{path}_2})}{\sum_{d \in D} w_d}$$

Decisions evaluated with strict materiality thresholds:
* **Positioning**: Target audience, USP, emotional hook, value proposition ($w = 0.25$).
* **Creative Territory**: Visual angle, narrative premise ($w = 0.25$).
* **Copy Direction**: Headline tone, primary call to action, key messaging ($w = 0.20$).
* **Visual Direction**: Visual emphasis, color scheme, layout hierarchy ($w = 0.15$).
* **Offer Framing**: Urgency trigger, incentive presentation ($w = 0.15$).

---

## 4. Architectural Integration

```
Business Brain & Campaign Intent
              ↓
  Adaptive State Machine
              ↓
Candidate Question Generation (Phase 4)
              ↓
┌─────────────────────────────────────────┐
│     PHASE 5 INFORMATION GAIN ENGINE    │
│                                         │
│ 1. Decision Materiality Evaluator       │
│ 2. Counterfactual Decision Evaluator    │
│ 3. Information Gain Calculator          │
│ 4. Combined Engine (Phase 4 + Phase 5)  │
└────────────────────┬────────────────────┘
                     │
       ┌─────────────┴─────────────┐
       ▼                           ▼
   Gain > 0                    Gain = 0
       │                           │
  Ask / Recommend               SKIP Question
       │                           │
  User Response           Proceed with Inference
       │                           │
       └─────────────┬─────────────┘
                     ▼
         Concept Generation (N=3)
                     ↓
        Concept Evaluation & Selection
                     ↓
             Creative Blueprint
```

---

## 5. Implementation Files

| File | Purpose |
|------|---------|
| `informationGain.types.ts` | Strongly typed domain contracts (`CreativeDecision`, `DecisionUncertainty`, `AnswerCounterfactualPath`, `InformationGainResult`, `InformationGainTrace`) |
| `informationGain.materiality.ts` | `DecisionMaterialityEvaluator` measuring strategic vs cosmetic decision divergence |
| `informationGain.counterfactual.ts` | `CounterfactualDecisionEvaluator` simulating answer branch outcomes |
| `informationGain.calculator.ts` | `InformationGainCalculator` executing entropy reduction and zero-gain skip enforcement |
| `informationGain.engine.ts` | `InformationGainEngine` combining Phase 4 Information Value (50%) + Phase 5 Information Gain (50%) |
| `creativeQuestion.engine.ts` | Updated orchestrator incorporating Information Gain evaluation |
| `creativeQuestion.selector.ts` | Updated selector filtering zero-gain candidate questions |

---

## 6. Validation & Test Coverage

All 6 test suites (24 tests) for the questions module and all 61 AI test suites (643 unit tests total) pass cleanly:

* `informationGain.materiality.test.ts`: Validates cosmetic vs material divergence thresholds.
* `informationGain.calculator.test.ts`: Validates mathematical calculation and zero-gain filtering.
* `informationGain.behavioral.test.ts`: Validates behavioral scenarios:
  1. Zero-gain question skip rule.
  2. High-gain question selection.
  3. Identical downstream outcome skip.
  4. Contextual gain variation across business states.
  5. Known fact question skip.
  6. Fully specified business auto-proceed.
  7. **0 industry-specific branches invariant** (verified across codebase).

---

## 7. Conclusion

Phase 5 completes the decision-quality layer for Mitra Creative Brain. By enforcing deterministic counterfactual decision evaluation, Mitra eliminates non-essential questions, respects user context, and ensures every asked question directly improves the output Creative Blueprint.
