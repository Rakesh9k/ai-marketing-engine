/**
 * PHASE 18 — Execution Planner
 * Translates an approved CanonicalCreativeBlueprint into a production ExecutionPlan
 * without introducing new strategy or altering strategic intent.
 */

import type { CanonicalCreativeBlueprint as CreativeBlueprint } from '../../creativeBrain/types/creativeBlueprint.types';
import type { StrategyLock } from '../strategyFidelity';
import type {
  ExecutionAssetRequirement,
  ExecutionPlan,
  ExecutionStage,
  GenerationTask,
  OutputRequirements,
  ValidationTask,
} from '../types/execution.types';

export class ExecutionPlanner {
  /**
   * Creates a production ExecutionPlan from an approved CreativeBlueprint and StrategyLock.
   */
  public createPlan(blueprint: CreativeBlueprint, lock: StrategyLock): ExecutionPlan {
    const isReel = blueprint.format?.primaryFormat === 'reel' || blueprint.format?.primaryFormat === 'video';
    const assetType = isReel ? 'reel' : 'post';
    const planId = `plan_${blueprint.id}_${Date.now()}`;

    // Stages
    const stages: ExecutionStage[] = isReel
      ? [
          'PLANNING',
          'SCRIPT',
          'SHOT_PLANNING',
          'ASSET_PREPARATION',
          'GENERATION',
          'VOICE',
          'MOTION',
          'CAPTIONS',
          'AUDIO',
          'RENDERING',
          'VALIDATION',
          'FINALIZATION',
        ]
      : [
          'PLANNING',
          'ASSET_PREPARATION',
          'GENERATION',
          'COMPOSITION',
          'RENDERING',
          'VALIDATION',
          'FINALIZATION',
        ];

    // Asset Requirements
    const requiredAssets: ExecutionAssetRequirement[] = [];

    // Always require logo/brand asset
    requiredAssets.push({
      id: `asset_req_logo_${blueprint.id}`,
      name: 'Brand Logo',
      role: 'logo',
      required: true,
    });

    // Hero visual requirement
    requiredAssets.push({
      id: `asset_req_hero_${blueprint.id}`,
      name: 'Hero Creative Visual',
      role: 'hero_visual',
      required: true,
      generationPrompt: blueprint.visualDirection?.visualConcept || blueprint.coreConcept?.oneLineIdea,
    });

    // Offer badge requirement if offer exists
    if (blueprint.offer?.exists) {
      requiredAssets.push({
        id: `asset_req_offer_${blueprint.id}`,
        name: 'Offer Badge',
        role: 'badge',
        required: false,
      });
    }

    // Output Requirements
    const targetRatios: Array<'1:1' | '4:5' | '9:16' | '16:9'> = isReel ? ['9:16'] : ['1:1', '4:5', '9:16'];
    const outputRequirements: OutputRequirements[] = targetRatios.map((ratio) => {
      let width = 1080;
      let height = 1080;
      if (ratio === '4:5') {
        height = 1350;
      } else if (ratio === '9:16') {
        width = 1080;
        height = 1920;
      } else if (ratio === '16:9') {
        width = 1920;
        height = 1080;
      }

      return {
        format: isReel ? 'mp4' : 'png',
        aspectRatio: ratio,
        minWidth: width,
        minHeight: height,
        maxFileSizeMB: isReel ? 100 : 15,
        maxDurationMs: isReel ? 30000 : undefined,
      };
    });

    // Generation Tasks
    const generationTasks: GenerationTask[] = targetRatios.map((ratio, index) => ({
      taskId: `gen_task_${index + 1}_${ratio.replace(':', '_')}`,
      stage: 'GENERATION',
      targetAssetType: assetType,
      aspectRatio: ratio,
      promptOrInstruction: this.constructSemanticBrief(blueprint, ratio),
      status: 'PENDING',
    }));

    // Validation Tasks
    const validationTasks: ValidationTask[] = [
      { taskId: 'val_tech', name: 'Technical Media Check', category: 'technical', blocking: true, status: 'PENDING' },
      { taskId: 'val_truth', name: 'Truth Check', category: 'truth', blocking: true, status: 'PENDING' },
      { taskId: 'val_brand', name: 'Brand Compliance Check', category: 'brand', blocking: true, status: 'PENDING' },
      { taskId: 'val_quality', name: 'Creative Quality Evaluation', category: 'quality', blocking: false, status: 'PENDING' },
      { taskId: 'val_platform', name: 'Platform Compliance Check', category: 'platform', blocking: true, status: 'PENDING' },
      { taskId: 'val_strategy', name: 'Strategy Fidelity Lock Check', category: 'strategy', blocking: true, status: 'PENDING' },
    ];

    return {
      planId,
      campaignId: blueprint.campaignId,
      blueprintId: blueprint.id,
      blueprintVersion: blueprint.version,
      strategyHash: lock.strategicHash,
      assetType,
      currentStage: 'PLANNING',
      stages,
      requiredAssets,
      generationTasks,
      validationTasks,
      outputRequirements,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Constructs a structured semantic visual brief for visual generation models
   * consuming blueprint parameters rather than generic marketing prompts.
   */
  public constructSemanticBrief(blueprint: CreativeBlueprint, ratio: string): string {
    const concept = blueprint.coreConcept?.name || 'Creative Concept';
    const insight = blueprint.coreConcept?.humanInsight || '';
    const tension = blueprint.audience?.audienceTension || '';
    const visualConcept = blueprint.visualDirection?.visualConcept || '';
    const subject = blueprint.visualDirection?.subject || '';
    const emotion = blueprint.emotionalDirection?.primaryEmotion || '';
    const tone = blueprint.tone?.primary || '';

    return `
[CAMPAIGN CONCEPT]: ${concept}
[AUDIENCE TENSION]: ${tension || insight}
[CREATIVE MECHANISM]: ${blueprint.creativeMechanism?.primaryMechanism}
[VISUAL DIRECTION]: ${visualConcept} (Subject: ${subject})
[EMOTIONAL TONE]: Evoke ${emotion} with ${tone} tone.
[ASPECT RATIO]: ${ratio} framing.
[COMPOSITION RULE]: Primary visual focus on narrative/subject interaction. Supporting offer is secondary.
[MUST AVOID]: Aggressive price shock text, low quality rendering, out-of-brand colors.
`.trim();
  }
}
