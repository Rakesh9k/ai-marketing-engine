/**
 * PHASE 10.34 — Build Local Intelligence
 * Language Intelligence Service
 */

import type { LocalLanguageProfile } from "../localIntelligence.types";
import { HYDERABAD_LANGUAGE_PROFILE } from "../seed/hyderabadSeed";

export class LanguageService {
  /**
   * Retrieves LocalLanguageProfile for a city.
   */
  public getLanguageProfile(city: string): LocalLanguageProfile | undefined {
    const cleanCity = city.trim().toLowerCase();
    if (cleanCity === "hyderabad") {
      return HYDERABAD_LANGUAGE_PROFILE;
    }
    // Generic fallback language profile
    return {
      id: `lang_${cleanCity}`,
      cityId: cleanCity,
      languages: [
        { code: "en", name: "English", isPrimary: true, script: "Latin" },
        { code: "hi", name: "Hindi", isPrimary: true, script: "Devanagari" },
      ],
      mixedLanguagePatterns: [
        {
          name: "Hinglish",
          baseLanguage: "Hindi",
          secondaryLanguage: "English",
          commonContexts: ["Digital Ads", "Social Captions"],
          examplePhrases: ["Check this out!", "Best offers for you"],
        },
      ],
      scriptPreferences: [],
      commercialTonePatterns: [
        { tone: "Professional & Direct", formality: "INFORMAL", commercialUsage: "General Business" },
      ],
      commonLocalTerms: [],
      avoidTerms: [],
      audienceVariations: [],
      confidence: 0.75,
      version: 1,
    };
  }

  /**
   * Recommends deterministic language and script pairing for audience & context.
   */
  public recommendLanguageAndScript(
    city: string,
    audience?: string,
    channel?: string
  ): { language: string; script: string; style: string; confidence: number } {
    const cleanCity = city.trim().toLowerCase();
    const aud = (audience || "").toLowerCase();
    const _isDigital = channel === "INSTAGRAM" || channel === "FACEBOOK" || channel === "WHATSAPP" || channel === "DIGITAL_AD";
    const isTraditional = aud.includes("family") || aud.includes("resident") || aud.includes("traditional");

    if (cleanCity === "hyderabad") {
      if (isTraditional) {
        return {
          language: "Telugu",
          script: "Telugu Native / Bi-Scriptal",
          style: "Warm family-oriented Telugu messaging",
          confidence: 0.88,
        };
      }
      return {
        language: "Teluglish (Telugu-English Mix)",
        script: "Romanized Telugu / English",
        style: "English headline with warm Romanized Telugu emotional hook",
        confidence: 0.9,
      };
    }

    return {
      language: "Hinglish / English",
      script: "Latin",
      style: "Clean commercial conversational tone",
      confidence: 0.8,
    };
  }
}
