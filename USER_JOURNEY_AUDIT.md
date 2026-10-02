# MITRA BY BRAINWISE — USER JOURNEY AUDIT

## Executive Summary
This document provides end-to-end UX flow audits for the 9 primary user journeys in **Mitra by BrainWise**. Each journey traces user entry, intent, system state, mascot state integration, motion feedback, friction points, and optimization recommendations.

---

## 1. Onboarding Journey

```
Landing Page CTA → Sign Up → Mascot Welcome → Business Profile Setup → Industry Selection → Brand Voice → Target Audience → First AI Generation Trigger → Dashboard Arrival
```

| Step | User Intent | UI & System State | Mascot Integration | Motion Feedback | Identified Friction | Recommended Fix |
|---|---|---|---|---|---|---|
| **1. Entry** | Create account after landing page | Auth Signup Modal | `MASCOT_STATES.GREETING` | Fade-in overlay with backdrop blur | Form re-entry if email exists | Clear inline error message with quick "Log In" link |
| **2. Welcome** | Get oriented | Step 1 Card: "Build your AI Marketing Brain" | `MASCOT_STATES.PRESENTING` | Smooth card slide from right | Text heavy explanation | Use 3-bullet animated benefit list with instant checkmarks |
| **3. Business Profile** | Input business name & location | Form fields active | `MASCOT_STATES.IDEA` | Input field focus ring pulse | Manual typing of location | Add Google Places auto-complete for fast local business lookup |
| **4. Industry Selection** | Select business category | Visual Industry Tiles (Restaurant, Salon, Real Estate, Retail) | `MASCOT_STATES.POINTING` | Card scale-up 1.05x on hover with border glow | Too many options | Limit top 4 visible cards with "Other" expandable search |
| **5. Brand Voice & Audience** | Define tone & target demographic | Radio pills + sliders | `MASCOT_STATES.THINKING` | Active pill slides smoothly into selected state | Abstract terminology | Provide sample output preview snippet when clicking a tone |
| **6. Finish** | Launch application | "Generating your AI Brain..." | `MASCOT_STATES.CELEBRATE` | Full-screen confetti particle burst + count-up progress | Slow loading pause | Show real-time checklist (Configuring voice -> Loading templates -> Ready!) |

---

## 2. First Content Generation Journey

```
Dashboard Arrival → Click "Create First Post" → Pre-filled Prompt → Multi-stage AI Loading → Creative Studio Output → Download / Schedule
```

| Step | User Intent | UI & System State | Mascot Integration | Motion Feedback | Identified Friction | Recommended Fix |
|---|---|---|---|---|---|---|
| **1. Trigger** | Generate initial marketing piece | Dashboard CTA banner | `MASCOT_STATES.CELEBRATE` | CTA pulsing orange glow ring | User hesitates on what prompt to type | Auto-suggest top converting prompt based on selected onboarding industry |
| **2. Input** | Review/edit suggested prompt | Post Studio textarea | `MASCOT_STATES.THINKING` | Glowing input border, character counter pop | Empty canvas intimidating | Pre-populate prompt: "Weekend Special offer for local customers" |
| **3. Generation** | Wait for AI output | `AIGenerationTimeline` progress (0% -> 100%) | `MASCOT_STATES.THINKING` pose with ambient float | 4-stage animated progress bar with glowing checkmarks | Perceived wait time during AI generation | Display dynamic marketing tips in mascot speech bubble while generating |
| **4. Result** | Review generated post & image | 3D Flip Card preview | `MASCOT_STATES.SUCCESS` | Card pops into view with spring bounce | User wants minor text tweak | One-click "Regenerate Copy" or direct inline text editing |

---

## 3. Post Creation Journey

```
Navigation / Shortcut (⌘K) → Post Studio → Format Selector (Feed, Story, Ad) → Prompt & Media Upload → AI Synthesizer → Multi-variant Output → Export / Publish
```

| Step | User Intent | UI & System State | Mascot Integration | Motion Feedback | Identified Friction | Recommended Fix |
|---|---|---|---|---|---|---|
| **1. Navigation** | Jump directly to post generator | Command Palette (`⌘K`) or Sidebar | `MASCOT_STATES.IDLE` | Instant command surface expand | Discoverability of `⌘K` | Pulse `⌘K` hint badge on hover over sidebar item |
| **2. Format Selection** | Pick Instagram Post vs Story vs Facebook | Segmented pill slider | `MASCOT_STATES.POINTING` | Sliding pill indicator with spring physics | Unclear aspect ratio differences | Display visual frame previews (1:1, 9:16, 4:5) alongside pill labels |
| **3. Asset Attachment** | Add business photo or use AI stock | Drag-and-drop dropzone | `MASCOT_STATES.QUESTIONING` | Dropzone border turns green on dragover | File size errors | Auto-compress uploaded images client-side before sending to server |
| **4. Completion** | Save or export final post | Modal / Drawer confirmation | `MASCOT_STATES.CELEBRATE` | Confetti burst + direct download link | Unclear where post is saved | Auto-redirect to `/history` with newly created asset highlighted |

---

## 4. Reel Creation Journey

```
Creative Studio → Reel Studio → Script Prompt / Topic → AI Storyboard & Script Generation → Audio & Caption Selector → Video Render → Export / Share
```

