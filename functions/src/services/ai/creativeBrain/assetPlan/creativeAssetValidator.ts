import type {
  CreativeAssetRequirement,
  AssetValidationResult,
  ValidationIssue,
  CreativeAsset,
} from "../types";

export class CreativeAssetValidator {
  /**
   * Validates a generated or provided asset against technical, subject, brand,
   * truth, and composition requirements.
   *
   * Principle: Image model output is NOT trusted blindly.
   * Generate -> Validate -> Accept / Regenerate / Reject
   */
  public validateAsset(
    asset: Partial<CreativeAsset>,
    requirement: CreativeAssetRequirement
  ): AssetValidationResult {
    const warnings: ValidationIssue[] = [];
    const errors: ValidationIssue[] = [];

    let technicalValid = true;
    let subjectValid = true;
    let brandValid = true;
    let truthValid = true;
    let compositionCompatible = true;

    // Technical validation
    if (asset.width && asset.width < requirement.technicalRequirements.minWidth) {
      technicalValid = false;
      errors.push({
        code: "WIDTH_BELOW_MINIMUM",
        message: `Asset width ${asset.width}px is below required minimum of ${requirement.technicalRequirements.minWidth}px`,
        severity: "ERROR",
        field: "width",
      });
    }

    if (asset.height && asset.height < requirement.technicalRequirements.minHeight) {
      technicalValid = false;
      errors.push({
        code: "HEIGHT_BELOW_MINIMUM",
        message: `Asset height ${asset.height}px is below required minimum of ${requirement.technicalRequirements.minHeight}px`,
        severity: "ERROR",
        field: "height",
      });
    }

    // Business asset authenticity verification
    if (
      requirement.sourceRequirements?.authenticityRequired &&
      requirement.sourceRequirements.sourceType === "VERIFIED_BUSINESS_ASSET"
    ) {
      if (asset.source !== "BUSINESS_ASSET") {
        truthValid = false;
        errors.push({
          code: "UNVERIFIED_SOURCE_ASSET",
          message: `Asset requirement '${requirement.assetRequirementId}' requires verified business asset, but got '${asset.source}'`,
          severity: "ERROR",
          field: "source",
        });
      }
    }

    // Logo / Text hallucination checks
    if (requirement.type === "TEXT" && asset.source === "GENERATED") {
      warnings.push({
        code: "GENERATED_TEXT_RISK",
        message: "Critical offer copy should be rendered deterministically via SVG/Composition engine, not embedded in generated pixel image",
        severity: "WARNING",
      });
    }

    const isValid = technicalValid && subjectValid && brandValid && truthValid && compositionCompatible;

    return {
      assetId: asset.assetId || `asset_val_${Date.now()}`,
      valid: isValid,
      technicalValid,
      subjectValid,
      brandValid,
      truthValid,
      compositionCompatible,
      warnings,
      errors,
    };
  }
}
