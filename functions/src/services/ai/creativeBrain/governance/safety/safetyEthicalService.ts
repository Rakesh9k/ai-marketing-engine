import type {
  SafetyEthicalResult,
  EthicalRisk,
  CreativeGovernanceInput} from "../../types/governance";
import {
  EthicalRiskType
} from "../../types/governance";
import { getMechanismEthicsProfile } from "./mechanismRisk";
import { VulnerableAudienceEvaluator } from "./vulnerabilityRules";

export class SafetyEthicalCheckService {
  private vulnerabilityEvaluator = new VulnerableAudienceEvaluator();

  /**
   * Evaluates psychological influence, mechanism ethical profiles, vulnerable audience safety,
   * coercion, body shaming, fear exploitation, and deceptive framing.
   */
  public evaluateSafetyAndEthics(input: CreativeGovernanceInput): SafetyEthicalResult {
    const risks: EthicalRisk[] = [];
    const requiredChanges: string[] = [];

    const audienceVulnerability = this.vulnerabilityEvaluator.evaluateVulnerability(
      undefined,
      input.businessContext.audienceProfiles
    );

    const getStr = (val: any): string => {
      if (!val) return "";
      if (typeof val === "string") return val;
      return val.content || "";
    };

    const headlineText = getStr(input.copy?.headline);
    const bodyText = getStr((input.copy as any)?.bodyText) || getStr(input.copy?.supportingCopy);
    const ctaText = getStr((input.copy as any)?.primaryCta) || getStr(input.copy?.cta);
    const offerText = getStr((input.copy as any)?.offerText) || getStr(input.copy?.offerCopy);

    const fullText = [
      (input.strategy.hook as any)?.text || input.strategy.hook?.illustrativeExample || "",
      headlineText,
      bodyText,
      ctaText,
      offerText,
    ]
      .join(" ")
      .toLowerCase();

    // 1. Mechanism Ethics Profile Check
    const mechanismObj = (input.strategy as any).mechanism || input.strategy.creativeMechanism?.primary;
    if (mechanismObj) {
      const profile = getMechanismEthicsProfile(mechanismObj.id);

      if (profile.ethicalRisk === "CRITICAL") {
        risks.push({
          id: `risk_mech_crit_${Date.now()}`,
          type: EthicalRiskType.DARK_PATTERN,
          severity: "CRITICAL",
          description: `Selected mechanism '${mechanismObj.name}' is classified as CRITICAL ethical risk`,
          triggeringElement: mechanismObj.id,
          mitigationSuggestion: "Replace mechanism with non-deceptive strategic alternative",
        });
      }

      if (audienceVulnerability.isVulnerable && profile.vulnerableAudienceRisk) {
        risks.push({
          id: `risk_mech_vuln_${Date.now()}`,
          type: EthicalRiskType.VULNERABILITY_EXPLOITATION,
          severity: "HIGH",
          description: `Mechanism '${mechanismObj.name}' presents high risk for vulnerable audience (${audienceVulnerability.vulnerabilityTypes.join(", ")})`,
          triggeringElement: mechanismObj.id,
          mitigationSuggestion: "Heighten transparency and eliminate high-pressure framing",
        });
      }
    }

    // 2. Coercion & Fear Exploitation Detection
    if (/(?:if you don't|or else|disaster|disgrace|shame|regret forever|ruin your|fail if you don't)/i.test(fullText)) {
      risks.push({
        id: `risk_fear_${Date.now()}`,
        type: EthicalRiskType.FEAR_EXPLOITATION,
        severity: "HIGH",
        description: "Creative copy employs coercive fear exploitation or anxiety-inducing threats",
        triggeringElement: "Copy text",
        mitigationSuggestion: "Reframe copy around positive aspirational or convenience benefits",
      });
      requiredChanges.push("Remove anxiety-inducing threat copy");
    }

    // 3. Body Shaming / Appearance Exploitation
    if (/(?:ugly|fat|skinny|gross|embarrassing body|hideous|ashamed of how you look)/i.test(fullText)) {
      risks.push({
        id: `risk_body_${Date.now()}`,
        type: EthicalRiskType.BODY_SHAMING,
        severity: "CRITICAL",
        description: "Creative copy uses body-shaming or physical insecurity exploitation",
        triggeringElement: "Copy text",
        mitigationSuggestion: "Use body-positive, wellness-focused messaging",
      });
      requiredChanges.push("Eliminate body-shaming terminology");
    }

    // 4. Fabricated Social Proof / Ratings Check
    if (/(?:fake review|invented rating|generated testimonial)/i.test(fullText)) {
      risks.push({
        id: `risk_proof_${Date.now()}`,
        type: EthicalRiskType.FABRICATED_SOCIAL_PROOF,
        severity: "CRITICAL",
        description: "Attempted use of fabricated social proof or fake ratings",
        triggeringElement: "Social proof claim",
        mitigationSuggestion: "Use only verified business customer ratings or authentic quotes",
      });
    }

    // 5. False Urgency / False Scarcity Check
    if (headlineText.toLowerCase().includes("only 2 left") && !input.businessContext.verifiedFacts?.some(f => f.statement.includes("inventory"))) {
      risks.push({
        id: `risk_scarcity_${Date.now()}`,
        type: EthicalRiskType.FALSE_SCARCITY,
        severity: "HIGH",
        description: "Manufactured false scarcity claim detected without verified inventory constraints",
        triggeringElement: headlineText,
        mitigationSuggestion: "Remove unverified inventory count or state verified stock",
      });
      requiredChanges.push("Remove unverified 'only X left' scarcity claim");
    }

    // 6. Discriminatory Targeting / Protected Characteristics
    if (/(?:no (?:caste|religion|minorities|women|men) allowed|discriminate)/i.test(fullText)) {
      risks.push({
        id: `risk_discrim_${Date.now()}`,
        type: EthicalRiskType.DISCRIMINATORY_TARGETING,
        severity: "CRITICAL",
        description: "Discriminatory targeting or prohibited exclusionary language detected",
        triggeringElement: "Audience/Copy text",
      });
    }

    // Overall Status Determination
    const hasCritical = risks.some((r) => r.severity === "CRITICAL");
    const hasHigh = risks.some((r) => r.severity === "HIGH");

    let status: "PASS" | "REVIEW" | "FAIL" = "PASS";
    if (hasCritical) {
      status = "FAIL";
    } else if (hasHigh) {
      status = "REVIEW";
    }

    return {
      status,
      risks,
      reasoning: risks.length === 0 ? "Creative satisfies all ethical and safety guidelines" : `Detected ${risks.length} ethical risk item(s)`,
      requiredChanges,
      policyVersion: "2026.10.07-safety-v1",
    };
  }
}
