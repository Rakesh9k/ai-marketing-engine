// Combination Rules Registry
// This module registers initial CombinationRule instances for the Combination Rules Engine (Phase 10.14).
// It follows the same pattern used by other intelligence layers (e.g., styleStructureRegistry).

import { OntologyRegistry } from "../ontology/ontology-registry";
import { CombinationRuleSchema, CombinationRelationshipEnum, ComponentTypeEnum, ComponentRoleEnum, RulePriorityEnum } from "../ontology/combination.types";

// Helper to create and register a rule safely
function registerCombinationRule(rule: any) {
  const parseResult = CombinationRuleSchema.safeParse(rule);
  if (!parseResult.success) {
    console.error("CombinationRule validation failed:", parseResult.error.format());
    throw new Error("Invalid CombinationRule definition");
  }
  OntologyRegistry.register("combination_rule", parseResult.data);
}

// ---------- Example Rules ---------- //
// 1. Curiosity Gap + Reveal + Product Demonstration => RECOMMENDED
registerCombinationRule({
  id: "CR01",
  name: "Curiosity Gap → Reveal → Product Demonstration",
  definition: "A curiosity gap that is later resolved by a reveal, followed by a product demonstration creates a strong discovery‑oriented flow.",
  relationship: CombinationRelationshipEnum.enum.RECOMMENDED,
  components: [
    { type: ComponentTypeEnum.enum.MECHANISM, id: "CuriosityGap", role: ComponentRoleEnum.enum.PRIMARY },
    { type: ComponentTypeEnum.enum.MECHANISM, id: "Reveal", role: ComponentRoleEnum.enum.SECONDARY },
    { type: ComponentTypeEnum.enum.MECHANISM, id: "ProductDemonstration", role: ComponentRoleEnum.enum.SUPPORTING },
  ],
  requiredConditions: [],
  preferredConditions: [],
  excludedConditions: [],
  strategicPurpose: "Discovery & education",
  expectedEffect: "Builds interest, resolves information gap, and proves value",
  rationale: "The curiosity gap creates an information gap, the reveal satisfies it, and the demonstration materialises the solution.",
  strengths: ["Creates tension", "Provides logical resolution", "Shows product in context"],
  weaknesses: ["Requires accurate reveal to avoid disappointment"],
  risks: ["If reveal is weak, curiosity may turn into frustration"],
  antiPatterns: [],
  ethicalBoundaries: [],
  requiredEvidence: [],
  assumptions: [],
  exceptions: [],
  compatibleWith: [],
  conflictsWith: [],
  evidence: [],
  confidence: "MEDIUM" as const,
  status: "ACTIVE" as const,
  relationships: [CombinationRelationshipEnum.enum.RECOMMENDED],
  priority: RulePriorityEnum.enum.STRATEGIC,
});

// 2. Social Proof + Specific Number (verified) => RECOMMENDED
registerCombinationRule({
  id: "SP01",
  name: "Verified Social Proof with Specific Number",
  definition: "When social proof includes a verified specific number, the claim gains credibility and can be recommended.",
  relationship: CombinationRelationshipEnum.enum.RECOMMENDED,
  components: [
    { type: ComponentTypeEnum.enum.MECHANISM, id: "SocialProof", role: ComponentRoleEnum.enum.PRIMARY },
    { type: ComponentTypeEnum.enum.COPY, id: "SpecificNumber", role: ComponentRoleEnum.enum.SECONDARY },
  ],
  requiredConditions: [],
  preferredConditions: [],
  excludedConditions: [],
  strategicPurpose: "Build trust through quantifiable evidence",
  expectedEffect: "Increases perceived popularity and reliability",
  rationale: "A verified number eliminates the risk of deceptive claims while reinforcing the social proof.",
  strengths: ["Quantifiable credibility", "Easy to understand"],
  weaknesses: ["Requires verification"],
  risks: [],
  antiPatterns: [],
  ethicalBoundaries: [],
  requiredEvidence: [
    {
      claim: "specific number",
      evidenceType: "VERIFIED_BUSINESS_FACT",
      required: true,
      verificationStatus: "VERIFIED",
    },
  ],
  assumptions: [],
  exceptions: [],
  compatibleWith: [],
  conflictsWith: [],
  evidence: [],
  confidence: "HIGH" as const,
  status: "ACTIVE" as const,
  relationships: [CombinationRelationshipEnum.enum.RECOMMENDED],
  priority: RulePriorityEnum.enum.ETHICAL,
});

