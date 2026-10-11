/**
 * PHASE 18 — Layout Engine
 * Provides reusable layout primitives and typography hierarchy rules for post composition.
 */

export type LayoutPattern =
  | 'Hero Focus'
  | 'Editorial'
  | 'Split Story'
  | 'Product Focus'
  | 'Human Moment'
  | 'Offer Support'
  | 'Text-led'
  | 'Image-led';

export interface LayoutStyleConfig {
  layoutPattern: LayoutPattern;
  fontFamily: string;
  colorPalette: {
    primary: string;
    secondary: string;
    text: string;
    accent: string;
    background: string;
  };
}

export class LayoutEngine {
  /**
   * Selects an appropriate layout pattern based on creative mechanism and message hierarchy.
   */
  public selectLayoutPattern(primaryMechanism?: string, hasOffer?: boolean): LayoutPattern {
    const mech = (primaryMechanism || '').toLowerCase();

    if (mech.includes('recognition') || mech.includes('story')) {
      return 'Human Moment';
    }
    if (mech.includes('contrast') || mech.includes('before')) {
      return 'Split Story';
    }
    if (hasOffer && (mech.includes('value') || mech.includes('deal'))) {
      return 'Offer Support';
    }

    return 'Hero Focus';
  }

  /**
   * Returns color palette and font typography defaults.
   */
  public getTypographyAndColors(brandTone?: string): LayoutStyleConfig['colorPalette'] & { fontFamily: string } {
    const tone = (brandTone || '').toLowerCase();

    if (tone.includes('warm') || tone.includes('hospitable')) {
      return {
        fontFamily: "'Inter', 'Montserrat', sans-serif",
        primary: '#E65100', // Warm amber / orange
        secondary: '#FFF3E0',
        text: '#1F2937',
        accent: '#D97706',
        background: '#FFFFFF',
      };
    }

    return {
      fontFamily: "'Inter', sans-serif",
      primary: '#1E40AF',
      secondary: '#EFF6FF',
      text: '#111827',
      accent: '#3B82F6',
      background: '#FFFFFF',
    };
  }
}
