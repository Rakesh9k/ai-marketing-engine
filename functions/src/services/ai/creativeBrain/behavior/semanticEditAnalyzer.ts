/**
 * PHASE 22 — Semantic Edit Analyzer
 * Infers taxonomy shifts (e.g. PROMOTIONAL -> RECOGNITION, SALESY -> CONVERSATIONAL)
 * from user copy, hook, visual, and tone edits rather than comparing raw strings.
 */

import type { SemanticEditClassification } from './behavior.types';

export class SemanticEditAnalyzer {
  /**
   * Analyzes an edit action and infers the underlying creative taxonomy shift.
   */
  public analyzeEdit(
    component: string,
    beforeValue?: unknown,
    afterValue?: unknown
  ): SemanticEditClassification {
    const beforeStr = typeof beforeValue === 'string' ? beforeValue.toLowerCase() : '';
    const afterStr = typeof afterValue === 'string' ? afterValue.toLowerCase() : '';

    let beforeCategory = 'PROMOTIONAL';
    let afterCategory = 'CONVERSATIONAL';
    let shiftDescription = `${component.toUpperCase()} shift`;

    if (component === 'HOOK') {
      if (this.isPromotional(beforeStr) && this.isQuestionOrRecognition(afterStr)) {
        beforeCategory = 'PROMOTIONAL_OFFER';
        afterCategory = 'AUDIENCE_RECOGNITION';
        shiftDescription = 'Shifted hook from offer-led promotion to audience recognition question';
      } else if (this.isSalesy(beforeStr) && !this.isSalesy(afterStr)) {
        beforeCategory = 'SALES_PITCH';
        afterCategory = 'CONVERSATIONAL_HOOK';
        shiftDescription = 'Shifted hook tone from sales pitch to conversational engagement';
      }
    } else if (component === 'COPY' || component === 'TONE') {
      if (this.isSalesy(beforeStr) && !this.isSalesy(afterStr)) {
        beforeCategory = 'SALESY';
        afterCategory = 'WARM_AUTHENTIC';
        shiftDescription = 'Shifted copy tone from aggressive salesy to warm authentic';
      }
    } else if (component === 'VISUAL' || component === 'LAYOUT') {
      if (beforeStr.includes('text') || beforeStr.includes('graphic')) {
        beforeCategory = 'TEXT_HEAVY_GRAPHIC';
        afterCategory = 'HUMAN_IMAGE_LED';
        shiftDescription = 'Shifted visual layout from text-heavy graphic to image-led photography';
      }
    }

    return {
      component,
      beforeCategory,
      afterCategory,
      shiftDescription,
    };
  }

  private isPromotional(text: string): boolean {
    return (
      text.includes('offer') ||
      text.includes('deal') ||
      text.includes('discount') ||
      text.includes('off') ||
      text.includes('price') ||
      text.includes('buy') ||
      text.includes('save')
    );
  }

  private isQuestionOrRecognition(text: string): boolean {
    return text.includes('?') || text.includes('still') || text.includes('arguing') || text.includes('wondering') || text.includes('tired');
  }

  private isSalesy(text: string): boolean {
    return (
      text.includes('amazing') ||
      text.includes('don\'t miss') ||
      text.includes('hurry') ||
      text.includes('limited time') ||
      text.includes('act now')
    );
  }
}
