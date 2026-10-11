# Mascot / `public/` asset audit

**Status: read-only audit.** Nothing was deleted, replaced, converted or committed. This is **not** a blocker for D2/D4,
the legal pages, Paddle billing, Firebase billing verification or the production-readiness review, and it is deliberately
**not** part of any billing/legal commit. Measured 2026-10-02 on the working tree (branch
`consolidate/phases-and-paddle-billing`); `HEAD` of `master` = `b129ab7`.

## 1. Totals

| Measure                            | Value                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Files in `public/` now             | **88** (80 PNG · 6 SVG · 1 JPG · 1 JSON)                                                                     |
| Size now                           | **155.9 MB** (PNG = 155.6 MB)                                                                                |
| `public/` already in git at `HEAD` | 21 files, **31.2 MB** (so history already carries large mascot PNGs)                                         |
| Not yet committed                  | **67 untracked files = 127.0 MB** and **14 modified tracked files = 28.6 MB** (7 tracked, unchanged, 0.3 MB) |
| Held back from the 4 local commits | everything under `public/` (≈ 160 MB of change)                                                              |

Consequence of not committing: **a clean checkout/deploy from git lacks the mascot images that the app uses**
(`src/components/mascot/mascotStates.ts` maps ~36 poses to `/brand/mascot/<pose>.png`). Fix before any production
deploy from git — but via the approach in §6, not by committing 160 MB as-is.

## 2. Exact duplicates — 28 groups, **92.9 MB wasted**

Byte-identical files stored under several names. Almost all are `mascot-<pose>.png` copies of `<pose>.png` (the name the
app actually uses), plus aliases of one image under several pose names:

| Identical copies (same bytes)                                                                                                                                                                                                                                                                   | Size each  | Copies |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ |
| `remembering` = `thinking` = `thinking-chin` (+ their `mascot-*` twins)                                                                                                                                                                                                                         | 2.3 MB     | 6      |
| `hero-presenting` = `phone` (+ `mascot-*`)                                                                                                                                                                                                                                                      | 2.5 MB     | 4      |
| `analyst` = `analyzing` (+ `mascot-*`)                                                                                                                                                                                                                                                          | 2.5 MB     | 4      |
| `cheer-chair` = `cheer` (+ `mascot-*`)                                                                                                                                                                                                                                                          | 2.4 MB     | 4      |
| `curious` = `idea` (+ `mascot-*`)                                                                                                                                                                                                                                                               | 1.9 MB     | 4      |
| `explain` = `helper` (+ `mascot-*`)                                                                                                                                                                                                                                                             | 1.8 MB     | 4      |
| `concerned` = `sad` (+ `mascot-*`)                                                                                                                                                                                                                                                              | 1.5 MB     | 4      |
| 21 further pairs: `success`, `designer`, `directing`, `creating`, `discovering`, `point`, `publishing`, `waving`, `sleeping`, `laptop`, `product`, `love`, `problem-solver`, `proud`, `thumbs-up`, `surprised`, `newspaper`, `confused`, `idle`, `rocket`, `hands_in_pockets`/`waving_standing` | 0.5–2.9 MB | 2 each |

Note: several **different poses share identical pixels** (e.g. `thinking`, `remembering`, `thinking-chin`; `idea` and `curious`).
That is a content question for the design owner (are those poses supposed to look different?), not just a storage one.

## 3. No static reference in code — 49 files, **79.8 MB**

A search of `src/`, `tests/` and `next.config.ts` for each file's web path and basename found **no reference** for:

- **35 `mascot-<pose>.png` files** (every one is a byte-identical copy of the un-prefixed file the app does use).
- **5 underscore-named files**: `cheer_chair.png`, `thinking_chin.png`, `point_excited.png`, `hands_in_pockets.png`,
  `waving_standing.png` (the hyphenated `cheer-chair.png` / `thinking-chin.png` are the ones the app uses).
