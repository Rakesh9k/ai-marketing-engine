import type { ID, Version, ISODateTime, DurationRange } from "./primitives";

export interface SafeArea {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  unit: "PX" | "PERCENT" | "RELATIVE";
}

export interface PlatformExpressionConstraints {
  aspectRatios: string[];
  duration?: DurationRange;
  attentionWindow?: DurationRange;
  textDensity: "LOW" | "MEDIUM" | "HIGH";
  safeAreas?: SafeArea[];
  ctaBehavior?: string;
  contentDensity: "LOW" | "MEDIUM" | "HIGH";
  visualPacing: "SLOW" | "MODERATE" | "FAST" | "VARIABLE";
  sourceVersion: Version;
  lastVerified: ISODateTime;
}

export interface PlatformContext {
  platformId: ID;
  name: string;
  version?: Version;
  supported: boolean;
  expressionConstraints: PlatformExpressionConstraints;
}

export type FormatType =
  | "STATIC"
  | "CAROUSEL"
  | "REEL"
  | "STORY"
  | "VIDEO"
  | "POST"
  | "OTHER";

export interface FormatContext {
  formatId: ID;
  name: string;
  type: FormatType;
  aspectRatio?: string;
  duration?: DurationRange;
  constraints?: string[];
}
