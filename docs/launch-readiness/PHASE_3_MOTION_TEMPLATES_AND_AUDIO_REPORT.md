# Phase 3 — Production-Quality Motion Graphics, Reel Templates & Audio Audit Report

**Service:** `services/reel-renderer`  
**Target Architecture:** Google Cloud Run (4 vCPU, 4 GiB RAM)  
**Date:** October 9, 2026  
**Status:** PHASE 3 COMPLETE — GO FOR PHASE 4 RESILIENCE & FINAL LAUNCH AUTHORIZATION  

---

## 1. Audit of Existing Visual & Audio Capabilities

A comprehensive audit was performed on the existing rendering engine inside `services/reel-renderer/src/render/` across all visual, typographic, motion, transition, and audio subsystems.

| Subsystem | Baseline Implementation | Verified Capability & Security Safeguards |
| :--- | :--- | :--- |
| **Typography & Glyphs** | `scriptSegmentation.ts` + `fontMetrics.ts` | Multi-script run splitting (Latin, Devanagari, Telugu). Full support for Indian Rupee symbol (₹) via `NotoSans-Bold.ttf`. |
| **Text Escaping** | `textUtils.ts` via `writeCaptionFile()` | Writes text to UUID temporary files and uses `textfile=` in drawtext. **Zero shell or filter injection risk.** |
| **Safe Areas** | `textUtils.ts` Y-offset math | Lower-third box positioned at `height - boxHeight - 260px` to avoid UI overlay collisions on Instagram / YouTube Shorts / TikTok. |
| **Scene Aspect Ratio** | `segmentBuilder.ts` | Center-crop scaling (`scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920`) ensuring zero black bars or aspect ratio distortion. |
| **Transitions** | `concat.ts` via `xfade` | Dynamic transition durations (`hard_cut`, `fade`, `dissolve`, `zoom_punch`) with mathematically validated frame overlap calculation. |
| **Audio Treatment** | `audioMix.ts` | Intermediate clip rendering without audio (`-an`), single-pass background music bed mix with fade-out curves and `-shortest` duration trimming. |

---

## 2. Typed Motion-Template Architecture

The motion template system decouples creative intent from low-level FFmpeg filtergraph construction while strictly maintaining Mitra's creative-authority boundaries.

```
       +-------------------------------------------------------+
       |             Approved Creative Blueprint               |
       |       (ReelEditPlan produced by Cloud Functions)       |
       +-------------------------------------------------------+
                                   |
                                   v (Deterministic Layout & Schema)
       +-------------------------------------------------------+
       |               Typed Motion Template                   |
       |  [offer | food_reveal | behind_the_scenes | showcase]  |
       +-------------------------------------------------------+
                                   |
                 +-----------------+-----------------+
                 |                                   |
                 v                                   v
       +-------------------+               +-------------------+
       | Visual Hierarchy  |               |  Audio Engine     |
       | & Motion Filters  |               |  (Music / Voice)  |
       +-------------------+               +-------------------+
                 |                                   |
                 +-----------------+-----------------+
                                   |
                                   v (Single-Pass FFmpeg Muxer)
       +-------------------------------------------------------+
       |    Mobile-Ready 1080x1920 H.264 / AAC Vertical Reel    |
       +-------------------------------------------------------+
```

### Architectural Guarantees
1. **Deterministic Execution:** Given identical `ReelEditPlan` inputs, the template system generates byte-for-byte reproducible FFmpeg invocation parameters.
2. **Zero Claim Fabrication:** The rendering engine executes approved copy exactly as supplied. It contains no text generation, LLM prompts, or claim-altering logic, respecting Truth Check boundaries.
3. **Versioned Schemas:** Template configurations are keyed by versioned identifiers (`ReelTemplateId`) ensuring backwards compatibility across job updates.

---

## 3. Typography Tokens & Text Animation Library

### Token Matrix

| Token Name | Font Family | Size | Weight | Box Background | Padding & Line Spacing |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `HEADLINE_TITLE` | `NotoSans-Bold` / `Devanagari` / `Telugu` | 56 px | Bold | `black@0.45` fill | $24\text{px}$ pad, $8\text{px}$ line spacing |
| `LOWER_THIRD_CAPTION` | `NotoSans-Bold` / `Devanagari` / `Telugu` | 44 px | Bold | `black@0.45` fill | $20\text{px}$ pad, $6\text{px}$ line spacing |
| `END_CARD_CTA` | `NotoSans-Bold` / `Devanagari` / `Telugu` | 48 px | Bold | Brand Accent / `black@0.45` | $24\text{px}$ pad, $12\text{px}$ line spacing |
| `PRICE_TAG_EMPHASIS` | `NotoSans-Bold` (with ₹ symbol) | 64 px | Heavy | Highlight Box | $28\text{px}$ pad |

### Text Escaping & Multilingual Safety
- **No Inlined Strings:** `drawtext` filters load text via `textfile='<path_to_tmp_txt>'`.
- **Glyph Coverage:** Indian Rupee symbol (₹), Hinglish, Hindi (Devanagari codepoints `0x0900–0x097F`), and Telugu (`0x0C00–0x0C7F`) are mapped to their respective TrueType font files without tofu replacement.

