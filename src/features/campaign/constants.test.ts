import { VERTICAL_OBJECTIVES, VERTICAL_CTAS, VERTICAL_OFFER_TYPES } from './constants';

/**
 * Phase 35 — Priority 9 (Verticals): asserts the wizard's own
 * source-of-truth allow-lists never let one vertical's options leak into
 * another. This is the actual data the wizard filters against
 * (CampaignWizard.tsx's `availableObjectives/CTAs/OfferTypes`), so testing
 * it directly is a cheaper and equally strong guarantee than re-deriving
 * the same assertion through a full component render.
 */
describe('Vertical isolation — campaign wizard option allow-lists', () => {
  it('a salon business never sees restaurant-only or real-estate-only objectives', () => {
    expect(VERTICAL_OBJECTIVES.salon).not.toEqual(
      expect.arrayContaining(['weekend_offer', 'new_dish'])
    );
    expect(VERTICAL_OBJECTIVES.salon).not.toEqual(
      expect.arrayContaining(['property_promotion', 'new_listing'])
    );
  });

  it('a restaurant never sees salon-only or real-estate-only objectives', () => {
    expect(VERTICAL_OBJECTIVES.restaurant).not.toEqual(
      expect.arrayContaining(['appointment_promotion', 'service_promotion'])
    );
    expect(VERTICAL_OBJECTIVES.restaurant).not.toEqual(
      expect.arrayContaining(['open_house', 'project_promotion'])
    );
  });

  it('a real-estate business never sees restaurant-only or salon-only objectives', () => {
    expect(VERTICAL_OBJECTIVES.real_estate).not.toEqual(
      expect.arrayContaining(['weekend_offer', 'discount'])
    );
    expect(VERTICAL_OBJECTIVES.real_estate).not.toEqual(
      expect.arrayContaining(['package_promotion', 'new_service'])
    );
  });

  it('a salon business never sees the restaurant "Book a Table" CTA', () => {
    expect(VERTICAL_CTAS.salon).not.toContain('book_table');
    expect(VERTICAL_CTAS.salon).not.toContain('order_whatsapp');
    expect(VERTICAL_CTAS.salon).not.toContain('view_menu');
  });

  it('a restaurant never sees the salon "Book Appointment" CTA', () => {
    expect(VERTICAL_CTAS.restaurant).not.toContain('book_appointment');
  });

  it('a real-estate business never sees "Order on WhatsApp" or "Book a Table"', () => {
    expect(VERTICAL_CTAS.real_estate).not.toContain('order_whatsapp');
    expect(VERTICAL_CTAS.real_estate).not.toContain('book_table');
    expect(VERTICAL_CTAS.real_estate).not.toContain('book_appointment');
  });

  it("offer types stay within each vertical's real allow-list (e.g. no BOGO/free-delivery for real estate)", () => {
    expect(VERTICAL_OFFER_TYPES.real_estate).not.toContain('bogo');
    expect(VERTICAL_OFFER_TYPES.real_estate).not.toContain('free_delivery');
    expect(VERTICAL_OFFER_TYPES.real_estate).not.toContain('loyalty');
  });

  it('every vertical has at least one objective, CTA, and offer type — never an empty (broken) wizard step', () => {
    for (const vertical of ['restaurant', 'salon', 'real_estate'] as const) {
      expect(VERTICAL_OBJECTIVES[vertical].length).toBeGreaterThan(0);
      expect(VERTICAL_CTAS[vertical].length).toBeGreaterThan(0);
      expect(VERTICAL_OFFER_TYPES[vertical].length).toBeGreaterThan(0);
    }
  });
});
