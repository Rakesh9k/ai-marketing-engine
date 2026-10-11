/**
 * Phase 10.31 — Strategic Axes Taxonomy
 * Reusable Creative Intelligence taxonomy for strategic direction axes and industry-aware templates.
 */

export interface StrategicAxisDefinition {
  axisId: string;
  category: "FUNCTIONAL" | "EMOTIONAL" | "IDENTITY" | "SOCIAL" | "TRANSFORMATION" | "COMPETITIVE" | "PROOF";
  name: string;
  description: string;
  defaultPsychology: string;
  defaultMechanism: string;
  communicationFrame: string;
}

export const STRATEGIC_AXES_TAXONOMY: Record<string, StrategicAxisDefinition> = {
  CONVENIENCE: {
    axisId: "CONVENIENCE",
    category: "FUNCTIONAL",
    name: "Convenience & Choice Simplification",
    description: "Focuses on removing decision friction and making the purchase effortless.",
    defaultPsychology: "Choice Simplification / Effort Reduction",
    defaultMechanism: "Decision Friction Removal",
    communicationFrame: "Dinner sorted in seconds — no decision fatigue.",
  },
  FAMILY_CONNECTION: {
    axisId: "FAMILY_CONNECTION",
    category: "EMOTIONAL",
    name: "Family Connection & Belonging",
    description: "Focuses on creating shared moments and togetherness around the product.",
    defaultPsychology: "Belonging & Emotional Warmth",
    defaultMechanism: "Shared Moment Framing",
    communicationFrame: "Bring everyone around the same table effortless night.",
  },
  VALUE: {
    axisId: "VALUE",
    category: "FUNCTIONAL",
    name: "Value Maximization & Smart Choice",
    description: "Focuses on getting maximum utility, savings, or complete package value.",
    defaultPsychology: "Value Maximization & Smart Buyer Pride",
    defaultMechanism: "Bundle Value Framing",
    communicationFrame: "Complete family bundle with maximum value.",
  },
  LOCAL_PRIDE: {
    axisId: "LOCAL_PRIDE",
    category: "IDENTITY",
    name: "Local Identity & Neighborhood Pride",
    description: "Focuses on community belonging, local craftsmanship, and supporting neighborhood favorites.",
    defaultPsychology: "Local Identity & Community Pride",
    defaultMechanism: "Local Social Proof & Heritage",
    communicationFrame: "Your trusted neighborhood staple in Kondapur.",
  },
  TRANSFORMATION: {
    axisId: "TRANSFORMATION",
    category: "TRANSFORMATION",
    name: "Before vs After Transformation",
    description: "Highlights the visible transition from problem state to ideal outcome state.",
    defaultPsychology: "Self-Efficacy & Aspirations",
    defaultMechanism: "Transformation Demonstration",
    communicationFrame: "Experience the visible difference before and after.",
  },
  CONFIDENCE: {
    axisId: "CONFIDENCE",
    category: "EMOTIONAL",
    name: "Self-Expression & Confidence Boost",
    description: "Focuses on boosting personal empowerment and feeling self-assured.",
    defaultPsychology: "Status & Self-Assurance",
    defaultMechanism: "Empowerment Framing",
    communicationFrame: "Walk out feeling completely renewed and confident.",
  },
  EXPERT_TRUST: {
    axisId: "EXPERT_TRUST",
    category: "PROOF",
    name: "Expertise, Authority & Trust",
    description: "Focuses on professional credentials, safety, transparency, and expert care.",
    defaultPsychology: "Risk Reduction & Authority Trust",
    defaultMechanism: "Professional Diagnosis & Proof",
    communicationFrame: "Certified expert care tailored to your exact needs.",
  },
  INVESTMENT_SECURITY: {
    axisId: "INVESTMENT_SECURITY",
    category: "FUNCTIONAL",
    name: "Financial Security & Future Wealth",
    description: "Focuses on long-term appreciation, safety of capital, and equity growth.",
    defaultPsychology: "Financial Security & Risk Reduction",
    defaultMechanism: "ROI & Equity Growth Proof",
    communicationFrame: "Secure your family's financial future with prime assets.",
  },
  LIFESTYLE_ASPIRATION: {
    axisId: "LIFESTYLE_ASPIRATION",
    category: "IDENTITY",
    name: "Premium Lifestyle & Status",
    description: "Focuses on elevated living, prestige, and aesthetic lifestyle identity.",
    defaultPsychology: "Status & Lifestyle Identity",
    defaultMechanism: "Aspiration & Aesthetic Proof",
    communicationFrame: "Live in the luxury neighborhood designed for achievers.",
  },
};

export const INDUSTRY_EXPLORATION_MAP: Record<string, string[]> = {
  RESTAURANT: ["CONVENIENCE", "FAMILY_CONNECTION", "VALUE", "LOCAL_PRIDE"],
  SALON: ["TRANSFORMATION", "CONFIDENCE", "EXPERT_TRUST"],
  REAL_ESTATE: ["INVESTMENT_SECURITY", "LIFESTYLE_ASPIRATION", "FAMILY_CONNECTION"],
  RETAIL: ["VALUE", "CONVENIENCE", "LOCAL_PRIDE"],
  HEALTHCARE: ["EXPERT_TRUST", "TRANSFORMATION", "CONFIDENCE"],
  DEFAULT: ["CONVENIENCE", "FAMILY_CONNECTION", "VALUE", "LOCAL_PRIDE"],
};
