# Phase 29 — Creative Brain Evaluation Suite

## Objective

The Creative Brain Evaluation Suite is Mitra's primary quality gate. It benchmarks Creative Brain's ability to reason, question, differentiate, respect truth, surface strategic tension, and select relevant creative mechanisms across diverse businesses and campaign scenarios.

---

## 1. Canonical Test Businesses

1. **Hyderabad Biryani Restaurant** (`hyderabad_biryani`)
   - Traditional family dining & dum preparation heritage.
2. **Premium Specialty Café** (`premium_cafe`)
   - Design-conscious specialty coffee, aesthetic experience, no discount flyers.
3. **Delivery-First Cloud Kitchen** (`cloud_kitchen`)
   - Fast, late-night combo delivery, budget value under 30 minutes.
4. **Premium Women's Salon** (`premium_womens_salon`)
   - High-ticket balayage color corrections & bridal styling customization.
5. **Budget Unisex Salon** (`budget_unisex_salon`)
   - Express 20-min haircuts, student deals, wallet-friendly walk-ins.
6. **Mid-Range Hyderabad Apartment Project** (`midrange_apartments`)
   - 2BHK/3BHK family homes, school district proximity, strict RERA truth constraints.

---

## 2. Evaluation Dimensions & Quality Gates

- **Questioning & Questionnaire Similarity**: Verifies tailored questioning per business (Jaccard similarity < 0.50 across businesses).
- **Strategic Tension**: Verifies Phase 26 tension detection (e.g. Premium Café + Discount Request).
- **Truth Discipline**: Verifies zero unsupported claim adoption or constraint violations.
- **Creative Bank Relevance**: Verifies Phase 28 mechanism composition (1 primary + 0–2 non-overlapping secondary mechanisms).
- **Concept Differentiation**: Verifies Phase 14 strategic concept fingerprints.

---

## 3. Running Automated Evaluations

```bash
npm test -- --testPathPattern=evaluationSuite
```
