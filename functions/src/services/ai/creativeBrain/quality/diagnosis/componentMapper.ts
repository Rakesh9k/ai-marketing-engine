import { CreativeQualityDimension, CreativeComponent } from "../../types";

export class QualityComponentMapper {
  /**
   * Deterministic mapping from Quality Dimension -> Primary affected Creative Components.
   */
  public mapDimensionToComponents(dimension: CreativeQualityDimension): CreativeComponent[] {
    switch (dimension) {
      case CreativeQualityDimension.STRATEGIC_FIT:
        return [CreativeComponent.STRATEGY, CreativeComponent.CORE_IDEA, CreativeComponent.HEADLINE, CreativeComponent.SUPPORTING_COPY];
      case CreativeQualityDimension.AUDIENCE_RELEVANCE:
        return [CreativeComponent.SUPPORTING_COPY, CreativeComponent.HEADLINE, CreativeComponent.STORY_STRUCTURE];
      case CreativeQualityDimension.CLARITY:
        return [CreativeComponent.HEADLINE, CreativeComponent.SUPPORTING_COPY, CreativeComponent.CTA];
      case CreativeQualityDimension.ATTENTION:
        return [CreativeComponent.HOOK, CreativeComponent.HERO_ASSET, CreativeComponent.COMPOSITION];
      case CreativeQualityDimension.EMOTIONAL_RESONANCE:
        return [CreativeComponent.HEADLINE, CreativeComponent.SUPPORTING_COPY, CreativeComponent.VISUAL_DIRECTION];
      case CreativeQualityDimension.DIFFERENTIATION:
        return [CreativeComponent.HEADLINE, CreativeComponent.SUPPORTING_COPY, CreativeComponent.VISUAL_DIRECTION];
      case CreativeQualityDimension.BRAND_FIT:
        return [CreativeComponent.STYLE, CreativeComponent.TYPOGRAPHY, CreativeComponent.COLOR];
      case CreativeQualityDimension.OFFER_CLARITY:
        return [CreativeComponent.OFFER_COPY, CreativeComponent.HEADLINE, CreativeComponent.COMPOSITION];
      case CreativeQualityDimension.CTA_STRENGTH:
        return [CreativeComponent.CTA];
      case CreativeQualityDimension.VISUAL_HIERARCHY:
        return [CreativeComponent.COMPOSITION, CreativeComponent.TYPOGRAPHY, CreativeComponent.HERO_ASSET];
      case CreativeQualityDimension.PLATFORM_FIT:
        return [CreativeComponent.PLATFORM_EXPRESSION, CreativeComponent.COMPOSITION];
      case CreativeQualityDimension.TRUTHFULNESS:
        return [CreativeComponent.HEADLINE, CreativeComponent.OFFER_COPY, CreativeComponent.SUPPORTING_COPY];
      default:
        return [CreativeComponent.HEADLINE];
    }
  }
}
