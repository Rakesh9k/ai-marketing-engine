# Reel Renderer — Cloud Run ffmpeg rendering service for Mitra "Create a Reel".
#
# ffmpeg itself is NOT apt-installed: ffmpeg-static / ffprobe-static npm
# packages vendor a pinned static binary, which keeps the encoder version
# deterministic across builds instead of tracking whatever Debian's repos
# currently carry. drawtext's fonts are handled the same way: vendored TTFs
# under assets/fonts/ (Noto Sans / Noto Sans Devanagari / Noto Sans Telugu,
# SIL OFL 1.1 — see assets/fonts/NOTICE.md) are COPYed into the image below
# rather than apt-installed, so the exact font bytes are identical across
# every build/host and multilingual captions (English/Hindi/Telugu/mixed)
# never depend on whatever fonts a given Debian release happens to package.
FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
COPY assets ./assets
RUN npm run build && npm prune --omit=dev

# Non-root user for defense-in-depth.
RUN useradd --uid 1001 --create-home appuser && chown -R appuser:appuser /app
USER appuser

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "lib/index.js"]
