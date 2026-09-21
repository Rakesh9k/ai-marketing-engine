# Vendored fonts

These TTF files are vendored directly into the repo (not `apt-get`-installed)
so the drawtext font set is byte-identical and deterministic across every
build/host, with zero network access required at render time or even at
Docker build time for fonts specifically (only `npm install` and the base
image pull still need network, same as before).

| File | Family | Style | Source | License |
|---|---|---|---|---|
| `NotoSans-Bold.ttf` | Noto Sans | Bold | `github.com/notofonts/NotoSans`, `fonts/ttf/hinted/instance_ttf/NotoSans-Bold.ttf` (static Bold instance of the variable font, `main` branch) | SIL OFL 1.1 |
| `NotoSansDevanagari-Bold.ttf` | Noto Sans Devanagari | Bold | `github.com/notofonts/NotoSansDevanagari`, `fonts/ttf/hinted/instance_ttf/NotoSansDevanagari-Bold.ttf` | SIL OFL 1.1 |
| `NotoSansTelugu-Bold.ttf` | Noto Sans Telugu | Bold | `github.com/notofonts/NotoSansTelugu`, `fonts/ttf/hinted/instance_ttf/NotoSansTelugu-Bold.ttf` | SIL OFL 1.1 |

Downloaded 2026-09-16. `LICENSE-OFL.txt` is the SIL Open Font License 1.1
text (identical across all three families/repos) — permissive, royalty-free,
explicitly permits embedding in commercial software and modifying/
redistributing the font as part of a larger work (the rendered video output
is not itself "the font" and carries no license obligation). The only OFL
restriction relevant here is that the font files themselves may not be sold
standalone under the "Noto" name without renaming — irrelevant to embedding
them in the Reel renderer's Docker image.

## Why per-script files instead of one merged font

`notofonts/*` per-script repos each publish **static weight instances**
(e.g. `NotoSansDevanagari-Bold.ttf`) built from the current variable-font
source in `google/fonts`, which no longer ships static instances directly.
Verified via glyph-coverage inspection (`fontkit`, see
`docs/PHASE_*` reel font report): `NotoSansDevanagari-Bold.ttf` and
`NotoSansTelugu-Bold.ttf` contain **zero Latin A-Z/a-z glyphs** — Google's
per-script Noto Sans builds are script-only, not merged multi-script fonts.
This is why the renderer performs script-run segmentation and selects a
font per run rather than assuming one font covers a mixed-script caption
(see `src/render/scriptSegmentation.ts`).
