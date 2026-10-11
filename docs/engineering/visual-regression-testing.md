# Playwright Visual Regression Testing Strategy

**Date:** October 10, 2026  
**Implementation:** Playwright (`tests/e2e/visual-regression.spec.ts`)

---

## 1. Targeted Viewports & Core Surfaces

| Viewport Category | Resolution | Target Pages Covered |
|---|---|---|
| **Desktop** | 1440 × 900 px | Landing (`/`), Pricing (`/pricing`), Login (`/login`), Signup (`/signup`), Features (`/features`) |
| **Mobile** | 390 × 844 px | Landing (`/`), Pricing (`/pricing`), Login (`/login`), Signup (`/signup`), Features (`/features`) |

---

## 2. Snapshot Stability & Flakiness Prevention Rules

- Disable CSS animations & transitions (`* { animation: none !important; transition: none !important; }`).
- Wait for network idle before capturing screenshot.
- Set strict pixel diff ratio allowance (`maxDiffPixelRatio: 0.05`).