- **9 other files**: `brand/mascot/ipad.png` (0.9 MB), `brand/about/about_hero_reference.jpg` (0.3 MB — the name suggests a
  design reference, not a shipped asset), `brand/mascot/metadata.json`, `brand/mitra-m.svg`, and the five stock Next.js
  starter SVGs (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`).

No dynamic path construction (`` `/brand/…${x}` ``) was found, so "no static reference" is reliable, but **confirm with the
design owner before deleting** — external sites, emails, social posts or Figma exports may link to these URLs.

## 4. Oversized — 76 files over 500 KB (**154.8 MB**)

- Typical source: **~800–1200 px wide × ~1300–1500 px tall**, 1.5–3 MB each.
- The largest size the app ever renders is **340 px tall** (`MASCOT_SIZE_MAP.hero`; one call site uses 280, others 40–256).
  Even at 2× retina that is **≤ 680 px** — the sources are ~4× larger than any use.

## 5. How the images are served today

- The mascot component uses `next/image` (29 files import it), so the **browser download is already optimised at request time**
  (resized + WebP/AVIF). What is oversized is the **source**: repo/clone size, CI, builds, and Vercel's image-optimisation
  source-size handling and usage quotas.
- No `<img>` tag references a `/brand/` mascot path (the 37 plain `<img>` tags in the app point elsewhere).
- 14 tracked mascot PNGs were **modified** (some larger, some smaller than at `HEAD`: e.g. `thinking.png` 0.9→2.3 MB, `idle.png`
  3.1→1.7 MB) — i.e. the artwork was re-exported at different quality without a size budget.

## 6. Recommended approach (each step needs your approval; none has been done)

Measured on the **39 referenced** PNGs (76.1 MB of originals), converted in a temp folder only:

| Option                                                    | Result                                | Code change                                                | Notes                                                                                                                                                                  |
| --------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Downscale to ≤ 640 px tall + palette-quantised PNG** | **4.3 MB** (−94 %)                    | **none** (same filenames)                                  | Zero risk to references. Palette quantisation can band soft gradients/shadows — needs a visual check.                                                                  |
| **B. WebP q82, ≤ 640 px tall**                            | **3.2 MB** (−96 %)                    | update `mascotStates.ts` (+ any other refs) `.png`→`.webp` | Best size; transparency preserved; ~97 % at 480 px.                                                                                                                    |
| **C. Keep originals in Git LFS**                          | repo stays small, originals preserved | `.gitattributes` + LFS on host                             | LFS is installed (v3.7.1). Vercel and GitHub both support it, but it adds quota/cost and a clone dependency. Keep only if the 2–3 MB originals must live in this repo. |
| D. Commit as-is                                           | +~160 MB permanent in history         | none                                                       | **Not recommended** — irreversible.                                                                                                                                    |

**Suggested sequence**

1. **Decide what is canonical.** Commit only the **39 referenced** files (never the 35 `mascot-*` duplicates or the 5 underscore
   files unless the design owner says they are needed). Even before optimising, that cuts the commit from ~160 MB to ~76 MB.
2. **Keep the full-resolution originals outside git** (design source / cloud storage / LFS), and commit **optimised web copies**
   (Option A or B), sized to the largest real render (≤ 680 px).
3. **Visual QA**: compare each converted pose against the original at its real display sizes (40–340 px, light/dark, with the
   `drop-shadow` and animation used on the landing page) before replacing anything.
4. **Resolve the identical-pixels question** (§2) — if `thinking`/`remembering`/`thinking-chin` are meant to differ, the art is missing.
5. Add a **size budget** (e.g. fail CI if a file in `public/` exceeds ~300 KB) and a one-line note in the repo so this does not recur.
6. If any file has already been pushed to a remote, removing it from history would require a history rewrite — avoid by
   not committing the oversized files in the first place.

## 7. What was NOT done

No asset was deleted, overwritten, renamed, converted or committed; no code reference was changed; the conversion figures above were
produced in a temporary directory and discarded. `public/` remains exactly as found in the working tree.

## 9. Final classification and optimisation (production preparation, 2026-10-02)

Supersedes the "not committed / ≈160 MB" position above for the **runtime** set only. Nothing was committed or pushed.

**Runtime set (committed):** the 35 unique files referenced by `src/components/mascot/mascotStates.ts` (36 poses; two poses share one file),
plus `brand/mitra-logo-long.png` (346 KB), `brand/mitra-logo-wordmark.png` (13 KB, both used by `MitraLogo.tsx`) and `og-image.png`
(121 KB, 1200×630, referenced by `layout.tsx` metadata). An earlier "39 referenced" figure wrongly counted `mascot-idle.png`
(a CSS keyframe name, not a file reference).

**Method (no artwork change):** 8-bit RGBA PNGs re-encoded with `sharp`, `palette: false` (lossless), maximum deflate + adaptive filtering;
RGB data hidden under fully transparent pixels cleared (invisible); and any file taller than **1020 px** downscaled (Lanczos) to 1020 px tall,
aspect ratio preserved. Rationale: the largest height the app ever renders a mascot at is 340 CSS px (`hero`), so 1020 px is 3× that.
`mascotStates.ts` width/height values were updated to the new exact dimensions. A 256-colour palette variant was tried and **rejected**
(alpha error up to 105/255 on soft edges) — not used. Visible pixels and alpha were verified identical for the lossless step.

**Result:** 35 runtime mascot PNGs **75.3 MB → 34.5 MB**. Full-resolution originals (all 80 files under `public/brand` + OG/logos) are
backed up **outside the repo** at `D:\brainwise AI marketing Agent\mascot-originals-backup-2026-10-02\`.

**Kept OUT of git (43 files, ≈ 78 MB, untouched):** 34 `mascot-<pose>.png` copies (incl. `mascot-idle.png`), the underscore variants
(`cheer_chair`, `hands_in_pockets`, `ipad`, `point_excited`, `thinking_chin`, `waving_standing`), `about/about_hero_reference.jpg`
and `mascot/metadata.json`. Byte-identical poses (`thinking` = `remembering` = `thinking-chin`, `idea` = `curious`, …) remain a design
question, not an ops one; they are still referenced under separate names so none were merged.
