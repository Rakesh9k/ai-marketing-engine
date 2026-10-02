# MITRA BY BRAINWISE — COMPLETE PAGE-BY-PAGE PRODUCT AUDIT (PAGE_AUDIT.md)

> **Document Version:** 1.0  
> **Target System:** Mitra AI Marketing Partner Application  
> **Audit Focus:** Purpose clarity, functional completeness, copy precision, UX hierarchy, state feedback, AI integration, responsive behavior, and performance risks.

---

## 1. LANDING & MARKETING PAGES

### PAGE: Homepage
* **ROUTE:** `/`
* **PRIMARY PURPOSE:** Communicate Mitra's value proposition ("One photo. A month of marketing.") and convert local business owners into free trial signups within 5 seconds.
* **PRIMARY USER:** Local business owner (Restaurant, Salon, Real Estate agent).
* **PRIMARY USER INTENT:** Determine if Mitra can solve their local social media marketing headache without hiring an agency.
* **PRIMARY CTA:** `Get Started Free` / `Start Free Trial` (`/signup`)
* **SECONDARY CTA:** `Explore Live Demo` / `Watch 1-Min Walkthrough`
* **KEY USER ACTIONS:** Scroll through feature breakdown, toggle vertical showcases (Restaurant, Salon, Real Estate), preview interactive social post/reel generation, inspect pricing.
* **DATA DISPLAYED:** Simulated campaign outputs, live metric counters (10,000+ campaigns generated), client testimonials, vertical templates.
* **DATA SOURCES:** Static config, mock campaign samples, Firebase real-time metric listeners where active.
* **CURRENT FEATURES:** Hero section with 3D mascot anchor, orbiting campaign cards, live impact counters, vertical tabs, device mockup.
* **MISSING FEATURES:** Direct interactive creation sandbox in hero ("Type your business name & see instant sample").
* **BROKEN/UNNECESSARY FEATURES:** None broken.
* **COPY/TEXT ISSUES:** Some hero copy uses SaaS terminology ("AI campaign engine") rather than local business language ("Create your weekend Biryani special in 1 click").
* **UX ISSUES:** Hero headline does not immediately explain what happens after clicking signup.
* **STATIC AREAS:** Testimonials and static feature cards lack hover elevation feedback.
* **INTERACTIVE AREAS:** Hero CTA (magnetic pull), vertical switcher, mascot hover tilt.
* **MITRA / MASCOT OPPORTUNITY:** Mascot pose `creating` / `curious` in hero with ambient glow, providing contextual commentary in vertical switcher.
* **RECOMMENDED MICROINTERACTIONS:** Magnetic pull on primary signup button, 3D card tilt on vertical cards, counter count-up.
* **MOBILE BEHAVIOR:** Reduce 3D parallax, convert hover previews to tap triggers.
* **ACCESSIBILITY:** Respect `prefers-reduced-motion`, visible focus rings on navigation links.
* **PERFORMANCE RISKS:** Unoptimized image assets below fold; lazy-load images.
* **PRIORITY:** P0 (Primary conversion gateway).

---

### PAGE: Solutions — Restaurants & Cloud Kitchens
* **ROUTE:** `/solutions/restaurants`
* **PRIMARY PURPOSE:** Demonstrate food-specific campaign generation (Biryani specials, festival thalis, weekend discounts).
* **PRIMARY USER:** Restaurant owner, cloud kitchen manager, cafe operator.
* **PRIMARY USER INTENT:** See real examples of food photography posts, WhatsApp offer broadcasts, and Instagram Reels.
* **PRIMARY CTA:** `Generate Food Campaign` (`/signup?vertical=restaurant`)
* **KEY USER ACTIONS:** Filter food post templates, inspect Telugu/Hindi/English sample captions, view video reel previews.
* **COPY ISSUES:** Generic food marketing advice instead of specific dishes (Biryani, Mandi, Sweets).
* **MITRA OPPORTUNITY:** Mascot pose `product` holding smartphone with food delivery card.
* **PRIORITY:** P1.

---

### PAGE: Solutions — Salons & Beauty
* **ROUTE:** `/solutions/salons`
* **PRIMARY PURPOSE:** Show beauty transformation posts, festival makeover offers, and appointment booking campaigns.
* **PRIMARY USER:** Salon owner, spa manager, bridal makeup artist.
* **PRIMARY CTA:** `Create Salon Campaign` (`/signup?vertical=salon`)
* **COPY ISSUES:** Lacks specific local festival hooks (Diwali makeover, wedding season specials).
* **MITRA OPPORTUNITY:** Mascot pose `designer` showcasing beauty transformation cards.
* **PRIORITY:** P1.

---

