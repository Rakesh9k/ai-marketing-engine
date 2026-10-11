import { OfferStructureSchema } from "../ontology/offer-structure";
import { OntologyRegistry } from "../ontology/ontology-registry";
import type { ValidationIssue } from "./types";

// Prohibited ethical boundaries for offers (as per specification)
const PROHIBITED_BOUNDARIES = [
  "fake scarcity",
  "fake deadlines",
  "fake reference prices",
  "fake discounts",
  "fake bonuses",
  "hidden conditions",
  "bait-and-switch",
  "forced continuity",
  "misleading free",
  "misleading per-person pricing",
  "invented value",
  "fabricated testimonials",
  "fabricated demand",
];

export function validateOfferStructure(offer: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const result = OfferStructureSchema.safeParse(offer);
  if (!result.success) {
    // Collect Zod errors
    result.error.errors.forEach((e) => {
      issues.push({
        path: e.path.join("."),
        message: e.message,
        severity: "error",
      });
    });
    // If schema fails, further checks may be unreliable
    return issues;
  }

  const o: any = result.data;

  // Ethical boundaries check
  const violations = (o.ethicalBoundaries ?? []).filter((b: string) =>
    PROHIBITED_BOUNDARIES.includes(b.toLowerCase())
  );
  if (violations.length) {
    issues.push({
      path: "ethicalBoundaries",
      message: `Prohibited ethical boundaries detected: ${violations.join(", ")}`,
      severity: "error",
    });
  }

  // Reference existence checks for various EntityRef arrays
  const refFields = [
    { field: "bestFor", label: "bestFor" },
    { field: "bestObjectives", label: "bestObjectives" },
    { field: "bestIndustries", label: "bestIndustries" },
    { field: "bestSituations", label: "bestSituations" },
    { field: "compatibleMechanisms", label: "compatibleMechanisms" },
    { field: "compatibleCopyGrammars", label: "compatibleCopyGrammars" },
    { field: "compatibleStoryStructures", label: "compatibleStoryStructures" },
    { field: "compatibleVisualStructures", label: "compatibleVisualStructures" },
    { field: "requiredEvidence", label: "requiredEvidence" },
    { field: "antiPatterns", label: "antiPatterns" },
    { field: "evidence", label: "evidence" },
    { field: "relationships", label: "relationships" },
  ];
  for (const { field, label } of refFields) {
    const refs = (o as any)[field] as any[];
    if (Array.isArray(refs)) {
      refs.forEach((ref, i) => {
        if (!OntologyRegistry.has(ref.type, ref.id)) {
          issues.push({
            path: `${label}[${i}]`,
            message: `Reference to unknown ${ref.type} (id=${ref.id})`,
            severity: "error",
          });
        }
      });
    }
  }

  // Primary lever consistency with margin impact
  if (o.primaryLever === "priceReduction" && o.marginImpact) {
    if (!o.marginImpact.reducesPrice) {
      issues.push({
        path: "marginImpact.reducesPrice",
        message: "primary lever is priceReduction but marginImpact.reducesPrice is false",
        severity: "warning",
      });
    }
  }

  return issues;
}
