/**
 * PHASE 10.40 — Cultural Sensitivity Test Fixtures
 * City & regional profiles for testing local intelligence vs forced localization.
 */

export interface TestCulturalContext {
  city: "Hyderabad" | "Bangalore" | "Mumbai" | "Delhi" | "Chennai" | "Pune";
  neighborhood?: string;
  localLanguage: string;
  culturalOccasions?: string[];
  audienceSubculture?: string;
}

export const FIXTURE_HYDERABAD_KONDAPUR: TestCulturalContext = {
  city: "Hyderabad",
  neighborhood: "Kondapur",
  localLanguage: "Telugu",
  culturalOccasions: ["Bonalu", "Sankranti", "Diwali"],
  audienceSubculture: "IT corridor tech professionals & young families",
};

export const FIXTURE_BANGALORE_KORAMANGALA: TestCulturalContext = {
  city: "Bangalore",
  neighborhood: "Koramangala",
  localLanguage: "Kannada",
  culturalOccasions: ["Ugadi", "Dasara"],
  audienceSubculture: "Startup founders & cosmopolitan youth",
};

export const FIXTURE_MUMBAI_BANDRA: TestCulturalContext = {
  city: "Mumbai",
  neighborhood: "Bandra",
  localLanguage: "Marathi",
  culturalOccasions: ["Ganesh Chaturthi", "Gudi Padwa"],
  audienceSubculture: "Creative professionals & lifestyle enthusiasts",
};
