/**
 * PHASE 18 — Reel Script Generator
 * Derives a structured ReelScript from an approved CanonicalCreativeBlueprint,
 * preserving full strategic traceability (strategySource) for every beat.
 */

import type { CanonicalCreativeBlueprint as CreativeBlueprint } from '../../creativeBrain/types/creativeBlueprint.types';
import type { ReelScript, ScriptSegment } from '../types/execution.types';

export class ReelScriptGenerator {
  /**
   * Generates a ReelScript from a CreativeBlueprint.
   */
  public generateScript(blueprint: CreativeBlueprint): ReelScript {
    // 1. Hook Segment
    const hookIdea = blueprint.hook?.hookIdea || blueprint.audience?.audienceTension || 'Can’t decide what to eat?';
    const hook: ScriptSegment = {
      id: 'seg_hook',
      type: 'hook',
      text: hookIdea,
      voiceoverText: hookIdea,
      captionText: hookIdea,
      durationMs: 3000,
      strategySource: {
        blueprintField: 'hook',
        purpose: 'Audience tension recognition hook',
      },
    };

    // 2. Beats (Problem -> Escalation -> Solution)
    const beats: ScriptSegment[] = [];

    // Problem Beat
    const tensionText = blueprint.audience?.audienceTension || 'Everyone in the family wants something different.';
    beats.push({
      id: 'seg_beat_1',
      type: 'beat',
      text: tensionText,
      voiceoverText: tensionText,
      captionText: tensionText,
      durationMs: 4000,
      strategySource: {
        blueprintField: 'audience.audienceTension',
        purpose: 'Audience problem escalation',
      },
    });

    // Solution Beat
    const primaryMsg = blueprint.messageHierarchy?.primaryMessage || blueprint.coreConcept?.oneLineIdea || 'Finally, a Sunday dinner where everyone agrees.';
    beats.push({
      id: 'seg_beat_2',
      type: 'solution',
      text: primaryMsg,
      voiceoverText: primaryMsg,
      captionText: primaryMsg,
      durationMs: 5000,
      strategySource: {
        blueprintField: 'messageHierarchy.primaryMessage',
        purpose: 'Core concept & resolution presentation',
      },
    });

    // Supporting Offer Beat (if offer exists)
    if (blueprint.offer?.exists && blueprint.offer?.name) {
      const offerMsg = `Enjoy ${blueprint.offer.name}`;
      beats.push({
        id: 'seg_beat_offer',
        type: 'offer',
        text: offerMsg,
        voiceoverText: offerMsg,
        captionText: offerMsg,
        durationMs: 3000,
        strategySource: {
          blueprintField: 'offer',
          purpose: 'Supporting offer proof',
        },
      });
    }

    // 3. Final Message & CTA
    const finalMsgText = blueprint.messageHierarchy?.finalTakeaway || 'Visit us this weekend.';
    const finalMessage: ScriptSegment = {
      id: 'seg_final_msg',
      type: 'beat',
      text: finalMsgText,
      voiceoverText: finalMsgText,
      captionText: finalMsgText,
      durationMs: 3000,
      strategySource: {
        blueprintField: 'messageHierarchy.finalTakeaway',
        purpose: 'Final strategic takeaway',
      },
    };

    const ctaText = blueprint.cta?.action || 'Reserve Your Table';
    const cta: ScriptSegment = {
      id: 'seg_cta',
      type: 'cta',
      text: ctaText,
      voiceoverText: `${ctaText} today!`,
      captionText: ctaText,
      durationMs: 2000,
      strategySource: {
        blueprintField: 'cta.action',
        purpose: 'Direct conversion action',
      },
    };

    const totalDurationMs =
      hook.durationMs +
      beats.reduce((acc, b) => acc + b.durationMs, 0) +
      finalMessage.durationMs +
      cta.durationMs;

    return {
      hook,
      beats,
      transitionLogic: ['Cut on motion', 'Smooth slide', 'Fade out'],
      finalMessage,
      cta,
      totalDurationMs,
    };
  }
}
