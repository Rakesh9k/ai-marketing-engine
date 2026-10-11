import type { BusinessBrain } from '../../../../types';
import type { IndustryCreativeKnowledge } from './industryKnowledge.types';
import { IndustryCreativeKnowledgeSchema } from './industryKnowledge.schema';

export class IndustryKnowledgeValidator {
  /**
   * Validates structure and asserts no fabricated factual claims are encoded in knowledge
   */
  public static validate(knowledge: IndustryCreativeKnowledge): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const parsed = IndustryCreativeKnowledgeSchema.safeParse(knowledge);
    if (!parsed.success) {
      errors.push(...parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`));
    }

    // Safeguard check: ensure no hardcoded claims or numeric prices exist in descriptions/labels
    const jsonString = JSON.stringify(knowledge);
    const forbiddenPatterns = [
      /\b\d{4,}\b/, // large numeric claims like 10000
      /100%\s+guaranteed/i,
      /best\s+in\s+city/i,
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(jsonString)) {
        errors.push(`Forbidden factual or absolute claim pattern detected: ${pattern.toString()}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Asserts that candidate copy or generated claims do not convert advisory industry knowledge
   * into unverified business facts when Business Brain lacks confirmation.
   */
  public static validateClaimSafety(
    claimText: string,
    businessBrain?: BusinessBrain
  ): { safe: boolean; prohibitedClaim?: string; reason?: string } {
    const text = claimText.toLowerCase();

    const confirmedFacts = [
      businessBrain?.identity?.description || '',
      ...(businessBrain?.products?.map((p) => `${p.name} ${p.description || ''}`) || []),
    ].join(' ').toLowerCase();

    // 1. Delivery & Convenience claims (requires confirmed delivery service/attribute in Business Brain)
    const deliveryClaims = ['fast delivery', '30-minute delivery', '30 min delivery', 'order online', 'delivery available', 'free delivery'];
    const hasDeliveryClaim = deliveryClaims.find((c) => text.includes(c));

    if (hasDeliveryClaim) {
      const deliveryConfirmed = confirmedFacts.includes('delivery') || confirmedFacts.includes('order online') || confirmedFacts.includes('swiggy') || confirmedFacts.includes('zomato');
      if (!deliveryConfirmed) {
        return {
          safe: false,
          prohibitedClaim: hasDeliveryClaim,
          reason: `Claim '${hasDeliveryClaim}' asserts a delivery service fact not confirmed in Business Brain`,
        };
      }
    }

    // 2. Clinical Expertise & Regulatory Certification claims
    const trustCertificationClaims = ['certified experts', 'clinically proven', 'fda approved', 'doctor recommended', 'board certified'];
    const hasCertClaim = trustCertificationClaims.find((c) => text.includes(c));

    if (hasCertClaim) {
      const certConfirmed = confirmedFacts.includes('certified') || confirmedFacts.includes('clinical') || confirmedFacts.includes('fda');
      if (!certConfirmed) {
        return {
          safe: false,
          prohibitedClaim: hasCertClaim,
          reason: `Claim '${hasCertClaim}' asserts a regulatory or clinical certification fact not confirmed in Business Brain`,
        };
      }
    }

    // 3. Real Estate RERA Regulatory claims
    const reraClaims = ['rera approved', 'rera registered', 'rera cert', 'rera id'];
    const hasReraClaim = reraClaims.find((c) => text.includes(c));

    if (hasReraClaim) {
      const reraConfirmed = confirmedFacts.includes('rera');
      if (!reraConfirmed) {
        return {
          safe: false,
          prohibitedClaim: hasReraClaim,
          reason: `Claim '${hasReraClaim}' asserts a RERA regulatory approval fact not confirmed in Business Brain`,
        };
      }
    }

    return { safe: true };
  }
}

