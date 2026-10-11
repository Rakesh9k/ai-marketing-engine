# Dead-Code Audit Report (Knip)

**Date:** October 10, 2026  
**Tooling:** Knip (`knip.json`)

---

## 1. Audit Findings Summary

Knip static analysis identified:
- **Unused Dependencies:** Zero critical production dependencies.
- **Unused Type Exports:** 40 unused type interfaces in domain models (`src/types/index.ts`).
- **Unused Enum Members:** 40 enum members in Creative Brain module (`functions/src/services/ai/creativeBrain/types/assetPlan.ts`).
- **Duplicate Exports:** 3 aliased schema exports.

---

## 2. Recommendation & Safe Cleanup Strategy

1. Domain types in `src/types/index.ts` and `assetPlan.ts` serve as domain data contracts between frontend, backend, and Firestore schemas. They must be preserved to prevent runtime breaking changes when new features access those fields.
2. Integrate `knip` into CI workflow in report-only mode to prevent new unreferenced files from accumulating.
