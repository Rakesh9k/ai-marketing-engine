# MITRA BY BRAINWISE — DYNAMIC EXPERIENCE MAP

## Executive Summary
This document provides a systematic mapping of static UI regions across the **Mitra by BrainWise** platform, outlining proposed motion behaviors, interaction triggers, state variations, and user value proposition for each enhancement.

---

## 1. Landing Page (`/`)

| Page / Section | Static Area | Proposed Interaction | Trigger | Target State | Motion & Microinteraction | User Value |
|---|---|---|---|---|---|---|
| **Hero Section** | Headline & Subtitle | Staggered reveal with ambient glow pulse | Page load | Initial entrance | Words stagger up in 0.4s with smooth cubic-bezier easing (`motion.duration.normal`) | Grabs attention instantly and establishes premium brand craft |
| **Hero Section** | Static Hero Mascot Graphic | 3D depth floating with interactive tilt & cursor tracking | Hover / Pointer move | `MASCOT_STATES.CELEBRATE` | Gentle Y-axis wave float (`3s` infinite loop), 3D tilt tracking cursor offset up to ±15deg | Makes Mitra feel alive and responsive as an intelligent marketing partner |
| **Hero Section** | Primary CTA ("Start Free Trial") | Magnetic suction & shimmer shine | Hover / Mouse proximity | Active CTA hover | Button pulls 8px toward cursor with dynamic gradient shimmer sweeping across surface | Increases CTA click-through rate (CTR) via high affordance micro-feedback |
| **Feature Grid** | Feature Cards | Interactive 3D tilt card with localized orange border glow | Card Hover | Focused feature | Card tilts 5deg on relative mouse position, border changes from `slate-800` to `#E84D1A` glow | Encourages feature exploration through tactile physical feedback |
| **Personality Section** | Mascot Preview Tabs | Smooth mascot pose morphing with spring transition | Tab Selection | `MASCOT_STATES.POINTING` / `MASCOT_STATES.IDEA` | Mascot smoothly scales down, cross-fades asset, and bounces into new pose in 0.35s | Demonstrates Mitra's adaptive personality across different marketing workflows |
| **Final CTA Banner** | Static CTA Box | Ambient gradient mesh motion with floating badges | Scroll into viewport | Active conversion state | Background mesh rotates slowly (20s duration), floating metric cards drift in opposite parallax directions | Prevents visual fatigue at footer and creates strong closing conversion momentum |

---

## 2. Dashboard (`/dashboard`)

| Page / Section | Static Area | Proposed Interaction | Trigger | Target State | Motion & Microinteraction | User Value |
|---|---|---|---|---|---|---|
| **Header** | Command Bar (`⌘K`) | Pulse ring on key hint, smooth overlay expand | `⌘K` keyboard shortcut or click | Modal open | Backdrop blur fades in 0.2s, search input expands downward with spring physics | Accelerates power-user navigation across all studio tools |
| **Mascot Header** | Static Welcome Banner | Living mascot state reflecting business health score | Page Load / Data fetch | `MASCOT_STATES.CELEBRATE` or `THINKING` | Mascot shifts pose depending on weekly marketing score (Score >80% = Celebrate, <50% = Encouraging) | Provides instant emotional signal on marketing progress without reading raw text |
| **Activity Feed** | Static List Items | Staggered list cascade with hover highlight | Dashboard mount | Feed loaded | Items slide in with 50ms stagger index delay, hover elevates card by 2px with shadow expansion | Gives clear visual sequence to recent marketing actions and generated content |
| **Quick Actions** | Static Action Tiles | Magnetic hover lift with icon rotation | Tile Hover | Interactive state | Tile lifts -4px, primary icon rotates 12deg with spring recovery | Makes workflow initiation (Post, Reel, Story) tactile and engaging |
| **Analytics Cards** | Static Numbers | Eased count-up counter animation | Scroll into view | Metrics displayed | Numbers animate smoothly from 0 to target value over 1.2s using `easeOutCubic` | Emphasizes growth metrics and progress milestones dynamically |

---

## 3. Business Profile (`/business-profile`)

