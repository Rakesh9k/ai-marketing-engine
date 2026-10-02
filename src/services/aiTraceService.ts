import type { PipelineTrace } from '@/types';

export interface AiTraceRecord {
  id: string;
  campaignId: string;
  campaignNumber: string;
  businessName: string;
  userRequest: string;
  intent: string;
  contextFactsCount: number;
  validationStatus: 'PASS' | 'FAIL';
  validationPassedCount: number;
  validationTotalCount: number;
  costInr: number;
  latencySeconds: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  createdAt: string;
  trace: PipelineTrace;
}

export const INITIAL_AI_TRACES: AiTraceRecord[] = [
  {
    id: 'trace_8291',
    campaignId: 'camp_8291',
    campaignNumber: '#8291',
    businessName: 'ABC Biryani',
    userRequest: 'Create a funny Telugu biryani ad for Friday',
    intent: 'Promotion (Chicken Biryani, Funny, Telugu)',
    contextFactsCount: 8,
    validationStatus: 'PASS',
    validationPassedCount: 9,
    validationTotalCount: 9,
    costInr: 0.42,
    latencySeconds: 3.2,
    model: 'Gemini 1.5 Pro',
    inputTokens: 1240,
    outputTokens: 380,
    createdAt: '2026-09-30T18:45:00Z',
    trace: {
      traceId: 'tr_8291_abc',
      campaignId: 'camp_8291',
      businessId: 'biz_abc_biryani',
      createdAt: '2026-09-30T18:45:00Z',
      userRequest: {
        stepId: 'step_1_req',
        name: 'User Input',
        status: 'passed',
        timestamp: '2026-09-30T18:45:00Z',
        summary: 'Instruction captured successfully',
        data: {
          request: 'Create a funny Telugu ad for our chicken biryani',
          language: 'te',
          style: 'funny',
          objective: 'promotion',
          targetProduct: 'Chicken Biryani',
        },
      },
      mitraUi: {
        stepId: 'step_2_ui',
        name: 'Mitra UI',
        status: 'passed',
        timestamp: '2026-09-30T18:45:00.100Z',
        summary: 'Wizard parameters validated',
        data: {
          component: 'CampaignWizard',
          platform: 'instagram',
          format: 'poster',
        },
      },
      intentExtraction: {
        stepId: 'step_3_intent',
        name: 'Intent Extraction',
        status: 'passed',
        timestamp: '2026-09-30T18:45:00.300Z',
        summary: 'Parsed Promotion intent for Chicken Biryani in Telugu (funny tone)',
        data: {
          extractedLanguage: 'te',
          extractedStyle: 'funny',
          extractedProduct: 'Chicken Biryani',
          extractedObjective: 'promotion',
          extractedOccasion: 'Friday Special',
          confidence: 0.98,
        },
      },
      businessBrainRetrieval: {
        stepId: 'step_4_brain',
        name: 'Business Brain Retrieval',
        status: 'passed',
        timestamp: '2026-09-30T18:45:00.600Z',
        summary: 'Retrieved 8 core business facts from Business Brain',
        data: {
          business: 'ABC Biryani',
          location: 'Kondapur, Hyderabad',
          product: 'Special Chicken Biryani',
          price: '₹299',
          brandTone: 'Friendly',
          languagePreference: 'Telugu',
          audience: 'Local food lovers & young professionals',
          businessRules: {
            openingHours: '11:00 AM - 11:00 PM',
            deliveryRadius: '5 km',
            phone: '+91 98765 43210',
          },
        },
      },
      contextAssembly: {
        stepId: 'step_5_ctx',
        name: 'Context Assembly',
        status: 'passed',
        timestamp: '2026-09-30T18:45:00.900Z',
        summary: '8 relevant facts retrieved and ground truth constraints assembled',
        data: {
          selectedContext: {
            businessIdentity: true,
            productInformation: true,
            currentOffer: true,
            location: true,
            language: true,
            tone: true,
            relevantPreviousCampaignPreferences: true,
            brandRules: true,
          },
          contextSummary:
            'ABC Biryani (Kondapur, Hyd) | Product: Special Chicken Biryani | Price: ₹299 | Tone: Friendly/Funny | Lang: Telugu (te)',
        },
      },
      promptBuilder: {
        stepId: 'step_6_prompt',
        name: 'Prompt & Instruction Builder',
        status: 'passed',
        timestamp: '2026-09-30T18:45:01.200Z',
        summary: 'Constructed system instructions (1,240 tokens) with 4-tier fact hierarchy',
        data: {
          systemInstruction:
            'You are Mitra, expert AI Marketing Agent for Indian SMBs. Generate authentic Telugu copy without inventing pricing or claims.',
          businessContext:
            'Business: ABC Biryani | Location: Kondapur, Hyderabad | Phone: +91 98765 43210 | Product: Special Chicken Biryani | Price: ₹299 | Offer: Friday Special Biryani Feast',
          userRequest: 'Create a funny Telugu ad for our chicken biryani',
          task: 'Create high-converting social media copy, headline, and CTA in Telugu with funny regional flavor.',
          outputSchema: {
            headline: 'STRING',
            caption: 'STRING',
            language: 'te',
            tone: 'funny',
            cta: 'STRING',
          },
        },
      },
      geminiResponse: {
        stepId: 'step_7_gemini',
        name: 'Gemini Model Response',
        status: 'passed',
        timestamp: '2026-09-30T18:45:02.800Z',
        summary: 'Model gemini-1.5-pro responded in 3.2s (1,240 in / 380 out tokens)',
        data: {
          headline: 'శుక్రవారం వచ్చిందంటే బిర్యానీ పండగే! 🍗✨',
          caption:
            'ఆకలి కేకలా? కొండాపూర్ ABC Biryani కి వచ్చేయండి! Special Chicken Biryani కేవలం ₹299 మాత్రమే! 😋',
          language: 'te',
          tone: 'funny',
          cta: 'WhatsApp లో ఇప్పుడే ఆర్డర్ చేయండి 📲',
          rawOutput: {
            headline: 'శుక్రవారం వచ్చిందంటే బిర్యానీ పండగే! 🍗✨',
            caption:
              'ఆకలి కేకలా? కొండాపూర్ ABC Biryani కి వచ్చేయండి! Special Chicken Biryani కేవలం ₹299 మాత్రమే! 😋',
            language: 'te',
            tone: 'funny',
            cta: 'WhatsApp లో ఇప్పుడే ఆర్డర్ చేయండి 📲',
          },
        },
      },
      validationTruthCheck: {
        stepId: 'step_8_val',
        name: 'Validation & Truth Check',
        status: 'passed',
        timestamp: '2026-09-30T18:45:03.000Z',
        summary: '9 / 9 Ground Truth checks passed. No hallucinations detected.',
        data: {
          passed: true,
          summary: '9 / 9 ground truth rules satisfied.',
          checks: [
            {
              name: 'Business Name',
              status: 'PASS',
              expected: 'ABC Biryani',
              actual: 'ABC Biryani',
            },
            {
              name: 'Product Name',
              status: 'PASS',
              expected: 'Special Chicken Biryani',
              actual: 'Special Chicken Biryani',
            },
            { name: 'Price Floor', status: 'PASS', expected: '₹299', actual: '₹299' },
            {
              name: 'Phone & Contact',
              status: 'PASS',
              expected: '+91 98765 43210',
              actual: '+91 98765 43210',
            },
            {
              name: 'Location Match',
              status: 'PASS',
              expected: 'Kondapur, Hyderabad',
              actual: 'Kondapur',
            },
            { name: 'Language Requested', status: 'PASS', expected: 'te', actual: 'te' },
            { name: 'Tone Requested', status: 'PASS', expected: 'funny', actual: 'funny' },
            {
              name: 'No Invented Discount',
              status: 'PASS',
              expected: 'No unauthorized offer',
              actual: 'Valid offer',
            },
            {
              name: 'CTA Present',
              status: 'PASS',
              expected: 'WhatsApp CTA',
              actual: 'WhatsApp Order CTA',
            },
          ],
        },
      },
      mitraTransformations: {
        stepId: 'step_9_trans',
        name: 'Mitra Transformations',
        status: 'passed',
        timestamp: '2026-09-30T18:45:03.100Z',
        summary: 'Formatted regional typography and badge styling applied',
        data: {
          appliedTransformations: [
            {
              name: 'Telugu Typography Adjuster',
              description: 'Selected Noto Sans Telugu for headline rendering',
            },
            {
              name: 'Brand Palette Injector',
              description: 'Injected primary amber and deep maroon brand tokens',
            },
          ],
        },
      },
      creativeGeneration: {
        stepId: 'step_10_creative',
        name: 'Creative Generation',
        status: 'passed',
        timestamp: '2026-09-30T18:45:03.200Z',
        summary: 'Generated 1 primary poster asset',
        data: {
          generatedPostersCount: 1,
          storyFramesCount: 0,
          reelStoryboardCount: 0,
          assetsMetadata: [
            {
              type: 'poster',
              prompt: 'Sizzling Hyderabadi Chicken Biryani bowl with steam and fresh mint leaves',
            },
          ],
        },
      },
      finalCampaign: {
        stepId: 'step_11_final',
        name: 'Final Campaign Assembly',
        status: 'passed',
        timestamp: '2026-09-30T18:45:03.200Z',
        summary: 'Campaign ready for review and instant WhatsApp publishing',
        data: {
          campaignId: 'camp_8291',
          status: 'verified',
          deliveredAssetsCount: 1,
          customerSummary: 'Campaign verified and ready for WhatsApp publishing',
        },
      },
    },
  },
  {
    id: 'trace_8292',
    campaignId: 'camp_8292',
    campaignNumber: '#8292',
    businessName: 'Royal Beauty Salon & Spa',
    userRequest: 'Promote our weekend bridal package at ₹1,999 in Hinglish',
    intent: 'Promotion (Bridal Package, Premium, Hinglish)',
    contextFactsCount: 7,
    validationStatus: 'PASS',
    validationPassedCount: 9,
    validationTotalCount: 9,
    costInr: 0.38,
    latencySeconds: 2.9,
    model: 'Gemini 1.5 Pro',
    inputTokens: 1100,
    outputTokens: 320,
    createdAt: '2026-09-30T17:10:00Z',
    trace: {
      traceId: 'tr_8292_salon',
      campaignId: 'camp_8292',
      businessId: 'biz_royal_salon',
      createdAt: '2026-09-30T17:10:00Z',
      userRequest: {
        stepId: 'step_1_req',
        name: 'User Input',
        status: 'passed',
        timestamp: '2026-09-30T17:10:00Z',
        summary: 'Instruction captured successfully',
        data: {
          request: 'Promote our weekend bridal package at ₹1,999 in Hinglish',
          language: 'te_en',
          style: 'premium',
          objective: 'package_promotion',
          targetProduct: 'Weekend Bridal Package',
        },
      },
      mitraUi: {
        stepId: 'step_2_ui',
        name: 'Mitra UI',
        status: 'passed',
        timestamp: '2026-09-30T17:10:00.100Z',
        summary: 'Salon vertical layout',
        data: { component: 'CampaignWizard', platform: 'instagram', format: 'poster' },
      },
      intentExtraction: {
        stepId: 'step_3_intent',
        name: 'Intent Extraction',
        status: 'passed',
        timestamp: '2026-09-30T17:10:00.250Z',
        summary: 'Parsed Package Promotion for Bridal Package in Hinglish',
        data: {
          extractedLanguage: 'hi_en',
          extractedStyle: 'premium',
          extractedProduct: 'Weekend Bridal Package',
          extractedObjective: 'package_promotion',
          confidence: 0.96,
        },
      },
      businessBrainRetrieval: {
        stepId: 'step_4_brain',
        name: 'Business Brain Retrieval',
        status: 'passed',
        timestamp: '2026-09-30T17:10:00.500Z',
        summary: 'Retrieved Salon service catalog and price list',
        data: {
          business: 'Royal Beauty Salon & Spa',
          location: 'Banjara Hills, Hyderabad',
          product: 'Weekend Bridal Glow Package',
          price: '₹1,999',
          brandTone: 'Luxury',
          languagePreference: 'Hinglish',
          audience: 'Brides-to-be & festive women',
        },
      },
      contextAssembly: {
        stepId: 'step_5_ctx',
        name: 'Context Assembly',
        status: 'passed',
        timestamp: '2026-09-30T17:10:00.800Z',
        summary: '7 relevant facts retrieved',
        data: {
          selectedContext: {
            businessIdentity: true,
            productInformation: true,
            currentOffer: true,
            location: true,
            language: true,
            tone: true,
            relevantPreviousCampaignPreferences: false,
            brandRules: true,
          },
          contextSummary:
            'Royal Beauty Salon (Banjara Hills) | Package: Bridal Glow | Price: ₹1,999',
        },
      },
      promptBuilder: {
        stepId: 'step_6_prompt',
        name: 'Prompt & Instruction Builder',
        status: 'passed',
        timestamp: '2026-09-30T17:10:01.000Z',
        summary: 'Constructed prompt with Hinglish language parameters',
        data: {
          systemInstruction: 'You are Mitra AI. Generate luxury Hinglish copy for salon packages.',
          businessContext:
            'Royal Beauty Salon, Banjara Hills | Price: ₹1,999 | Phone: +91 91234 56789',
          userRequest: 'Promote our weekend bridal package at ₹1,999 in Hinglish',
          task: 'Generate Instagram caption and headline in engaging Hinglish.',
          outputSchema: { headline: 'STRING', caption: 'STRING', cta: 'STRING' },
        },
      },
      geminiResponse: {
        stepId: 'step_7_gemini',
        name: 'Gemini Model Response',
        status: 'passed',
        timestamp: '2026-09-30T17:10:02.900Z',
        summary: 'Model gemini-1.5-pro responded in 2.9s',
        data: {
          headline: 'Get That Royal Bridal Glow This Weekend! ✨👑',
          caption:
            'Shaadi season is here! Treat yourself to our Weekend Bridal Glow Package at just ₹1,999 only at Royal Beauty Salon, Banjara Hills! Book your appointment today. 💆‍♀️✨',
          language: 'hi_en',
          tone: 'premium',
          cta: 'Book Appointment on WhatsApp 📲',
        },
      },
      validationTruthCheck: {
        stepId: 'step_8_val',
        name: 'Validation & Truth Check',
        status: 'passed',
        timestamp: '2026-09-30T17:10:03.000Z',
        summary: '9 / 9 Ground Truth checks passed.',
        data: {
          passed: true,
          summary: 'All facts verified against Business Brain.',
          checks: [
            {
              name: 'Business Name',
              status: 'PASS',
              expected: 'Royal Beauty Salon & Spa',
              actual: 'Royal Beauty Salon',
            },
            {
              name: 'Product Name',
              status: 'PASS',
              expected: 'Weekend Bridal Package',
              actual: 'Weekend Bridal Glow Package',
            },
            { name: 'Price Floor', status: 'PASS', expected: '₹1,999', actual: '₹1,999' },
            {
              name: 'Location Match',
              status: 'PASS',
              expected: 'Banjara Hills',
              actual: 'Banjara Hills',
            },
            {
              name: 'Language Requested',
              status: 'PASS',
              expected: 'Hinglish',
              actual: 'Hinglish',
            },
            { name: 'Tone Requested', status: 'PASS', expected: 'Premium', actual: 'Premium' },
            {
              name: 'CTA Present',
              status: 'PASS',
              expected: 'Appointment CTA',
              actual: 'Book Appointment',
            },
            {
              name: 'No Invented Offer',
              status: 'PASS',
              expected: 'Valid package price',
              actual: 'Valid',
            },
            { name: 'Brand Rules', status: 'PASS', expected: 'Respected', actual: 'Respected' },
          ],
        },
      },
      mitraTransformations: {
        stepId: 'step_9_trans',
        name: 'Mitra Transformations',
        status: 'passed',
        timestamp: '2026-09-30T17:10:03.050Z',
        summary: 'Rose gold theme and luxury fonts injected',
        data: {
          appliedTransformations: [
            { name: 'Luxury Palette Injector', description: 'Rose Gold & Champagne' },
          ],
        },
      },
      creativeGeneration: {
        stepId: 'step_10_creative',
        name: 'Creative Generation',
        status: 'passed',
        timestamp: '2026-09-30T17:10:03.100Z',
        summary: '1 luxury poster creative generated',
        data: {
          generatedPostersCount: 1,
          storyFramesCount: 0,
          reelStoryboardCount: 0,
          assetsMetadata: [
            { type: 'poster', prompt: 'Elegant beauty salon interior with glowing mirrors' },
          ],
        },
      },
      finalCampaign: {
        stepId: 'step_11_final',
        name: 'Final Campaign Assembly',
        status: 'passed',
        timestamp: '2026-09-30T17:10:03.100Z',
        summary: 'Campaign verified and ready',
        data: {
          campaignId: 'camp_8292',
          status: 'verified',
          deliveredAssetsCount: 1,
          customerSummary: 'Campaign verified and ready for social sharing',
        },
      },
    },
  },
  {
    id: 'trace_8293',
    campaignId: 'camp_8293',
    campaignNumber: '#8293',
    businessName: 'Skyline Heights Real Estate',
    userRequest:
      'Make a serious premium ad but also funny and meme-like for 3BHK flats at ₹85 Lakhs',
    intent: 'Property Promotion (3BHK Flat, Premium vs Meme Conflict Resolved)',
    contextFactsCount: 9,
    validationStatus: 'PASS',
    validationPassedCount: 9,
    validationTotalCount: 9,
    costInr: 0.45,
    latencySeconds: 3.6,
    model: 'Gemini 1.5 Pro',
    inputTokens: 1350,
    outputTokens: 410,
    createdAt: '2026-09-30T15:20:00Z',
    trace: {
      traceId: 'tr_8293_re',
      campaignId: 'camp_8293',
      businessId: 'biz_skyline',
      createdAt: '2026-09-30T15:20:00Z',
      userRequest: {
        stepId: 'step_1_req',
        name: 'User Input',
        status: 'passed',
        timestamp: '2026-09-30T15:20:00Z',
        summary:
          'Instruction captured with conflicting style constraints (Serious Premium vs Meme)',
        data: {
          request:
            'Make a serious premium ad but also funny and meme-like for 3BHK flats at ₹85 Lakhs',
          language: 'en',
          style: 'funny',
          objective: 'property_promotion',
          targetProduct: '3BHK Luxury Flat',
        },
      },
      mitraUi: {
        stepId: 'step_2_ui',
        name: 'Mitra UI',
        status: 'passed',
        timestamp: '2026-09-30T15:20:00.100Z',
        summary: 'Real estate vertical selector',
        data: { component: 'CampaignWizard', platform: 'facebook', format: 'poster' },
      },
      intentExtraction: {
        stepId: 'step_3_intent',
        name: 'Intent Extraction & Conflict Resolution',
        status: 'passed',
        timestamp: '2026-09-30T15:20:00.350Z',
        summary:
          'Conflict Engine resolved "Serious + Funny Meme" into "Witty Premium Smart Real-Estate Direction"',
        data: {
          extractedLanguage: 'en',
          extractedStyle: 'funny',
          extractedProduct: '3BHK Luxury Apartment',
          extractedObjective: 'property_promotion',
          confidence: 0.94,
        },
      },
      businessBrainRetrieval: {
        stepId: 'step_4_brain',
        name: 'Business Brain Retrieval',
        status: 'passed',
        timestamp: '2026-09-30T15:20:00.700Z',
        summary: 'Retrieved Real Estate property catalog',
        data: {
          business: 'Skyline Heights Real Estate',
          location: 'Gachibowli, Hyderabad',
          product: '3BHK Luxury Apartment (1850 sqft)',
          price: '₹85,00,000',
          brandTone: 'Professional',
          languagePreference: 'English',
          audience: 'IT professionals & growing families',
        },
      },
      contextAssembly: {
        stepId: 'step_5_ctx',
        name: 'Context Assembly',
        status: 'passed',
        timestamp: '2026-09-30T15:20:01.000Z',
        summary: '9 relevant facts retrieved including square footage & possession date',
        data: {
          selectedContext: {
            businessIdentity: true,
            productInformation: true,
            currentOffer: true,
            location: true,
            language: true,
            tone: true,
            relevantPreviousCampaignPreferences: true,
            brandRules: true,
          },
          contextSummary: 'Skyline Heights (Gachibowli) | 3BHK 1850 sqft | ₹85 Lakhs',
        },
      },
      promptBuilder: {
        stepId: 'step_6_prompt',
        name: 'Prompt & Instruction Builder',
        status: 'passed',
        timestamp: '2026-09-30T15:20:01.300Z',
        summary: 'Injected non-negotiable fact hierarchy: Price ₹85 Lakhs locked',
        data: {
          systemInstruction:
            'You are Mitra AI. Create smart witty real estate ads for premium homebuyers.',
          businessContext: 'Skyline Heights, Gachibowli | Price: ₹85 Lakhs | Area: 1850 sqft',
          userRequest:
            'Make a serious premium ad but also funny and meme-like for 3BHK flats at ₹85 Lakhs',
          task: 'Generate witty high-converting ad copy.',
          outputSchema: { headline: 'STRING', caption: 'STRING', cta: 'STRING' },
        },
      },
      geminiResponse: {
        stepId: 'step_7_gemini',
        name: 'Gemini Model Response',
        status: 'passed',
        timestamp: '2026-09-30T15:20:03.400Z',
        summary: 'Model gemini-1.5-pro responded in 3.6s',
        data: {
          headline: 'Tired of Rent Creep? Own Your 3BHK Dream in Gachibowli! 🔑🏢',
          caption:
            'Why pay someone else’s home loan? Move into a spacious 1850 sq.ft. 3BHK at Skyline Heights, Gachibowli for ₹85 Lakhs! Premium amenities, prime location, zero compromises.',
          language: 'en',
          tone: 'witty_premium',
          cta: 'Schedule Site Visit on WhatsApp 📲',
        },
      },
      validationTruthCheck: {
        stepId: 'step_8_val',
        name: 'Validation & Truth Check',
        status: 'passed',
        timestamp: '2026-09-30T15:20:03.550Z',
        summary: '9 / 9 Ground Truth checks passed.',
        data: {
          passed: true,
          summary: 'All property details and pricing verified.',
          checks: [
            {
              name: 'Business Name',
              status: 'PASS',
              expected: 'Skyline Heights Real Estate',
              actual: 'Skyline Heights',
            },
            {
              name: 'Product Name',
              status: 'PASS',
              expected: '3BHK Luxury Apartment',
              actual: '3BHK',
            },
            { name: 'Price Floor', status: 'PASS', expected: '₹85,00,000', actual: '₹85 Lakhs' },
            {
              name: 'Location Match',
              status: 'PASS',
              expected: 'Gachibowli, Hyderabad',
              actual: 'Gachibowli',
            },
            { name: 'Language Requested', status: 'PASS', expected: 'English', actual: 'English' },
            {
              name: 'Tone Conflict Resolution',
              status: 'PASS',
              expected: 'Harmonized',
              actual: 'Witty Premium',
            },
            {
              name: 'CTA Present',
              status: 'PASS',
              expected: 'Site Visit CTA',
              actual: 'Schedule Site Visit',
            },
            {
              name: 'No Invented Details',
              status: 'PASS',
              expected: '1850 sqft',
              actual: '1850 sq.ft.',
            },
            { name: 'Brand Rules', status: 'PASS', expected: 'Respected', actual: 'Respected' },
          ],
        },
      },
      mitraTransformations: {
        stepId: 'step_9_trans',
        name: 'Mitra Transformations',
        status: 'passed',
        timestamp: '2026-09-30T15:20:03.580Z',
        summary: 'Architectural modern layout applied',
        data: {
          appliedTransformations: [
            { name: 'Real Estate Blueprint Theme', description: 'Deep Navy & Gold' },
          ],
        },
      },
      creativeGeneration: {
        stepId: 'step_10_creative',
        name: 'Creative Generation',
        status: 'passed',
        timestamp: '2026-09-30T15:20:03.600Z',
        summary: '1 modern apartment poster generated',
        data: {
          generatedPostersCount: 1,
          storyFramesCount: 0,
          reelStoryboardCount: 0,
          assetsMetadata: [
            {
              type: 'poster',
              prompt: 'Modern high-rise residential building with sunset balcony views',
            },
          ],
        },
      },
      finalCampaign: {
        stepId: 'step_11_final',
        name: 'Final Campaign Assembly',
        status: 'passed',
        timestamp: '2026-09-30T15:20:03.600Z',
        summary: 'Verified campaign ready',
        data: {
          campaignId: 'camp_8293',
          status: 'verified',
          deliveredAssetsCount: 1,
          customerSummary: 'Campaign verified and ready for real estate promotion',
        },
      },
    },
  },
];
