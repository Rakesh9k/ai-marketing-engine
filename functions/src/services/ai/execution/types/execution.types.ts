/**
 * PHASE 18 — Execution Pipeline Types & Contracts
 * Complete types for Execution Planning, Asset Management, Posts, Reels,
 * Composition, Validation Gates, and Final Campaign Packaging.
 */

import type { StrategyFidelityResult } from '../strategyFidelity';

export type ExecutionAssetType = 'post' | 'reel';

export type ExecutionStage =
  | 'PLANNING'
  | 'SCRIPT'
  | 'SHOT_PLANNING'
  | 'ASSET_PREPARATION'
  | 'GENERATION'
  | 'VOICE'
  | 'MOTION'
  | 'CAPTIONS'
  | 'AUDIO'
  | 'COMPOSITION'
  | 'RENDERING'
  | 'VALIDATION'
  | 'FINALIZATION'
  | 'COMPLETED'
  | 'FAILED';

export type AssetSourceType =
  | 'business'
  | 'user_upload'
  | 'generated'
  | 'stock'
  | 'derived';

export interface AssetProvenance {
  generatedAt?: string;
  modelUsed?: string;
  promptUsed?: string;
  sourceAssetId?: string;
  derivedFromRatio?: string;
}

export interface ExecutionAsset {
  id: string;
  campaignId: string;
  type: string;
  source: AssetSourceType;
  storagePath: string;
  mimeType: string;
  width?: number;
  height?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  provenance?: AssetProvenance;
}

export interface ExecutionAssetRequirement {
  id: string;
  name: string;
  role: 'logo' | 'hero_visual' | 'product_photo' | 'background' | 'badge' | 'clip' | 'audio';
  required: boolean;
  existingAssetId?: string;
  generationPrompt?: string;
}

export interface GenerationTask {
  taskId: string;
  stage: ExecutionStage;
  targetAssetType: string;
  aspectRatio: string;
  promptOrInstruction: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  outputAssetId?: string;
  error?: string;
}

export interface ValidationTask {
  taskId: string;
  name: string;
  category: 'technical' | 'truth' | 'brand' | 'quality' | 'platform' | 'strategy';
  blocking: boolean;
  status: 'PENDING' | 'PASSED' | 'FAILED';
  resultDetails?: string;
}

export interface OutputRequirements {
  format: 'png' | 'jpeg' | 'webp' | 'mp4';
  aspectRatio: '1:1' | '4:5' | '9:16' | '16:9';
  minWidth: number;
  minHeight: number;
  maxFileSizeMB: number;
  maxDurationMs?: number;
}

export interface ExecutionPlan {
  planId: string;
  campaignId: string;
  blueprintId: string;
  blueprintVersion: number;
  strategyHash: string;
  assetType: ExecutionAssetType;
  currentStage: ExecutionStage;
  stages: ExecutionStage[];
  requiredAssets: ExecutionAssetRequirement[];
  generationTasks: GenerationTask[];
  validationTasks: ValidationTask[];
  outputRequirements: OutputRequirements[];
  createdAt: string;
}

// COMPOSITION TYPES
export interface CompositionCanvas {
  width: number;
  height: number;
  aspectRatio: '1:1' | '4:5' | '9:16' | '16:9';
}

export interface LayerZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayerStyle {
  fontSize?: string;
  color?: string;
  backgroundColor?: string;
  [key: string]: unknown;
}

export interface CompositionLayer {
  id: string;
  type: 'image' | 'text' | 'badge' | 'logo' | 'shape';
  zone: LayerZone;
  content: string; // URL, text string, or asset ID
  style?: LayerStyle;
  zIndex: number;
}

export interface CompositionSpec {
  canvas: CompositionCanvas;
  layers: CompositionLayer[];
  hierarchy: string[];
  layoutPattern: string; // 'Hero Focus', 'Editorial', 'Split Story', 'Product Focus', etc.
  fontFamily: string;
  colorPalette: {
    primary: string;
    secondary: string;
    text: string;
    accent: string;
    background: string;
  };
}

// REEL PIPELINE TYPES
export interface ScriptSegment {
  id: string;
  type: 'hook' | 'beat' | 'solution' | 'offer' | 'cta';
  speaker?: string;
  text: string;
  voiceoverText: string;
  captionText: string;
  durationMs: number;
  strategySource: {
    blueprintField: string;
    purpose: string;
  };
}

export interface ReelScript {
  hook: ScriptSegment;
  beats: ScriptSegment[];
  transitionLogic?: string[];
  finalMessage: ScriptSegment;
  cta: ScriptSegment;
  totalDurationMs: number;
}

export interface ReelShot {
  id: string;
  sequenceOrder: number;
  durationMs: number;
  purpose: string;
  visualDirection: string;
  assetRequirement: string;
  cameraDirection?: string;
  textOverlay?: string;
  voiceover?: string;
  transition?: string;
  motion?: string;
  strategySource: string;
}

export interface AudioTrack {
  id: string;
  source: string; // URL or storage path
  durationMs: number;
  role: 'music' | 'voice' | 'sound_effect';
  volume: number; // 0.0 to 1.0
  licenseMetadata?: Record<string, unknown>;
}

export interface Timeline {
  durationMs: number;
  videoTracks: Array<{
    clipId: string;
    storagePath: string;
    startTimeMs: number;
    durationMs: number;
    textOverlay?: string;
  }>;
  audioTracks: AudioTrack[];
  captionTrack?: {
    captions: Array<{ text: string; startTimeMs: number; endTimeMs: number }>;
  };
}

// VALIDATION GATE RESULT
export interface ValidationGateResult {
  gateName: string;
  passed: boolean;
  score?: number; // 0 to 100
  details: string[];
  blocking: boolean;
}

export interface CombinedValidationResults {
  technicalCheck: ValidationGateResult;
  truthCheck: ValidationGateResult;
  brandCheck: ValidationGateResult;
  creativeQualityCheck: ValidationGateResult;
  platformCheck: ValidationGateResult;
  strategyFidelity: StrategyFidelityResult;
  allPassed: boolean;
  blockingFailure?: string;
}

// FINAL ASSET CONTRACTS
export interface FinalPostAsset {
  campaignId: string;
  blueprintId: string;
  blueprintVersion: number;
  strategyHash: string;
  assetId: string;
  format: 'png' | 'jpeg' | 'webp';
  width: number;
  height: number;
  aspectRatio: string;
  storagePath: string;
  validation: CombinedValidationResults;
  status: 'READY';
  createdAt: string;
}

export interface FinalReelAsset {
  campaignId: string;
  blueprintId: string;
  blueprintVersion: number;
  strategyHash: string;
  assetId: string;
  format: 'mp4';
  width: number;
  height: number;
  durationMs: number;
  fps: number;
  storagePath: string;
  thumbnailStoragePath: string;
  validation: CombinedValidationResults;
  status: 'READY';
  createdAt: string;
}

// EXECUTION JOB MODEL
export type ExecutionJobStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'RECOVERING';

export interface ExecutionJob {
  id: string;
  campaignId: string;
  blueprintId: string;
  blueprintVersion: number;
  strategyHash: string;
  type: ExecutionAssetType;
  status: ExecutionJobStatus;
  currentStage: ExecutionStage;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
  resumableState?: Record<string, unknown>;
}
