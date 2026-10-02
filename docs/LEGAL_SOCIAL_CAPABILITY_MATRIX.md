# Legal Social-Media Capability Matrix

Generated 2026-09-22 as part of the legal/compliance audit, to prevent any public-facing copy from
overstating what Mitra does. Evidence basis: repo-wide search of `src/` and `functions/src/` for
`instagram_business_account`, `media_publish`, `graph.facebook`, `Graph API`, `access_token`,
`OAuth`, `ig-user-id` — 9 hits, all Firebase/Google/Facebook _login_ auth or Sentry PII-scrubbing
regexes, none of them Instagram/Meta content-publishing code. Full evidence trail is in
`docs/PRODUCTION_CONTENT_CAPABILITY_MATRIX.md`; this table restates it for the legal audience.

**A downloadable file is never represented here as direct Instagram publishing.**

| Capability                               |                                                                    Generation |                            Final File |                             Download | Instagram API | Direct Publishing | Status                                                                                                                                                                                                                                                                              |
| ---------------------------------------- | ----------------------------------------------------------------------------: | ------------------------------------: | -----------------------------------: | ------------: | ----------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Post (poster)                            |               Yes — AI hero image (DALL-E 3) + deterministic SVG text overlay |         SVG (not rasterized PNG/JPEG) |                                  Yes |            No |                No | GENERATED, RENDERED, DOWNLOADABLE. Not API-CONNECTED. NOT IMPLEMENTED for publishing.                                                                                                                                                                                               |
| Story                                    |                                                Yes — per-frame SVG compositor |                            SVG frames |                                  Yes |            No |                No | GENERATED, RENDERED, DOWNLOADABLE. Not API-CONNECTED. NOT IMPLEMENTED for publishing.                                                                                                                                                                                               |
| Reel (campaign-pipeline asset)           | Text storyboard only — reuses the same hero image, no per-scene AI generation |                      Not a video file | N/A (nothing renderable to download) |            No |                No | PARTIAL (concept/script only, not a video). NOT IMPLEMENTED for publishing.                                                                                                                                                                                                         |
| Reel (dedicated "Create a Reel" feature) |                           Yes — real FFmpeg pipeline from user-uploaded clips | Real MP4, 1080×1920, 30fps, 15/30/45s |                                  Yes |            No |                No | GENERATED, RENDERED, DOWNLOADABLE **conditional on `REEL_RENDERER_URL` being correctly configured in production** — if unset, silently substitutes a fake placeholder file (see `docs/PRODUCTION_CONTENT_CAPABILITY_MATRIX.md`). Not API-CONNECTED. NOT IMPLEMENTED for publishing. |
| Carousel                                 |                                                                            No |                                    No |                                   No |            No |                No | NOT IMPLEMENTED — does not exist in any form; no `AssetType` enum value, zero code references.                                                                                                                                                                                      |

## Explicit statement for marketing/product copy review

- Mitra **generates and packages** Instagram-sized Post and Story creative, and (via the separate
  Reel feature) a real, downloadable video file.
- Mitra does **not** publish anything to Instagram, Facebook, or any other social platform on the
  customer's behalf. There is no "Connect your Instagram account" flow, no Meta OAuth, and no call
  to Meta's Graph API anywhere in the codebase.
- Any product copy, onboarding text, or pricing-page language that says or implies Mitra "posts to
  Instagram" or "publishes your Reel" should be corrected to say "creates" / "generates" /
  "downloads," unless and until direct publishing is actually built — see
  `docs/LEGAL_FOUNDER_DECISIONS_REQUIRED.md` for the scope question this would raise (out of scope
  for this remediation pass; no publishing code was added).
- WhatsApp is a `wa.me` deep link with AI-authored prefilled text — not the WhatsApp Business API,
  and not an automated message-sending capability. Confirmed unchanged in this pass.
