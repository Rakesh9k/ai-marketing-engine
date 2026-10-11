import * as crypto from 'crypto';
import {
  verifyWhatsAppSignature,
  extractCampaignRef,
  processInboundMessageEvent,
} from './whatsappService';

// Mock firebase-admin
jest.mock('firebase-admin', () => {
  const mDoc = {
    get: jest.fn().mockResolvedValue({
      exists: false,
      data: () => null,
    }),
    set: jest.fn().mockResolvedValue(true),
  };
  const mCollection = {
    doc: jest.fn().mockReturnValue(mDoc),
  };
  const mFirestore = () => ({
    collection: jest.fn().mockReturnValue(mCollection),
  });
  (mFirestore as any).FieldValue = {
    increment: (n: number) => n,
  };
  return {
    firestore: mFirestore,
  };
});

describe('WhatsApp Webhook & Outcome Ingestion Service', () => {
  const secret = 'my_whatsapp_secret';

  describe('verifyWhatsAppSignature', () => {
    it('returns true for a valid HMAC SHA256 signature', () => {
      const body = '{"object":"whatsapp_business_account"}';
      const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');

      const isValid = verifyWhatsAppSignature(body, signature, secret);
      expect(isValid).toBe(true);
    });

    it('returns false for an invalid signature or secret', () => {
      const body = '{"object":"whatsapp_business_account"}';
      const invalidSignature = 'sha256=invalid_hash_value';

      const isValid = verifyWhatsAppSignature(body, invalidSignature, secret);
      expect(isValid).toBe(false);
    });

    it('returns false if signature header is missing', () => {
      expect(verifyWhatsAppSignature('data', undefined, secret)).toBe(false);
    });
  });

  describe('extractCampaignRef', () => {
    it('extracts campaign ID from prefilled message text', () => {
      const text = 'Hi Bawarchi Biryani! I want to order the Family Combo [Ref: cmp_biryani_101]';
      const campaignId = extractCampaignRef(text);
      expect(campaignId).toBe('cmp_biryani_101');
    });

    it('returns null if no campaign reference tag is present', () => {
      const text = 'Hi, what are your opening hours?';
      expect(extractCampaignRef(text)).toBeNull();
    });

    it('handles undefined or empty text gracefully', () => {
      expect(extractCampaignRef(undefined)).toBeNull();
      expect(extractCampaignRef('')).toBeNull();
    });
  });

  describe('processInboundMessageEvent', () => {
    it('processes inbound message idempotently and extracts campaign attribution', async () => {
      const result = await processInboundMessageEvent(
        {
          id: 'wmid.HBgLMzEwNDY5NTg1OAVAAgASICBFMDc2',
          from: '919876543210',
          timestamp: '1700000000',
          text: {
            body: 'Interested in Bawarchi Biryani Combo [Ref: cmp_101]',
          },
        },
        'phone_num_123'
      );

      expect(result.success).toBe(true);
      expect(result.campaignId).toBe('cmp_101');
      expect(result.deduplicated).toBe(false);
    });
  });
});
