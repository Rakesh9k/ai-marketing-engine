/**
 * One-off asset pipeline: takes the supplied photoreal Mitra mascot PNGs
 * (source of truth lives outside the repo, never modified in place) and
 * produces transparent, cropped, kebab-case PNGs in public/brand/mascot/
 * for the 13 MitraMascotPose values used by MascotScene.
 *
 * Only does background removal (soft-alpha white/near-white keying via
 * border flood-fill + feathered edges) and a content-bounding-box crop.
 * Never recolors, redraws, or otherwise edits the artwork.
 *
 * Run: node scripts/mascot-extract.mjs
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SRC_DIR = 'D:\\brainwise ai agent files\\mascot';
const OUT_DIR = path.join(process.cwd(), 'public', 'brand', 'mascot');

// pose -> substring (lowercased) used to find the source file in SRC_DIR
const POSE_SOURCE = {
  idle: 'resting 2',
  point: 'mitra mascot',
  explain: 'personality',
  cheer: 'celebrating.png', // exact-ish, avoid matching "celebrating 3"
  concerned: 'confused',
  curious: 'suprise',
  idea: 'thinking lightbulb',
  thinking: 'thinking mascot',
  creating: 'sparkal',
  designer: 'mitra mascot', // no dedicated "designer/pencil" asset exists; reuse closest neutral render (see report)
  analyst: 'analytics',
  remembering: 'data saved',
  discovering: 'in search',
};

// Optional pre-crop region (in the *source* image's own pixel coordinates)
// applied before background removal. Background removal here only clears
// the white/near-white studio backdrop connected to the image border — it
// never isolates the character from other foreground props in the same
// shot. "Confused" is a full desk/multi-monitor scene, not an isolated
// character, so without this the whole scene ships as concerned.png and is
// illegible at the ~88px this pose actually renders at in the app. Crop
// coordinates are calibrated against that specific source file's pixels
// (1686x2528) and would need re-tuning if the source render changes.
const POSE_PRECROP = {
  concerned: { left: 950, top: 560, width: 430, height: 560 },
};

function findSource(substr) {
  const files = fs.readdirSync(SRC_DIR);
  const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const target = norm(substr);
  // exact "startswith" match first (handles "celebrating.png" vs "celebrating 3.png")
  let hit = files.find((f) => norm(f) === target || norm(f).startsWith(target));
  if (!hit) hit = files.find((f) => norm(f).includes(target.replace('.png', '')));
  if (!hit) throw new Error(`No source file found for "${substr}" in ${SRC_DIR}`);
  return path.join(SRC_DIR, hit);
}

async function colorDistanceBackground(inputPath) {
  const image = sharp(inputPath).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Sample corners to establish the studio-backdrop reference color.
  const sample = (x, y) => {
    const idx = (y * width + x) * channels;
    return [data[idx], data[idx + 1], data[idx + 2]];
  };
  const corners = [
    sample(2, 2),
    sample(width - 3, 2),
    sample(2, height - 3),
    sample(width - 3, height - 3),
  ];
  const ref = [0, 1, 2].map((c) => corners.reduce((sum, p) => sum + p[c], 0) / corners.length);

  const dist = (x, y) => {
    const idx = (y * width + x) * channels;
    const dr = data[idx] - ref[0];
    const dg = data[idx + 1] - ref[1];
    const db = data[idx + 2] - ref[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  // Flood fill from the border: any pixel connected to the border whose
  // color distance to the reference is within CONNECT_TOL is background.
  const CONNECT_TOL = 46;
  const visited = new Uint8Array(width * height);
  const queue = [];
  const pushIfBg = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (visited[i]) return;
    if (dist(x, y) <= CONNECT_TOL) {
      visited[i] = 1;
      queue.push(i);
    }
  };
  for (let x = 0; x < width; x++) {
    pushIfBg(x, 0);
    pushIfBg(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    pushIfBg(0, y);
    pushIfBg(width - 1, y);
  }
  while (queue.length) {
    const i = queue.pop();
    const x = i % width;
    const y = (i / width) | 0;
    pushIfBg(x + 1, y);
    pushIfBg(x - 1, y);
    pushIfBg(x, y + 1);
    pushIfBg(x, y - 1);
  }

  // Build an alpha mask: 0 inside the flood-filled background, 255 elsewhere.
  const alpha = Buffer.alloc(width * height);
  for (let i = 0; i < width * height; i++) {
    alpha[i] = visited[i] ? 0 : 255;
  }

  return { data, info, alpha };
}

async function processOne(pose, srcPath, outPath) {
  const precrop = POSE_PRECROP[pose];
  const input = precrop ? await sharp(srcPath).extract(precrop).toBuffer() : srcPath;
  const { data, info, alpha } = await colorDistanceBackground(input);
  const { width, height, channels } = info;

  // Feather the mask edges (soft-alpha keying) so hair/finger/hoodie edges
  // don't get a hard cutout line, then composite it as the alpha channel.
  // IMPORTANT: sharp silently expands a single-channel raw buffer to 3
  // channels during .blur() unless the colourspace is pinned to
  // greyscale first — without this, the returned buffer is 3x the
  // expected length and gets misinterpreted when repacked as the alpha
  // channel below (this was the root cause of the corrupted/garbage
  // alpha seen in earlier output — huge black blobs, wrong-region crops).
  const softAlpha = await sharp(alpha, { raw: { width, height, channels: 1 } })
    .toColourspace('b-w')
    .blur(1.4)
    .raw()
    .toBuffer();
  if (softAlpha.length !== width * height) {
    throw new Error(
      `softAlpha length mismatch: got ${softAlpha.length}, expected ${width * height}`
    );
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, p = 0; i < width * height; i++, p += 4) {
    const srcIdx = i * channels;
    rgba[p] = data[srcIdx];
    rgba[p + 1] = data[srcIdx + 1];
    rgba[p + 2] = data[srcIdx + 2];
    rgba[p + 3] = softAlpha[i];
  }

  let img = sharp(rgba, { raw: { width, height, channels: 4 } }).png();

  // Crop to the content bounding box (alpha > threshold) with small padding.
  const stats = await img.clone().toBuffer();
  const probe = sharp(stats);
  const { data: alphaOnly, info: pinfo } = await probe
    .extractChannel(3)
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (alphaOnly.length !== pinfo.width * pinfo.height || pinfo.channels !== 1) {
    throw new Error(
      `alphaOnly shape mismatch: length=${alphaOnly.length} channels=${pinfo.channels} for ${width}x${height}`
    );
  }

  let minX = pinfo.width,
    minY = pinfo.height,
    maxX = -1,
    maxY = -1;
  const THRESH = 12;
  for (let y = 0; y < pinfo.height; y++) {
    for (let x = 0; x < pinfo.width; x++) {
      if (alphaOnly[y * pinfo.width + x] > THRESH) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0 || maxY < 0) {
    throw new Error(`No foreground pixels found above alpha threshold ${THRESH} in ${pose}`);
  }
  const fgFraction = ((maxX - minX + 1) * (maxY - minY + 1)) / (pinfo.width * pinfo.height);
  if (fgFraction < 0.02) {
    throw new Error(
      `Suspiciously small foreground bbox (${(fgFraction * 100).toFixed(1)}% of frame) for ${pose} — likely a masking bug, not a real crop`
    );
  }

  const PAD = 12;
  minX = Math.max(0, minX - PAD);
  minY = Math.max(0, minY - PAD);
  maxX = Math.min(pinfo.width - 1, maxX + PAD);
  maxY = Math.min(pinfo.height - 1, maxY + PAD);

  await img
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    // Source renders are ~2000-3000px; nothing in this UI needs more than
    // ~1200px wide (largest placement size is 'xl' at 176px, rendered at up
    // to 2x-3x DPR via next/image). Cap here to keep repo assets reasonable.
    .resize({ width: 1200, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  console.log(`  ${pose} <- ${path.basename(srcPath)} -> ${path.relative(process.cwd(), outPath)}`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('Extracting mascot poses to', OUT_DIR);
  for (const [pose, sourceKey] of Object.entries(POSE_SOURCE)) {
    const srcPath = findSource(sourceKey);
    const outPath = path.join(OUT_DIR, `${pose}.png`);
    await processOne(pose, srcPath, outPath);
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
