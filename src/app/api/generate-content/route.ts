import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, contentType, tone = 'engaging', businessName } = body;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return NextResponse.json(
        { error: 'Topic or product description is required' },
        { status: 400 }
      );
    }

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

    return NextResponse.json({ text: result });
  } catch (err) {
    console.error('Failed to generate content:', err);
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 });
  }
}
