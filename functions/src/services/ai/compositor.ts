/**
 * Deterministic creative compositor (Phase 7).
 *
 * The AI image provider is deliberately prompted (see imagePromptBuilder.ts's
 * negative prompt: "text, numbers, prices...") to produce a CLEAN visual with
 * no rendered text — AI image models cannot be trusted to render exact
 * factual text (₹299, phone numbers, "10% OFF") correctly. That text data
 * (buildTextOverlay() in imagePromptBuilder.ts) was already being computed
 * but was never actually placed onto the final image anywhere — it was
 * discarded. This module is the missing step: it deterministically overlays
 * business name, product name, price/offer, CTA, and phone onto the
 * AI-generated (or product) base image, using only server-verified campaign
 * facts, never AI-invented text.
 *
 * Output format is SVG, not a rasterized PNG: no image-processing dependency
 * (Sharp/Canvas) exists in this project, and adding one is a heavy, native
 * binary dependency the task explicitly says not to add "unnecessarily".
 * SVG with an embedded <image> reference plus <text> elements is a real,
 * renderable, downloadable image format (contentType image/svg+xml) that
 * every modern browser displays natively, and text stays perfectly crisp at
 * any size — an advantage over rasterized text for a marketing creative.
 * This is documented as a deliberate MVP tradeoff, not an oversight.
 */

export type CreativeFormat = 'poster' | 'story';

export const CREATIVE_DIMENSIONS: Record<CreativeFormat, { width: number; height: number }> = {
  poster: { width: 1024, height: 1280 }, // 4:5
  story: { width: 1080, height: 1920 }, // 9:16
};

export interface CreativeTextOverlay {
  businessName: string;
  productName?: string;
  headline: string;
  priceText: string; // e.g. "₹299" — pre-formatted, deterministic, from verified offer data
  originalPriceText?: string; // e.g. "₹332" struck through
  offerBadge?: string; // e.g. "10% OFF" — only ever the server-computed authorized value
  ctaText: string;
  phone?: string;
  locality?: string;
}

export interface CreativeBrandStyle {
  primaryColor: string;
  accentColor: string;
  textColor: string;
}

export const DEFAULT_BRAND_STYLE: CreativeBrandStyle = {
  primaryColor: '#E84D1A',
  accentColor: '#FFD700',
  textColor: '#FFFFFF',
};

/** Escapes text for safe inclusion inside SVG markup — never trust generated/user text as raw XML. */
export function escapeSvgText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Simple deterministic word-wrap by character budget per line, capped at
 * maxLines. Anything beyond maxLines is truncated with an ellipsis rather
 * than overflowing the canvas — explicit layout constraint per Phase 7's
 * "no text rendered outside canvas" requirement.
 */
export function wrapText(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = candidate;
    }
  }
  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  if (lines.length === maxLines) {
    const last = lines[maxLines - 1]!;
    const consumedWords = lines.join(' ').split(/\s+/).length;
    if (consumedWords < words.length) {
      lines[maxLines - 1] =
        last.length > 3 ? `${last.slice(0, last.length - 1).trimEnd()}…` : `${last}…`;
    }
  }

  return lines.length > 0 ? lines : [''];
}

/** Picks a font size that keeps the (already-wrapped) headline within a safe width, with a floor so text never becomes illegible. */
function fitFontSize(text: string, maxWidth: number, baseSize: number, minSize: number): number {
  const approxCharWidth = baseSize * 0.58;
  const estimatedWidth = text.length * approxCharWidth;
  if (estimatedWidth <= maxWidth) return baseSize;
  const scaled = Math.floor(maxWidth / Math.max(1, text.length) / 0.58);
  return Math.max(minSize, Math.min(baseSize, scaled));
}

/**
 * Composes the final creative as an SVG string. baseImageUrl must be a
 * stable, permanently-hosted URL (Firebase Storage) — never a temporary
 * provider URL — since the SVG references it by external href.
 */
