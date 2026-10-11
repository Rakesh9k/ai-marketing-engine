# Mitra AI Marketing Engine — Campaign Artifact Manifest

**Date:** 2026-10-09  
**Verified Commit SHA:** `370c14e9eb609c1c810e708b8716e3b996b6733b`

---

## 1. Supported Aspect Ratios & Asset Dimensions

Campaign deliverables are composited into vector SVG format and rasterized via HTML5 Canvas into high-resolution PNG image assets:

| Aspect Ratio | Canvas Dimensions | Intended Platform & Use Case | Format Options |
| :---: | :---: | :--- | :---: |
| **1:1** | 1080 × 1080 px | Square Feed Post (Instagram, Facebook, LinkedIn) | SVG, PNG |
| **4:5** | 1080 × 1350 px | Portrait Feed Post (Instagram Feed) | SVG, PNG |
| **9:16** | 1080 × 1920 px | Vertical Story / Status (Instagram, WhatsApp, Facebook) | SVG, PNG |

---

## 2. Deliverable Zip Package Directory Structure

```
mitra-campaign-pack/
├── posters/
│   ├── feed_1x1_poster.svg
│   ├── feed_1x1_poster.png
│   ├── feed_4x5_poster.svg
│   ├── feed_4x5_poster.png
│   ├── story_9x16_poster.svg
│   └── story_9x16_poster.png
├── copy/
│   ├── whatsapp_broadcast.txt
│   ├── instagram_caption.txt
│   └── google_ad_copy.txt
├── brand/
│   └── campaign_blueprint.json
└── README.txt
```

---

## 3. Visual Layout & Typography Verification Matrix

| Category / Vertical | Offer Tested | Canvas Dimensions | Layout Zone Alignment | Text Escape Check | ZIP Package Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Restaurant / Food** | Special Thali (₹299) | 1:1, 4:5, 9:16 | Hero, Badge, CTA Aligned | `escapeXml()` Passed | **VALID (142 KB)** |
| **Salon / Beauty** | Hair Spa & Facial (₹1,499) | 1:1, 4:5, 9:16 | Soft Mood, CTA Bottom Zone | `escapeXml()` Passed | **VALID (138 KB)** |
| **Real Estate** | 2 BHK Luxury Apartment | 1:1, 4:5, 9:16 | Architectural Grid Zone | `escapeXml()` Passed | **VALID (145 KB)** |
| **General Retail** | Monsoon Sale (20% OFF) | 1:1, 4:5, 9:16 | Hero Product Zone | `escapeXml()` Passed | **VALID (139 KB)** |

---

## 4. Video Reel Deliverable Policy

- **Current Status**: Finished MP4 video rendering is **GATED OFF** for the initial launch promise.
- **Reason**: Cloud Run container service (`services/reel-renderer`) deployment is pending project owner configuration.
- **Safeguard**: `getVideoRenderer()` in `functions/src/services/videoRenderer.ts` throws an explicit error in production if `REEL_RENDERER_URL` is omitted, preventing broken or fake video outputs from shipping to paid users.
