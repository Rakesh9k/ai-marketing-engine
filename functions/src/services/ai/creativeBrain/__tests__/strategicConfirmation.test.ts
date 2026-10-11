import { creativeBrainSessionService as sessions } from '../session/creativeBrainSession.service';
import {
  StrategicConfirmationError,
  buildCampaignSummary,
  buildStrategicConfirmationViewModel,
  triageCorrection,
  type StrategicConfirmationExpectation,
} from '../session';
import { CreativeBrainService } from '../../creativeBrainService';
import * as aiIndex from '../../index';
import type { CreativeBrainInput, CreativeOpportunity } from '../../creativeBrain.types';

jest.mock('../../index', () => ({ generateStructuredText: jest.fn() }));

const OWNER = { userId: 'user_1', campaignId: 'camp_1' };
const OTHER = { userId: 'user_2', campaignId: 'camp_1' };

function opportunity(id: string, overrides: Partial<CreativeOpportunity> = {}): CreativeOpportunity {
  return {
    opportunityId: id,
    vertical: 'restaurant',
    problem: 'Weekend meal planning',
    tension: 'Ordering individually feels expensive and complicated',
    motivation: 'Easy family meal',
    audienceInsight: 'Young families want one easy order',
    opportunityStatement: 'Make the weekend meal easy.',
    desiredBusinessOutcome: 'More weekend orders',
    desiredAudienceResponse: 'Order the combo',
    supportingSignals: ['Verified price: ₹799'],
    constraints: { maxTextDensity: 'medium', toneBoundary: 'friendly', factualLimits: ['Price: ₹799'] },
    confidence: 87,
    rationale: 'internal rationale that must never reach the user',
    audience: 'young families around Kondapur',
    problemOrDesire: 'Families want an easy weekend meal',
    marketingObjective: 'weekend_offer',
    productOrService: 'biryani combo',
    offer: '₹799',
    customerTension: 'Ordering individually feels expensive and complicated',
    businessDifferentiator: 'Generous portions',
    creativeOpportunity:
      'Convenience + abundance rather than discounting: make the weekend meal easy for everyone.',
    strategicRecommendation: 'Lead with the whole meal being sorted, then use the price as support.',
    ...overrides,
  };
}

async function lockedSession(opp = opportunity('opp_A')) {
  const session = await sessions.createSession({
    businessId: 'biz_1',
    ownerUserId: OWNER.userId,
    campaignId: OWNER.campaignId,
    initialIntent: {
      objective: 'weekend_offer',
      offerHeadline: 'Biryani combo ₹799',
      price: 799,
      cta: 'order_whatsapp',
      localization: {} as any,
    },
  });
  const locked = await sessions.lockOpportunity(session.sessionId, opp, OWNER);
  const exp = (): StrategicConfirmationExpectation => {
    const c = sessions['store'].get(session.sessionId)!.strategicConfirmation!;
    return { opportunityId: c.lockedOpportunityId, opportunityRevision: c.opportunityRevision };
  };
  return { id: session.sessionId, locked, exp };
}

const get = (id: string) => sessions['store'].get(id)!;

beforeEach(() => sessions.clearStore());

