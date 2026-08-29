import { CreativeBrief, VISUAL_DIRECTION_PRESETS } from './creativeBrief';
import type { CreativeBriefInput, CampaignStrategyReference, CopyPackReference } from './creativeBrief';

/**
 * ImagePromptBuilder - Centralized prompt builder for image generation
 *
 * Consumes structured CreativeBrief and outputs detailed, provider-optimized prompts.
 * Does NOT construct prompts directly in React components.
 */

export interface ImagePrompt {
  readonly prompt: string;
  readonly negativePrompt: string;
  readonly aspectRatio: '1:1' | '4:5' | '9:16' | '16:9';
  readonly styleGuidance: string;
  readonly generationMode: 'product_ad' | 'social_post' | 'story' | 'campaign_creative';
  readonly textOverlay?: {
    readonly headline: string;
    readonly offer: string;
    readonly cta: string;
  };
}

/**
 * Build image prompt from CreativeBrief
 */
export function buildImagePrompt(brief: CreativeBrief): ImagePrompt {
  const sections: string[] = [];

  // 1. Core subject - product as hero
  sections.push(buildSubjectSection(brief));

  // 2. Composition and framing
  sections.push(buildCompositionSection(brief));

  // 3. Lighting and mood
  sections.push(buildLightingMoodSection(brief));

  // 4. Brand identity
  sections.push(buildBrandSection(brief));

  // 5. Localization and cultural context
  sections.push(buildLocalizationSection(brief));

  // 6. Text overlays (for poster generation)
  const textOverlay = buildTextOverlay(brief);

  // 7. Technical specifications
  sections.push(buildTechnicalSection(brief));

  // 8. Style guidance
  const styleGuidance = buildStyleGuidance(brief);

  // Combine into final prompt
  const prompt = sections.filter(Boolean).join('\n\n');

  // Build negative prompt
  const negativePrompt = buildNegativePrompt(brief);

  return {
    prompt,
    negativePrompt,
    aspectRatio: brief.aspectRatio,
    styleGuidance,
    generationMode: brief.generationMode,
    textOverlay,
  };
}

/**
 * Build subject section - the product as visual reference
 */
function buildSubjectSection(brief: CreativeBrief): string {
  const { product, visualDirection } = brief;

  let subject = `MAIN SUBJECT: ${product.name}`;

  if (product.visualAttributes) {
    const va = product.visualAttributes;
    subject += `\n- Dish: ${va.dishName}`;
    subject += `\n- Plating: ${va.platingStyle}`;
    subject += `\n- Container: ${va.colorPalette.join(', ')} color palette`;
    if (va.garnish && va.garnish.length > 0) {
      subject += `\n- Garnish: ${va.garnish.join(', ')}`;
    }
    subject += `\n- Key visual elements: ${va.keyVisualElements.join(', ')}`;
  }

  subject += '\n\nCRITICAL: Use the uploaded product image as the EXACT visual reference. The generated image must preserve the product identity, packaging, dish appearance, quantity, and color. Do NOT change the product to a different dish or style.';

  return subject;
}

/**
 * Build composition section
 */
function buildCompositionSection(brief: CreativeBrief): string {
  const { visualDirection, generationMode, aspectRatio } = brief;

  const compositions = {
    product_ad: 'Vertical 4:5 Instagram post composition. Product centered or rule-of-thirds. Space for headline at top, offer price prominent, CTA button at bottom.',
    social_post: 'Square or 4:5 composition. Balanced layout with product, branding, and copy.',
    story: 'Vertical 9:16 full-screen Story frame. Product prominent in upper 2/3. Safe zones for profile pic (top-left) and CTA (bottom).',
    campaign_creative: 'Flexible composition for campaign hero asset. Strong visual hierarchy.',
  } as const;

  let composition = `COMPOSITION: ${compositions[generationMode] || compositions.product_ad}`;

  if (visualDirection.composition) {
    composition += `\n- Custom direction: ${visualDirection.composition}`;
  }

  if (visualDirection.props && visualDirection.props.length > 0) {
    composition += `\n- Props to include: ${visualDirection.props.join(', ')}`;
  }

  composition += `\n- Aspect ratio: ${aspectRatio}`;
  composition += '\n- Vertical orientation optimized for mobile Instagram feed.';

  return composition;
}

/**
 * Build lighting and mood section
 */
