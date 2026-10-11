import type { CreativeBankItem, StudioSandboxInput, StudioSandboxResult } from "../../types/studio";

/**
 * Phase 10.29 — Studio Testing Sandbox
 *
 * Runs isolated sandbox tests of Creative Bank items with Creative Brain.
 * CRITICAL INVARIANT: Test runs MUST be marked isSandboxTest: true and MUST NOT pollute
 * production performance metrics or consume customer credits.
 */
export class StudioTestingSandbox {
  static async runSimulation(
    item: CreativeBankItem,
    input: StudioSandboxInput
  ): Promise<StudioSandboxResult> {
    const warnings: string[] = [];

    // Check compatibility warnings
    if (input.industry && !item.industries.includes(input.industry) && item.industries.length > 0) {
      warnings.push(`Item [${item.name}] is not explicitly flagged for industry [${input.industry}].`);
    }

    if (input.objective && !item.objectives.includes(input.objective) && item.objectives.length > 0) {
      warnings.push(`Item [${item.name}] is not explicitly flagged for objective [${input.objective}].`);
    }

    const industryText = input.industry || "General Business";
    const audienceText = input.audience || "Target Audience";

    // Simulate creative output generation based on item type
    let headline = `${item.name} for ${industryText}`;
    let bodyCopy = `Positioning tailored around ${item.shortDescription || item.name} to address ${audienceText}.`;
    let visualDirection = `Visual demonstration supporting ${item.name}.`;
    let cta = `Learn more about our ${industryText} offer`;

    if (item.examples && item.examples.length > 0) {
      bodyCopy = item.examples[0].text;
    }

    return {
      itemId: item.id,
      itemName: item.name,
      simulatedOutput: {
        headline,
        bodyCopy,
        visualDirection,
        cta,
      },
      expectedBehavior: item.useCases.whenToUse[0] || `Reduce decision complexity for ${audienceText}.`,
      compatibilityWarnings: warnings,
      isSandboxTest: true,
      executedAt: new Date().toISOString(),
    };
  }
}
