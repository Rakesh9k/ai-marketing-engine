# MITRA BY BRAINWISE — UX COPY & CONTENT AUDIT

## Executive Summary
This document provides a comprehensive audit of user interface copy, empty states, call-to-action (CTA) labels, error messages, AI generation status text, and mascot contextual dialogue across the **Mitra by BrainWise** platform.

---

## 1. Landing Page (`/`)

| Location / Context | Existing Copy | Audit Identification & Problem | Recommended Polish Copy | Strategic Rationale |
|---|---|---|---|---|
| **Hero Headline** | `AI Marketing for Local Business` | Generic, passive, lacks punch and emotional resonance. | `Your AI Marketing Partner — Work Less, Grow Faster.` | Directly addresses pain point (time) and value proposition (growth). |
| **Hero Subtitle** | `Create posts, reels, and campaigns automatically with AI.` | Purely feature-focused without business benefit framing. | `Generate localized social posts, viral reels, and targeted ad campaigns in seconds. Tailored for your specific business.` | Emphasizes speed, locality, and custom relevance. |
| **Primary CTA** | `Get Started` | Low urgency, generic SaaS button text. | `Start Generating Free →` | Specific action verb with clear benefit ("Free") and directional indicator. |
| **Secondary CTA** | `Watch Demo` | Passive, friction-heavy commitment. | `See Mitra in Action (2 min)` | Sets clear time expectation (2 min) to lower viewing friction. |
| **Value Props** | `Smart AI tools for your marketing needs.` | Vague, boilerplate description. | `Hyper-Local AI Intelligence Trained on Top Performing Marketing Campaigns.` | Highlights specific competitive advantage (local market specialization). |

---

## 2. Onboarding Flow (`/onboarding`)

| Step | Existing Copy | Audit Identification & Problem | Recommended Polish Copy | Strategic Rationale |
|---|---|---|---|---|
| **Step 1: Welcome** | `Welcome to Mitra. Let's set up your profile.` | Dry setup instructions. | `Namaste! I'm Mitra. Let's build your AI Marketing Brain in under 2 minutes.` | Warm cultural identity ("Namaste"), clear identity ("Mitra"), and fast time-to-value. |
| **Step 2: Business Info** | `Enter your business details.` | Robotic transactional label. | `Tell me about your business. What makes you unique?` | Conversational prompt encouraging detail. |
| **Step 3: Industry** | `Select Industry` | Form field label without guidance. | `Which industry best describes your business?` | Clear, helpful prompt with localized options (Restaurant, Salon, Real Estate, Retail). |
| **Step 4: Target Audience** | `Who is your target customer?` | Slightly abstract for local business owners. | `Who are your ideal local customers? (e.g., Families, Students, Professionals)` | Includes concrete examples to guide input. |
| **Step 5: Brand Tone** | `Choose Tone` | Single word header. | `How should your brand speak to customers?` | Explains the impact of tone selection on AI voice output. |
| **Completion Step** | `Setup complete. Go to dashboard.` | Flat technical state message. | `Your AI Marketing Brain is ready! Let me create your first campaign.` | High-energy transition from setup to value realization. |

---

## 3. Dashboard & Assistant (`/dashboard`)

| Location / Context | Existing Copy | Audit Identification & Problem | Recommended Polish Copy | Strategic Rationale |
|---|---|---|---|---|
| **Greeting Banner** | `Welcome back!` | Generic placeholder greeting. | `Good morning, [Business Name]! Ready to launch today's marketing?` | Personalized, actionable start to the business day. |
| **Assistant Input** | `Type your message...` | Standard chat placeholder. | `Ask Mitra anything: "Create a weekend discount post" or "Give me 3 reel ideas"` | Uses prompt suggestions to educate user on capabilities. |
| **Quick Action CTA** | `New Post` | Functional noun phrase. | `Create Post →` | Direct action verb. |
| **Weekly Performance** | `Metrics overview` | Corporate jargon for local business. | `Your Weekly Marketing Impact` | Frames analytics around business impact rather than abstract metrics. |

---

## 4. Content Generators (`/create/post`, `/create/reel`)

| Location / Context | Existing Copy | Audit Identification & Problem | Recommended Polish Copy | Strategic Rationale |
|---|---|---|---|---|
| **Post Studio Header** | `AI Post Generator` | Utility label. | `Craft Local Social Posts That Convert` | Benefit-oriented title setting high output expectations. |
| **Prompt Label** | `What do you want to post about?` | Clear, but could prompt better details. | `What offer, event, or update are we highlighting today?` | Gives concrete categories (offer, event, update) to stimulate user input. |
| **Generating Step 1** | `Loading...` | Bland, static waiting message. | `Analyzing your local market trends...` | Reassures user that AI is performing strategic research. |
| **Generating Step 2** | `Processing...` | Technical backend state message. | `Drafting high-converting localized copy...` | Communicates active copywriting process. |
| **Generating Step 3** | `Designing...` | Minimal. | `Rendering pixel-perfect visual creative...` | Highlights visual quality focus. |
| **Generating Step 4** | `Done` | Abrupt finish. | `Your marketing creative is ready!` | Celebratory output confirmation. |

---

## 5. Empty States & Errors

| Context | Existing Copy | Audit Identification & Problem | Recommended Polish Copy | Strategic Rationale |
|---|---|---|---|---|
| **Empty History** | `No history found.` | Cold error-like message. | `No content created yet. Let's make your first viral post!` | Positive framing with clear CTA button trigger. |
| **Empty Campaigns** | `No campaigns.` | Single noun fragment. | `Your marketing calendar is clear. Launch your first campaign today!` | Encouraging tone with immediate action path. |
| **Generation Failed** | `An error occurred. Try again.` | Unhelpful, opaque error message. | `Mitra ran into a bump while generating. Please try again or simplify your prompt.` | Friendly mascot ownership with actionable retry advice. |
| **Low Credits** | `Out of credits.` | Harsh blocking message. | `You've used all your credits for this cycle. Top up to keep creating!` | Friendly upgrade prompt explaining clear step forward. |

---

## 6. Mascot Speech Bubbles & Contextual Dialogue

| State / Trigger | Existing Dialogue | Recommended Contextual Dialogue | Tone & Character Alignment |
|---|---|---|---|
| **Idle / Welcome** | `Hi!` | `"Ready to grow your business today? Let's create something awesome!"` | Friendly, energetic, supportive. |
| **Thinking** | `Thinking...` | `"Putting my marketing cap on... Synthesizing your brand voice!"` | Intelligent, active, dedicated. |
| **Success** | `Success!` | `"Boom! That creative looks fire. Ready to post?"` | Enthusiastic, encouraging, celebratory. |
| **Error / Help** | `Error` | `"Oops! I got a bit tangled up. Let's give that another shot!"` | Humble, helpful, resilient. |
| **Low Credits** | `Low credits` | `"We're almost out of fuel! Top up your credits to keep generating."` | Proactive, helpful advisor. |
