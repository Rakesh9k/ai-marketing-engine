# Reel Renderer

Cloud Run ffmpeg service implementing the `VideoRenderer` HTTP contract
defined in `functions/src/services/videoRenderer.ts` for Mitra's "Create a
Reel" feature. It exposes two endpoints — `POST /analyze-clip` and
`POST /render` — that `CloudRunVideoRenderer` in that file calls with an
OIDC identity token.

This service is entirely separate from `functions/` and `src/`: its own
`package.json`, its own `npm install`, its own Docker image, deployed
independently to Cloud Run.

## Why a separate service

Cloud Functions Gen2 `onCall` callables are unsuited to long/heavy ffmpeg
encoding. This service does the actual trim/crop/concat/text/music/export
work; the Cloud Function (`generateReel.ts`, not part of this directory)
just awaits an authenticated HTTP call to it.

## Endpoints

- `GET /healthz` — liveness/readiness probe, no auth.
- `POST /analyze-clip` — downloads one uploaded clip, probes duration/
  dimensions via ffprobe, extracts a representative thumbnail (~35% into the
  clip, avoiding black start frames), computes deterministic 0-1
  brightness/motion heuristics, uploads the thumbnail back to Storage at
  `storagePath.replace(/\.[^/.]+$/, '_thumb.jpg')` (matches
  `DevMockVideoRenderer`'s convention exactly).
- `POST /render` — downloads all referenced clips + the music track +
  optional logo, builds the edit plan (hook title card → per-segment
  trimmed/cropped/captioned clips → optional offer card → ending card with
  CTA/WhatsApp/location), joins them with transitions, overlays the logo,
  mixes in background music, exports an H.264 1080x1920 MP4, generates a
  thumbnail, and uploads both.

Both endpoints reject malformed input with `{ error: { code, message } }`
and a 4xx status rather than crashing.

## Authentication model

Deploy with `--no-allow-unauthenticated`. Cloud Run's own platform-level IAM
check verifies the caller's OIDC identity token before the request ever
reaches this container — the Express handlers do **not** manually verify
JWTs. `apiKeyMiddleware` (src/middleware/apiKey.ts) additionally checks an
`x-api-key` header, but only as defense-in-depth, and only when
`REEL_RENDERER_API_KEY` is set as an env var on this service.

## ffmpeg binary strategy

Uses `ffmpeg-static` / `ffprobe-static` npm packages (pinned static
binaries) rather than `apt-get install ffmpeg` in the Dockerfile. This keeps
the encoder version deterministic across builds/architectures. Fonts follow
the same principle: TTFs are vendored under `assets/fonts/` and `COPY`ed
into the image rather than `apt-get`-installed, so the exact font bytes are
identical across every build/host (see "Font strategy" below).

### Font strategy (multilingual captions)

Mitra supports English, Hindi (Devanagari), Telugu, Hinglish, and mixed
Hindi/Telugu+English captions. Three vendored fonts cover this:

| Script | Font | Path (in-container) |
|---|---|---|
| Latin (English/Hinglish) | Noto Sans Bold | `assets/fonts/NotoSans-Bold.ttf` |
| Devanagari (Hindi) | Noto Sans Devanagari Bold | `assets/fonts/NotoSansDevanagari-Bold.ttf` |
| Telugu | Noto Sans Telugu Bold | `assets/fonts/NotoSansTelugu-Bold.ttf` |

All three are **SIL Open Font License 1.1** — permissive, royalty-free, and
explicitly permits embedding in commercial software with no attribution
requirement in rendered output (see `assets/fonts/NOTICE.md` and
`assets/fonts/LICENSE-OFL.txt` for exact source/provenance).

**Why not one merged font, or apt-installed `fonts-noto-core`:** verified by
inspecting each font's cmap (via `fontkit`) — `NotoSansDevanagari-Bold.ttf`
and `NotoSansTelugu-Bold.ttf` contain **zero Latin A-Z/a-z glyphs**. Google's
per-script Noto Sans builds are script-only, not multi-script merges.
Combined with ffmpeg's `drawtext` filter loading exactly one font per filter
instance (no per-glyph fallback across fonts), a single caption mixing
scripts cannot be rendered with one font file or one drawtext call.

**How mixed-script captions are actually rendered:**
`src/render/scriptSegmentation.ts` classifies every character by its actual
Unicode codepoint (Devanagari block, Telugu block, or Latin A-Z/a-z;
everything else — spaces, digits, punctuation, ₹, emoji — is script-neutral
and folds into the adjacent run) — **never** by any upstream "language" tag
the AI pipeline attaches to a segment, since that can be wrong or stale.
`src/render/textUtils.ts` then splits each caption line into runs, measures
each run's pixel width with its script's font (`fontMetrics.ts`, via
`fontkit`, using unshaped per-glyph advance widths — see the limitation
below for why this deliberately does not assume HarfBuzz-shaped widths),
and emits one `drawtext` filter per run positioned side-by-side on a shared
baseline, behind a single `drawbox` background sized to the whole
line/block.

**Known limitation — Telugu base+matra glyph collision (confirmed, not
merely theoretical):** the `ffmpeg-static` binary this service uses *is*
built with `--enable-libharfbuzz`/`--enable-libfribidi`, and `drawtext`'s
`text_shaping` option defaults to `true` — so shaping is attempted. Testing
found it works correctly for every **Devanagari** case tried (conjuncts
like "क्या", matras + chandrabindu like "हूँ", full sentences) — properly
formed, no overlap. For **Telugu**, results are inconsistent: some
matra-bearing words render correctly ("బిర్యానీ"/biryani), but others show
genuine glyph collision — e.g. "కావాలా?" and "తెలుగు" render with vowel
signs stacked on top of the following consonant instead of advancing past
it. This was verified as an ffmpeg-side shaping defect, not a font-coverage
or renderer-code issue: reproduced with a raw standalone `drawtext` call
(bypassing all of this service's code) against both the hinted and
unhinted static Noto Sans Telugu Bold builds, and confirmed by shaping the
same string with real HarfBuzz directly (`harfbuzzjs`), which correctly
merges each base+matra pair into one well-advanced glyph (4 glyphs,
941/1140/1143/483 font units) — proving ffmpeg's own HarfBuzz integration
is not applying that substitution for this text, not that the substitution
is unavailable.

**Practical impact:** every caption is still glyph-complete (no tofu, no
missing characters, no crash) — this is a rendering-quality defect (visual
overlap in isolated cases), not a coverage failure, and it did not exist
before either (the previous DejaVu-only setup rendered 100% tofu for all
Hindi/Telugu text, which is strictly worse). But it means Telugu captions
carry a real, data-dependent risk of glyph collision on some words that
this font-selection fix cannot fully close. Fixing it properly requires
replacing `drawtext` itself with a shaping-correct render path (e.g.
rendering captions to a transparent PNG via HarfBuzz+FreeType or a browser/
Skia-based text layout, then compositing with ffmpeg's `overlay` filter) —
a materially larger change than a font/mapping fix, and out of scope here.
Recommendation: flag this to product before shipping Telugu captions
broadly, and re-test with real generated copy (not just this report's
sample strings) to gauge how often affected sequences actually occur.

Override any font path via `DRAWTEXT_FONT_LATIN` / `DRAWTEXT_FONT_DEVANAGARI`
/ `DRAWTEXT_FONT_TELUGU`, or override the whole directory via
`DRAWTEXT_FONTS_DIR` (defaults to `/app/assets/fonts`, matching the
Dockerfile's `COPY assets ./assets`).

## Local development

```bash
cd services/reel-renderer
npm install
npm run build
# Requires GOOGLE_APPLICATION_CREDENTIALS or ADC pointing at a service
# account with Storage access to the target project's default bucket.
npm start
```

### Local ffmpeg smoke test (no Firebase/Storage required)

```bash
npm run build
npm run smoke-test
```

This synthesizes two tiny test clips (one landscape, one portrait) and a
sine-wave "music" track with ffmpeg's own `lavfi` test sources, then runs
the actual segment-build / title-card / xfade-concat / logo-overlay /
music-mix / thumbnail pipeline directly against local files — it does not
touch Storage or the HTTP layer. Fonts are vendored under `assets/fonts/` in
the repo itself (not only inside the container), so local Windows/macOS/
Linux dev resolves them automatically via the default relative-to-cwd path
resolution in `constants.ts`; no override is normally needed. If running
from a different working directory, point `DRAWTEXT_FONTS_DIR` at the repo's
`assets/fonts/` folder explicitly:

```bash
DRAWTEXT_FONTS_DIR="/path/to/services/reel-renderer/assets/fonts" node lib/smokeTest.js
```

It exits non-zero and leaves the working directory in place for inspection
if anything fails.

## Deployment

### 1. Build and push the image

```bash
gcloud builds submit --tag asia-south1-docker.pkg.dev/PROJECT_ID/reel-renderer/reel-renderer:latest .
```

(Replace with your Artifact Registry repo path, or use `docker build` /
`docker push` directly if you maintain your own registry.)

### 2. Deploy to Cloud Run

```bash
gcloud run deploy reel-renderer \
  --image asia-south1-docker.pkg.dev/PROJECT_ID/reel-renderer/reel-renderer:latest \
  --region asia-south1 \
  --no-allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 900s \
  --concurrency 2 \
  --set-env-vars REEL_RENDERER_API_KEY=<optional-shared-secret>
```

`--timeout 900s` gives headroom under the 540s Cloud Functions timeout that
awaits `/render`; the target render time for a 10-clip 45s reel is a few
minutes, well under both ceilings.

### 3. IAM grants

- **This Cloud Run service's own runtime service account** (by default the
  Compute Engine default service account, or a custom one if you passed
  `--service-account`) needs `roles/storage.objectAdmin` on the project's
  default Firebase Storage bucket, so it can download uploaded clips/music/
  logo and upload rendered output/thumbnails:

  ```bash
  gsutil iam ch \
    serviceAccount:RUN_SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com:roles/storage.objectAdmin \
    gs://PROJECT_ID.appspot.com
  ```

- **The Cloud Functions Gen2 service account** (the one `generateReel.ts`
  runs as) needs `roles/run.invoker` on this Cloud Run service, so its
  `getIdTokenClient` calls are authorized:

  ```bash
  gcloud run services add-iam-policy-binding reel-renderer \
    --region asia-south1 \
    --member serviceAccount:FUNCTIONS_SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com \
    --role roles/run.invoker
  ```

### 4. Configure the Cloud Functions side

After deployment, set on the Cloud Functions (Gen2) environment:

- `REEL_RENDERER_URL` — the deployed Cloud Run service URL (e.g.
  `https://reel-renderer-xxxxx-el.a.run.app`), matching
  `functions/src/config/env.ts`'s `REEL_RENDERER_URL` (a validated URL).
- `REEL_RENDERER_API_KEY` — optional, only if you set the same value as an
  env var on this Cloud Run service in step 2.

`functions/src/services/videoRenderer.ts`'s `getVideoRenderer()` picks the
real `CloudRunVideoRenderer` automatically once `REEL_RENDERER_URL` is set
outside the emulator; nothing else on the Functions side needs to change.

## Pipeline design notes / judgment calls

- **Audio strategy**: every intermediate segment/title-card clip is built
  *without* audio (`-an`). The only audio in the final output is the
  background music bed, mixed in once at the very end (`src/render/
  audioMix.ts`) at low volume (0.22 gain) with a 0.5s fade-in / 1s fade-out
  and `loudnorm` normalization. This trades "preserve each clip's original
  ambient audio at low volume" for a single, reliable audio path — the
  product brief explicitly allows this ("If a clip's original audio is very
  quiet/silent, that's fine — the music still carries the piece").
  **Left for production-readiness**: mixing in original clip audio at a low
  duck level under the music, if product wants raw ambience (sizzling,
  chatter) to come through.
- **Transitions**: all joins (including `hard_cut`) are implemented as a
  single chained `xfade` filter_complex, with `hard_cut` using a very short
  (0.05s) `fade` — visually indistinguishable from an instant cut, but this
  keeps one reliable code path instead of switching between the concat
  demuxer and a filter graph depending on plan content. `zoom_punch` maps to
  ffmpeg's `zoomin` xfade transition (a genuine zoom transition, not a fake).
  Crossfade duration is capped at 1/3 of the shorter adjacent clip so a
  short segment can never be mostly eaten by its own transition.
- **Hook/offer/ending → segment joins**: `ReelEditPlanSegment.transitionIn`
  covers segment-to-segment joins (including hook→segment0, since
  `segments[0].transitionIn` is defined). The plan type has no
  `transitionIn` field for `offer`/`ending`, so those joins default to
  `fade` (`DEFAULT_JOIN_TRANSITION` in `src/render/constants.ts`) — a safe,
  clean look regardless of style.
- **Crop, never stretch**: `scale=W:H:force_original_aspect_ratio=increase,
  crop=W:H` scales the source up to cover the 1080x1920 frame then center-
  crops it, so landscape or otherwise non-vertical source footage is never
  distorted.
- **Brightness/motion heuristics**: coarse, deterministic, and explicitly
  approximate per the spec. 4 frames are sampled at fixed fractions through
  the clip (15/40/65/85%) as small 64x64 grayscale buffers; brightness is
  their average pixel value, motion is the mean absolute pixel difference
  between consecutive samples, both normalized into 0-1. **Left for
  production-readiness**: a more principled approach (e.g. ffmpeg's
  `signalstats` filter for per-frame luma stats, or sampling more/denser
  frames) if upstream clip scoring proves too coarse in practice.
- **File size / bitrate**: final export uses `-crf 23 -maxrate 4M -bufsize
  8M`, which in the local smoke test produced ~1.2MB for a 5.7s test video
  (synthetic noise-pattern test sources, which compress worse than real
  footage) — comfortably in the "a few MB per 15-45s" target for real
  handheld footage.
- **Text rendering**: captions are written to temp `.txt` files and burned
  in via `drawtext=textfile=...` rather than ever inlining user-controlled
  text into an ffmpeg filter string — this sidesteps drawtext's escaping
  rules entirely for arbitrary user text (colons/quotes/percent/backslash),
  since the only string embedded in the filter graph syntax is our own
  UUID-based temp path.
- **No shell interpolation**: every ffmpeg/ffprobe invocation goes through
  `child_process.spawn` with an argument array (`src/lib/exec.ts`) — never
  `exec()` with a concatenated command string — so there is no shell
  injection surface even though clip ids / storage paths / caption text
  ultimately trace back to user-controlled Firestore data.
- **Cleanup**: every analyze/render request runs inside `withTempDir()`
  (`src/lib/tempDir.ts`), which removes its entire scratch directory in a
  `finally` block on both success and failure — required because Cloud Run
  containers are reused across requests and this endpoint runs many times a
  day.

## What's left for production-readiness

- Real-world validation against actual phone footage (variable frame rates,
  rotation metadata / EXIF orientation, unusual codecs) — the smoke test
  only exercises ffmpeg's own synthetic `lavfi` test sources and two
  synthetic resolutions.
- Brand font decision: currently Noto Sans / Noto Sans Devanagari / Noto
  Sans Telugu, vendored OFL fonts chosen for script coverage and license
  safety (see "Font strategy" above) — a future brand-specific font would
  need the same per-script coverage verification before replacing these.
- Devanagari/Telugu conjunct shaping quality is limited by `drawtext`
  lacking a HarfBuzz-based shaping engine (see "Font strategy" above) —
  acceptable for MVP per visual inspection, but a hard ceiling on rendering
  fidelity for those scripts unless `drawtext` itself is replaced.
- Better brightness/motion heuristics if upstream scoring needs finer
  signal (see above).
- Optional: preserve/duck original clip audio under the music bed instead of
  dropping it entirely (see "Audio strategy" above).
- Load/concurrency testing — the deploy command above sets `--concurrency 2`
  as a starting point (Cloud Run's default of 80 is far too high for a
  CPU-bound ffmpeg workload sharing 2 vCPUs), but the right value should be
  tuned against real render times and traffic before production.
- Monitoring/alerting on render failures and render duration (e.g. via
  Cloud Logging-based alerts on the `severity: "ERROR"` JSON log lines this
  service emits).
