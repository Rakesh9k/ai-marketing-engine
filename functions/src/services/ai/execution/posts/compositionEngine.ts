/**
 * PHASE 18 — Composition Engine
 * Assembles visual assets, text hierarchy, and brand elements into a CompositionSpec
 * and intermediate SVG representation for post deliverables.
 */

import type { CanonicalCreativeBlueprint as CreativeBlueprint } from '../../creativeBrain/types/creativeBlueprint.types';
import type { CompositionLayer, CompositionSpec } from '../types/execution.types';
import { LayoutEngine } from './layoutEngine';

export class CompositionEngine {
  private readonly layoutEngine: LayoutEngine;

  constructor(layoutEngine?: LayoutEngine) {
    this.layoutEngine = layoutEngine || new LayoutEngine();
  }

  /**
   * Generates a CompositionSpec for a given aspect ratio and blueprint.
   */
  public buildCompositionSpec(
    blueprint: CreativeBlueprint,
    targetRatio: '1:1' | '4:5' | '9:16' = '1:1',
    heroImageUrl?: string,
    logoUrl?: string
  ): CompositionSpec {
    let width = 1080;
    let height = 1080;
    if (targetRatio === '4:5') {
      height = 1350;
    } else if (targetRatio === '9:16') {
      height = 1920;
    }

    const layoutPattern = this.layoutEngine.selectLayoutPattern(
      blueprint.creativeMechanism?.primaryMechanism,
      blueprint.offer?.exists
    );
    const style = this.layoutEngine.getTypographyAndColors(blueprint.tone?.primary);

    const layers: CompositionLayer[] = [];

    // 1. Background / Hero Image Layer
    layers.push({
      id: 'layer_hero_image',
      type: 'image',
      zone: { x: 0, y: 0, width, height: Math.round(height * 0.65) },
      content: heroImageUrl || 'placeholder_hero.png',
      zIndex: 1,
    });

    // 2. Headline / Primary Message Layer
    const primaryMsg = blueprint.messageHierarchy?.primaryMessage || blueprint.coreConcept?.oneLineIdea || '';
    layers.push({
      id: 'layer_headline',
      type: 'text',
      zone: { x: 60, y: Math.round(height * 0.68), width: width - 120, height: 100 },
      content: primaryMsg,
      style: {
        fontSize: '38px',
        fontWeight: '700',
        color: style.text,
        fontFamily: style.fontFamily,
      },
      zIndex: 2,
    });

    // 3. Supporting Message Layer
    const supportingMsg = blueprint.messageHierarchy?.supportingMessages?.[0] || '';
    if (supportingMsg) {
      layers.push({
        id: 'layer_supporting',
        type: 'text',
        zone: { x: 60, y: Math.round(height * 0.78), width: width - 120, height: 60 },
        content: supportingMsg,
        style: {
          fontSize: '24px',
          fontWeight: '400',
          color: '#4B5563',
          fontFamily: style.fontFamily,
        },
        zIndex: 2,
      });
    }

    // 4. Offer Badge Layer (Secondary, if offer exists)
    if (blueprint.offer?.exists && blueprint.offer?.name) {
      layers.push({
        id: 'layer_offer_badge',
        type: 'badge',
        zone: { x: width - 260, y: Math.round(height * 0.60), width: 200, height: 60 },
        content: blueprint.offer.name,
        style: {
          backgroundColor: style.accent,
          color: '#FFFFFF',
          fontSize: '20px',
          fontWeight: '600',
        },
        zIndex: 3,
      });
    }

    // 5. CTA Layer
    const ctaText = blueprint.cta?.action || 'Reserve Table';
    layers.push({
      id: 'layer_cta',
      type: 'text',
      zone: { x: 60, y: height - 100, width: 300, height: 60 },
      content: ctaText,
      style: {
        backgroundColor: style.primary,
        color: '#FFFFFF',
        fontSize: '22px',
        fontWeight: '600',
        borderRadius: '8px',
      },
      zIndex: 3,
    });

    // 6. Logo Layer
    if (logoUrl) {
      layers.push({
        id: 'layer_logo',
        type: 'logo',
        zone: { x: width - 180, y: 40, width: 140, height: 60 },
        content: logoUrl,
        zIndex: 4,
      });
    }

    return {
      canvas: { width, height, aspectRatio: targetRatio },
      layers,
      hierarchy: ['layer_hero_image', 'layer_headline', 'layer_supporting', 'layer_offer_badge', 'layer_cta', 'layer_logo'],
      layoutPattern,
      fontFamily: style.fontFamily,
      colorPalette: {
        primary: style.primary,
        secondary: style.secondary,
        text: style.text,
        accent: style.accent,
        background: style.background,
      },
    };
  }

  /**
   * Generates intermediate SVG representation from CompositionSpec.
   */
  public generateSVG(spec: CompositionSpec): string {
    const { width, height } = spec.canvas;

    let svgLayers = '';
    spec.layers.forEach((layer) => {
      if (layer.type === 'image') {
        svgLayers += `<rect x="${layer.zone.x}" y="${layer.zone.y}" width="${layer.zone.width}" height="${layer.zone.height}" fill="#E5E7EB"/>`;
      } else if (layer.type === 'text') {
        svgLayers += `<text x="${layer.zone.x}" y="${layer.zone.y + 30}" font-family="${spec.fontFamily}" font-size="${layer.style?.fontSize || '24px'}" fill="${layer.style?.color || '#000'}">${this.escapeXml(layer.content)}</text>`;
      } else if (layer.type === 'badge') {
        svgLayers += `<rect x="${layer.zone.x}" y="${layer.zone.y}" width="${layer.zone.width}" height="${layer.zone.height}" rx="6" fill="${layer.style?.backgroundColor || '#FF0000'}"/>`;
        svgLayers += `<text x="${layer.zone.x + 10}" y="${layer.zone.y + 38}" font-family="${spec.fontFamily}" font-size="${layer.style?.fontSize || '18px'}" fill="#FFFFFF">${this.escapeXml(layer.content)}</text>`;
      }
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="${spec.colorPalette.background}"/>
      ${svgLayers}
    </svg>`;
  }

  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
