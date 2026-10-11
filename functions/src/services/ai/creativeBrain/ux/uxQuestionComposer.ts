/**
 * PHASE 23 — UX Question Composer
 * Transforms domain state & missing information into warm, human, conversational questions.
 * Ensures 3-5 high-impact options, first-class [ I'm not sure ] fallback,
 * and suppression of questions already answered by Business Brain or Memory.
 */

import type {
  CreativeUXStage,
  CreativeQuestionPresentation,
  CreativeQuestionOption,
  CreativeSessionSummary,
} from './creativeUX.types';

export interface BusinessContextPayload {
  businessId: string;
  businessName?: string;
  category?: string;
  featuredProducts?: string[];
  targetAudienceSegments?: string[];
  brandTone?: string;
  memoryInsights?: string[];
  preferenceHighlights?: string[];
}

export class UXQuestionComposer {
  /**
   * Generates a conversational question presentation for the specified stage.
   */
  public composeQuestion(
    stage: CreativeUXStage,
    context: BusinessContextPayload,
    summary: CreativeSessionSummary
  ): CreativeQuestionPresentation {
    switch (stage) {
      case 'START':
      case 'INTENT':
        return this.composeIntentQuestion(context, summary);
      case 'SUBJECT':
        return this.composeSubjectQuestion(context, summary);
      case 'AUDIENCE':
        return this.composeAudienceQuestion(context, summary);
      case 'MOTIVATION':
        return this.composeMotivationQuestion(context, summary);
      case 'DIFFERENTIATION':
        return this.composeDifferentiationQuestion(context, summary);
      case 'CONFIRMATION':
        return this.composeConfirmationQuestion(context, summary);
      default:
        return this.composeIntentQuestion(context, summary);
    }
  }

  /**
   * Evaluates if a given stage question can be skipped because Business Brain or prior context already provides it.
   */
  public canInferStage(stage: CreativeUXStage, context: BusinessContextPayload, summary: CreativeSessionSummary): boolean {
    if (stage === 'AUDIENCE' && (summary.targetAudience || (context.targetAudienceSegments && context.targetAudienceSegments.length > 0))) {
      return true;
    }
    if (stage === 'SUBJECT' && summary.productOrOffer) {
      return true;
    }
    if (stage === 'DIFFERENTIATION' && summary.uniqueAngle) {
      return true;
    }
    return false;
  }

  /**
   * Infers value for a stage if available.
   */
  public inferValue(stage: CreativeUXStage, context: BusinessContextPayload, summary: CreativeSessionSummary): string | undefined {
    if (stage === 'AUDIENCE') {
      return summary.targetAudience || context.targetAudienceSegments?.[0];
    }
    if (stage === 'SUBJECT') {
      return summary.productOrOffer || context.featuredProducts?.[0];
    }
    if (stage === 'DIFFERENTIATION') {
      return summary.uniqueAngle;
    }
    return undefined;
  }

  // --- Private Composer Methods ---

  private composeIntentQuestion(context: BusinessContextPayload, _summary: CreativeSessionSummary): CreativeQuestionPresentation {
    const bizName = context.businessName || 'your business';
    const options: CreativeQuestionOption[] = [
      {
        id: 'opt_sales',
        label: 'Drive Instant Sales & Orders',
        description: 'Focus on immediate transactions, special offers, and bookings.',
        isRecommended: true,
      },
      {
        id: 'opt_awareness',
        label: 'Build Local Brand Awareness',
        description: `Get ${bizName} noticed by nearby customers who haven't visited yet.`,
      },
      {
        id: 'opt_launch',
        label: 'Promote a New Product or Feature',
        description: 'Highlight a fresh menu item, service upgrade, or seasonal offer.',
      },
      {
        id: 'opt_reengagement',
        label: 'Bring Back Inactive Customers',
        description: 'Re-engage repeat customers with a compelling reminder or VIP perk.',
      },
      {
        id: 'opt_unsure',
        label: "I'm not sure — suggest the best strategy",
        description: 'Let Mitra analyze your business performance and recommend the ideal goal.',
        isUnsure: true,
      },
    ];

    return {
      questionId: 'q_intent',
      stage: 'INTENT',
      text: `What are we creating for ${bizName} today?`,
      helperText: 'Pick your primary goal, or let Mitra recommend the best angle.',
      responseType: 'single_select',
      options,
      allowUnsure: true,
      allowSkip: true,
    };
  }

  private composeSubjectQuestion(context: BusinessContextPayload, summary: CreativeSessionSummary): CreativeQuestionPresentation {
    const products = context.featuredProducts && context.featuredProducts.length > 0
      ? context.featuredProducts
      : ['Main Service / Product Line', 'Seasonal Special Offer', 'Weekend Featured Package'];

    const options: CreativeQuestionOption[] = products.map((prod, idx) => ({
      id: `opt_prod_${idx}`,
      label: prod,
      description: idx === 0 ? 'Featured item in your profile' : undefined,
      isRecommended: idx === 0,
    }));

    options.push({
      id: 'opt_custom_prod',
      label: 'Focus on something else (type below)',
      description: 'Specify a custom product or package name.',
    });

    options.push({
      id: 'opt_unsure',
      label: "I'm not sure — spotlight our top offering",
      description: 'Mitra will select your flagship product automatically.',
      isUnsure: true,
    });

    return {
      questionId: 'q_subject',
      stage: 'SUBJECT',
      text: 'Which product, service, or offer should we spotlight?',
      helperText: 'Select one of your saved items or type a custom focus.',
      responseType: 'single_select',
      options,
      allowUnsure: true,
      allowSkip: true,
      inferredValue: this.inferValue('SUBJECT', context, summary),
    };
  }