// 3. Social Proof + Specific Number (unverified) => FORBIDDEN
registerCombinationRule({
  id: "SP02",
  name: "Unverified Social Proof with Specific Number",
  definition: "Presenting a specific number without verification is deceptive and must be forbidden.",
  relationship: CombinationRelationshipEnum.enum.FORBIDDEN,
  components: [
    { type: ComponentTypeEnum.enum.MECHANISM, id: "SocialProof", role: ComponentRoleEnum.enum.PRIMARY },
    { type: ComponentTypeEnum.enum.COPY, id: "SpecificNumber", role: ComponentRoleEnum.enum.CONSTRAINT },
  ],
  requiredConditions: [],
  preferredConditions: [],
  excludedConditions: [],
  strategicPurpose: "Prevent deceptive claims",
  expectedEffect: "None – must be blocked",
  rationale: "Unverified numbers breach truth and ethical constraints.",
  strengths: [],
  weaknesses: [],
  risks: ["Legal risk", "Brand damage"],
  antiPatterns: [],
  ethicalBoundaries: ["Truth constraint"],
  requiredEvidence: [
    {
      claim: "specific number",
      evidenceType: "VERIFIED_BUSINESS_FACT",
      required: true,
      verificationStatus: "UNVERIFIED",
    },
  ],
  assumptions: [],
  exceptions: [],
  compatibleWith: [],
  conflictsWith: [],
  evidence: [],
  confidence: "HIGH" as const,
  status: "ACTIVE" as const,
  relationships: [CombinationRelationshipEnum.enum.FORBIDDEN],
  priority: RulePriorityEnum.enum.TRUTH,
});

// 4. Fake Scarcity + Countdown => FORBIDDEN (ethical violation)
registerCombinationRule({
  id: "FA01",
  name: "Fake Scarcity with Countdown",
  definition: "Artificial scarcity combined with a countdown is a deceptive practice and must never be used.",
  relationship: CombinationRelationshipEnum.enum.FORBIDDEN,
  components: [
    { type: ComponentTypeEnum.enum.ANTIPATTERN, id: "FakeScarcity", role: ComponentRoleEnum.enum.CONSTRAINT },
    { type: ComponentTypeEnum.enum.MECHANISM, id: "Countdown", role: ComponentRoleEnum.enum.CONSTRAINT },
  ],
  requiredConditions: [],
  preferredConditions: [],
  excludedConditions: [],
  strategicPurpose: "Prevent deceptive urgency",
  expectedEffect: "None – must be blocked",
  rationale: "Both elements create a false sense of limited supply, violating ethical rules.",
  strengths: [],
  weaknesses: [],
  risks: ["Consumer deception", "Regulatory violation"],
  antiPatterns: [],
  ethicalBoundaries: ["Ethical constraint"],
  requiredEvidence: [],
  assumptions: [],
  exceptions: [],
  compatibleWith: [],
  conflictsWith: [],
  evidence: [],
  confidence: "HIGH" as const,
  status: "ACTIVE" as const,
  relationships: [CombinationRelationshipEnum.enum.FORBIDDEN],
  priority: RulePriorityEnum.enum.ETHICAL,
});

// 5. Luxury Style + Aggressive Discount => AVOID (strategic tension)
registerCombinationRule({
  id: "LU01",
  name: "Luxury Style with Aggressive Discount",
  definition: "Combining a premium visual style with an aggressive discount can create brand tension; it is generally avoidable unless explicitly justified.",
  relationship: CombinationRelationshipEnum.enum.AVOID,
  components: [
    { type: ComponentTypeEnum.enum.STYLE, id: "Luxury", role: ComponentRoleEnum.enum.PRIMARY },
    { type: ComponentTypeEnum.enum.MECHANISM, id: "AggressiveDiscount", role: ComponentRoleEnum.enum.SECONDARY },
  ],
  requiredConditions: [],
  preferredConditions: [],
  excludedConditions: [],
  strategicPurpose: "Maintain premium perception",
  expectedEffect: "Potential brand dilution",
  rationale: "A luxury aesthetic signals exclusivity, while an aggressive discount signals price sensitivity – the signals conflict.",
  strengths: [],
  weaknesses: [],
  risks: ["Brand positioning erosion", "Customer confusion"],
  antiPatterns: [],
  ethicalBoundaries: [],
  requiredEvidence: [],
  assumptions: [],
  exceptions: [
    {
      description: "Limited‑time luxury‑exclusive offer where discount is positioned as a member benefit",
      condition: {
        type: "ONLY_IF",
        field: "audience.segment",
        operator: "EQ",
        value: "LOYAL_CUSTOMERS",
        reason: "Brand‑trusted segment may accept discount without harming premium perception",
      },
    },
  ],
  compatibleWith: [],
  conflictsWith: [],
  evidence: [],
  confidence: "MEDIUM" as const,
  status: "ACTIVE" as const,
  relationships: [CombinationRelationshipEnum.enum.AVOID],
  priority: RulePriorityEnum.enum.STRATEGIC,
});

// Register all rules on module load (the helper does this automatically)
// No explicit export is required; the side‑effect registration is sufficient.

// If you need to import the list elsewhere, you can export the raw definitions:
export const initialCombinationRules = [
  // The objects above are already registered; we expose them for testing/inspection.
];
