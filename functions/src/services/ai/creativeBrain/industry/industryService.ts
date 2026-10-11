/**
 * PHASE 27 — Industry Creative Intelligence Master Service Facade
 * Connects Industry Pack Registry, Resolvers, and Creative Brain reasoning pipelines.
 */

import { IndustryPackRegistry } from './registry/industryPackRegistry';
import { IndustryPackResolver } from './registry/industryPackResolver';
import type { IndustryPackResolution, IndustryType, IndustryCreativePack } from './industryPack.types';

export class IndustryService {
  private registry: IndustryPackRegistry = new IndustryPackRegistry();
  private resolver: IndustryPackResolver = new IndustryPackResolver(this.registry);

  /**
   * Resolves business category to IndustryPackResolution.
   */
  public resolveBusinessIndustry(categoryText?: string): IndustryPackResolution {
    return this.resolver.resolveCategory(categoryText);
  }

  /**
   * Retrieves registered Industry Pack by industry type and version.
   */
  public getPack(industry: IndustryType, version: string = '1.0.0'): IndustryCreativePack | null {
    return this.registry.get(industry, version);
  }

  /**
   * Retrieves registered Industry Pack by ID.
   */
  public getPackById(packId: string): IndustryCreativePack | null {
    return this.registry.getById(packId);
  }

  /**
   * Generates domain-aware creative guidance for a business category and offer.
   */
  public generateIndustryAwareReasoning(categoryText: string, _offerText: string) {
    const resolution = this.resolveBusinessIndustry(categoryText);
    const pack = resolution.pack;

    const situation = pack.audienceSituations[0] || { name: 'General Demand', context: 'Local need' };
    const mechanism = pack.creativeMechanisms[0] || { globalMechanismId: 'TRUST_BUILDER', industryExpression: 'Build local trust.' };
    const visual = pack.visualPrinciples[0] || { rule: 'Clear Product Display', rationale: 'Clear focus.' };
    const cta = pack.ctaPatterns[0] || { text: 'Contact Us Today', journeyStage: 'Immediate Action' };

    return {
      resolution,
      industry: pack.industry,
      subIndustry: resolution.subIndustry,
      packVersion: pack.version,
      audienceSituation: situation.name,
      recommendedMechanism: mechanism.industryExpression,
      visualRule: visual.rule,
      recommendedCTA: cta.text,
      antiPatternWarning: pack.antiPatterns[0]?.warningReason,
    };
  }
}
