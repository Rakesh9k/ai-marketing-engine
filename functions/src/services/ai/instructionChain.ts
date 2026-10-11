import type { GenerationPipelineInput } from '../../types';
import type { GenerationPipeline } from './pipeline';

export interface InstructionChainTestCase {
  id: string;
  userSays: string;
  mitraShouldUnderstand: string;
  inputOverrides: Partial<GenerationPipelineInput>;
  expectedInterpretation: {
    style?: string;
    language?: string;
    brandTone?: string;
    price?: number;
    productName?: string;
    regionalStyle?: string;
    targetCustomer?: string;
    offerType?: string;
  };
  promptKeyword: string;
  validationCheckName: string;
}

export interface InstructionChainEvaluationResult {
  testCaseId: string;
  userSays: string;
  mitraShouldUnderstand: string;
  userIntentPassed: boolean;
  mitraInterpretationPassed: boolean;
  geminiInstructionPassed: boolean;
  geminiOutputPassed: boolean;
  finalOutputPassed: boolean;
  overallPassed: boolean;
  details: {
    intent: string;
    interpretation: string;
    geminiInstructionSnippet: string;
    geminiOutputSnippet: string;
    finalCheckName: string;
  };
}

export const INSTRUCTION_CHAIN_TEST_MATRIX: InstructionChainTestCase[] = [
  {
    id: 'ic_1_funny',
    userSays: 'Make it funny',
    mitraShouldUnderstand: 'Funny tone',
    inputOverrides: { campaignStyle: 'funny' },
    expectedInterpretation: { style: 'funny' },
    promptKeyword: 'funny',
    validationCheckName: 'Funny requested',
  },
  {
    id: 'ic_2_serious',
    userSays: 'Make it serious',
    mitraShouldUnderstand: 'Serious tone',
    inputOverrides: { campaignStyle: 'professional' },
    expectedInterpretation: { style: 'professional' },
    promptKeyword: 'professional',
    validationCheckName: 'Brand rules respected',
  },
  {
    id: 'ic_3_telugu',
    userSays: 'Telugu please',
    mitraShouldUnderstand: 'Telugu',
    inputOverrides: {
      localizationProfile: {
        country: 'India',
        state: 'Telangana',
        city: 'Hyderabad',
        locality: 'Kondapur',
        primaryLanguage: 'te',
        secondaryLanguage: 'en',
        languageMixing: 'natural',
        regionalStyle: 'hyderabadi',
        slangPreference: 'moderate',
        audienceDescription: 'Local food lovers',
        brandTone: 'friendly',
        campaignStyle: 'funny',
        contentFormat: 'poster',
      },
    },
    expectedInterpretation: { language: 'te' },
    promptKeyword: 'Telugu',
    validationCheckName: 'Telugu requested',
  },
  {
    id: 'ic_4_hinglish',
    userSays: 'Use Hinglish',
    mitraShouldUnderstand: 'Hinglish',
    inputOverrides: {
      localizationProfile: {
        country: 'India',
        state: 'Telangana',
        city: 'Hyderabad',
        locality: 'Kondapur',
        primaryLanguage: 'hi_en',
        secondaryLanguage: 'en',
        languageMixing: 'heavy',
        regionalStyle: 'mumbai',
        slangPreference: 'moderate',
        audienceDescription: 'Local food lovers',
        brandTone: 'friendly',
        campaignStyle: 'funny',
        contentFormat: 'poster',
      },
    },
    expectedInterpretation: { language: 'Hinglish' },
    promptKeyword: 'Hinglish',
    validationCheckName: 'Brand rules respected',
  },
  {
    id: 'ic_5_no_discount',
    userSays: "Don't mention discount",
    mitraShouldUnderstand: 'No discount',
    inputOverrides: { offerType: 'fixed' },
    expectedInterpretation: { offerType: 'fixed' },
    promptKeyword: 'fixed',
    validationCheckName: 'No invented offer',
  },
  {
    id: 'ic_6_friday_offer',
    userSays: 'Promote Friday offer',
    mitraShouldUnderstand: 'Friday promotion',
    inputOverrides: { audience: { localities: ['Kondapur'], occasion: 'Friday Special' } },
    expectedInterpretation: {},
    promptKeyword: 'Friday Special',
    validationCheckName: 'Brand rules respected',
  },
  {
    id: 'ic_7_students',
    userSays: 'Target college students',
    mitraShouldUnderstand: 'Audience = students',
    inputOverrides: {
      audience: {
        localities: ['Kondapur'],
        targetCustomer: 'students',
        ageRange: { min: 18, max: 24 },
        occasion: 'Campus Deals',
      } as any,
    },
    expectedInterpretation: { targetCustomer: 'students' },
    promptKeyword: 'Campus Deals',
    validationCheckName: 'Brand rules respected',
  },
  {
    id: 'ic_8_premium',
    userSays: 'Make it premium',
    mitraShouldUnderstand: 'Premium visual/copy direction',
    inputOverrides: { brandProfile: { tone: 'premium' } },
    expectedInterpretation: { brandTone: 'premium' },
    promptKeyword: 'premium',
    validationCheckName: 'Brand rules respected',
  },
  {
    id: 'ic_9_exact_price',
    userSays: 'Use this exact price ₹299',
    mitraShouldUnderstand: 'Exact price',
    inputOverrides: { offerPrice: 299 },
    expectedInterpretation: { price: 299 },
    promptKeyword: '299',
    validationCheckName: 'Correct price',
  },
  {
    id: 'ic_10_product_fidelity',
    userSays: "Don't change my product",
    mitraShouldUnderstand: 'Product fidelity',
    inputOverrides: { productName: 'Special Chicken Biryani' },
    expectedInterpretation: { productName: 'Special Chicken Biryani' },
    promptKeyword: 'Special Chicken Biryani',
    validationCheckName: 'Correct product',
  },
  {
    id: 'ic_11_previous_campaign',
    userSays: 'Make it like our previous campaign',
    mitraShouldUnderstand: 'Relevant history/context',
    inputOverrides: {
      savedStyleId: 'style_prev_123',
      savedStyleContext: {
        styleId: 'style_prev_123',
        name: 'Previous Campaign',
        tone: 'friendly',
        visuals: 'vibrant',
      } as any,
    },
    expectedInterpretation: {},
    promptKeyword: 'style_prev_123',
    validationCheckName: 'Brand rules respected',
  },
  {
    id: 'ic_12_hyderabad_feel',
    userSays: 'More local Hyderabad feel',
    mitraShouldUnderstand: 'Hyderabad localization',
    inputOverrides: {
      localizationProfile: {
        country: 'India',
        state: 'Telangana',
        city: 'Hyderabad',
        locality: 'Kondapur',
        primaryLanguage: 'te',
        secondaryLanguage: 'en',
        languageMixing: 'natural',
        regionalStyle: 'hyderabadi',
        slangPreference: 'heavy',
        audienceDescription: 'Local food lovers',
        brandTone: 'friendly',
        campaignStyle: 'funny',
        contentFormat: 'poster',
      },
    },
    expectedInterpretation: { regionalStyle: 'hyderabadi' },
    promptKeyword: 'hyderabadi',
    validationCheckName: 'Brand rules respected',
  },
];