function buildLightingMoodSection(brief: CreativeBrief): string {
  const { visualDirection, brand } = brief;

  let lighting = 'LIGHTING & MOOD:';

  if (visualDirection.lighting) {
    lighting += `\n- Lighting: ${visualDirection.lighting}`;
  } else {
    lighting += '\n- Lighting: Warm, appetizing natural light. Soft shadows. Steam visible for hot dishes. Golden hour warmth.';
  }

  if (visualDirection.mood) {
    lighting += `\n- Mood: ${visualDirection.mood}`;
  } else {
    lighting += '\n- Mood: Crave-inducing, authentic, local pride. Makes viewer want to order immediately.';
  }

  return lighting;
}

/**
 * Build brand identity section
 */
function buildBrandSection(brief: CreativeBrief): string {
  const { brand, product } = brief;

  let brandSection = 'BRAND IDENTITY:';

  if (brand.colors && brand.colors.length > 0) {
    brandSection += `\n- Brand colors: ${brand.colors.join(', ')} (use in background, accents, text overlays)`;
  }

  if (brand.tone) {
    brandSection += `\n- Brand tone: ${brand.tone}`;
  }

  if (brand.visualStyle) {
    brandSection += `\n- Visual style: ${brand.visualStyle}`;
  }

  if (brand.logoUrl) {
    brandSection += `\n- Logo: Place in top-right or bottom-right corner, subtle but visible. URL: ${brand.logoUrl}`;
  }

  if (brand.fonts) {
    brandSection += `\n- Fonts: Heading="${brand.fonts.heading}", Body="${brand.fonts.body}" (for text overlay reference)`;
  }

  return brandSection;
}

/**
 * Build localization and cultural context section
 */
function buildLocalizationSection(brief: CreativeBrief): string {
  const { localization, visualDirection } = brief;

  let locSection = 'LOCALIZATION & CULTURAL CONTEXT:';

  locSection += `\n- Language: ${localization.language}`;
  if (localization.region) locSection += `\n- Region: ${localization.region}`;
  if (localization.regionalStyle) locSection += `\n- Regional style: ${localization.regionalStyle}`;
  if (localization.contentStyle) locSection += `\n- Content style: ${localization.contentStyle}`;
  if (localization.audienceDescription) locSection += `\n- Target audience: ${localization.audienceDescription}`;

  // Regional style specific guidance
  if (localization.regionalStyle === 'hyderabadi') {
    locSection += '\n\nHYDERABADI STYLE REQUIREMENTS:';
    locSection += '\n- Visual cues: Copper handi (biryani pot), banana leaf serving, charcoal/wood fire hints';
    locSection += '\n- Garnish: Fried onions (birista), fresh mint, coriander, lemon wedge';
    locSection += '\n- Accompaniments: Mirchi ka salan, raita, baghaar-e-baingan visible in frame';
    locSection += '\n- Color palette: Saffron/orange, deep red, fresh green, warm gold, copper tones';
    locSection += '\n- Ambiance: Traditional Hyderabadi kitchen or modern restaurant with local character';
    locSection += '\n- Cultural references: Charminar silhouette (subtle), Nizami heritage hints, "Dum" steam';
  }

  if (localization.contentStyle === 'funny') {
    locSection += '\n- Humor style: Self-deprecating, relatable food situations, "mast" energy';
  } else if (localization.contentStyle === 'emotional') {
    locSection += '\n- Emotional tone: Nostalgic, family memories, comfort food warmth';
  } else if (localization.contentStyle === 'urgent') {
    locSection += '\n- Urgency cues: Steam rising, fresh-from-kitchen, limited time visual cues';
  }

  if (visualDirection.props && visualDirection.props.length > 0) {
    locSection += `\n- Additional local props: ${visualDirection.props.join(', ')}`;
  }

  return locSection;
}

/**
 * Build text overlay specification
 */
function buildTextOverlay(brief: CreativeBrief): ImagePrompt['textOverlay'] {
  const { copyPack, campaignStrategy, offer, brand, cta } = brief;

  // Use copy pack headlines if available, otherwise generate from strategy
  const headline = copyPack?.headlines?.[0]
    || campaignStrategy?.hook
    || offer?.title
    || brief.product.name;

  const offerText = offer
    ? `₹${offer.price}${offer.originalPrice ? ` (was ₹${offer.originalPrice})` : ''}`
    : '';

  const ctaText = copyPack?.cta || campaignStrategy?.ctaStrategy?.primary || formatCTAForOverlay(cta);

  return {
    headline,
    offer: offerText,
    cta: ctaText,
  };
}

