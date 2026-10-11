import type {
  CreativeDirection,
  CreativeContext,
  CreativeVariantStrategy,
  CreativeVariantStrategyReference,
  VariantStrategicFrame,
  CreativeConstraints,
} from "../types";
import { CANONICAL_VARIANT_STRATEGIES } from "./strategyLibrary";

export interface VariantStrategyFilterInput {
  context: CreativeContext;
  direction: CreativeDirection;
  preferredStrategies?: CreativeVariantStrategy[];
  excludedStrategies?: CreativeVariantStrategy[];
  constraints?: CreativeConstraints;
}

export class VariantStrategyService {
  /**
   * Retrieves and ranks candidate strategies suitable for the given campaign context.
   */
  public getCandidateStrategies(input: VariantStrategyFilterInput): CreativeVariantStrategyReference[] {
    const { context, preferredStrategies, excludedStrategies } = input;
    const allStrategies = Object.values(CANONICAL_VARIANT_STRATEGIES);

    // Filter out excluded strategies
    const filtered = allStrategies.filter((stratRef) => {
      if (excludedStrategies && excludedStrategies.includes(stratRef.strategy)) {
        return false;
      }
      // Objective compatibility check
      if (stratRef.bestFor.length > 0 && !stratRef.bestFor.includes(context.objective)) {
        // If preferred explicitly, allow even if objective is slightly different
        if (preferredStrategies && preferredStrategies.includes(stratRef.strategy)) {
          return true;
        }
        return false;
      }
      return true;
    });

    // Rank: preferred first (in exact specified order), then objective fit
    filtered.sort((a, b) => {
      const aPrefIndex = preferredStrategies ? preferredStrategies.indexOf(a.strategy) : -1;
      const bPrefIndex = preferredStrategies ? preferredStrategies.indexOf(b.strategy) : -1;

      const aPref = aPrefIndex !== -1;
      const bPref = bPrefIndex !== -1;

      if (aPref && !bPref) return -1;
      if (!aPref && bPref) return 1;
      if (aPref && bPref) return aPrefIndex - bPrefIndex;

      const aObjFit = a.bestFor.includes(context.objective) ? 1 : 0;
      const bObjFit = b.bestFor.includes(context.objective) ? 1 : 0;
      return bObjFit - aObjFit;
    });

    return filtered;
  }