export async function evaluateInstructionChainTestCase(
  pipeline: GenerationPipeline,
  baseInput: GenerationPipelineInput,
  testCase: InstructionChainTestCase
): Promise<InstructionChainEvaluationResult> {
  const targetCustomer = (testCase.inputOverrides.audience as any)?.targetCustomer;
  const mergedInput: GenerationPipelineInput = {
    ...baseInput,
    ...testCase.inputOverrides,
    offerHeadline: testCase.userSays,
    businessBrain: {
      ...baseInput.businessBrain,
      audience: {
        ...baseInput.businessBrain?.audience,
        targetCustomer:
          targetCustomer ||
          baseInput.businessBrain?.audience?.targetCustomer ||
          'local food lovers',
      },
    },
    localizationProfile: {
      ...baseInput.localizationProfile,
      ...(testCase.inputOverrides.localizationProfile || {}),
    },
    audience: {
      ...baseInput.audience,
      ...(testCase.inputOverrides.audience || {}),
    },
  };

  const result = await pipeline.execute(mergedInput);
  const trace = result.pipelineTrace;

  if (!trace) {
    throw new Error(`Pipeline trace missing for test case ${testCase.id}`);
  }

  // 1. USER INTENT
  const userIntentPassed = Boolean(trace.userRequest.data.request);

  // 2. MITRA INTERPRETATION
  let mitraInterpretationPassed = true;
  if (testCase.expectedInterpretation.style) {
    mitraInterpretationPassed =
      mitraInterpretationPassed &&
      trace.intentExtraction.data.extractedStyle === testCase.expectedInterpretation.style;
  }
  if (testCase.expectedInterpretation.language) {
    mitraInterpretationPassed =
      mitraInterpretationPassed &&
      (trace.intentExtraction.data.extractedLanguage
        .toLowerCase()
        .includes(testCase.expectedInterpretation.language.toLowerCase()) ||
        trace.businessBrainRetrieval.data.languagePreference
          .toLowerCase()
          .includes(testCase.expectedInterpretation.language.toLowerCase()));
  }
  if (testCase.expectedInterpretation.price) {
    mitraInterpretationPassed =
      mitraInterpretationPassed &&
      trace.businessBrainRetrieval.data.price.includes(
        String(testCase.expectedInterpretation.price)
      );
  }
  if (testCase.expectedInterpretation.productName) {
    mitraInterpretationPassed =
      mitraInterpretationPassed &&
      trace.intentExtraction.data.extractedProduct === testCase.expectedInterpretation.productName;
  }
  if (testCase.expectedInterpretation.brandTone) {
    mitraInterpretationPassed =
      mitraInterpretationPassed &&
      trace.businessBrainRetrieval.data.brandTone.toLowerCase() ===
        testCase.expectedInterpretation.brandTone.toLowerCase();
  }
  if (testCase.expectedInterpretation.regionalStyle) {
    mitraInterpretationPassed =
      mitraInterpretationPassed &&
      JSON.stringify(trace.promptBuilder.data)
        .toLowerCase()
        .includes(testCase.expectedInterpretation.regionalStyle.toLowerCase());
  }
  if (testCase.expectedInterpretation.targetCustomer) {
    mitraInterpretationPassed =
      mitraInterpretationPassed &&
      (trace.businessBrainRetrieval.data.audience
        .toLowerCase()
        .includes(testCase.expectedInterpretation.targetCustomer.toLowerCase()) ||
        JSON.stringify(trace.promptBuilder.data)
          .toLowerCase()
          .includes(testCase.expectedInterpretation.targetCustomer.toLowerCase()));
  }

  // 3. GEMINI INSTRUCTION
  const geminiInstructionText = JSON.stringify(trace.promptBuilder.data);
  const geminiInstructionPassed = geminiInstructionText
    .toLowerCase()
    .includes(testCase.promptKeyword.toLowerCase());

  // 4. GEMINI OUTPUT
  const geminiOutputText = JSON.stringify(trace.geminiResponse.data);
  const geminiOutputPassed = geminiOutputText.length > 0;

  // 5. FINAL OUTPUT (Validation)
  const validationChecks = trace.validationTruthCheck.data.checks || [];
  const targetCheck = validationChecks.find(
    (c) => c.name.toLowerCase() === testCase.validationCheckName.toLowerCase()
  );
  const finalOutputPassed = targetCheck
    ? targetCheck.status === 'PASS'
    : trace.validationTruthCheck.status === 'passed';

  const overallPassed =
    userIntentPassed &&
    mitraInterpretationPassed &&
    geminiInstructionPassed &&
    geminiOutputPassed &&
    finalOutputPassed;

  return {
    testCaseId: testCase.id,
    userSays: testCase.userSays,
    mitraShouldUnderstand: testCase.mitraShouldUnderstand,
    userIntentPassed,
    mitraInterpretationPassed,
    geminiInstructionPassed,
    geminiOutputPassed,
    finalOutputPassed,
    overallPassed,
    details: {
      intent: `User prompt: "${testCase.userSays}"`,
      interpretation: `Mitra understood: ${testCase.mitraShouldUnderstand}`,
      geminiInstructionSnippet: `Prompt includes keyword "${testCase.promptKeyword}"`,
      geminiOutputSnippet: `Gemini generated headline: "${trace.geminiResponse.data.headline || ''}"`,
      finalCheckName: `${testCase.validationCheckName}: ${finalOutputPassed ? 'PASS' : 'FAIL'}`,
    },
  };
}