| Step | User Intent | UI & System State | Mascot Integration | Motion Feedback | Identified Friction | Recommended Fix |
|---|---|---|---|---|---|---|
| **1. Entry** | Create short video reel | `/create/reel` page mount | `MASCOT_STATES.REEL_MAKER` / `CREATIVE` | Staggered header entrance animation | Video creation feels complex | Show 3-step timeline: Script -> Captions -> Render |
| **2. Script Gen** | Generate viral reel hook & script | Script Editor with AI rewrite options | `MASCOT_STATES.THINKING` | Line-by-line typewriter effect as script streams | Hard to judge video pacing | Display estimated reel duration counter (e.g., "15 sec reel") |
| **3. Render** | Render final video reel | Video player preview with audio wave | `MASCOT_STATES.WORKING` | Pulsing render meter + audio spectrum bars | Render time longer than static image | Provide "Notify me when ready" background processing option |

---

## 5. Marketing Library & History Journey

```
Sidebar → History Page → Grid View → Filter by Channel / Date → Click Asset → Inspection Drawer → Copy Caption / Re-use Prompt
```

| Step | User Intent | UI & System State | Mascot Integration | Motion Feedback | Identified Friction | Recommended Fix |
|---|---|---|---|---|---|---|
| **1. Access** | Find previously generated posts | `/history` page route | `MASCOT_STATES.IDLE` | Masonry grid entrance with stagger | Grid loading jump | Enforce strict aspect-ratio placeholder containers (zero CLS) |
| **2. Filter** | Locate specific Instagram post | Channel filter pills (All, IG, FB, WA) | `MASCOT_STATES.POINTING` | Active pill background slides smoothly | No search bar | Add instant fuzzy text search for captions and prompts |
| **3. Inspect** | Inspect details & copy text | Slide-over inspection drawer | `MASCOT_STATES.SUCCESS` | Drawer slides in from right with backdrop blur | Copy button feedback unclear | Morph "Copy Caption" button to green checkmark on click |

---

## 6. AI Recommendations & Growth Journey

```
Dashboard → Performance Cards → AI Suggestion Banner → Click Suggestion → Auto-filled Studio Prompt → Create Campaign
```

| Step | User Intent | UI & System State | Mascot Integration | Motion Feedback | Identified Friction | Recommended Fix |
|---|---|---|---|---|---|---|
| **1. Discovery** | See what to post today | Dashboard suggestion card | `MASCOT_STATES.IDEA` | Ambient orange glow around recommendation card | Suggestions feel generic | Personalize suggestions using local festival & weekend event calendar data |
| **2. Action** | Accept AI recommendation | Click "Generate This Campaign" | `MASCOT_STATES.CELEBRATE` | Card morphs into loading state and redirects to `/create` | Disconnect between click and creation studio | Pre-fill prompt automatically and launch generation stream instantly |

---

## 7. Assistant & Chat Journey

```
Floating Mascot Widget / Sidebar → Assistant Drawer → Type Query → Streaming AI Answer → Action Card (e.g., "Open Post Studio")
```

| Step | User Intent | UI & System State | Mascot Integration | Motion Feedback | Identified Friction | Recommended Fix |
|---|---|---|---|---|---|---|
| **1. Open** | Ask Mitra a marketing question | Floating Mascot Widget click | `MASCOT_STATES.LISTENING` | Widget expands into floating chat drawer with spring transition | Obstructs page content | Allow drawer minimize and drag-positioning |
| **2. Prompting** | Send message | Chat input box | `MASCOT_STATES.THINKING` | Pulsing indicator dot in chat bubble | Slow initial response | Stream AI response tokens in real-time with continuous scroll lock |
| **3. Action** | Follow advice | Inline Action Card | `MASCOT_STATES.POINTING` | Card hover elevation + arrow icon shift | Manual navigation required | Add 1-click execution buttons inside chat response (e.g., "Create this post now") |

---

## 8. Subscription & Upgrading Journey

```
Credits Low Banner → Click "Upgrade Plan" → Pricing Tier Grid → Toggle Monthly/Annual → Click Select Plan → Checkout → Celebration & Upgraded Limits
```

| Step | User Intent | UI & System State | Mascot Integration | Motion Feedback | Identified Friction | Recommended Fix |
|---|---|---|---|---|---|---|
| **1. Trigger** | Upgrade account for unlimited AI | Pricing page `/pricing` | `MASCOT_STATES.PRESENTING` | Plan cards stagger scale-up on enter | Unclear plan comparison | Highlight "Most Popular" plan with bright orange border and dynamic savings pill |
| **2. Selection** | Choose Pro vs Agency plan | Billing toggle (Monthly vs Annual) | `MASCOT_STATES.CELEBRATE` | Price numbers ease-count to discounted annual value | Checkout redirection delay | Embed inline payment modal (Stripe/Razorpay overlay) without leaving page |

---

## 9. Credit Top-up Journey

```
Low Credit Alert Badge → Click "Add Credits" → Quick Top-up Modal → Select Credit Pack (50, 100, 500) → Instant Payment → Counter Increment
```

| Step | User Intent | UI & System State | Mascot Integration | Motion Feedback | Identified Friction | Recommended Fix |
|---|---|---|---|---|---|---|
| **1. Trigger** | Replenish depleted credits | Header credit pill click | `MASCOT_STATES.QUESTIONING` | Pulse animation on credit counter pill | Interrupted workflow | Open lightweight top-up modal over current studio page without navigation |
| **2. Complete** | Resume creation | Success modal | `MASCOT_STATES.CELEBRATE` | Animated counter counts up to new balance, confetti burst | Unsure if draft was saved | Auto-resume interrupted generation after successful top-up |
