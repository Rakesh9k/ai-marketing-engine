import { OntologyRegistry } from "../ontology/ontology-registry";
import type { StyleSystem } from "../ontology/style-system";

// Helper to create a StyleSystem object
function createStyle(data: any): any {
  return data;
}

const styleSystems: StyleSystem[] = [
  // 01 Warm Editorial
  createStyle({
    id: "style-001",
    name: "Warm Editorial",
    definition: "A restrained editorial visual language combining warmth, humanity, considered typography, natural imagery, intentional whitespace, and subtle material texture.",
    visualIdentity: "Warm, handcrafted, editorial",
    emotionalCharacter: ["warm", "considered", "human", "crafted", "quietly premium"],
    brandPerception: ["premium", "approachable", "authentic"],
    typography: {
      primaryRole: "headline",
      displayCharacter: "EDITORIAL",
      hierarchy: "Display → Headline → Supporting → Detail → CTA",
      weightBehavior: "light/regular display, medium supporting, restrained bold emphasis",
      sizeBehavior: "large editorial headlines, moderate body",
      lineHeightBehavior: "generous line spacing",
      trackingBehavior: "standard",
      caseBehavior: "MIXED",
      alignmentBehavior: "left/aligned",
      maximumFontFamilies: 2,
      emphasisTechnique: ["italic", "bold"],
      typographyRisks: ["overly decorative fonts"]
    },
    colorBehavior: {
      paletteCharacter: "warm neutrals",
      dominantRole: "warm neutral foundation",
      accentRole: "restrained brand or earthy accent",
      backgroundBehavior: "soft, natural",
      contrastLevel: "MEDIUM",
      saturation: "MUTED",
      temperature: "WARM",
      colorRatio: "70% neutrals, 30% accent",
      accentUsage: "controlled",
      gradientUsage: "rare",
      photographicColorInteraction: "warm natural tones",
      avoidColors: ["neon"],
      brandColorAdaptation: "accent adapts to brand colors"
    },
    composition: {
      density: "BALANCED",
      alignment: "EDITORIAL",
      whitespace: "ABUNDANT",
      focalPoint: "strong image",
      hierarchy: "visual hierarchy emphasized",
      edgeBehavior: "soft cropping",
      layering: "minimal",
      cropping: "intentional",
      balance: "asymmetrical",
      visualTension: "subtle"
    },
    spacing: {
      overallDensity: "AIRY",
      marginBehavior: "large margins",
      paddingBehavior: "generous padding",
      sectionSpacing: "spacious",
      textSpacing: "high line spacing",
      elementGrouping: "clear groups",
      rhythm: "deliberate"
    },
    imageTreatment: {
      cropStyle: "natural",
      framing: "soft",
      subjectScale: "medium",
      contrast: "soft",
      saturation: "muted",
      colorGrade: "warm",
      sharpness: "moderate",
      backgroundTreatment: "light texture",
      overlays: [],
      masks: [],
      borders: "none",
      layering: "minimal"
    },
    texture: {
      presence: "SUBTLE",
      type: ["paper", "film"],
      purpose: "adds tactile warmth",
      scale: "fine",
      opacityBehavior: "low",
      interactionWithPhotography: "enhances warmth",
      interactionWithTypography: "supports readability"
    },
    motion: {
      energy: "CALM",
      entranceBehavior: ["slow reveal"],
      exitBehavior: ["fade out"],
      transitionBehavior: ["soft cross‑fade"],
      cameraMovement: ["subtle parallax"],
      textMovement: ["gentle scale"],
      imageMovement: ["slow pan"],
      pacing: "moderate",
      easingCharacter: "ease‑out",
      repetition: "minimal",
      motionIntensity: "low",
      motionAntiPatterns: ["jarring cuts"]
    },
    shapeLanguage: {
      geometry: "MIXED",
      corners: "SOFT",
      borders: "none",
      containers: "simple",
      masks: [],
      decorativeShapes: [],
      visualMotifs: []
    },
    photography: {
      subjectMatter: ["people", "products", "environments"],
      cameraCharacter: "natural",
      framing: "loose",
      perspective: "eye level",
      lighting: "soft natural",
      depthOfField: "shallow",
      humanPresence: "CENTRAL",
      authenticityLevel: "high",
      environmentImportance: "medium",
      imperfectionTolerance: "low"
    },
    illustration: {
      usage: "ACCENT",
      character: "hand‑drawn",
      lineQuality: "soft",
      geometry: "organic",
      detailLevel: "moderate",
      colorBehavior: "muted",
      interactionWithPhotography: "complementary"
    },
    lighting: {
      character: "SOFT",
      direction: "diffused",
      contrast: "medium",
      shadowBehavior: "soft shadows",
      highlightBehavior: "warm highlights",
      practicalLightUsage: "natural window light"
    },
    depth: {
      dimensionality: "LAYERED",
      foregroundUsage: "focused subject",
      backgroundBehavior: "soft blur",
      overlap: "minimal",
      shadows: "subtle",
      blur: "light",
      parallaxPotential: "low"
    },
    contrast: {
      tonalContrast: "moderate",
      colorContrast: "balanced",
      typographicContrast: "clear hierarchy",
      scaleContrast: "subtle",
      densityContrast: "balanced",
      subjectBackgroundSeparation: "soft"
    },
    hierarchy: {
      primaryAttention: "hero image",
      secondaryAttention: "headline",
      tertiaryAttention: "supporting copy",
      focalStrategy: "visual‑first",
      readingDirection: "LTR",
      hierarchyMechanisms: ["size", "weight", "color"]
    },
    bestFor: ["food", "lifestyle", "beauty", "premium local businesses", "craft", "hospitality"],
    bestObjectives: ["brand awareness", "engagement", "premium positioning"],
    bestIndustries: ["restaurant", "cafe", "bakery", "hospitality"],
    bestAudienceStates: ["consideration", "interest"],
    bestSituations: ["seasonal promotion", "new product launch"],
    compatibleVisualStructures: ["Hero Reveal", "Before / After", "Proof Wall", "Grid"],
    compatibleStoryStructures: ["Problem → Solution", "Transformation"],
    compatibleCopyStructures: ["Problem → Empathy → Solution", "Claim → Proof → Benefit"],
    compatibleMechanisms: ["emotional", "social proof"],
    compatiblePsychology: ["warmth", "trust"],
    incompatibleStyles: [],
    strengths: ["warmth", "human connection", "subtle elegance"],
    weaknesses: ["may be perceived as low‑energy"],
    risks: ["visual quietness may reduce urgency"],
    antiPatterns: ["visual clutter", "aggressive discount badges", "generic AI imagery"],
    ethicalBoundaries: ["no fake scarcity", "no misleading discount"],
    assetRequirements: [{ type: "photography", quantity: 3, description: "high‑quality warm‑toned images" }],
    adaptability: {
      supportsBrandColorAdaptation: true,
      supportsTypographyAdaptation: true,
      supportsPhotographyAdaptation: true,
      supportsPlatformAdaptation: true,
      supportsCulturalAdaptation: true,
      supportsIndustryAdaptation: true,
      rigidElements: ["warm palette character"],
      flexibleElements: ["accent colors", "fonts"]
    },
    evidence: [],
    assumptions: [],
    confidence: "strong_evidence",
    status: "active",
    relationships: []
  }),
  // 02 Premium Minimal (abridged example)
  createStyle({
    id: "style-002",
    name: "Premium Minimal",
    definition: "A sleek, restrained visual language emphasizing minimal information density, generous whitespace, and refined typography.",
    visualIdentity: "Minimalist premium",
    emotionalCharacter: ["refined", "calm", "exclusive"],
    brandPerception: ["high‑end", "modern"],
    typography: {
      primaryRole: "headline",
      displayCharacter: "GEOMETRIC",
      hierarchy: "Display → Headline → Detail",
      weightBehavior: "light display, medium body, bold emphasis where needed",
      sizeBehavior: "large headline, moderate body",
      lineHeightBehavior: "tight",
      trackingBehavior: "standard",
      caseBehavior: "UPPERCASE",
      alignmentBehavior: "center",
      maximumFontFamilies: 1,
      emphasisTechnique: ["bold"],
      typographyRisks: []
    },
    colorBehavior: {
      paletteCharacter: "neutral with subtle accent",
      dominantRole: "light neutral",
      accentRole: "brand accent",
      backgroundBehavior: "clean",
      contrastLevel: "HIGH",
      saturation: "MUTED",
      temperature: "NEUTRAL",
      colorRatio: "80/20",
      accentUsage: "sparingly",
      gradientUsage: "subtle",
      photographicColorInteraction: "neutral tones",
      brandColorAdaptation: "accent adapts"
    },
    composition: {
      density: "MINIMAL",
      alignment: "GRID",
      whitespace: "ABUNDANT",
      focalPoint: "central image",
      hierarchy: "clear",
      edgeBehavior: "sharp",
      layering: "none",
      cropping: "tight",
      balance: "symmetrical",
      visualTension: "low"
    },
    spacing: {
      overallDensity: "AIRY",
      marginBehavior: "large",
      paddingBehavior: "ample",
      sectionSpacing: "spacious",
      textSpacing: "generous",
      elementGrouping: "clear",
      rhythm: "steady"
    },
    imageTreatment: {
      cropStyle: "tight",
      framing: "centered",
      subjectScale: "medium",
      contrast: "high",
      saturation: "muted",
      colorGrade: "neutral",
      sharpness: "high",
      backgroundTreatment: "plain",
      overlays: [],
      masks: [],
      borders: "none",
      layering: "none"
    },
    texture: { presence: "NONE", type: [], purpose: "clean", scale: "none", opacityBehavior: "none", interactionWithPhotography: "none", interactionWithTypography: "none" },
    motion: {
      energy: "CALM",
      entranceBehavior: ["fade in"],
      exitBehavior: ["fade out"],
      transitionBehavior: ["cross‑fade"],
      cameraMovement: [],
      textMovement: [],
      imageMovement: [],
      pacing: "slow",
      easingCharacter: "ease‑in‑out",
      repetition: "none",
      motionIntensity: "low",
      motionAntiPatterns: []
    },
    shapeLanguage: { geometry: "GEOMETRIC", corners: "SHARP", borders: "none", containers: "simple", masks: [], decorativeShapes: [], visualMotifs: [] },
    photography: { subjectMatter: ["product"], cameraCharacter: "clean", framing: "centered", perspective: "eye level", lighting: "soft", depthOfField: "shallow", humanPresence: "NONE", authenticityLevel: "high", environmentImportance: "low", imperfectionTolerance: "low" },
    illustration: { usage: "NONE", character: "", lineQuality: "", geometry: "", detailLevel: "", colorBehavior: "", interactionWithPhotography: "" },
    lighting: { character: "SOFT", direction: "front", contrast: "medium", shadowBehavior: "soft", highlightBehavior: "subtle", practicalLightUsage: "studio" },
    depth: { dimensionality: "LAYERED", foregroundUsage: "focus", backgroundBehavior: "blurred", overlap: "none", shadows: "soft", blur: "light", parallaxPotential: "low" },
    contrast: { tonalContrast: "high", colorContrast: "high", typographicContrast: "high", scaleContrast: "moderate", densityContrast: "low", subjectBackgroundSeparation: "clear" },
    hierarchy: { primaryAttention: "hero image", secondaryAttention: "headline", tertiaryAttention: "detail", focalStrategy: "centered", readingDirection: "LTR", hierarchyMechanisms: ["size", "weight"] },
    bestFor: ["tech products", "luxury services", "B2B software"],
    bestObjectives: ["brand positioning", "lead generation"],
    bestIndustries: ["technology", "finance"],
    bestAudienceStates: ["consideration", "evaluation"],
    bestSituations: ["product launch"],
    compatibleVisualStructures: ["Hero Reveal", "Product Journey"],
    compatibleStoryStructures: ["Problem → Solution"],
    compatibleCopyStructures: ["Claim → Proof → Benefit"],
    compatibleMechanisms: ["clarity", "authority"],
    compatiblePsychology: ["trust", "authority"],
    incompatibleStyles: [],
    strengths: ["clarity", "premium feel"],
    weaknesses: ["may feel cold"],
    risks: ["overly sterile"],
    antiPatterns: ["excessive ornamentation"],
    ethicalBoundaries: ["no fake urgency"],
    assetRequirements: [{ type: "photography", quantity: 2, description: "high‑resolution product shots" }],
    adaptability: {
      supportsBrandColorAdaptation: true,
      supportsTypographyAdaptation: true,
      supportsPhotographyAdaptation: true,
      supportsPlatformAdaptation: true,
      supportsCulturalAdaptation: true,
      supportsIndustryAdaptation: true,
      rigidElements: ["minimal density"],
      flexibleElements: ["accent colors"]
    },
    evidence: [],
    assumptions: [],
    confidence: "strong_evidence",
    status: "active",
    relationships: []
  })
  // Additional styles (03‑30) can be added following the same pattern.
];

export function registerStyleSystems() {
  for (const style of styleSystems) {
    OntologyRegistry.register("style_system", style);
  }
}

// Auto‑register on module load
registerStyleSystems();
