import type {
  CreativeAssetRequirement,
  AssetGenerationPrompt,
} from "../types";

export class AssetGenerationPromptBuilder {
  /**
   * Deterministically builds a structured Image/Visual Asset Generation Prompt
   * strictly from a CreativeAssetRequirement artifact.
   *
   * Architecture Rule:
   * Strategy -> Asset Requirement -> Image Prompt Builder -> Image Model
   *
   * The prompt builder NEVER reinvents strategy; it strictly translates
   * strategic visual requirements into execution instructions.
   */
  public buildPrompt(requirement: CreativeAssetRequirement): AssetGenerationPrompt {
    const visualDir = requirement.visualDirection;
    const subject = requirement.subject;

    const brandConstraints: string[] = [
      "Must align with verified brand colors and visual standards",
      "No unauthorized third-party logos or trademarks",
    ];

    const culturalConstraints: string[] = subject.culturalContext
      ? [
          `Cultural region context: ${subject.culturalContext.region}`,
          ...subject.culturalContext.cues.map((cue) => `Include authentic cultural cue: ${cue}`),
        ]
      : ["Ensure authentic local cultural framing without generic Western stock tropes"];

    const negativeConstraints: string[] = [
      ...visualDir.negativeConstraints,
      "text overlay",
      "watermark",
      "synthetic logos",
      "fake price tags",
      "distorted anatomy",
      "unrealistic food presentation",
    ];

    if (subject.prohibitedElements) {
      negativeConstraints.push(...subject.prohibitedElements);
    }

    if (subject.culturalContext?.prohibitedCues) {
      negativeConstraints.push(...subject.culturalContext.prohibitedCues);
    }

    const outputRequirements: string[] = [
      `Aspect ratio: ${requirement.technicalRequirements.aspectRatio}`,
      `Min resolution: ${requirement.technicalRequirements.minWidth}x${requirement.technicalRequirements.minHeight}`,
      `Format: ${requirement.technicalRequirements.format}`,
    ];

    return {
      assetRequirementId: requirement.assetRequirementId,
      systemIntent: `Generate production-grade visual asset for role '${requirement.role}' with purpose '${requirement.purpose}'`,
      subject: subject.primarySubject,
      environment: subject.environment || visualDir.environment,
      composition: visualDir.composition,
      camera: visualDir.camera,
      lighting: visualDir.lighting,
      visualStyle: visualDir.visualStyle,
      emotionalIntent: subject.humanPresence?.emotionalState || "Relief, warmth, togetherness, appetite appeal",
      brandConstraints,
      culturalConstraints,
      negativeConstraints: Array.from(new Set(negativeConstraints)),
      outputRequirements,
      sourceAssetReferences: requirement.sourceRequirements?.requiredAssetIds,
    };
  }
}