### PAGE: Solutions — Real Estate
* **ROUTE:** `/solutions/real-estate`
* **PRIMARY PURPOSE:** Demonstrate luxury property showcase cards, open house announcements, and lead-gen posts.
* **PRIMARY USER:** Real estate agent, property developer, builder.
* **PRIMARY CTA:** `Create Property Post` (`/signup?vertical=real-estate`)
* **MITRA OPPORTUNITY:** Mascot pose `directing` pointing to lead capture preview.
* **PRIORITY:** P1.

---

## 2. ONBOARDING & AUTHENTICATION

### PAGE: Authentication (Login / Signup)
* **ROUTE:** `/login`, `/signup`, `/forgot-password`, `/reset-password`
* **PRIMARY PURPOSE:** Authenticate user safely while reinforcing brand trust.
* **PRIMARY USER:** Returning or prospective customer.
* **PRIMARY CTA:** `Log In` / `Create Account`
* **DATA SOURCES:** Firebase Auth (Email/Password, Google OAuth).
* **BACKEND FUNCTIONS:** `firebase.auth().signInWithEmailAndPassword`, `signInWithPopup`.
* **CURRENT FEATURES:** View-mode specific mascot states (`waving`, `thumbs-up`, `confused`, `laptop`, `success`), social login buttons, feature badges.
* **COPY ISSUES:** Error messages like `auth/user-not-found` were raw; now translated into human copy ("We couldn't find an account with that email.").
* **MITRA OPPORTUNITY:** Mascot provides state-aware reassurance.
* **PRIORITY:** P0.

---

### PAGE: Onboarding Wizard (Steps 1 – 8)
* **ROUTE:** `/onboarding`
* **PRIMARY PURPOSE:** Gather business profile parameters (Type, Location, Contact, Marketing Goals, Brand Style) in a conversational sequence.
* **PRIMARY USER:** First-time user immediately after signup.
* **PRIMARY CTA:** `Continue` / `Initialize Workspace`
* **BACKEND FUNCTIONS:** `businessService.create()`, Cloud Function `createBusinessProfile`.
* **CURRENT FEATURES:** 8-step wizard with mascot pose evolution (`waving` → `point` → `curious` → `helper` → `remembering` → `designer` → `analyzing` → `success`).
* **MISSING FEATURES:** Real-time preview of the generated Business Brain node as each step is filled.
* **COPY ISSUES:** Step 5 used technical terms ("Signal preferences") instead of business words ("What kind of posts do you like?").
* **RECOMMENDED MICROINTERACTIONS:** Progress bar filling animation, badge collection pop-in.
* **PRIORITY:** P0.

---

## 3. CORE PRODUCT WORKFLOWS

### PAGE: Dashboard Command Center
* **ROUTE:** `/dashboard`
* **PRIMARY PURPOSE:** Answer "What should I do next?" and provide one-click access to weekly campaign generation.
* **PRIMARY USER:** Active customer logging in for daily/weekly marketing.
* **PRIMARY CTA:** `＋ Create with Mitra` (`/campaigns/new`)
* **SECONDARY CTA:** `Explore AI Suggestions`
* **DATA DISPLAYED:** Workspace business selector, recent campaigns list, credits balance, AI suggestions, activity stream.
* **DATA SOURCES:** Firestore `businesses`, `campaigns`, `usage`, `subscriptions`.
* **MISSING FEATURES:** Directly triggering a campaign creation pre-filled with the AI recommendation upon clicking "Use this suggestion".
* **MITRA OPPORTUNITY:** Mascot pose `waving` / `discovering` with ambient glow and `MascotWidget` floating trigger.
* **PRIORITY:** P0.

---

### PAGE: Campaign Creation Wizard
* **ROUTE:** `/campaigns/new`
* **PRIMARY PURPOSE:** Guide user from marketing objective to multi-asset campaign package (Post + Caption + Hashtags + Reel storyboard).
* **PRIMARY USER:** Business owner starting a new campaign.
* **PRIMARY CTA:** `Generate Full Campaign Package`
* **AI FUNCTIONS:** Gemini API prompt execution (`generateCampaignContent`).
* **CURRENT FEATURES:** Multi-step wizard, objective selection, audience target, offer input, regional tone selector.
* **LIVE MOMENT:** `AIGenerationTimeline` multi-stage visual reveal during content generation.
* **MITRA OPPORTUNITY:** Mascot transition from `curious` → `creating` → `success`.
* **PRIORITY:** P0.

---

### PAGE: Campaign Detail View
* **ROUTE:** `/campaigns/[campaignId]`
* **PRIMARY PURPOSE:** Display generated campaign assets, copy variants, hashtags, and social publishing options.
* **PRIMARY USER:** Customer reviewing generated outputs.
* **PRIMARY CTA:** `Publish to Social` / `Download Assets`
* **SECONDARY CTA:** `Regenerate Hook` / `Edit Caption`
* **LIVE MOMENT:** Layered asset reveal (background → image → headline → offer → CTA).
* **MITRA OPPORTUNITY:** Mascot pose `proud` / `thumbs-up`.
* **PRIORITY:** P0.

