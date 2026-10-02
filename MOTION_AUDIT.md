# MITRA BY BRAINWISE — MASTER MOTION AUDIT & INTERACTION ARCHITECTURE

> **Audit Timestamp:** October 2026  
> **Status:** Completed Phase 1 Audit  
> **Scope:** Full application UI/UX, Framer Motion tokens, GSAP integration, interactive cursor physics, dynamic mascot state hooks, page transitions, and AI generation states.

---

## 1. System Inventory

### Motion Libraries & Utilities
* **Primary Animation Engine:** `motion/react` (Framer Motion v12+)
* **Secondary Kinetic/Scroll Engine:** `gsap` (with `ScrollTrigger`, `TextPlugin`, `CustomEase`)
* **Mascot Component Infrastructure:** `<Mascot />` unified component rendering official 3D CGI PNG assets with aspect ratio preservation (CLS = 0), soft ground shadows, and brand orange (`#E84D1A`) ambient glow.
* **Mascot Context:** `MascotProvider` & `useMascot()` for section-level and global state management.

---

## 2. Page & Feature Inventory & Opportunities

| Page / Component | Primary Purpose | Current State | Motion & Interaction Opportunities | Mascot & AI Integration |
| :--- | :--- | :--- | :--- | :--- |
| **Global Layout & Navigation** | App framing & routing | Static sidebar / navbar | Magnetic nav indicators, active pill sliding, morphing icons | Floating contextual mascot quick trigger & status indicator |
| **Landing & Hero** | Value prop & product demonstration | Static hero grid with mascot | Kinetic headline, floating marketing cards orbiting mascot, ambient organic gradient background, simulated workflow step trigger | Mascot state `"creating"` with ambient brand glow |
| **Dashboard** | Daily marketing command center | Command cards & analytics | Count-up metrics, staggered card reveals, interactive recommendation action triggers | Mascot state `"waving"` / `"discovering"` |
| **AI Content & Campaign Generator** | Generating posts, captions & visual ads | Basic loading text | Organic multi-stage generation timeline (Understanding → Drafting Hook → Crafting Visual → Preparing Campaign), layered visual asset assembly reveal | Mascot state `"creating"` / `"laptop"` during generation → `"success"` on finish |
| **Reel Creator Studio** | Short video & reel storyboard builder | Static scenes | Interactive scene timeline with hover expansion, scene scrubbing preview, camera move animations | Mascot state `"directing"` (Director Mitra mode) |
| **Business Brain & Profile** | Brand identity, voice & location parameters | Tabbed forms | Interconnected visual node graph, animated profile completeness meter, visual signal propagation when updating voice/location | Mascot state `"remembering"` / `"analyzing"` |
| **Onboarding Flow (Steps 1–8)** | Multi-step business setup | Step wizard | Guided conversational transitions, slide/fade card sequences, animated badge collecting | Mascot states evolving per step: `waving` → `point` → `curious` → `helper` → `remembering` → `designer` → `analyzing` → `success` |
| **Assistant & Command Bar** | AI conversation & quick actions | Standard chat modal | Spatial expansion from floating mascot anchor, contextual page-aware recommendations, active thinking particles | Mascot state `"thinking"` / `"helper"` |

---

## 3. Motion Architecture & Standards

### Motion Tokens & Physics Presets
```ts
motion.duration.instant  = 100ms
motion.duration.fast     = 180ms
motion.duration.normal   = 300ms
motion.duration.slow     = 500ms
motion.duration.dramatic = 800ms
```

### Spring Easing Curves
* **Spring Standard:** `stiffness: 400, damping: 25` (tactile buttons, tabs, cards)
* **Spring Gentle:** `stiffness: 280, damping: 22` (modals, page reveals)
* **Spring Bouncy:** `stiffness: 450, damping: 18` (success indicators, badges)
* **Ease Standard:** `[0.4, 0, 0.2, 1]`

### Performance & Accessibility Boundaries
* All animations strictly mutate `opacity`, `transform` (`x`, `y`, `scale`, `rotate`), or `clip-path`.
* `prefers-reduced-motion` explicitly disables looping transforms and magnetic tilt while preserving semantic state transitions.

---

## 4. Execution Plan (Phases 2 – 6)

1. **Phase 2 — Motion Foundation & Custom Hooks:** Create `src/lib/motionTokens.ts` and interactive hooks: `useMagnetic`, `useTilt`, `useCountUp`, `useScrollProgress`, `usePageTransition`.
2. **Phase 3 — Global UI Primitives:** Build `MagneticButton`, `InteractiveCard`, `AmbientBackground`, `GlobalPageTransition`, `CommandPalette`, `RevealText`, `AnimatedBadge`, `ShimmerLoader`.
3. **Phase 4 — Connected Mascot & Assistant Layer:** Enhance `<Mascot />` with real backend execution state listener (`useMascot()`), floating global widget, and persistent contextual assistant layer.
4. **Phase 5 — Core Product Workflow Enhancements:** Implement multi-stage AI generation reveal in `CampaignWizard`, `ImageGeneratorStudio`, and `ReelGeneratorStudio`; animate `BusinessBrain` node connections; add count-up statistics in `Dashboard`.
5. **Phase 6 — Landing Scrollytelling & Interactive Demos:** Build live workflow simulator, vertical switcher (Restaurant, Salon, Real Estate), and kinetic typography reveals on landing pages.
6. **Phase 7 & 8 — Performance & Typechecking:** Run `tsc` and `next build` verification to confirm 0 build errors and zero layout shifts.