function formatCTAForOverlay(cta?: string): string {
  if (!cta) return 'Order Now →';
  const ctaMap: Record<string, string> = {
    order_whatsapp: 'Order on WhatsApp →',
    book_table: 'Book Table →',
    view_menu: 'View Menu →',
    call_now: 'Call Now →',
    get_directions: 'Get Directions →',
  };
  return ctaMap[cta] || 'Order Now →';
}

/**
 * Build technical specifications
 */
function buildTechnicalSection(brief: CreativeBrief): string {
  const { aspectRatio, generationMode } = brief;

  const techSpecs = {
    product_ad: 'Professional food photography quality. Sharp focus on product. Instagram-ready 4:5 vertical.',
    social_post: 'High-quality social media creative. Balanced composition. Platform-agnostic.',
    story: 'Full-screen 9:16 vertical. Safe zones: 14% top, 20% bottom. Interactive elements space.',
    campaign_creative: 'Campaign hero quality. Versatile for multiple formats.',
  } as const;

  return `TECHNICAL: ${techSpecs[generationMode] || techSpecs.product_ad}
- Resolution: High quality (1024x1792 for 9:16, 1024x1024 for 1:1, 1792x1024 for 16:9)
- Format: JPEG/PNG, optimized for web
- Brand colors in sRGB color space
- Text overlays must be legible at mobile thumbnail size`;
}

/**
 * Build style guidance
 */
function buildStyleGuidance(brief: CreativeBrief): string {
  const { visualDirection, localization, brand, generationMode } = brief;

  let guidance = `STYLE GUIDANCE:\n`;

  if (visualDirection.styleGuidance) {
    guidance += `- ${visualDirection.styleGuidance}\n`;
  }

  // Apply visual direction preset if available
  const presets = VISUAL_DIRECTION_PRESETS as Record<string, Record<string, string>>;
  const presetKey = Object.keys(presets).find((key) =>
    visualDirection.styleGuidance?.toLowerCase().includes(key) ||
    brand.visualStyle?.toLowerCase().includes(key) ||
    generationMode === key
  );

  if (presetKey && presets[presetKey]) {
    const preset = presets[presetKey];
    guidance += `- Preset (${presetKey}): ${Object.entries(preset).map(([k, v]) => `${k}: ${v}`).join('; ')}\n`;
  }

  guidance += '- Professional food photography aesthetic\n';
  guidance += '- Authentic Indian restaurant/homestyle presentation\n';
  guidance += '- Appetizing, crave-worthy, not overly staged\n';
  guidance += '- Mobile-first vertical composition\n';
  guidance += '- Text overlays integrated naturally into composition';

  return guidance;
}

/**
 * Build negative prompt from prohibited elements
 */
function buildNegativePrompt(brief: CreativeBrief): string {
  const { prohibitedElements, product, brand, localization } = brief;

  const negatives: string[] = [
    'blurry, low quality, pixelated, artifact',
    'deformed food, unappetizing, burnt, raw, spoiled',
    'wrong dish, different food item, different cuisine',
    'different packaging, different container, different portion',
    'fake, plastic, artificial looking food',
    'overexposed, underexposed, harsh flash, bad lighting',
    'cluttered, messy, distracting background',
    'watermark, signature, logo (other than brand logo)',
    'text, numbers, prices (except specified overlays)',
    'cartoon, illustration, painting, sketch, 3d render',
    'unrealistic, fantasy, sci-fi, surreal',
  ];

  // Add prohibited elements from brief
  if (prohibitedElements && prohibitedElements.length > 0) {
    prohibitedElements.forEach((element) => {
      negatives.push(element.toLowerCase());
    });
  }

  // Brand-specific negatives
  if (brand.colors) {
    const nonBrandColors = ['neon pink', 'electric blue', 'toxic green', 'bright purple']
      .filter((c) => !brand.colors?.some((bc) => bc.toLowerCase().includes(c)));
    negatives.push(...nonBrandColors.map((c) => `${c} background`));
  }

  // Localization-specific negatives
  if (localization.regionalStyle === 'hyderabadi') {
    negatives.push('north indian style plating (white plate only)', 'punjabi dhaba style', 'generic restaurant look');
  }

  return negatives.join(', ');
}

