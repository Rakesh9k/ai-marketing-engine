import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyServerRequest, verifyTenantAccess } from '@/lib/server/auth/verifyRequest';
import { checkRateLimit, rateLimitExceededResponse } from '@/lib/server/rateLimit';

const generateContentSchema = z.object({
  topic: z.string().min(1, 'Topic or product description is required').max(1000),
  contentType: z
    .enum(['caption', 'headline', 'offer', 'whatsapp', 'hashtags'])
    .optional()
    .default('caption'),
  businessName: z.string().optional(),
  businessId: z.string().optional(),
});

function jsonResponse(
  data: unknown,
  status = 200,
  initHeaders?: Record<string, string>
): NextResponse {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      ...initHeaders,
    },
  });
}

export async function POST(req: Request) {
  // 1. Verify Server Authentication
  const authResult = await verifyServerRequest(req);
  if (!authResult.success) {
    return authResult.response;
  }

  const principal = authResult.principal;

  // 2. Parse & Validate Request Input
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON request payload' }, 400);
  }

  const parseResult = generateContentSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return jsonResponse(
      { error: parseResult.error.errors[0]?.message || 'Invalid input parameter' },
      400
    );
  }

  const { topic, contentType, businessName, businessId } = parseResult.data;

  // 3. Verify Tenant Access if businessId is provided
  if (businessId) {
    const tenantAccess = await verifyTenantAccess(principal.uid, businessId);
    if (!tenantAccess.authorized) {
      return jsonResponse(
        { error: `Forbidden: ${tenantAccess.reason || 'Unauthorized access to target business'}` },
        403
      );
    }
  }

  // 4. Rate Limiting (20 requests per minute per user)
  const rateLimit = await checkRateLimit({
    identifier: principal.uid,
    limit: 20,
    windowSeconds: 60,
    prefix: 'ai-generate-content',
  });

  if (!rateLimit.success) {
    return rateLimitExceededResponse(rateLimit);
  }

  // 5. Execute Generation Logic
  try {
    const cleanTopic = topic.trim();
    const tagTopic = cleanTopic.replace(/[^a-zA-Z0-9]/g, '');
    let result = '';

    if (contentType === 'caption') {
      result = `✨ **${cleanTopic.toUpperCase()}** ✨\n\nLooking for something extraordinary today? Experience the rich taste and unmatched quality of ${cleanTopic}, crafted to perfection!\n\n🔥 **Why you'll love it:**\n• Freshly prepared with premium ingredients\n• Unbeatable quality & value\n• Fast delivery right to your door\n\n👉 **Tag a friend who needs to try this today!**\n\n📌 **Hashtags:**\n#${tagTopic} #${tagTopic}Special #FoodieFavorites #LocalFlavor #DailySpecial #TrendingNow`;
    } else if (contentType === 'headline') {
      result = `🔥 1. Craving the Best ${cleanTopic}? Get 20% Off Your First Order Today!\n\n⚡ 2. Don't Miss Out: Premium ${cleanTopic} Delivered Fresh to You!\n\n🎉 3. The Ultimate ${cleanTopic} Experience — Order Now & Save Big!`;
    } else if (contentType === 'offer') {
      result = `🎉 **SPECIAL LIMITED TIME OFFER** 🎉\n\nBuy 1 Get 1 FREE on all ${cleanTopic} orders this weekend!\n\n🎁 **Use Code:** \`MITRA20\`\n⏳ **Valid Till:** Sunday Midnight\n\n👉 Tap the link in bio to claim your discount before it expires!`;
    } else if (contentType === 'whatsapp') {
      result = `👋 Hi there! Special update from ${businessName || 'us'}!\n\nEnjoy delicious, fresh ${cleanTopic} delivered right to your doorstep.\n\n🌟 *Weekend Special:* Get FREE delivery on orders above ₹299!\n\n📲 Reply *ORDER* to get our menu or tap below to order now!`;
    } else {
      result = `🏷️ **Hashtag Strategy for ${cleanTopic}:**\n\n🎯 **Niche Tags:**\n#${tagTopic} #${tagTopic}Lovers #${tagTopic}Daily #${tagTopic}Special\n\n📍 **Location & Local Tags:**\n#LocalBusiness #CityFoodies #HyderabadiFlavors #NearMe\n\n🚀 **Broad Reach Tags:**\n#TrendingNow #SpecialOffer #BestQuality #ViralPost`;
    }

    return jsonResponse({ text: result }, 200);
  } catch (err) {
    console.error('Failed to generate content:', err);
    return jsonResponse({ error: 'Failed to generate content' }, 500);
  }
}