  /**
   * Builds a strategic frame for a specific strategy by combining base direction and strategy definition.
   */
  public buildStrategicFrame(
    strategy: CreativeVariantStrategy,
    direction: CreativeDirection,
    context: CreativeContext
  ): VariantStrategicFrame {
    const stratRef = CANONICAL_VARIANT_STRATEGIES[strategy] || CANONICAL_VARIANT_STRATEGIES.CONVENIENCE;

    let centralMotivation = direction.audience.motivation[0] || "Satisfaction & Value";
    let audienceTension = direction.situation.tension || "Decision effort during busy times";
    let desiredAudienceShift = "From hesitation to confidence in choice";
    let marketingPromise = direction.coreIdea.statement;
    let expectedBehavior = direction.objective.desiredAudienceBehavior || "Take action";

    switch (strategy) {
      case "EMOTIONAL":
        centralMotivation = "Relief, peace of mind, and family connection";
        audienceTension = "Dinner negotiations and weekend stress disrupt quality family time";
        desiredAudienceShift = "From feeling overwhelmed by dinner chores to enjoying seamless family moments";
        marketingPromise = `Turn weekend dinner into effortless family quality time with ${context.business.name}`;
        expectedBehavior = "Order to create a relaxing family dinner experience";
        break;

      case "RATIONAL":
        centralMotivation = "Cognitive clarity, price justification, and clear value stack";
        audienceTension = "Uncertainty about whether the meal bundle justifies the cost";
        desiredAudienceShift = "From doubting value to appreciating complete itemized worth";
        marketingPromise = `Complete itemized family meal for ${context.offer?.price ? `${context.offer.price.currency}${context.offer.price.amount}` : "a great price"}`;
        expectedBehavior = "Review the value stack and complete order";
        break;

      case "CURIOSITY":
        centralMotivation = "Novelty, discovery, and pattern interruption";
        audienceTension = "Routine dining habits feel repetitive";
        desiredAudienceShift = "From passive scrolling to active curiosity about what local families are doing";
        marketingPromise = `Discover why local families are choosing ${context.business.name} this weekend`;
        expectedBehavior = "Click to uncover the weekend meal secret";
        break;

      case "CONVENIENCE":
        centralMotivation = "Effort reduction and decision simplification";
        audienceTension = "Weekend dinner becomes another exhausting decision on a busy schedule";
        desiredAudienceShift = "From decision fatigue to instant single-click ordering solution";
        marketingPromise = `One decision solves weekend family dinner instantly`;
        expectedBehavior = "Order immediately with zero hassle";
        break;

      case "VALUE":
        centralMotivation = "Economic smartness and maximum perceived value";
        audienceTension = "Feeding the whole family feels increasingly expensive";
        desiredAudienceShift = "From concern over cost to excitement about high bundle savings";
        marketingPromise = `Unbeatable family bundle value designed for complete satisfaction`;
        expectedBehavior = "Secure the high-value family deal";
        break;

      case "IDENTITY":
        centralMotivation = "Belonging, local pride, and family ritual";
        audienceTension = "Modern schedules make regular family table rituals hard to maintain";
        desiredAudienceShift = "From isolated meals to celebrating weekend family dinner rituals";
        marketingPromise = `Bring everyone back to the table with a cherished weekend tradition`;
        expectedBehavior = "Order to fulfill family weekend ritual";
        break;

      case "TRUST":
        centralMotivation = "Safety, risk reversal, and verified origin";
        audienceTension = "Worry about food quality, hygiene, or inconsistent standards";
        desiredAudienceShift = "From risk skepticism to total confidence in verified quality";
        marketingPromise = `100% verified quality and satisfaction guarantee`;
        expectedBehavior = "Order with complete peace of mind";
        break;

      case "PROOF":
        centralMotivation = "Social proof, ratings, and popular validation";
        audienceTension = "Fear of picking an unproven or disappointing restaurant";
        desiredAudienceShift = "From uncertainty to reassurance from hundreds of happy neighbors";
        marketingPromise = `Top-rated family favorite backed by real customer reviews`;
        expectedBehavior = "Follow community recommendation and order";
        break;

      default:
        break;
    }

    return {
      strategy,
      centralMotivation,
      audienceTension,
      desiredAudienceShift,
      marketingPromise,
      psychologicalEntry: [
        {
          id: `psych-${strategy.toLowerCase()}`,
          name: stratRef.name,
          category: strategy === "EMOTIONAL" || strategy === "IDENTITY" ? "EMOTION" : strategy === "RATIONAL" || strategy === "VALUE" ? "DECISION" : "ATTENTION",
          definition: stratRef.definition,
          purpose: stratRef.strategicPurpose,
          whyItMayWork: "Aligns with primary audience motivation and contextual tension.",
          whenToUse: [context.objective],
          whenNotToUse: [],
          risks: stratRef.risks,
          ethicalBoundary: stratRef.ethicalBoundaries[0] || "Must remain truthful",
          compatibleMechanismIds: stratRef.preferredMechanismIds,
          incompatibleMechanismIds: [],
          evidence: stratRef.evidence,
          confidence: "VALIDATED",
          status: "ACTIVE",
        },
      ],
      mechanism: {
        id: stratRef.preferredMechanismIds[0] || `mech-${strategy.toLowerCase()}`,
        name: `${stratRef.name} Mechanism`,
        definition: stratRef.definition,
        purpose: stratRef.strategicPurpose,
        psychologyIds: stratRef.preferredPsychologyIds,
        bestFor: [context.business.industry],
        industries: [context.business.industry],
        objectives: [context.objective],
        audienceSituationIds: [],
        strengths: ["High contextual resonance"],
        weaknesses: [],
        worksWith: [],
        avoidWith: [],
        hookPatterns: stratRef.preferredHookPatternIds,
        storyStructures: stratRef.preferredStoryStructureIds,
        visualStructures: stratRef.preferredVisualStructureIds,
        copyStructures: stratRef.preferredCopyStructureIds,
        assetRequirements: [],
        antiPatterns: stratRef.antiPatterns,
        ethicalBoundaries: stratRef.ethicalBoundaries,
        evidence: [],
        confidence: "VALIDATED",
        status: "ACTIVE",
      },
      strategicHypothesis: `Applying ${strategy} framing will address ${audienceTension} by highlighting ${centralMotivation}, resulting in increased ${expectedBehavior}.`,
      expectedBehavior,
      evidence: direction.evidence,
      confidence: direction.confidence,
    };
  }
}