/**
 * Build multiple prompts for a campaign (5 posters, story frames, reel frames)
 */
export function buildImagePromptPack(
  brief: CreativeBrief,
  count: number = 5
): ImagePrompt[] {
  const prompts: ImagePrompt[] = [];

  for (let i = 0; i < count; i++) {
    // Create variation by adjusting composition hints
    const variedBrief = varyBriefForIndex(brief, i, count);
    prompts.push(buildImagePrompt(variedBrief));
  }

  return prompts;
}

/**
 * Create variations of the brief for multiple generations
 */
function varyBriefForIndex(brief: CreativeBrief, index: number, total: number): CreativeBrief {
  const variations = [
    { composition: 'centered hero, symmetrical', angle: 'straight-on' },
    { composition: 'rule of thirds, product left', angle: '45-degree top-down' },
    { composition: 'product right, copy left', angle: 'overhead flat-lay' },
    { composition: 'close-up detail, macro', angle: 'close-up, steam focus' },
    { composition: 'lifestyle context, hands interacting', angle: 'serving moment, pour/mix' },
  ];

  const variationIndex = index % variations.length;
  const variation = variations[variationIndex] as { composition: string; angle: string };

  return {
    ...brief,
    visualDirection: {
      ...brief.visualDirection,
      composition: variation.composition,
    },
  };
}

/**
 * Build story frame prompts (sequential)
 */
export function buildStoryFramePrompts(
  brief: CreativeBrief,
  frameCount: number = 4
): ImagePrompt[] {
  const frames: ImagePrompt[] = [];

  const storyArc = [
    { focus: 'hook', description: 'Attention-grabbing opening', visual: 'Problem/craving scenario' },
    { focus: 'product reveal', description: 'Introduce the product', visual: 'Hero product shot' },
    { focus: 'benefit', description: 'Show benefit/experience', visual: 'Enjoyment/consumption' },
    { focus: 'cta', description: 'Call to action', visual: 'WhatsApp/ordering flow' },
  ];

  for (let i = 0; i < Math.min(frameCount, storyArc.length); i++) {
    const arc = storyArc[i] as { focus: string; description: string; visual: string };
    const frameBrief: CreativeBrief = {
      ...brief,
      generationMode: 'story',
      aspectRatio: '9:16',
      visualDirection: {
        ...brief.visualDirection,
        composition: `Story frame ${i + 1}/${frameCount}: ${arc.visual}. ${brief.visualDirection?.composition || ''}`,
      },
    };
    frames.push(buildImagePrompt(frameBrief));
  }

  return frames;
}

/**
 * Build reel frame prompts (sequential scenes)
 */
export function buildReelFramePrompts(
  brief: CreativeBrief,
  frameCount: number = 5
): ImagePrompt[] {
  const frames: ImagePrompt[] = [];

  const reelArc = [
    { scene: 'hook', description: 'Scroll-stopping visual hook (0-3s)', visual: 'Problem/craving/relatable moment' },
    { scene: 'process', description: 'Behind the scenes / preparation (3-8s)', visual: 'Kitchen action, dum process, plating' },
    { scene: 'reveal', description: 'Product hero reveal (8-12s)', visual: 'Steaming product, garnish, portions' },
    { scene: 'enjoyment', description: 'Tasting/enjoyment (12-18s)', visual: 'First bite, satisfied expression' },
    { scene: 'cta', description: 'Offer + WhatsApp CTA (18-30s)', visual: 'Offer graphic, WhatsApp number, location' },
  ];

  for (let i = 0; i < Math.min(frameCount, reelArc.length); i++) {
    const arc = reelArc[i] as { scene: string; description: string; visual: string };
    const frameBrief: CreativeBrief = {
      ...brief,
      generationMode: 'story',
      aspectRatio: '9:16',
      visualDirection: {
        ...brief.visualDirection,
        composition: `Reel scene ${i + 1}/${frameCount} (${arc.scene}): ${arc.visual}. ${arc.description}. ${brief.visualDirection?.composition || ''}`,
      },
    };
    frames.push(buildImagePrompt(frameBrief));
  }

  return frames;
}