  private composeAudienceQuestion(context: BusinessContextPayload, summary: CreativeSessionSummary): CreativeQuestionPresentation {
    const segments = context.targetAudienceSegments && context.targetAudienceSegments.length > 0
      ? context.targetAudienceSegments
      : ['Busy Working Professionals', 'Families & Groups', 'Local Neighborhood Residents', 'Value-conscious Shoppers'];

    const options: CreativeQuestionOption[] = segments.map((seg, idx) => ({
      id: `opt_aud_${idx}`,
      label: seg,
      isRecommended: idx === 0,
    }));

    options.push({
      id: 'opt_unsure',
      label: "I'm not sure — reach all local potential customers",
      description: 'Mitra will target a broad, high-intent local audience.',
      isUnsure: true,
    });

    return {
      questionId: 'q_audience',
      stage: 'AUDIENCE',
      text: 'Who is this campaign primarily for?',
      helperText: 'Choose the customer group you want to connect with most.',
      responseType: 'single_select',
      options,
      allowUnsure: true,
      allowSkip: true,
      inferredValue: this.inferValue('AUDIENCE', context, summary),
    };
  }

  private composeMotivationQuestion(_context: BusinessContextPayload, _summary: CreativeSessionSummary): CreativeQuestionPresentation {
    const options: CreativeQuestionOption[] = [
      {
        id: 'opt_mot_value',
        label: 'Unbeatable value & special deal',
        description: 'Price perception, savings, and immediate deal urgency.',
        isRecommended: true,
      },
      {
        id: 'opt_mot_convenience',
        label: 'Convenience, speed, and ease',
        description: 'Saving time and solving a hassle quickly.',
      },
      {
        id: 'opt_mot_quality',
        label: 'Premium quality & craftsmanship',
        description: 'Superior standards, taste, or results.',
      },
      {
        id: 'opt_mot_togetherness',
        label: 'Shared experience & togetherness',
        description: 'Warm family moments, celebrations, or friend hangouts.',
      },
      {
        id: 'opt_unsure',
        label: "I'm not sure — pick the strongest motivation hook",
        description: 'Mitra will select the hook proven to convert for your category.',
        isUnsure: true,
      },
    ];

    return {
      questionId: 'q_motivation',
      stage: 'MOTIVATION',
      text: 'What will motivate your customers to take action?',
      helperText: 'Select the primary emotional or practical trigger.',
      responseType: 'single_select',
      options,
      allowUnsure: true,
      allowSkip: true,
    };
  }

  private composeDifferentiationQuestion(context: BusinessContextPayload, summary: CreativeSessionSummary): CreativeQuestionPresentation {
    const options: CreativeQuestionOption[] = [
      {
        id: 'opt_diff_quality',
        label: 'Uncompromising Quality & Fresh Ingredients',
        isRecommended: true,
      },
      {
        id: 'opt_diff_speed',
        label: 'Fastest Service & Ultimate Convenience',
      },
      {
        id: 'opt_diff_price',
        label: 'Best Price-to-Value in the Neighborhood',
      },
      {
        id: 'opt_diff_atmosphere',
        label: 'Unique Atmosphere & Local Legacy',
      },
      {
        id: 'opt_unsure',
        label: "I'm not sure — highlight our core brand strength",
        isUnsure: true,
      },
    ];

    return {
      questionId: 'q_differentiation',
      stage: 'DIFFERENTIATION',
      text: 'What makes your offering stand out from local alternatives?',
      helperText: 'Select your key differentiator.',
      responseType: 'single_select',
      options,
      allowUnsure: true,
      allowSkip: true,
      inferredValue: this.inferValue('DIFFERENTIATION', context, summary),
    };
  }

  private composeConfirmationQuestion(context: BusinessContextPayload, summary: CreativeSessionSummary): CreativeQuestionPresentation {
    const title = summary.opportunityTitle || 'Strategic Opportunity';

    return {
      questionId: 'q_confirmation',
      stage: 'CONFIRMATION',
      text: `Mitra synthesized this campaign strategy: "${title}". Does this direction sound good?`,
      helperText: 'Confirm to generate distinct creative concepts or request adjustments.',
      responseType: 'confirmation',
      options: [
        {
          id: 'opt_confirm_yes',
          label: '(Recommended) Yes, generate concepts now',
          description: 'Proceed to create distinct strategic concepts.',
          isRecommended: true,
        },
        {
          id: 'opt_confirm_adjust',
          label: 'I want to refine the direction',
          description: 'Adjust audience, focus, or tone before generating concepts.',
        },
      ],
      allowUnsure: false,
      allowSkip: false,
    };
  }
}
