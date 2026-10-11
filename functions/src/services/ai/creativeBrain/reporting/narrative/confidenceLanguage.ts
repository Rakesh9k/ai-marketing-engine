import type { ConfidenceLanguageLevel } from "../../types/reports";

/**
 * Phase 10.28 — Confidence Language Vocab Mapper
 *
 * Rules:
 * VERY_STRONG (confidence >= 0.85): "consistently", "strong pattern", "clear winner", "repeatedly outperformed"
 * STRONG (0.70 - 0.84): "appears to be working particularly well", "has performed strongly"
 * MODERATE (0.55 - 0.69): "shows promising results", "appears promising"
 * WEAK (0.40 - 0.54): "early signs suggest", "worth testing further"
 * INSUFFICIENT (< 0.40): "not enough evidence yet"
 */
export class ConfidenceLanguageEngine {
  /**
   * Maps numerical confidence score to confidence language level
   */
  static getConfidenceLevel(confidence: number): ConfidenceLanguageLevel {
    if (confidence >= 0.85) return "VERY_STRONG";
    if (confidence >= 0.70) return "STRONG";
    if (confidence >= 0.55) return "MODERATE";
    if (confidence >= 0.40) return "WEAK";
    return "INSUFFICIENT";
  }

  /**
   * Returns standard lead phrase based on confidence level
   */
  static getLeadPhrase(confidence: number, topic: string): string {
    const level = this.getConfidenceLevel(confidence);
    switch (level) {
      case "VERY_STRONG":
        return `${topic} has consistently outperformed other approaches for your audience.`;
      case "STRONG":
        return `${topic} appears to be working particularly well for your target audience.`;
      case "MODERATE":
        return `${topic} shows promising results across recent campaigns.`;
      case "WEAK":
        return `Early signs suggest ${topic} may be worth testing further.`;
      case "INSUFFICIENT":
      default:
        return `We don't have enough evidence yet to form a strong conclusion on ${topic}.`;
    }
  }

  /**
   * Enforces FORBIDDEN absolute claims rule.
   * Returns list of illegal words found if any ("always", "never", "guaranteed", "proven", "will work").
   */
  static checkForbiddenWords(text: string): string[] {
    const forbidden = ["always", "never", "guaranteed", "proven", "will work"];
    const found: string[] = [];
    const lower = text.toLowerCase();

    for (const word of forbidden) {
      const regex = new RegExp(`\\b${word}\\b`, "i");
      if (regex.test(lower)) {
        found.push(word);
      }
    }
    return found;
  }

  /**
   * Sanitizes text to remove any illegal absolute claims, replacing them with confidence-qualified terms.
   */
  static sanitizeText(text: string, confidence: number): string {
    let sanitized = text;
    const level = this.getConfidenceLevel(confidence);

    const replacementMap: Record<string, string> = {
      always: level === "VERY_STRONG" ? "consistently" : "frequently",
      never: level === "VERY_STRONG" ? "rarely" : "uncommonly",
      guaranteed: "highly likely",
      proven: "validated",
      "will work": "is expected to perform well",
    };

    for (const [forbidden, replacement] of Object.entries(replacementMap)) {
      const regex = new RegExp(`\\b${forbidden}\\b`, "gi");
      sanitized = sanitized.replace(regex, replacement);
    }
    return sanitized;
  }
}
