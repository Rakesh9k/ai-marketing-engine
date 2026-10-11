import type { BusinessContext } from "../types";

export class BusinessUnderstandingService {
  /**
   * Understands and validates authoritative BusinessContext from Business Brain.
   */
  public async understand(source: unknown): Promise<BusinessContext> {
    if (!source || typeof source !== "object") {
      throw new Error("Invalid BusinessContext source provided.");
    }
    const business = source as BusinessContext;
    if (!business.name || !business.industry) {
      throw new Error("BusinessContext missing mandatory business name or industry.");
    }

    // Default missing capability tri-states to UNKNOWN rather than assuming true
    const capabilities = business.capabilities || {
      booking: "UNKNOWN",
      reservation: "UNKNOWN",
      purchase: "UNKNOWN",
      whatsapp: "UNKNOWN",
      phone: "UNKNOWN",
      physicalLocation: "UNKNOWN",
      delivery: "UNKNOWN",
      onlineOrdering: "UNKNOWN",
    };

    return {
      ...business,
      capabilities,
      products: business.products || [],
      services: business.services || [],
      verifiedFacts: business.verifiedFacts || [],
      restrictions: business.restrictions || [],
      status: business.status || "ACTIVE",
    };
  }
}
