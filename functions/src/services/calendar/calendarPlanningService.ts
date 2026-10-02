import { z } from 'zod';
import { getTextAI } from '../ai/factory/aiProviderFactory';
import type {
  Business,
  GeneratePlanInput,
  MarketingPlan,
  MarketingCalendarItem,
  PublishContentType,
} from '../../types';
import { isValidIANATimezone } from '../scheduling/timezoneUtils';

// Zod Schema for Structured AI Planner Output
const CalendarItemAISchema = z.object({
  dayOffset: z.number().int().min(0).max(30), // Day 0 to 29 relative to start
  contentType: z.enum(['post', 'reel']),
  strategy: z.string().min(3),
  topic: z.string().min(3),
  hook: z.string().min(3),
  callToAction: z.string().min(2),
  suggestedTime: z.string().default('19:30'),
  productId: z.string().optional().nullable(),
  productName: z.string().optional().nullable(),
  offerHeadline: z.string().optional().nullable(),
});

const MarketingPlanAISchema = z.object({
  planTitle: z.string(),
  strategySummary: z.string(),
  items: z.array(CalendarItemAISchema),
});

export type GeneratedPlanAIOutput = z.infer<typeof MarketingPlanAISchema>;

export const calendarPlanningService = {
  async generatePlan(
    business: Business,
    input: GeneratePlanInput,
    userId: string
  ): Promise<{ plan: MarketingPlan; items: MarketingCalendarItem[] }> {
    const textAI = getTextAI();

    const timezone =
      input.timezone && isValidIANATimezone(input.timezone)
        ? input.timezone
        : business.settings?.timezone && isValidIANATimezone(business.settings.timezone)
          ? business.settings.timezone
          : 'Asia/Kolkata';

    const startDate = input.startDate || new Date().toISOString().split('T')[0]!;
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(startDateTime.getTime() + 29 * 86400000);
    const endDate = endDateTime.toISOString().split('T')[0]!;

    // Available Products
    const availableProducts = (business.businessBrain?.products || []).map((p) => ({
      id: p.productId,
      name: p.name,
      category: p.category,
      price: p.price,
    }));

    // Filter focus product if specified
    const selectedProduct = input.specificProductId
      ? availableProducts.find((p) => p.id === input.specificProductId)
      : null;

    // Available Offers (Strictly from Business Brain facts — never invented)
    const activeOffers = business.businessBrain?.businessRules?.offerValidityRules
      ? [business.businessBrain.businessRules.offerValidityRules]
      : [];

    const goalDescriptions: Record<string, string> = {
      get_customers:
        'Drive new customer acquisition, footfalls, and orders using high-converting hooks and value propositions.',
      promote_offers:
        'Highlight active discounts, special packages, and limited-time offers to maximize conversions.',
      build_awareness:
        'Educate the local audience on brand story, behind-the-scenes quality, and unique selling points.',
      promote_products:
        'Spotlight specific signature products/services in detail with clear feature-focused CTAs.',
    };

    const targetItemCounts: Record<string, number> = {
      three_per_week: 13,
      five_per_week: 21,
      daily: 30,
    };

    const countTarget = targetItemCounts[input.frequency] || 13;

    // Construct Low-Cost AI Planner Prompt
    const prompt = `
You are Mitra's Expert AI Marketing Strategist.
Create a structured 30-day marketing content plan for the following business:

BUSINESS PROFILE:
Name: "${business.name}"
Category: "${business.category}"
Location: "${business.location?.city || ''}, ${business.location?.state || ''}"
Tone: "${business.businessBrain?.brand?.tone || 'professional'}"
Primary Language: "${business.businessBrain?.localization?.primaryLanguage || 'en'}"
Regional Style: "${business.businessBrain?.localization?.regionalStyle || 'neutral'}"

GOAL & STRATEGY:
Selected Goal: "${input.goal}" (${goalDescriptions[input.goal] || ''})
Posting Frequency: "${input.frequency}" (Generate exactly ${countTarget} content items over 30 days)
Planning Window: Day 0 to Day 29 (${startDate} to ${endDate})
${selectedProduct ? `FEATURED PRODUCT FOCUS: "${selectedProduct.name}" (ID: ${selectedProduct.id})` : ''}

AVAILABLE PRODUCTS/SERVICES:
${JSON.stringify(availableProducts, null, 2)}

ACTIVE OFFERS (ONLY USE IF REAL — DO NOT INVENT UNVERIFIED OFFERS):
${JSON.stringify(activeOffers, null, 2)}

REQUIREMENTS:
1. Generate exactly ${countTarget} structured content items spread evenly across the 30-day window (dayOffset integer between 0 and 29).
2. Content Type Mix: Provide a healthy mix of Feed Posts ('post') and Vertical Reels ('reel').
3. Topics & Hooks: Ensure varied topics (Product spotlight, Educational, Behind-the-scenes, Special offer, Customer proof, FAQ, Problem-solution).
4. Language & Tone: Respect the business's primary language and brand tone.
5. No Repetition: Avoid repeating the exact same hook or topic in back-to-back posts.
6. Strict Factuality & Truthfulness:
   - If referencing a product, use a real productId and productName from AVAILABLE PRODUCTS.
   - DO NOT invent unverified offers, discounts, or sales. If ACTIVE OFFERS is empty, set offerHeadline to null.
   - DO NOT invent local festivals, holidays, or event dates based solely on model memory.
7. Format Output: Return ONLY JSON conforming strictly to the requested schema.
`;

    const aiOutput = await textAI.generateStructured(prompt, MarketingPlanAISchema, {
      temperature: 0.5,
      maxTokens: 8192,
    });

    const planId = 'plan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const nowIso = new Date().toISOString();

    // Map AI Output Items into MarketingCalendarItems with authoritative server dates
    const items: MarketingCalendarItem[] = aiOutput.items.map((aiItem, index) => {
      const clampedOffset = Math.max(0, Math.min(29, Math.floor(aiItem.dayOffset)));
      const itemDate = new Date(startDateTime.getTime() + clampedOffset * 86400000);
      const scheduledDateStr = itemDate.toISOString().split('T')[0]!;

      // Validate Product Reference
      let validProductId: string | null = null;
      let validProductName: string | null = null;
      if (aiItem.productId) {
        const found = availableProducts.find((p) => p.id === aiItem.productId);
        if (found) {
          validProductId = found.id;
          validProductName = found.name;
        }
      }

      // Enforce offer validity: if no active offers exist in Business Brain, force offerHeadline = null
      const validOfferHeadline = activeOffers.length > 0 ? aiItem.offerHeadline || null : null;

      return {
        itemId: `cal_${planId}_${index + 1}`,
        planId,
        userId,
        businessId: business.businessId,
        scheduledDate: scheduledDateStr,
        suggestedTime: aiItem.suggestedTime || '19:30',
        timezone,
        contentType: (aiItem.contentType === 'reel' ? 'reel' : 'post') as PublishContentType,
        strategy: aiItem.strategy,
        topic: aiItem.topic,
        hook: aiItem.hook,
        callToAction: aiItem.callToAction,
        offerHeadline: validOfferHeadline,
        productId: validProductId,
        productName: validProductName,
        status: 'planned',
        campaignId: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    });

    // Ensure items are sorted chronologically
    items.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

    const plan: MarketingPlan = {
      planId,
      userId,
      businessId: business.businessId,
      goal: input.goal,
      frequency: input.frequency,
      startDate,
      endDate,
      timezone,
      status: 'active',
      totalItems: items.length,
      createdCount: 0,
      metadata: {
        promptVersion: 'v1.0',
        aiModel: 'gemini-flash-latest',
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    return { plan, items };
  },
};