---

### PAGE: Creative Studio & Post Creator
* **ROUTE:** `/creative`, `/creative/image`, `/creative/poster`
* **PRIMARY PURPOSE:** Single-asset post creator allowing image upload, background styling, and localized caption creation.
* **PRIMARY USER:** Customer needing a single social post for today.
* **PRIMARY CTA:** `Generate Visual Post`
* **MITRA OPPORTUNITY:** Mascot pose `designer` providing layout advice.
* **PRIORITY:** P0.

---

### PAGE: Reel Creator Studio
* **ROUTE:** `/creative/reel`, `/reels/new`
* **PRIMARY PURPOSE:** Build short video reel storyboards with 3–5 scene directions, text overlays, and audio suggestions.
* **PRIMARY USER:** Customer wanting Instagram Reel or YouTube Short content.
* **PRIMARY CTA:** `Generate Reel Storyboard`
* **CURRENT FEATURES:** Scene list, timeline indicator, Director Mitra callout.
* **LIVE MOMENT:** Scene preview expansion on timeline hover.
* **MITRA OPPORTUNITY:** Mascot pose `directing` ("Director Mitra" mode).
* **PRIORITY:** P1.

---

### PAGE: Business Brain & Profile
* **ROUTE:** `/business-profile`, `/business`
* **PRIMARY PURPOSE:** Show all parameters Mitra knows about the business (Type, Location, Audience, Voice, Products, Rules).
* **PRIMARY USER:** Customer updating business information.
* **PRIMARY CTA:** `Save Profile Changes`
* **CURRENT FEATURES:** Form sections, Cloud Function updates, inline staleness warnings.
* **LIVE MOMENT:** `BusinessBrainGraph` interactive node map and animated profile completeness percentage bar.
* **MITRA OPPORTUNITY:** Mascot pose `analyzing` / `remembering`.
* **PRIORITY:** P0.

---

### PAGE: Products Catalog
* **ROUTE:** `/products`, `/products/new`, `/products/[id]`
* **PRIMARY PURPOSE:** Upload food items, salon services, or property listings for campaign insertion.
* **PRIMARY USER:** Customer expanding their product catalog.
* **PRIMARY CTA:** `＋ Add Product / Item`
* **MITRA OPPORTUNITY:** Mascot pose `product` showing product thumbnail.
* **PRIORITY:** P1.

---

### PAGE: Assistant & Chat Surface
* **ROUTE:** `/assistant`, `/assistant/[conversationId]`
* **PRIMARY PURPOSE:** Provide persistent conversational marketing strategy, caption tweaking, and recommendations.
* **PRIMARY USER:** Customer seeking marketing advice.
* **PRIMARY CTA:** `Ask Mitra Anything`
* **LIVE MOMENT:** Active thinking particles during Gemini inference.
* **MITRA OPPORTUNITY:** Mascot pose `thinking` / `helper`.
* **PRIORITY:** P1.

---

### PAGE: Analytics & Performance Insights
* **ROUTE:** `/analytics`
* **PRIMARY PURPOSE:** Display aggregated engagement metrics, top-performing posts, and AI growth recommendations.
* **PRIMARY USER:** Customer checking ROI and marketing reach.
* **PRIMARY CTA:** `Create Recommended Campaign`
* **LIVE MOMENT:** Animated metric count-up.
* **MITRA OPPORTUNITY:** Mascot pose `analyzing` / `discovering`.
* **PRIORITY:** P1.

---

### PAGE: Billing & Credits
* **ROUTE:** `/billing`, `/usage`
* **PRIMARY PURPOSE:** Manage subscription plan, view credit balance, and top up credits.
* **PRIMARY USER:** Customer upgrading plan or buying credits.
* **PRIMARY CTA:** `Upgrade Plan` / `Top Up Credits`
* **LIVE MOMENT:** Balance change counter animation.
* **MITRA OPPORTUNITY:** Mascot pose `rocket`.
* **PRIORITY:** P1.

---

### PAGE: Developer Mascot Showcase (Dev Inspection)
* **ROUTE:** `/dev/mascot`
* **PRIMARY PURPOSE:** Internal development and QA route for inspecting all 23 mascot states, asset resolutions, alpha channel transparency, motion presets, and aspect ratios.
* **PRIMARY USER:** Developer / QA Engineer.
* **PRIMARY CTA:** `Toggle Transparency Grid`
* **LIVE MOMENT:** Real-time state switcher and animation preset controls.
* **PRIORITY:** P2.
