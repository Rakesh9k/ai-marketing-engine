import type {
  AssetPlanningInput,
  AssetPlanningResult,
  CreativeAssetPlan,
  CreativeAssetIntent,
  CreativeAssetRequirement,
  CreativeCopyPlan,
  CreativeCompositionPlan,
  CreativeVisualPlan,
  ReelAssetPlan,
  CreativeBrandRequirements,
  CreativeTechnicalRequirements,
  CreativeAssetValidationRequirements,
  AssetSubject,
  AssetVisualDirection,
} from "../types";

import { AssetPlanStatus, AssetRequirementType, AssetRole, AssetGenerationMethod } from "../types";

export class CreativeAssetPlanBuilder {
  /**
   * Deterministically builds a CreativeAssetPlan from locked Creative Strategy,
   * Business Context, Platform Context, and Creative Direction.
   *
   * Principle: The Creative Bank does not generate PNG/SVG/MP4 directly.
   * It produces an Asset Plan that tells the execution engine what assets
   * are required, why they are required, how they should behave, and what
   * constraints they must satisfy.
   */
  public buildAssetPlan(input: AssetPlanningInput): AssetPlanningResult {
    const { creativeDirection, creativeStrategy, platform, format, business, product, offer, brand: _brand } = input;

    if (!creativeDirection || !creativeStrategy) {
      return {
        status: "BLOCKED",
        blockingReasons: [
          {
            code: "LOCKED_STRATEGY_REQUIRED",
            description: "Asset Plan generation requires locked Creative Direction and Creative Strategy",
            source: "SYSTEM",
            severity: "CRITICAL",
            resolvable: true,
          },
        ],
      };
    }

    const coreConcept = (creativeDirection as any).coreConcept || creativeDirection.coreIdea?.statement || creativeStrategy.headlineConcept;
    const targetObjective = (creativeDirection as any).targetObjective || creativeDirection.objective?.desiredAudienceBehavior || "Drive conversions";
    const targetAudienceSummary = (creativeDirection as any).targetAudienceSummary || creativeDirection.audience?.audienceDescription || "Target audience";
    const strategicPremise = (creativeDirection as any).strategicPremise || creativeDirection.coreIdea?.desiredShift || "From hesitation to action";
    const callToAction = (creativeDirection as any).callToAction || (creativeDirection.cta as any)?.primaryText || "Order now";
    const emotionalHook = (creativeDirection as any).emotionalHook || (creativeDirection.psychology as any)?.primaryDriver || "Relief, warmth, ease";

    const intent: CreativeAssetIntent = {
      coreIdea: coreConcept,
      strategicObjective: targetObjective,
      audience: targetAudienceSummary,
      desiredAudienceShift: strategicPremise,
      desiredBehavior: callToAction,
      emotionalTerritory: emotionalHook,
      primaryMessage: coreConcept,
      visualRole: "Dramatize strategic hook & product proof over discount graphics",
    };

    const requirements: CreativeAssetRequirement[] = [];

    // 1. HERO PRODUCT IMAGE / BUSINESS ASSET
    const verifiedProductAsset = business.products?.[0]?.verified ? `asset_prod_${business.products[0].id}` : undefined;
    const heroSubject: AssetSubject = {
      primarySubject: product?.name || business.products?.[0]?.name || business.name,
      secondarySubjects: [business.industry],
      environment: "Warm, authentic dining presentation",
      locationContext: { city: "Hyderabad", region: "Kondapur" },
      culturalContext: {
        region: "Indian / Hyderabad",
        cues: ["Authentic dum biryani handi", "Fresh garnishing", "Family portioning"],
        prohibitedCues: ["Western fine dining props", "Fake discount banners embedded in photo"],
      },
      prohibitedElements: ["Fake countdown timers", "Distorted food texture", "Foreign brand logos"],
    };

    const heroVisualDirection: AssetVisualDirection = {
      composition: "Rule of thirds, product prominent in lower center, negative space on top for headline",
      subjectHierarchy: "Primary food subject center-stage, warm ambient lighting",
      camera: "Medium close-up 50mm",
      framing: "Eye-level medium close-up",
      lighting: "Warm directional studio light",
      environment: "Clean, inviting table setting",
      realism: "High realism food photography",
      visualStyle: "Warm editorial food photography",
      negativeConstraints: ["text in image", "cluttered background", "watermarks"],
    };

    requirements.push({
      assetRequirementId: `req_hero_${Date.now()}_1`,
      type: AssetRequirementType.HERO_IMAGE,
      role: AssetRole.PRODUCT_PROOF,
      purpose: `Make the ${product?.name || "product"} immediately desirable and visually authentic`,
      required: true,
      quantity: 1,
      subject: heroSubject,
      visualDirection: heroVisualDirection,
      generationMethod: verifiedProductAsset ? AssetGenerationMethod.EXISTING_BUSINESS_ASSET : AssetGenerationMethod.GENERATED_IMAGE,
      sourceRequirements: {
        sourceType: verifiedProductAsset ? "VERIFIED_BUSINESS_ASSET" : "GENERATED",
        requiredAssetIds: verifiedProductAsset ? [verifiedProductAsset] : undefined,
        authenticityRequired: true,
      },
      compositionRole: "MAIN_SUBJECT",
      copyRelationship: "ADJACENT_TO_ASSET",
      technicalRequirements: {
        minWidth: 1080,
        minHeight: 1080,
        aspectRatio: (format as any).aspectRatioConstraints?.[0] || "1:1",
        format: "PNG",
      },
      validationRequirements: {
        subjectAccuracyRequired: true,
        brandComplianceRequired: true,
        truthVerificationRequired: true,
        prohibitedContentFilter: true,
      },
      priority: "P0_CRITICAL",
      dependencies: [],
    });

    // 2. CONTEXTUAL FAMILY / EMOTIONAL SCENE IMAGE
    const contextSubject: AssetSubject = {
      primarySubject: "Family sharing meal at home",
      environment: "Comfortable urban family dining setting",
      humanPresence: {
        required: true,
        count: 3,
        demographicDescription: "Young Indian family (parents + child)",
        action: "Enjoying meal together at dinner table",
        emotionalState: "Relaxed, happy, connected",
        framing: "Medium-wide contextual shot",
      },
      culturalContext: {
        region: "Urban Indian",
        cues: ["Contemporary Indian home interior", "Shared family combo packaging"],
        prohibitedCues: ["Generic Western dining tropes"],
      },
    };

    requirements.push({
      assetRequirementId: `req_context_${Date.now()}_2`,
      type: AssetRequirementType.CONTEXTUAL_IMAGE,
      role: AssetRole.EMOTIONAL_PROOF,
      purpose: "Dramatize the emotional relief of effortless family weekend dinner",
      required: true,
      quantity: 1,
      subject: contextSubject,
      visualDirection: {
        ...heroVisualDirection,
        composition: "Contextual medium shot showing happy family interaction",
        subjectHierarchy: "Family connection primary, food secondary in center",
      },
      generationMethod: AssetGenerationMethod.GENERATED_IMAGE,
      compositionRole: "HERO_BACKGROUND",
      copyRelationship: "SUPERIMPOSED_OVER_ASSET",
      technicalRequirements: {
        minWidth: 1080,
        minHeight: 1080,
        aspectRatio: (format as any).aspectRatioConstraints?.[0] || "1:1",
        format: "JPG",
      },
      validationRequirements: {
        subjectAccuracyRequired: true,
        brandComplianceRequired: true,
        truthVerificationRequired: false,
        prohibitedContentFilter: true,
      },
      priority: "P1_HIGH",
      dependencies: [],
    });

    // 3. LOGO (Verified Business Asset Priority)
    requirements.push({
      assetRequirementId: `req_logo_${Date.now()}_3`,
      type: AssetRequirementType.LOGO,
      role: AssetRole.BRANDING,
      purpose: `Identify ${business.name} with verified authentic brand logo`,
      required: true,
      quantity: 1,
      subject: { primarySubject: `${business.name} Official Logo` },
      visualDirection: {
        composition: "Top right or bottom right corner placement",
        subjectHierarchy: "Clear brand anchor",
        framing: "Clean vector cutout",
        lighting: "Flat daylight",
        environment: "Transparent background",
        realism: "Vector graphics",
        negativeConstraints: ["distortion", "recoloration"],
      },
      generationMethod: AssetGenerationMethod.EXISTING_BUSINESS_ASSET,
      sourceRequirements: {
        sourceType: "VERIFIED_BUSINESS_ASSET",
        authenticityRequired: true,
      },
      compositionRole: "BRAND_HEADER",
      copyRelationship: "INDEPENDENT_CONTAINER",
      technicalRequirements: {
        minWidth: 300,
        minHeight: 100,
        aspectRatio: "3:1",
        format: "PNG",
        transparentBackground: true,
      },
      validationRequirements: {
        subjectAccuracyRequired: true,
        brandComplianceRequired: true,
        truthVerificationRequired: true,
        prohibitedContentFilter: true,
      },
      priority: "P0_CRITICAL",
      dependencies: [],
    });

    // 4. COPY PLAN (Deterministic Text Requirements)
    const copyPlan: CreativeCopyPlan = {
      headline: {
        role: "HEADLINE",
        purpose: "Hook target audience with key emotional benefit",
        content: coreConcept,
        requiredInformation: [coreConcept],
        prohibitedClaims: ["fake scarcity", "unverified discount", "fake countdown"],
        maxLength: 60,
        tone: "Warm, direct, reassuring",
        truthRequirements: [],
      },
      supportingCopy: {
        role: "SUPPORT",
        purpose: "Elaborate value proposition",
        content: strategicPremise,
        requiredInformation: [],
        prohibitedClaims: [],
        maxLength: 100,
        truthRequirements: [],
      },
      offerCopy: offer
        ? {
            role: "OFFER",
            purpose: "Present clear commercial offer",
            content: `${(offer as any).offerTitle || (offer as any).discountValue || "Special Combo"}`,
            requiredInformation: [(offer as any).offerTitle || ""],
            prohibitedClaims: ["expired offer"],
            maxLength: 40,
            truthRequirements: [],
          }
        : undefined,
      cta: {
        role: "CTA",
        purpose: "Convert viewer intention into direct order action",
        content: callToAction,
        requiredInformation: [callToAction],
        prohibitedClaims: [],
        maxLength: 25,
        truthRequirements: [],
      },
    };

    // 5. COMPOSITION PLAN
    const compositionPlan: CreativeCompositionPlan = {
      canvas: {
        width: 1080,
        height: 1080,
        aspectRatio: (format as any).aspectRatioConstraints?.[0] || "1:1",
        dpi: 300,
      },
      layout: {
        gridColumns: 12,
        gridRows: 12,
        layoutPattern: "HERO_TOP_OFFER_BOTTOM",
      },
      hierarchy: {
        primaryFocus: requirements[0].assetRequirementId,
        secondaryFocus: [requirements[1].assetRequirementId],
        readingOrder: [requirements[0].assetRequirementId],
      },
      regions: [
        {
          regionId: "region_headline",
          role: "HEADLINE",
          position: { x: 54, y: 54, unit: "PX" },
          dimensions: { width: 972, height: 180 },
          priority: 1,
          allowedAssets: [],
          allowedCopy: ["HEADLINE"],
          constraints: ["Top safe area", "High contrast"],
        },
        {
          regionId: "region_hero",
          role: "HERO",
          position: { x: 54, y: 250, unit: "PX" },
          dimensions: { width: 972, height: 500 },
          priority: 0,
          allowedAssets: [requirements[0].assetRequirementId],
          allowedCopy: [],
          constraints: ["Center focus"],
        },
        {
          regionId: "region_cta",
          role: "CTA",
          position: { x: 54, y: 880, unit: "PX" },
          dimensions: { width: 972, height: 140 },
          priority: 2,
          allowedAssets: [],
          allowedCopy: ["CTA", "OFFER"],
          constraints: ["Bottom safe area", "High visibility button"],
        },
      ],
      assetPlacements: [
        {
          assetRequirementId: requirements[0].assetRequirementId,
          regionId: "region_hero",
          fitMode: "COVER",
          zIndex: 1,
        },
      ],
      copyPlacements: [
        {
          role: "HEADLINE",
          regionId: "region_headline",
          fontFamily: "Inter, sans-serif",
          fontSize: 42,
          colorHex: "#111827",
          textAlign: "LEFT",
          zIndex: 10,
        },
        {
          role: "CTA",
          regionId: "region_cta",
          fontFamily: "Inter, sans-serif",
          fontSize: 28,
          colorHex: "#FFFFFF",
          textAlign: "CENTER",
          zIndex: 10,
        },
      ],
      logoPlacement: {
        assetRequirementId: requirements[2].assetRequirementId,
        regionId: "region_headline",
        position: "TOP_RIGHT",
        maxHeight: 60,
      },
      safeAreas: [
        { top: 40, bottom: 40, left: 40, right: 40, unit: "PX" },
      ],
      responsiveVariants: [],
    };

    // 6. VISUAL PLAN
    const visualPlan: CreativeVisualPlan = {
      styleName: "Warm Authentic Editorial",
      colorPalette: {
        primary: "#D97706",
        secondary: "#92400E",
        accent: "#F59E0B",
        background: "#FFFBEB",
        text: "#1F2937",
      },
      typography: {
        headingFont: "Plus Jakarta Sans, sans-serif",
        bodyFont: "Inter, sans-serif",
        ctaFont: "Plus Jakarta Sans, sans-serif",
      },
      mood: "Warm, appetizing, trustworthy, family-friendly",
    };

    // 7. REEL PLAN (If video format)
    let reelPlan: ReelAssetPlan | undefined = undefined;
    if (format.type === "REEL" || format.type === "VIDEO") {
      reelPlan = {
        duration: { minSeconds: 5, maxSeconds: 15, recommendedSeconds: 10 },
        scenes: [
          {
            sceneId: "scene_1",
            sequenceOrder: 1,
            durationSeconds: 3,
            purpose: "Hook audience with warm family arrival & food reveal",
            primaryAssetId: requirements[1].assetRequirementId,
            textOverlay: copyPlan.headline.content,
          },
          {
            sceneId: "scene_2",
            sequenceOrder: 2,
            durationSeconds: 4,
            purpose: "Show appetite appeal of authentic food combo",
            primaryAssetId: requirements[0].assetRequirementId,
          },
          {
            sceneId: "scene_3",
            sequenceOrder: 3,
            durationSeconds: 3,
            purpose: "Present offer & direct CTA",
            primaryAssetId: requirements[0].assetRequirementId,
            textOverlay: copyPlan.cta.content,
          },
        ],
        assets: [requirements[0].assetRequirementId, requirements[1].assetRequirementId],
        transitions: [
          { fromSceneId: "scene_1", toSceneId: "scene_2", type: "DISSOLVE", durationSeconds: 0.5 },
          { fromSceneId: "scene_2", toSceneId: "scene_3", type: "CUT", durationSeconds: 0 },
        ],
        textTiming: [
          { sceneId: "scene_1", textRole: "HEADLINE", startTimeSeconds: 0.5, endTimeSeconds: 2.8, animationType: "FADE_IN" },
          { sceneId: "scene_3", textRole: "CTA", startTimeSeconds: 7.2, endTimeSeconds: 9.8, animationType: "SLIDE_UP" },
        ],
        motionRequirements: [
          { sceneId: "scene_2", assetId: requirements[0].assetRequirementId, motionType: "SLOW_ZOOM_IN" },
        ],
      };
    }

    const brandRequirements: CreativeBrandRequirements = {
      brandName: business.name,
      logoRequired: true,
      verifiedLogoId: verifiedProductAsset,
      brandColors: [visualPlan.colorPalette.primary, visualPlan.colorPalette.secondary],
      prohibitedWords: ["cheap", "untrustworthy", "fake"],
      mandatoryDisclaimers: [],
    };

    const technicalRequirements: CreativeTechnicalRequirements = {
      platform: platform.name,
      format: format.name,
      targetAspectRatio: (format as any).aspectRatioConstraints?.[0] || "1:1",
      maxTotalSizeMb: 15,
    };

    const validationRequirements: CreativeAssetValidationRequirements = {
      requireAllCriticalAssets: true,
      minAssetCount: requirements.length,
      truthVerificationRequired: true,
      brandSafetyRequired: true,
    };

    const assetPlan: CreativeAssetPlan = {
      assetPlanId: `plan_${input.business.businessId}_${Date.now()}`,
      sessionId: `sess_${Date.now()}`,
      revision: 1,
      strategyId: creativeStrategy.strategyId || `strat_${Date.now()}`,
      confirmationId: `conf_${Date.now()}`,
      platform,
      format,
      creativeIntent: intent,
      requirements,
      compositionPlan,
      copyPlan,
      visualPlan,
      reelPlan,
      brandRequirements,
      technicalRequirements,
      validationRequirements,
      policyVersions: [{ entityName: "CreativeAssetPlanPolicy", version: 1 }],
      status: AssetPlanStatus.READY,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      status: "SUCCESS",
      assetPlan,
    };
  }
}