| Page / Section | Static Area | Proposed Interaction | Trigger | Target State | Motion & Microinteraction | User Value |
|---|---|---|---|---|---|---|
| **Profile Completeness** | Plain Percentage Text | Radial SVG progress ring with particle spark | Page load / Form input | Percentage updated | SVG circle stroke dash-array animates smoothly to target %, glow flashes orange on completion | Gamifies business setup, driving higher profile completion rate for better AI context |
| **Business Brain Graph** | Static Form Fields | Dynamic interactive node graph showing interconnected business context | Field edit / Tab view | Active knowledge connections | Nodes for "Target Audience", "Brand Tone", and "Competitors" pulse when data is populated | Visually demonstrates how Mitra synthesizes business data into marketing intelligence |
| **Brand Color Selection** | Color Hex Swatches | Dynamic live preview theme refresh | Swatch click | Brand palette active | Color preview ring scales up with pop animation and updates UI accent swatches in real-time | Provides immediate feedback on custom brand identity application |
| **Save Profile CTA** | Save Button | Success checkmark morphing & celebrate mascot reaction | Click Save | Saving -> Saved | Button transitions to green checkmark, mascot switches to `MASCOT_STATES.SUCCESS` pose | Reassures user that critical marketing context is saved securely |

---

## 4. Creative Studio & Content Generators (`/create`, `/create/post`, `/create/reel`)

| Page / Section | Static Area | Proposed Interaction | Trigger | Target State | Motion & Microinteraction | User Value |
|---|---|---|---|---|---|---|
| **Prompt Input Box** | Standard Textarea | Glowing brand outline & character count pop | Focus / Typing | Active generation prompt | Textarea border glows with `#E84D1A` ring, character count pops when approaching limit | Focuses user attention on prompt crafting with tactile input state |
| **Template Selector** | Grid of Cards | Smooth layout animation & badge float | Category tab select | Filtered templates | Cards re-order using Framer Motion `layoutId`, selected card receives active orange ring | Enables seamless browsing of post and reel visual templates |
| **Generation Loading State**| Spinner overlay | Multi-stage AI creation timeline with living mascot state changes | Click "Generate" | Generating content | Mascot switches to `MASCOT_STATES.THINKING`, 4-step progress bar animates smoothly (Analyzing -> Copywriting -> Designing -> Rendering) | Reduces perceived wait time during 5-15s AI generation calls |
| **Output Preview** | Static Generated Image | Dynamic zoom preview, flip-to-edit 3D card | Hover on result | Result ready | Card scales slightly, hover overlay reveals quick actions (Download, Edit, Publish, Regenerate) with staggered icon entrance | Streamlines approval and post-processing steps for generated creatives |

---

## 5. Marketing Library & History (`/history`, `/campaigns`)

| Page / Section | Static Area | Proposed Interaction | Trigger | Target State | Motion & Microinteraction | User Value |
|---|---|---|---|---|---|---|
| **Media Grid** | Thumbnail Grid | Masonry grid with hover zoom and quick preview drawer | Page load / Scroll | Grid view | Images load in with blur-to-clear transition, hover scales image 1.05x inside clipped container | Enhances browsing experience of past marketing assets |
| **Filter Bar** | Static Select Inputs | Pill tab slider with sliding background indicator | Tab click | Active filter active | Active tab background slides smoothly under target pill using `framer-motion` layout animation | Improves filtering usability across Instagram, Facebook, and WhatsApp formats |
| **Empty State** | Static "No Content" Text | Mascot zero-state illustration with quick creation CTA | Zero items found | Empty state | Mascot in `MASCOT_STATES.QUESTIONING` pose floats gently, CTA button pulses subtley | Turns dead-ends into productive creation triggers |

---

## 6. Credits & Pricing (`/credits`, `/pricing`)

| Page / Section | Static Area | Proposed Interaction | Trigger | Target State | Motion & Microinteraction | User Value |
|---|---|---|---|---|---|---|
| **Credit Balance** | Plain Number | Glowing progress bar & low-credit alert mascot | Balance update | Balance state | Credit counter counts up/down smoothly, meter color shifts from green (>50) to orange (<20) to red (<5) | Prevents unexpected generation interruptions with intuitive visual status |
| **Plan Cards** | Pricing Tier Cards | Interactive tier highlight with "Popular" badge floating | Hover tier | Active plan focus | Selected plan scales 1.03x with bright orange drop-shadow border, popular badge floats subtly | Directs user attention to recommended tier for maximum conversion |
| **Purchase Success** | Static Confirmation | Full-screen confetti celebration with mascot victory pose | Successful checkout | Order complete | Mascot transitions to `MASCOT_STATES.CELEBRATE`, credit counter animates to new high total | Delivers high-dopamine reward feedback upon plan upgrade |

---

## Summary of Interaction Design Standards
1. **GPU Acceleration:** All dynamic effects leverage exclusively CSS `transform` and `opacity` to maintain 60fps performance across desktop and mobile browsers.
2. **Reduced Motion Compliance:** Every animated sequence respects `prefers-reduced-motion: reduce` by degrading gracefully to instant transitions.
3. **Zero Cumulative Layout Shift:** All image assets and motion containers preserve strict aspect-ratio bounds to ensure CLS = 0.