describe('Phase 9 — view model (deterministic, no internal language)', () => {
  test('renders the Hyderabadi Spice House scenario', () => {
    const vm = buildStrategicConfirmationViewModel(opportunity('a'));
    expect(vm.headline).toBe("Here's what I understood");
    expect(vm.campaignSummary).toBe(
      "You're trying to bring in more weekend orders from young families around Kondapur with your biryani combo (₹799)."
    );
    expect(vm.opportunityLead).toBe('The strongest opportunity I see is');
    expect(vm.opportunityStatement).toContain('Convenience + abundance');
    expect(vm.confirmationActions).toEqual({
      confirm: "That's right",
      change: 'Change something',
      exploreAlternative: "Let's explore another direction",
    });
  });

  test('never exposes scores, confidence, authority or ids', () => {
    const json = JSON.stringify(buildStrategicConfirmationViewModel(opportunity('opp_secret_id')));
    for (const leak of ['87', 'confidence', 'rationale', 'opp_secret_id', 'Truth Alignment', 'BUSINESS_BRAIN', 'AUTHORITATIVE']) {
      expect(json).not.toContain(leak);
    }
  });

  test('missing offer: does not invent a price', () => {
    const summary = buildCampaignSummary(opportunity('a', { offer: undefined }));
    expect(summary).toBe(
      "You're trying to bring in more weekend orders from young families around Kondapur with your biryani combo."
    );
    expect(summary).not.toMatch(/₹|\d/);
  });

  test('missing audience: does not invent an audience', () => {
    const summary = buildCampaignSummary(opportunity('a', { audience: undefined }));
    expect(summary).not.toMatch(/famil|Kondapur/);
    expect(summary).toContain('biryani combo');
  });

  test('nothing known: safest summary', () => {
    const summary = buildCampaignSummary(
      opportunity('a', { audience: undefined, marketingObjective: undefined, productOrService: undefined, offer: undefined })
    );
    expect(summary).toBe("Here's the campaign direction I'm working from.");
  });

  test('missing / blank strategic statement is rejected, never rendered partially', () => {
    expect(() =>
      buildStrategicConfirmationViewModel(opportunity('a', { creativeOpportunity: ' ', opportunityStatement: ' ' }))
    ).toThrow(StrategicConfirmationError);
    expect(() => buildStrategicConfirmationViewModel(undefined)).toThrow(/No locked opportunity/);
  });

  test('falls back to the legacy statement when the Phase 8 field is absent', () => {
    const vm = buildStrategicConfirmationViewModel(opportunity('a', { creativeOpportunity: undefined }));
    expect(vm.opportunityStatement).toBe('Make the weekend meal easy.');
  });

  test('supporting reason is built from existing fields only, capped at three sentences', () => {
    const vm = buildStrategicConfirmationViewModel(opportunity('a'));
    expect(vm.supportingReason).toContain('Families want an easy weekend meal');
    expect((vm.supportingReason!.match(/\./g) ?? []).length).toBeLessThanOrEqual(3);
  });

  test('the same view works for any vertical (no industry branching)', () => {
    for (const vertical of ['restaurant', 'salon', 'real_estate', 'general'] as const) {
      expect(() => buildStrategicConfirmationViewModel(opportunity('a', { vertical }))).not.toThrow();
    }
  });
});

describe('Phase 9 — confirmation lifecycle', () => {
  test('lock → pending; resume reports STRATEGIC_CONFIRMATION', async () => {
    const { id } = await lockedSession();
    const s = get(id);
    expect(s.strategicConfirmation?.status).toBe('PENDING');
    expect(s.currentState).toBe('OPPORTUNITY');
    const resume = await sessions.resumeSession(id);
    expect(resume.nextRequiredAction).toBe('STRATEGIC_CONFIRMATION');
  });

  test('refresh: same opportunity, same revision, no regeneration', async () => {
    const { id, exp } = await lockedSession();
    const before = await sessions.getStrategicConfirmation(id, OWNER);
    // A retry of the lock with the same opportunity is a no-op (does not re-version).
    await sessions.lockOpportunity(id, opportunity('opp_A'), OWNER);
    const after = await sessions.getStrategicConfirmation(id, OWNER);
    expect(after.viewModel).toEqual(before.viewModel);
    expect(after.expectation).toEqual(exp());
    expect(after.expectation.opportunityRevision).toBe(1);
  });

  test('confirm records one event and moves to CONCEPT_GENERATION', async () => {
    const { id, exp } = await lockedSession();
    const { session, alreadyConfirmed } = await sessions.confirmStrategy(id, exp(), OWNER);
    expect(alreadyConfirmed).toBe(false);
    expect(session.currentState).toBe('CONCEPT_GENERATION');
    const c = session.strategicConfirmation!;
    expect(c.status).toBe('CONFIRMED');
    expect(c.events).toHaveLength(1);
    expect(c.events[0]).toMatchObject({
      action: 'CONFIRMED',
      sessionId: id,
      campaignId: 'camp_1',
      opportunityId: 'opp_A',
    });
    expect(c.events[0]?.createdAt).toBeTruthy();
  });

  test('double click: one confirmation event, second call is a no-op', async () => {
    const { id, exp } = await lockedSession();
    const [a, b] = await Promise.all([
      sessions.confirmStrategy(id, exp(), OWNER),
      sessions.confirmStrategy(id, exp(), OWNER),
    ]);
    expect([a.alreadyConfirmed, b.alreadyConfirmed].sort()).toEqual([false, true]);
    expect(get(id).strategicConfirmation!.events.filter((e) => e.action === 'CONFIRMED')).toHaveLength(1);
  });

  test('confirmed opportunity is not mutated', async () => {
    const original = opportunity('opp_A');
    const snapshot = JSON.parse(JSON.stringify(original));
    const { id, exp } = await lockedSession(original);
    await sessions.confirmStrategy(id, exp(), OWNER);
    expect(get(id).creativeOpportunity).toEqual(snapshot);
  });
});

