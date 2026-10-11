import { validateOfferStructure } from "../offerStructureValidator";

describe("offerStructureValidator", () => {
  const baseValid = {
    type: "offer_structure",
    id: "offer-001",
    name: "Test Offer",
    slug: "test-offer",
    version: 1,
    status: "validated",
    definition: "A test offer structure for validation testing.",
    semanticPurpose: "Provide a test offer structure for unit tests.",
    scope: "generic",
    examples: ["Test example"],
    antiExamples: ["Test anti-example"],
    compatibility: [],
    constraints: [],
    assumptions: [],
    confidence: "moderate_evidence",
    evidenceRefs: [],
    culturalContexts: [],
    metadata: {},
    // OfferStructure specific fields
    category: "priceAnchor",
    strategicPurpose: "Test purpose for unit tests",
    primaryLever: "valueCommunication",
    secondaryLevers: [],
    valueMechanism: "reference pricing",
    customerProblemSolved: "test problem",
    perceivedValueEffect: "test effect",
    economicEffect: "test econ",
    marginImpact: { reducesPrice: false, confidence: "moderate_evidence" },
    bestFor: [],
    bestObjectives: [],
    bestIndustries: [],
    bestSituations: [],
    compatibleMechanisms: [],
    compatibleCopyGrammars: [],
    compatibleStoryStructures: [],
    compatibleVisualStructures: [],
    prerequisites: [],
    requiredEvidence: [],
    strengths: [],
    weaknesses: [],
    risks: [],
    worksWith: [],
    avoidWith: [],
    antiPatterns: [],
    ethicalBoundaries: [],
    evidence: [],
    relationships: [],
  } as any;

  test("valid offer passes validation", () => {
    const issues = validateOfferStructure(baseValid);
    expect(issues).toHaveLength(0);
  });

  test("ethical boundary violation produces error", () => {
    const invalid = { ...baseValid, ethicalBoundaries: ["fake scarcity"] } as any;
    const issues = validateOfferStructure(invalid);
    expect(issues.some((i) => i.path === "ethicalBoundaries")).toBe(true);
  });

  test("price reduction without margin impact reducesPrice triggers warning", () => {
    const invalid = {
      ...baseValid,
      primaryLever: "priceReduction",
      marginImpact: { reducesPrice: false, confidence: "moderate_evidence" },
    } as any;
    const issues = validateOfferStructure(invalid);
    expect(issues.some((i) => i.path === "marginImpact.reducesPrice")).toBe(true);
  });
});
