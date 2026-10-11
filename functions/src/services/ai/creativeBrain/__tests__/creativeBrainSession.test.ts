import { creativeBrainSessionService } from '../session/creativeBrainSession.service';
import { CreativeBrainSessionSchema } from '../session/creativeBrainSession.schema';
import type { BusinessBrain, LocalizationProfile } from '../../../../types';
import type { CreativeAnswer } from '../questions/creativeQuestion.types';
import type { CreativeConcept } from '../../creativeBrain.types';

describe('Phase 7 — Creative Brain Conversation State & Campaign Memory', () => {
  beforeEach(() => {
    creativeBrainSessionService.clearStore();
  });

  const sampleLocalization: LocalizationProfile = {
    country: 'IN',
    state: 'Telangana',
    city: 'Hyderabad',
    locality: 'Banjara Hills',
    primaryLanguage: 'en',
    secondaryLanguage: 'te',
    languageMixing: 'natural',
    regionalStyle: 'hyderabadi',
    slangPreference: 'light',
    audienceDescription: 'Biryani lovers in Hyderabad',
    brandTone: 'friendly',
    campaignStyle: 'emotional',
    contentFormat: 'poster',
  };

  const sampleInitialIntent = {
    objective: 'weekend_offer' as const,
    offerHeadline: 'Special Biryani Combo at ₹399',
    price: 399,
    cta: 'order_whatsapp' as const,
    localization: sampleLocalization,
    userInstruction: 'Focus on authentic Hyderabadi flavor',
  };

  const sampleBusinessBrain: BusinessBrain = {
    id: 'biz_restaurant_001',
    identity: {
      name: 'Paradise Biryani',
      category: 'restaurant',
      description: 'Authentic Hyderabadi Dum Biryani',
      location: { city: 'Hyderabad', state: 'Telangana', locality: 'Banjara Hills' },
      contact: { phone: '+919876543210' },
    },
    brand: {
      tone: 'friendly',
    },
    audience: {
      targetCustomer: 'Biryani enthusiasts',
      preferences: 'Authentic Hyderabadi spice',
    },
    products: [
      {
        id: 'prod_01',
        name: 'Hyderabadi Chicken Biryani',
        description: 'Authentic dum biryani',
        price: 399,
      },
    ],
  } as any;

  test('1. Session Creation & Default State Invariants', async () => {
    const session = await creativeBrainSessionService.createSession({
      businessId: 'biz_restaurant_001',
      industry: 'restaurant',
      initialIntent: sampleInitialIntent,
    });

    expect(session.sessionId).toBeDefined();
    expect(session.businessId).toBe('biz_restaurant_001');
    expect(session.businessRef.businessId).toBe('biz_restaurant_001');
    expect(session.status).toBe('ACTIVE');
    expect(session.currentState).toBe('INIT');
    expect(session.answers).toHaveLength(0);
    expect(session.askedQuestionIds).toHaveLength(0);
    expect(session.derivedInsights).toHaveLength(0);
    expect(session.version).toBe(1);

    // Zod schema compliance
    expect(() => CreativeBrainSessionSchema.parse(session)).not.toThrow();
  });

  test('2. Business Brain Data Is Never Duplicated inside Session', async () => {
    const session = await creativeBrainSessionService.createSession({
      businessId: 'biz_restaurant_001',
      industry: 'restaurant',
      initialIntent: sampleInitialIntent,
    });

    const sessionKeys = Object.keys(session);
    expect(sessionKeys).not.toContain('products');
    expect(sessionKeys).not.toContain('catalog');
    expect(sessionKeys).not.toContain('identity');
    expect(session.businessRef.businessId).toBe('biz_restaurant_001');
  });

  test('3. Answer Persistence, Tracking & Idempotency', async () => {
    const session = await creativeBrainSessionService.createSession({
      businessId: 'biz_restaurant_001',
      initialIntent: sampleInitialIntent,
    });

    const answer1: CreativeAnswer = {
      questionId: 'q_dinein_family',
      dimension: 'dining_setup',
      rawAnswer: 'Family seating with private dining areas',
      normalizedValue: 'family_friendly',
      quality: {
        specificity: 'high',
        completeness: 'high',
        decisionUsefulness: 90,
      },
      timestamp: new Date().toISOString(),
    };

    const sessionAfterAnswer = await creativeBrainSessionService.appendAnswer(session.sessionId, answer1);

    expect(sessionAfterAnswer.answers).toHaveLength(1);
    expect(sessionAfterAnswer.askedQuestionIds).toContain('q_dinein_family');
    expect(sessionAfterAnswer.version).toBe(2);

    // Test Idempotency: exact same answer submitted again
    const idempotentSession = await creativeBrainSessionService.appendAnswer(session.sessionId, answer1);
    expect(idempotentSession.answers).toHaveLength(1);
    expect(idempotentSession.version).toBe(2); // No extra version bump

    // Updating answer with different rawAnswer
    const updatedAnswer1: CreativeAnswer = {
      ...answer1,
      rawAnswer: 'Family seating and rooftop garden',
    };
    const sessionAfterUpdate = await creativeBrainSessionService.appendAnswer(session.sessionId, updatedAnswer1);
    expect(sessionAfterUpdate.answers).toHaveLength(1);
    expect(sessionAfterUpdate.answers[0]?.rawAnswer).toBe('Family seating and rooftop garden');
    expect(sessionAfterUpdate.version).toBe(3);
  });

  test('4. Derived Insight & Missing Dimension Recording', async () => {
    const session = await creativeBrainSessionService.createSession({
      businessId: 'biz_restaurant_001',
      initialIntent: sampleInitialIntent,
    });

    const sessionWithInsight = await creativeBrainSessionService.recordDerivedInsight(session.sessionId, {
      id: 'insight_family',
      dimension: 'audience_segment',
      insight: 'Target weekend family dining occasions',
      sourceAnswerIds: ['q_dinein_family'],
      source: 'USER_ANSWER',
      authority: 'AUTHORITATIVE',
      confidence: 95,
      affectsDecisions: ['positioning', 'creative_hook'],
      status: 'ACTIVE',
    });

    expect(sessionWithInsight.derivedInsights).toHaveLength(1);
    expect(sessionWithInsight.derivedInsights[0]?.insight).toBe('Target weekend family dining occasions');

    const sessionWithDimension = await creativeBrainSessionService.recordMissingDimension(session.sessionId, {
      dimension: 'special_offer_limit',
      state: 'UNKNOWN',
      uncertainty: 80,
      decisionImpact: 75,
      creativeRelevance: 70,
      affectedDecisions: ['offer_terms'],
      recommendedAction: 'ASK',
      lastEvaluatedAt: new Date().toISOString(),
    });

    expect(sessionWithDimension.missingDimensions).toHaveLength(1);
    expect(sessionWithDimension.missingDimensions[0]?.dimension).toBe('special_offer_limit');
  });

  test('5. State Machine Transitions & Audit History', async () => {
    const session = await creativeBrainSessionService.createSession({
      businessId: 'biz_restaurant_001',
      initialIntent: sampleInitialIntent,
    });

    const updated = await creativeBrainSessionService.updateState(
      session.sessionId,
      'AUDIENCE_REASONING' as any,
      'Analyzing target family segment',
      'INFERENCE'
    );

    expect(updated.currentState).toBe('AUDIENCE_REASONING');
    expect(updated.stateHistory).toHaveLength(2);
    expect(updated.stateHistory[1]?.reason).toBe('Analyzing target family segment');
    expect(updated.stateHistory[1]?.triggeredBy).toBe('INFERENCE');
  });

  test('6. Concept Selection & Mixed Concept Recording', async () => {
    const session = await creativeBrainSessionService.createSession({
      businessId: 'biz_restaurant_001',
      initialIntent: sampleInitialIntent,
    });

    const mockConcepts: CreativeConcept[] = [
      {
        conceptId: 'concept_01',
        title: 'Authentic Dum Heritage',
        angle: 'Heritage Dum Cooking',
        coreIdea: 'Royal heritage dum biryani recipe',
        hookDirection: 'Taste 50 years of royal dum biryani legacy',
        emotionalDriver: 'warm',
        audienceFraming: 'Biryani Purists',
        message: 'Cooked slow in handi',
        offerFraming: 'Special ₹399 Biryani combo',
        ctaDirection: 'Order via WhatsApp',
        visualPremise: {
          emphasis: 'product-led',
          composition: 'hero-product',
          mood: 'Warm & Authentic',
          compositionHints: ['Steam rising from handi'],
        },
        differentiation: 'True Hyderabadi spice profile',
        expectedResponse: 'Salivation and immediate order',
        templateId: 'tmpl_restaurant_01',
        opportunityId: 'opp_01',
        grammar: [],
        score: {
          totalScore: 92,
          isViable: true,
          evaluationNotes: ['High truth alignment'],
          breakdown: {
            truthAlignment: 25,
            brandFit: 20,
            audienceRelevance: 20,
            offerFit: 15,
            historicalPerformance: 6,
            executionFeasibility: 6,
          },
        },
      },
      {
        conceptId: 'concept_02',
        title: 'Weekend Family Dum Feast',
        angle: 'Family Feast Combo',
        coreIdea: 'Sunday family dinner solved with ₹399 Biryani Combo',
        hookDirection: 'Sunday family dinner solved with ₹399 Biryani Combo',
        emotionalDriver: 'warm',
        audienceFraming: 'Hyderabad Families',
        message: 'Feeds the whole family',
        offerFraming: 'Special ₹399 Biryani combo',
        ctaDirection: 'Order via WhatsApp',
        visualPremise: {
          emphasis: 'product-led',
          composition: 'hero-product',
          mood: 'Warm & Authentic',
          compositionHints: ['Family dining table'],
        },
        differentiation: 'High value family combo',
        expectedResponse: 'Family weekend orders',
        templateId: 'tmpl_restaurant_02',
        opportunityId: 'opp_01',
        grammar: [],
        score: {
          totalScore: 88,
          isViable: true,
          evaluationNotes: ['Strong audience relevance'],
          breakdown: {
            truthAlignment: 25,
            brandFit: 18,
            audienceRelevance: 20,
            offerFit: 15,
            historicalPerformance: 5,
            executionFeasibility: 5,
          },
        },
      },
    ];

    await creativeBrainSessionService.saveConcepts(session.sessionId, mockConcepts);

    const selectedSession = await creativeBrainSessionService.selectConcept(session.sessionId, 'concept_01', 'USER');
    expect(selectedSession.selectedConcept?.conceptId).toBe('concept_01');
    expect(selectedSession.selectedConcept?.selectionSource).toBe('USER');

    // Mixed Concept
    const mixedSession = await creativeBrainSessionService.createMixedConcept(session.sessionId, {
      sourceConceptIds: ['concept_01', 'concept_02'],
      selectedDimensions: {
        positioning: 'Authentic Royal Dum Biryani',
        audience: 'Hyderabad Weekend Families',
        motivation: 'Family weekend dinner solved',
        offerFraming: 'Special ₹399 Biryani combo',
        copyDirection: 'Heritage royal recipe meets weekend family deal',
        visualDirection: 'Hero biryani handi on family dining table',
        ctaDirection: 'Order via WhatsApp',
      },
      rationale: 'Combined heritage story with family weekend feast pricing angle',
    });

    expect(mixedSession.mixedConcept?.sourceConceptIds).toEqual(['concept_01', 'concept_02']);
    expect(mixedSession.mixedConcept?.selectedDimensions.positioning).toBe('Authentic Royal Dum Biryani');
  });

  test('7. Business Brain Reconciliation on Price / Catalog Update', async () => {
    const initialBrainTimestamp = '2026-10-01T10:00:00.000Z';
    const session = await creativeBrainSessionService.createSession({
      businessId: 'biz_restaurant_001',
      businessBrainUpdatedAt: initialBrainTimestamp,
      initialIntent: sampleInitialIntent,
    });

    // Record an insight from Business Brain
    await creativeBrainSessionService.recordDerivedInsight(session.sessionId, {
      id: 'insight_price',
      dimension: 'product_price',
      insight: 'Price is ₹399',
      sourceAnswerIds: [],
      source: 'BUSINESS_BRAIN',
      authority: 'AUTHORITATIVE',
      confidence: 100,
      affectsDecisions: ['offer_pricing'],
      status: 'ACTIVE',
    });

    // Business Brain updates (price updated to ₹449)
    const updatedBusinessBrain: BusinessBrain = {
      ...sampleBusinessBrain,
      products: [
        {
          id: 'prod_01',
          name: 'Hyderabadi Chicken Biryani',
          description: 'Authentic dum biryani',
          price: 449,
        },
      ],
      updatedAt: '2026-10-05T12:00:00.000Z',
    } as any;

    const reconciled = await creativeBrainSessionService.reconcileSessionWithBusinessBrain(
      session.sessionId,
      updatedBusinessBrain
    );

    expect(reconciled.businessRef.businessBrainUpdatedAt).toBe('2026-10-05T12:00:00.000Z');
    // Derived insight from previous Business Brain is superseded
    expect(reconciled.derivedInsights[0]?.status).toBe('SUPERSEDED');
  });

  test('8. Campaign Session Resumption', async () => {
    const session = await creativeBrainSessionService.createSession({
      businessId: 'biz_restaurant_001',
      initialIntent: sampleInitialIntent,
    });

    const mockConcepts: CreativeConcept[] = [
      {
        conceptId: 'concept_01',
        title: 'Authentic Dum Heritage',
        angle: 'Heritage Dum Cooking',
        coreIdea: 'Royal heritage recipe',
        hookDirection: 'Taste royal dum biryani legacy',
        emotionalDriver: 'warm',
        audienceFraming: 'Biryani Purists',
        message: 'Cooked slow in handi',
        offerFraming: 'Special ₹399 Biryani combo',
        ctaDirection: 'Order via WhatsApp',
        visualPremise: {
          emphasis: 'product-led',
          composition: 'hero-product',
          mood: 'Warm & Authentic',
          compositionHints: ['Handi steam'],
        },
        differentiation: 'Authentic spice',
        expectedResponse: 'Immediate order',
        templateId: 'tmpl_restaurant_01',
        opportunityId: 'opp_01',
        grammar: [],
        score: {
          totalScore: 92,
          isViable: true,
          evaluationNotes: ['High truth alignment'],
          breakdown: {
            truthAlignment: 25,
            brandFit: 20,
            audienceRelevance: 20,
            offerFit: 15,
            historicalPerformance: 6,
            executionFeasibility: 6,
          },
        },
      },
    ];

    await creativeBrainSessionService.saveConcepts(session.sessionId, mockConcepts);

    const resumeResult = await creativeBrainSessionService.resumeSession(session.sessionId);

    expect(resumeResult.canResume).toBe(true);
    expect(resumeResult.nextRequiredAction).toBe('SELECT_CONCEPT');
    expect(resumeResult.session.sessionId).toBe(session.sessionId);
    expect(resumeResult.session.concepts).toHaveLength(1);
  });
});