export function composeCreativeSVG(
  baseImageUrl: string,
  overlay: CreativeTextOverlay,
  brand: CreativeBrandStyle,
  format: CreativeFormat
): string {
  const { width, height } = CREATIVE_DIMENSIONS[format];
  const margin = Math.round(width * 0.06);
  const maxCharsPerLine = Math.round(width / 24);

  const headlineLines = wrapText(overlay.headline, maxCharsPerLine, format === 'story' ? 3 : 2);
  const headlineFontSize = fitFontSize(
    headlineLines[0] || '',
    width - margin * 2,
    format === 'story' ? 64 : 56,
    32
  );

  const scrimHeight = Math.round(height * 0.34);
  const scrimY = height - scrimHeight;

  const lines: string[] = [];
  let cursorY = scrimY + margin + headlineFontSize;

  const headlineSpans = headlineLines
    .map((line, i) => {
      const y = cursorY + i * (headlineFontSize + 6);
      return `<text x="${margin}" y="${y}" font-family="Arial, sans-serif" font-weight="700" font-size="${headlineFontSize}" fill="${brand.textColor}">${escapeSvgText(line)}</text>`;
    })
    .join('\n    ');
  lines.push(headlineSpans);
  cursorY += headlineLines.length * (headlineFontSize + 6) + 14;

  const priceFontSize = format === 'story' ? 48 : 42;
  let priceLine = `<text x="${margin}" y="${cursorY + priceFontSize}" font-family="Arial, sans-serif" font-weight="800" font-size="${priceFontSize}" fill="${brand.accentColor}">${escapeSvgText(overlay.priceText)}</text>`;
  let priceLineWidth = overlay.priceText.length * priceFontSize * 0.6;
  if (overlay.originalPriceText) {
    const origX = margin + priceLineWidth + 16;
    const origFontSize = Math.round(priceFontSize * 0.55);
    const origY = cursorY + priceFontSize - Math.round(origFontSize * 0.35);
    priceLine += `\n    <text x="${origX}" y="${origY}" font-family="Arial, sans-serif" font-size="${origFontSize}" fill="${brand.textColor}" opacity="0.75" text-decoration="line-through">${escapeSvgText(overlay.originalPriceText)}</text>`;
    priceLineWidth += overlay.originalPriceText.length * origFontSize * 0.6 + 16;
  }
  lines.push(priceLine);
  cursorY += priceFontSize + 16;

  if (overlay.offerBadge) {
    const badgeText = escapeSvgText(overlay.offerBadge);
    const badgeWidth = Math.max(80, overlay.offerBadge.length * 15 + 32);
    const badgeHeight = 40;
    lines.push(
      `<rect x="${margin}" y="${cursorY}" width="${badgeWidth}" height="${badgeHeight}" rx="8" fill="${brand.primaryColor}" />` +
        `<text x="${margin + badgeWidth / 2}" y="${cursorY + badgeHeight / 2 + 6}" font-family="Arial, sans-serif" font-weight="700" font-size="20" fill="${brand.textColor}" text-anchor="middle">${badgeText}</text>`
    );
    cursorY += badgeHeight + 16;
  }

  const ctaFontSize = 26;
  const ctaWidth = Math.max(140, overlay.ctaText.length * 13 + 48);
  const ctaHeight = 52;
  lines.push(
    `<rect x="${margin}" y="${cursorY}" width="${ctaWidth}" height="${ctaHeight}" rx="26" fill="${brand.accentColor}" />` +
      `<text x="${margin + ctaWidth / 2}" y="${cursorY + ctaHeight / 2 + 8}" font-family="Arial, sans-serif" font-weight="800" font-size="${ctaFontSize}" fill="#1A1A1A" text-anchor="middle">${escapeSvgText(overlay.ctaText)}</text>`
  );
  cursorY += ctaHeight + 18;

  const footerParts: string[] = [escapeSvgText(overlay.businessName)];
  if (overlay.locality) footerParts.push(escapeSvgText(overlay.locality));
  if (overlay.phone) footerParts.push(escapeSvgText(overlay.phone));
  const footerText = footerParts.join('   ·   ');
  if (cursorY + 20 < height - margin / 2) {
    lines.push(
      `<text x="${margin}" y="${height - margin / 2}" font-family="Arial, sans-serif" font-size="20" fill="${brand.textColor}" opacity="0.9">${footerText}</text>`
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.82" />
    </linearGradient>
  </defs>
  <image href="${escapeSvgText(baseImageUrl)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" />
  <rect x="0" y="${scrimY}" width="${width}" height="${scrimHeight}" fill="url(#scrim)" />
  <g>
    ${lines.join('\n    ')}
  </g>
</svg>`;
}