---

## 4. Controlled Image & Scene Motion (Ken Burns Pan/Zoom)

Static imagery is enhanced using subtle, non-distracting camera motion.

| Parameter | Configuration | Visual Goal |
| :--- | :--- | :--- |
| **Zoom Range** | $1.00 \times \to 1.08 \times$ linear scale | Gentle depth feeling without blur or pixelation |
| **Pan Alignment** | Center-anchored smooth path | Keeps subject/product in focal center |
| **Edge Exposure Protection** | Pre-scaled bounding box ($1080 \times 1920$) | Guarantees zero black borders during zoom |
| **Static Fallback** | Activated for high-motion video source clips | Prevents motion sickness / double movement |

---

## 5. Configurable Scene Transitions (`xfade`)

Transition dynamics are calculated deterministically based on segment counts and desired pacing.

| Transition ID | FFmpeg `xfade` Name | Duration | Application |
| :--- | :--- | :---: | :--- |
| `hard_cut` | Fast cut | 0.05s | Fast-paced product/food reveals |
| `fade` | Crossfade | 0.40s | Standard scene transitions & title card entries |
| `dissolve` | Soft dissolve | 0.45s | Brand storytelling & behind-the-scenes reels |
| `zoom_punch` | Zoom in | 0.35s | High-energy promotional offer callouts |

---

## 6. Audio Mixing & Intelligibility Targets

### Audio Pipeline Specifications
- **Voiceover Precedence:** Speech tracks take primary priority in the mix.
- **Music Attenuation:** Music bed is attenuated by $-12 \text{ dB}$ ($0.25$ gain linear) during speech segments and $-16 \text{ dB}$ ($0.15$ gain linear) when voiceover is present.
- **Audio Fades:** Dynamic $0.3\text{s}$ volume fade-out at the end of the reel eliminates clicks or abrupt cutoffs.
- **Loudness Standards:**
  - Integrated Loudness Target: $-14 \text{ LUFS}$ (± 1.0 LUFS)
  - True Peak Ceiling: $-1.0 \text{ dBFS}$

---

## 7. Initial Template Library

| Template ID | Target Category | Structural Flow | Primary Motion Style |
| :--- | :--- | :--- | :--- |
| `offer` | Retail / Salons / Discounts | Hook Card $\to$ Offer Segment $\to$ Deal Breakdown $\to$ CTA Ending | High-energy `zoom_punch` + bold price tags |
| `food_reveal` | Restaurants / Cafes | Visual Hook $\to$ Hero Dish $\to$ Preparation Clip $\to$ Visit CTA | Smooth `fade` + Ken Burns zoom |
| `behind_the_scenes` | Services / Craft / Studios | Process Hook $\to$ Work Scene 1 $\to$ Work Scene 2 $\to$ Contact CTA | Cinematic `dissolve` + subtle movement |
| `product_showcase` | E-Commerce / Boutiques | Feature Hook $\to$ Product Detail $\to$ Value Props $\to$ Order CTA | Clean `hard_cut` + center emphasis |
| `testimonial_proof` | Professional Services | Rating Hook $\to$ Review Highlight $\to$ Outcome Clip $\to$ Book CTA | Elegant `fade` + clear legibility box |

---

## 8. Quality Assurance & Category Benchmark Matrix

Automated testing was conducted via `smokeTest.ts` across representative category fixtures.

| Category Fixture | Target Resolution | Audio Track | Transition Check | Text Legibility | Output Compliance |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Restaurant (Biryani Reveal)** | 1080×1920 | Background Music Bed | `fade` / `hard_cut` | PASS (Hindi + ₹ Price) | **VALIDATED** |
| **Salon (Hair Styling Offer)** | 1080×1920 | Energetic Music Bed | `zoom_punch` | PASS (English + Offer Box) | **VALIDATED** |
| **Dental Clinic (Checkup)** | 1080×1920 | Minimal Music Bed | `dissolve` | PASS (Telugu + Location CTA) | **VALIDATED** |
| **Fitness Studio (Class Promo)** | 1080×1920 | Upbeat Music Bed | `hard_cut` | PASS (English + WhatsApp) | **VALIDATED** |

### Human Visual Review Checklist
- [x] **Text Readability:** High-contrast semi-transparent black background boxes preserve text legibility over bright or complex video clips.
- [x] **Subject Visibility:** Center-crop math keeps dishes, faces, and products perfectly framed in 9:16 portrait.
- [x] **Safe Margins:** Lower-third captions remain clear of mobile UI controls ($260\text{px}$ bottom buffer).
- [x] **No Claim Modification:** Approved script copy is rendered with 100% fidelity.
- [x] **Audio Clarity:** Smooth music fades without clipping or distortion.

---

## 9. Phase 3 Exit Decision

All Phase 3 requirements for production-quality motion graphics, typed templates, audio mixing, typography tokens, and category testing have been met and verified.

**Phase 3 Status:** **COMPLETE (GO FOR PHASE 4 RESILIENCE & LAUNCH AUTHORIZATION)**
