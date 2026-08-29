import {
  createUserInputSchema,
  createBusinessInputSchema,
  createCampaignInputSchema,
} from '@/lib/validation/schemas';

describe('Validation Schemas', () => {
  describe('createUserInputSchema', () => {
    it('should validate valid user input', () => {
      const validInput = {
        userId: 'user123',
        email: 'test@example.com',
        phone: '+919876543210',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        role: 'user',
        businessIds: ['biz1'],
        agencyId: 'agency1',
        subscriptionId: 'sub1',
        settings: {
          notifications: true,
          language: 'en',
          timezone: 'Asia/Kolkata',
        },
      };
      expect(() => createUserInputSchema.parse(validInput)).not.toThrow();
    });

    it('should reject invalid email', () => {
      const invalidInput = {
        userId: 'user123',
        email: 'invalid-email',
      };
      expect(() => createUserInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject invalid role', () => {
      const invalidInput = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'invalid_role',
      };
      expect(() => createUserInputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('createBusinessInputSchema', () => {
    it('should validate valid business input', () => {
      const validInput = {
        businessId: 'biz123',
        userId: 'user123',
        name: 'Test Restaurant',
        category: 'restaurant',
        description: 'A test restaurant',
        location: {
          city: 'Hyderabad',
          state: 'Telangana',
          locality: 'Kondapur',
        },
        contact: {
          phone: '+919876543210',
          whatsapp: '+919876543210',
        },
        businessBrain: {},
        settings: {
          timezone: 'Asia/Kolkata',
          currency: 'INR',
        },
        status: 'active',
      };
      expect(() => createBusinessInputSchema.parse(validInput)).not.toThrow();
    });

    it('should reject invalid category', () => {
      const invalidInput = {
        businessId: 'biz123',
        userId: 'user123',
        name: 'Test',
        category: 'invalid_category',
        location: { city: 'Hyderabad', state: 'Telangana' },
        contact: { phone: '123', whatsapp: '123' },
      };
      expect(() => createBusinessInputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('createCampaignInputSchema', () => {
    it('should validate valid campaign input', () => {
      const validInput = {
        campaignId: 'camp123',
        businessId: 'biz123',
        userId: 'user123',
        objective: 'weekend_offer',
        offer: {
          headline: 'Weekend Special',
          price: 199,
          type: 'fixed',
          validityStart: '2024-01-01T00:00:00.000Z',
          validityEnd: '2024-01-31T23:59:59.000Z',
        },
        duration: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-31T23:59:59.000Z',
        },
        audience: {
          localities: ['Kondapur'],
        },
        cta: 'order_whatsapp',
        localization: {
          country: 'India',
          state: 'Telangana',
          city: 'Hyderabad',
          locality: 'Kondapur',
          primaryLanguage: 'te_en',
          secondaryLanguage: 'en',
          languageMixing: 'natural',
          regionalStyle: 'hyderabadi',
          slangPreference: 'moderate',
          audienceDescription: 'Young office workers',
          brandTone: 'friendly',
          campaignStyle: 'funny',
          contentFormat: 'poster',
        },
        status: 'draft',
        creditsReserved: 100,
        metadata: {
          idempotencyKey: '123e4567-e89b-12d3-a456-426614174000',
        },
      };
      expect(() => createCampaignInputSchema.parse(validInput)).not.toThrow();
    });

    it('should reject negative price', () => {
      const invalidInput = {
        campaignId: 'camp123',
        businessId: 'biz123',
        userId: 'user123',
        objective: 'weekend_offer',
        offer: {
          headline: 'Test',
          price: -100,
          type: 'fixed',
          validityStart: '2024-01-01T00:00:00.000Z',
          validityEnd: '2024-01-31T23:59:59.000Z',
        },
        duration: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-31T23:59:59.000Z',
        },
        audience: { localities: ['Kondapur'] },
        cta: 'order_whatsapp',
        localization: {
          country: 'India',
          state: 'Telangana',
          city: 'Hyderabad',
          locality: 'Kondapur',
          primaryLanguage: 'en',
          secondaryLanguage: 'en',
          languageMixing: 'minimal',
          regionalStyle: 'neutral',
          slangPreference: 'none',
          audienceDescription: 'Test',
          brandTone: 'professional',
          campaignStyle: 'business',
          contentFormat: 'poster',
        },
        metadata: { idempotencyKey: '123e4567-e89b-12d3-a456-426614174000' },
      };
      expect(() => createCampaignInputSchema.parse(invalidInput)).toThrow();
    });
  });
});
