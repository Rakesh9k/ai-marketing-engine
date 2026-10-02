import { PRICING } from '../config/pricing';
import { getGenerationCost } from './usageControl';
import { grantTopUpCredits, grantPlanCredits, applyPlanEntitlement } from './billing';

describe('Phase 19 Billing System Invariants & Top-Up Operations', () => {
  it('enforces canonical product valuation of 1 Credit = ₹1 INR', () => {
    expect(PRICING.creditValueINR).toBe(1);
  });

  it('provides configured top-up packs matching canonical pricing', () => {
    expect(PRICING.topUpPacks).toEqual([
      { credits: 500, priceINR: 499 },
      { credits: 1200, priceINR: 999 },
      { credits: 3000, priceINR: 1999 },
    ]);
  });

  it('correctly calculates operation costs for AI generation tasks', () => {
    expect(getGenerationCost('campaign_generation')).toBe(140);
    expect(getGenerationCost('reel_generation')).toBe(80);
    expect(getGenerationCost('regeneration')).toBe(10);
    expect(getGenerationCost('image_generation')).toBe(20);
    expect(getGenerationCost('style_analysis')).toBe(15);
  });

  it('stages top-up credit grants on usage documents via grantTopUpCredits', () => {
    const mockTx = {
      set: jest.fn(),
      update: jest.fn(),
    } as any;

    const mockUsageRef = { id: 'user1_2026-09-01' } as any;
    const mockUsageSnap = { exists: false } as any;

    const creditsGranted = grantTopUpCredits(mockTx, 'user1', 500, mockUsageRef, mockUsageSnap);

    expect(creditsGranted).toBe(500);
    expect(mockTx.set).toHaveBeenCalledTimes(1);
    // Top-ups land in bonusCredits (enforced by usageControl) and keep the display total in step.
    expect(mockTx.update).toHaveBeenCalledWith(mockUsageRef, {
      bonusCredits: 500,
      creditsIncluded: 600, // free plan 100 + 500 bonus
      updatedAt: expect.anything(),
    });
  });

  it('accumulates top-ups on top of existing bonus credits and the current plan', () => {
    const mockTx = { set: jest.fn(), update: jest.fn() } as any;
    const mockUsageRef = { id: 'user1_2026-09-01' } as any;
    const mockUsageSnap = { exists: true, data: () => ({ planId: 'starter', bonusCredits: 500 }) } as any;

    grantTopUpCredits(mockTx, 'user1', 1200, mockUsageRef, mockUsageSnap);

    expect(mockTx.set).not.toHaveBeenCalled();
    expect(mockTx.update).toHaveBeenCalledWith(mockUsageRef, {
      bonusCredits: 1700,
      creditsIncluded: 500 + 1700,
      updatedAt: expect.anything(),
    });
  });

  it('applyPlanEntitlement sets (not increments) the plan and preserves bonus credits', () => {
    const mockTx = { set: jest.fn(), update: jest.fn() } as any;
    const mockUsageRef = { id: 'user1_2026-09-01' } as any;
    const mockUsageSnap = { exists: true, data: () => ({ planId: 'free', bonusCredits: 500 }) } as any;

    expect(applyPlanEntitlement(mockTx, 'user1', 'pro', mockUsageRef, mockUsageSnap)).toBe(2500);
    expect(applyPlanEntitlement(mockTx, 'user1', 'pro', mockUsageRef, mockUsageSnap)).toBe(2500);
    for (const call of mockTx.update.mock.calls) {
      expect(call[1]).toEqual({ planId: 'pro', creditsIncluded: 3000, updatedAt: expect.anything() });
    }
  });

  it('stages plan credit grants on usage documents via grantPlanCredits', () => {
    const mockTx = {
      set: jest.fn(),
      update: jest.fn(),
    } as any;

    const mockUsageRef = { id: 'user1_2026-09-01' } as any;
    const mockUsageSnap = { exists: true } as any;

    const creditsGranted = grantPlanCredits(
      mockTx,
      'user1',
      'starter',
      mockUsageRef,
      mockUsageSnap
    );

    expect(creditsGranted).toBe(500);
    expect(mockTx.set).not.toHaveBeenCalled();
    expect(mockTx.update).toHaveBeenCalledWith(mockUsageRef, {
      creditsIncluded: expect.anything(),
      planId: 'starter',
      updatedAt: expect.anything(),
    });
  });
});