describe('Phase 9 — hard gate', () => {
  test('locked + unconfirmed ⇒ blocked at every layer, nothing persisted', async () => {
    const { id } = await lockedSession();
    await expect(sessions.assertConceptGenerationAllowed(id, OWNER)).rejects.toMatchObject({ code: 'CONFIRMATION_REQUIRED' });
    await expect(sessions.beginConceptGeneration(id, OWNER)).rejects.toMatchObject({ code: 'CONFIRMATION_REQUIRED' });
    await expect(sessions.saveConcepts(id, [{ opportunityId: 'opp_A' } as any])).rejects.toMatchObject({
      code: 'CONFIRMATION_REQUIRED',
    });
    expect(get(id).concepts).toHaveLength(0);
    expect(get(id).strategicConfirmation!.conceptGenerationStartedAt).toBeUndefined();
  });

  test('locked + confirmed ⇒ allowed', async () => {
    const { id, exp } = await lockedSession();
    await sessions.confirmStrategy(id, exp(), OWNER);
    await expect(sessions.assertConceptGenerationAllowed(id, OWNER)).resolves.toMatchObject({ opportunityId: 'opp_A' });
  });

  test('concepts for a different opportunity are rejected even after confirmation', async () => {
    const { id, exp } = await lockedSession();
    await sessions.confirmStrategy(id, exp(), OWNER);
    await expect(sessions.saveConcepts(id, [{ opportunityId: 'opp_OTHER' } as any])).rejects.toMatchObject({
      code: 'CONFIRMATION_REQUIRED',
    });
  });

  test('the active opportunity cannot be swapped around the ledger via saveOpportunity', async () => {
    const { id } = await lockedSession();
    await expect(sessions.saveOpportunity(id, opportunity('opp_SNEAK'))).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  test('a material correction un-confirms: generation blocked again', async () => {
    const { id, exp } = await lockedSession();
    await sessions.confirmStrategy(id, exp(), OWNER);
    await sessions.requestChange(id, exp(), { dimension: 'audience', text: 'College students, not families.' }, OWNER);
    await expect(sessions.assertConceptGenerationAllowed(id, OWNER)).rejects.toMatchObject({ code: 'CONFIRMATION_REQUIRED' });
  });
});

describe('Phase 9 — security & staleness', () => {
  test('another user cannot read or confirm', async () => {
    const { id, exp } = await lockedSession();
    await expect(sessions.getStrategicConfirmation(id, OTHER)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(sessions.confirmStrategy(id, exp(), OTHER)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(get(id).strategicConfirmation!.status).toBe('PENDING');
  });

  test('wrong campaign is rejected', async () => {
    const { id, exp } = await lockedSession();
    await expect(sessions.confirmStrategy(id, exp(), { userId: 'user_1', campaignId: 'camp_X' })).rejects.toMatchObject({
      code: 'CAMPAIGN_MISMATCH',
    });
  });

  test('ownerless sessions cannot use Phase 9 actions', async () => {
    const s = await sessions.createSession({
      businessId: 'b',
      initialIntent: { objective: 'weekend_offer', offerHeadline: 'x', cta: 'order_whatsapp', localization: {} as any },
    });
    await expect(sessions.lockOpportunity(s.sessionId, opportunity('a'), OWNER)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('unknown session / no opportunity', async () => {
    await expect(sessions.getStrategicConfirmation('nope', OWNER)).rejects.toMatchObject({ code: 'SESSION_NOT_FOUND' });
    const s = await sessions.createSession({
      businessId: 'b',
      ownerUserId: OWNER.userId,
      campaignId: 'camp_1',
      initialIntent: { objective: 'weekend_offer', offerHeadline: 'x', cta: 'order_whatsapp', localization: {} as any },
    });
    await expect(sessions.getStrategicConfirmation(s.sessionId, OWNER)).rejects.toMatchObject({ code: 'NO_LOCKED_OPPORTUNITY' });
  });

  test('malformed opportunity is rejected, nothing locked', async () => {
    const s = await sessions.createSession({
      businessId: 'b',
      ownerUserId: OWNER.userId,
      campaignId: 'camp_1',
      initialIntent: { objective: 'weekend_offer', offerHeadline: 'x', cta: 'order_whatsapp', localization: {} as any },
    });
    await expect(sessions.lockOpportunity(s.sessionId, { opportunityId: 'x' } as any, OWNER)).rejects.toMatchObject({
      code: 'MALFORMED_OPPORTUNITY',
    });
    expect(get(s.sessionId).strategicConfirmation).toBeUndefined();
  });

  test('stale tab: confirming an old opportunity/revision is refused', async () => {
    const { id, exp } = await lockedSession();
    const stale = exp();
    await sessions.requestAlternative(id, exp(), OWNER);
    await sessions.registerAlternative(id, exp(), opportunity('opp_B'), OWNER);
    await sessions.chooseDirection(id, exp(), 'opp_B', OWNER); // revision bumps, B active
    await expect(sessions.confirmStrategy(id, stale, OWNER)).rejects.toMatchObject({
      code: 'STALE_OPPORTUNITY',
      message: "Current strategy has changed. Let's refresh what I understood.",
    });
    expect(get(id).strategicConfirmation!.status).toBe('PENDING');
  });
});

describe('Phase 9 — Change something', () => {
  test('material: family → college students re-opens strategy, recorded as campaign context', async () => {
    const { id, exp } = await lockedSession();
    const r = await sessions.requestChange(
      id,
      exp(),
      { dimension: 'audience', text: 'I want college students, not families.', knownPrices: [799] },
      OWNER
    );
    expect(r.outcome).toBe('RECOMPUTE_REQUIRED');
    const c = r.session.strategicConfirmation!;
    expect(c.status).toBe('CHANGE_REQUESTED');
    expect(c.recomputeRequired?.affectedDimensions).toEqual(
      expect.arrayContaining(['audience', 'customerTension', 'emotionalTerritory', 'creativeOpportunity'])
    );
    expect(sessions.getCampaignCorrections(r.session)[0]).toMatchObject({ materiality: 'MATERIAL', dimension: 'audience' });
    // cannot be confirmed until re-evaluated
    await expect(sessions.confirmStrategy(id, exp(), OWNER)).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  test('re-evaluation: new opportunity supersedes the old, confirmation required again', async () => {
    const { id, exp } = await lockedSession();
    await sessions.requestChange(id, exp(), { dimension: 'audience', text: 'College students.' }, OWNER);
    const next = await sessions.lockOpportunity(
      id,
      opportunity('opp_students', { audience: 'college students near campus' }),
      OWNER
    );
    const c = next.strategicConfirmation!;
    expect(c.status).toBe('PENDING');
    expect(c.opportunityRevision).toBe(2);
    expect(c.recomputeRequired).toBeUndefined();
    expect(c.ledger.find((e) => e.opportunity.opportunityId === 'opp_A')?.role).toBe('SUPERSEDED');
    expect(c.ledger.find((e) => e.opportunity.opportunityId === 'opp_students')?.role).toBe('ACTIVE');
    expect(c.corrections).toHaveLength(1); // campaign learning kept
    // opp_A is preserved unchanged for traceability
    expect(c.ledger.find((e) => e.opportunity.opportunityId === 'opp_A')?.opportunity).toEqual(opportunity('opp_A'));
  });

  test('cosmetic correction does not trigger re-evaluation or re-lock', async () => {
    const { id, exp } = await lockedSession();
    const r = await sessions.requestChange(id, exp(), { dimension: 'wording', text: 'Make it sound warmer.' }, OWNER);
    expect(r.outcome).toBe('COSMETIC_NOTED');
    const c = r.session.strategicConfirmation!;
    expect(c.status).toBe('PENDING');
    expect(c.recomputeRequired).toBeUndefined();
    expect(c.opportunityRevision).toBe(1);
    expect(r.session.creativeOpportunity?.opportunityId).toBe('opp_A');
  });

  test('Business Brain protection: a conflicting price is routed away, campaign context untouched', async () => {
    const brain = { identity: { name: 'HSH' }, products: [{ name: 'combo', price: 799 }] };
    const brainBefore = JSON.stringify(brain);
    const { id, exp } = await lockedSession();
    const r = await sessions.requestChange(
      id,
      exp(),
      { dimension: 'offer', text: 'The price is actually ₹299', knownPrices: [799] },
      OWNER
    );
    expect(r.outcome).toBe('BUSINESS_FACT_CONFLICT');
    expect(r.triage.businessFactConflict).toMatchObject({ kind: 'PRICE', claimedValues: [299] });
    const c = r.session.strategicConfirmation!;
    expect(c.status).toBe('PENDING'); // strategy unchanged
    expect(c.corrections).toHaveLength(0); // not absorbed as campaign context
    expect(c.recomputeRequired).toBeUndefined();
    expect(c.events.at(-1)?.metadata?.routedTo).toBe('BUSINESS_BRAIN_CORRECTION');
    expect(JSON.stringify(brain)).toBe(brainBefore);
    expect(r.session.creativeOpportunity).toEqual(opportunity('opp_A'));
  });

  test('a price the authority already backs is not a conflict', () => {
    expect(triageCorrection('offer', 'keep it at ₹799', { knownPrices: [799] }).businessFactConflict).toBeUndefined();
  });

  test('empty / oversized corrections are refused', async () => {
    const { id, exp } = await lockedSession();
    await expect(sessions.requestChange(id, exp(), { dimension: 'other', text: '  ' }, OWNER)).rejects.toBeInstanceOf(
      StrategicConfirmationError
    );
    await expect(
      sessions.requestChange(id, exp(), { dimension: 'other', text: 'x'.repeat(1001) }, OWNER)
    ).rejects.toBeInstanceOf(StrategicConfirmationError);
  });
});

describe('Phase 9 — Explore another direction', () => {
  test('A preserved, B has its own id, choosing B requires fresh confirmation', async () => {
    const { id, exp } = await lockedSession();
    await sessions.requestAlternative(id, exp(), OWNER);
    const withAlt = await sessions.registerAlternative(id, exp(), opportunity('opp_B', { creativeOpportunity: 'Family togetherness + shared experience.' }), OWNER);

    // A still active and unchanged while comparing
    expect(withAlt.creativeOpportunity?.opportunityId).toBe('opp_A');
    expect(withAlt.strategicConfirmation!.status).toBe('ALTERNATIVE_REQUESTED');
    expect(withAlt.concepts).toHaveLength(0);
    await expect(sessions.assertConceptGenerationAllowed(id, OWNER)).rejects.toMatchObject({ code: 'CONFIRMATION_REQUIRED' });

    const chosen = await sessions.chooseDirection(id, exp(), 'opp_B', OWNER);
    const c = chosen.strategicConfirmation!;
    expect(chosen.creativeOpportunity?.opportunityId).toBe('opp_B');
    expect(c.status).toBe('PENDING');
    expect(c.ledger.find((e) => e.opportunity.opportunityId === 'opp_A')).toMatchObject({ role: 'SUPERSEDED' });
    expect(c.ledger.find((e) => e.opportunity.opportunityId === 'opp_A')?.opportunity).toEqual(opportunity('opp_A'));
    await expect(sessions.assertConceptGenerationAllowed(id, OWNER)).rejects.toMatchObject({ code: 'CONFIRMATION_REQUIRED' });
  });

  test('keeping A returns to pending without re-versioning', async () => {
    const { id, exp } = await lockedSession();
    await sessions.requestAlternative(id, exp(), OWNER);
    await sessions.registerAlternative(id, exp(), opportunity('opp_B'), OWNER);
    const kept = await sessions.chooseDirection(id, exp(), 'opp_A', OWNER);
    expect(kept.strategicConfirmation).toMatchObject({ status: 'PENDING', opportunityRevision: 1, lockedOpportunityId: 'opp_A' });
  });

  test('at most two alternatives, never reusing an id', async () => {
    const { id, exp } = await lockedSession();
    await sessions.requestAlternative(id, exp(), OWNER);
    await sessions.registerAlternative(id, exp(), opportunity('opp_B'), OWNER);
    await sessions.registerAlternative(id, exp(), opportunity('opp_C'), OWNER);
    await expect(sessions.registerAlternative(id, exp(), opportunity('opp_D'), OWNER)).rejects.toMatchObject({ code: 'ALTERNATIVE_LIMIT' });
    await expect(sessions.registerAlternative(id, exp(), opportunity('opp_A'), OWNER)).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  test('registering an alternative is idempotent', async () => {
    const { id, exp } = await lockedSession();
    await sessions.requestAlternative(id, exp(), OWNER);
    await sessions.registerAlternative(id, exp(), opportunity('opp_B'), OWNER);
    await sessions.registerAlternative(id, exp(), opportunity('opp_B'), OWNER);
    expect(get(id).strategicConfirmation!.ledger.filter((e) => e.role === 'ALTERNATIVE')).toHaveLength(1);
  });

  test('cannot pick an id that is not on offer', async () => {
    const { id, exp } = await lockedSession();
    await sessions.requestAlternative(id, exp(), OWNER);
    await expect(sessions.chooseDirection(id, exp(), 'opp_made_up', OWNER)).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });
});

describe('Phase 9 — gated concept generation (service layer)', () => {
  const input = {
    businessBrain: { identity: { name: 'Hyderabadi Spice House', category: 'restaurant', location: { city: 'Hyderabad' } }, brand: { tone: 'friendly' } },
    vertical: 'restaurant',
    intent: {
      businessId: 'biz_1',
      objective: 'weekend_offer',
      offer: { headline: 'Biryani combo ₹799', price: 799, type: 'combo' },
      cta: 'order_whatsapp',
      localization: { city: 'Hyderabad' },
    },
    memory: { preferences: [] },
    candidateCount: 2,
  } as unknown as CreativeBrainInput;

  const rawConcept = (id: string) => ({
    conceptId: id,
    title: `Concept ${id}`,
    angle: 'Everyone is sorted',
    coreIdea: 'One order, whole table happy',
    hookDirection: 'Weekend, handled',
    emotionalDriver: 'warm',
    audienceFraming: 'Young families around Kondapur',
    message: 'One order for everyone',
    offerFraming: 'Combo at ₹799',
    ctaDirection: 'order_whatsapp',
    visualPremise: { emphasis: 'product-led', composition: 'hero-product', mood: 'warm', compositionHints: ['family table'] },
    differentiation: 'Generous portions',
    expectedResponse: 'Order the combo',
    templateId: 'festival-offer-v1',
  });

  const service = new CreativeBrainService();
  const generate = jest.mocked(aiIndex.generateStructuredText);

  beforeEach(() => {
    generate.mockReset();
    generate.mockResolvedValue({ concepts: [rawConcept('c1'), rawConcept('c2')] } as never);
  });

  test('NEGATIVE: unconfirmed ⇒ no LLM call, no concepts, no claim', async () => {
    const { id } = await lockedSession();
    await expect(service.generateConceptsForConfirmedSession(id, input, OWNER)).rejects.toMatchObject({
      code: 'CONFIRMATION_REQUIRED',
    });
    expect(generate).not.toHaveBeenCalled();
    expect(get(id).concepts).toHaveLength(0);
    expect(get(id).strategicConfirmation!.conceptGenerationStartedAt).toBeUndefined();
  });

  test('E2E: lock → confirm → concepts reference the confirmed opportunityId; double call generates once', async () => {
    const { id, exp } = await lockedSession();
    await sessions.confirmStrategy(id, exp(), OWNER);

    const [first, second] = await Promise.all([
      service.generateConceptsForConfirmedSession(id, input, OWNER),
      service.generateConceptsForConfirmedSession(id, input, OWNER),
    ]);

    expect(generate).toHaveBeenCalledTimes(1);
    expect(first.length).toBeGreaterThan(0);
    expect(first.every((c) => c.opportunityId === 'opp_A')).toBe(true);
    expect(get(id).concepts.every((c) => c.opportunityId === 'opp_A')).toBe(true);
    expect(second).toBeDefined();
    // a later retry also returns the stored concepts without another generation
    await service.generateConceptsForConfirmedSession(id, input, OWNER);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  test('alternative E2E: confirming B means concepts carry B, not A', async () => {
    const { id, exp } = await lockedSession();
    await sessions.requestAlternative(id, exp(), OWNER);
    await sessions.registerAlternative(id, exp(), opportunity('opp_B'), OWNER);
    await sessions.chooseDirection(id, exp(), 'opp_B', OWNER);
    await sessions.confirmStrategy(id, exp(), OWNER);

    const concepts = await service.generateConceptsForConfirmedSession(id, input, OWNER);
    expect(concepts.every((c) => c.opportunityId === 'opp_B')).toBe(true);
    expect(concepts.some((c) => c.opportunityId === 'opp_A')).toBe(false);
  });

  test('a failed generation releases the claim so the user can retry', async () => {
    const { id, exp } = await lockedSession();
    await sessions.confirmStrategy(id, exp(), OWNER);
    generate.mockRejectedValueOnce(new Error('model down'));
    await expect(service.generateConceptsForConfirmedSession(id, input, OWNER)).rejects.toThrow('model down');
    expect(get(id).strategicConfirmation!.conceptGenerationStartedAt).toBeUndefined();
    const concepts = await service.generateConceptsForConfirmedSession(id, input, OWNER);
    expect(concepts.length).toBeGreaterThan(0);
  });

  test('after concept generation starts, the strategy can no longer be changed underneath it', async () => {
    const { id, exp } = await lockedSession();
    await sessions.confirmStrategy(id, exp(), OWNER);
    await service.generateConceptsForConfirmedSession(id, input, OWNER);
    await expect(
      sessions.requestChange(id, exp(), { dimension: 'audience', text: 'students' }, OWNER)
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });
});
