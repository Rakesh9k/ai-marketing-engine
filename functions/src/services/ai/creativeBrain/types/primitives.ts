// Primitive scalar types and basic structs for Creative Brain contracts

export type ID = string;

export type ISODateTime = string; // ISO 8601 timestamp string

export type Version = number;

export type Score = number; // 0–100 range

export type Weight = number; // 0–100 range

export type Probability = number; // 0–1 range

export interface Money {
  amount: number;
  currency: string;
}

export interface VersionedReference {
  id: ID;
  version: Version;
}

export interface DurationRange {
  minSeconds?: number;
  maxSeconds?: number;
  recommendedSeconds?: number;
}

/**
 * Validates whether a numerical score falls strictly within the 0–100 range.
 */
export function isValidScore(value: number): boolean {
  return typeof value === "number" && !isNaN(value) && isFinite(value) && value >= 0 && value <= 100;
}
