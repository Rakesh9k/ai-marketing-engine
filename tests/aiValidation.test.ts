// Mock the AI module
jest.mock('@functions/services/ai/index', () => ({
  generateStructuredText: jest.fn(),
  analyzeProductImages: jest.fn(),
}));

import { generateStructuredText, analyzeProductImages } from '@functions/services/ai/index';
import {
  runTruthValidation,
  runQualityValidation,
  runSafetyValidation,
} from '@functions/services/ai/validationStages';

// Mock environment config
jest.mock('@functions/config/env', () => ({
  getEnvConfig: jest.fn().mockReturnValue({
    NODE_ENV: 'test',
    FIREBASE_PROJECT_ID: 'demo-project',
    FIREBASE_REGION: 'asia-south1',
    GEMINI_API_KEY: 'test-key',
    OPENAI_API_KEY: 'test-key',
    NVIDIA_API_KEY: 'test-key',
    RAZORPAY_KEY_ID: 'test-key',
    RAZORPAY_KEY_SECRET: 'test-key',
    RAZORPAY_WEBHOOK_SECRET: 'test-key',
    APP_URL: 'http://localhost:3000',
    ADMIN_EMAILS: 'admin@test.com',
  }),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL for JSDOM
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Image constructor for JSDOM
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 100;
  height = 100;
  src = '';

  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}

global.Image = MockImage as any;

describe('AI Validation Stages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (generateStructuredText as jest.Mock).mockReset();
    (analyzeProductImages as jest.Mock).mockReset();
  });

  describe('Truth Validation', () => {
    it('should pass for valid copy pack with correct facts', async () => {
      (generateStructuredText as jest.Mock).mockResolvedValue({
        passed: true,
        violations: [],
        assetStatus: {
          headline_0: 'passed',
          adCopy_0: 'passed',
          caption_0: 'passed',
          story_0: 'passed',
          reel_0: 'passed',
          whatsapp_0: 'passed',
        },
      });

      const result = await runTruthValidation(
        { headlines: [{ text: 'Test', characterCount: 10, variant: 'test' }] },
        null,
        { businessFacts: [{ fact: 'Biryani Palace', category: 'identity' }] },
        { productFacts: [{ fact: 'Chicken Biryani', category: 'product' }] },
        {
          businessName: 'Biryani Palace',
          productName: 'Chicken Biryani',
          offerPrice: 199,
          offerType: 'fixed',
          businessLocation: { locality: 'Kondapur' },
          whatsappNumber: '+919876543210',
        }
      );

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Quality Validation', () => {
    it('should check brand tone consistency', async () => {
      (generateStructuredText as jest.Mock).mockResolvedValue({
        passed: true,
        issues: [],
        assetScores: { headline_0: 95, adCopy_0: 90 },
      });

      const result = await runQualityValidation(
        { headlines: [{ text: 'Test' }] },
        null,
        { tone: 'friendly', colors: { primary: '#E84D1A' } },
        { creativeDirection: { mood: 'friendly' } }
      );

      expect(result.passed).toBe(true);
    });
  });

  describe('Safety Validation', () => {
    it('should flag medical claims', async () => {
      (generateStructuredText as jest.Mock).mockResolvedValue({
        passed: false,
        violations: [
          {
            assetId: 'headline_0',
            assetType: 'headline',
            category: 'medical',
            description: 'Medical claim detected',
            excerpt: 'Cures diabetes',
            severity: 'critical',
          },
        ],
      });

      const result = await runSafetyValidation(
        { headlines: [{ text: 'Cures diabetes with our biryani!' }] },
        null
      );

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].category).toBe('medical');
    });

    it('should flag misleading urgency', async () => {
      (generateStructuredText as jest.Mock).mockResolvedValue({
        passed: false,
        violations: [
          {
            assetId: 'adCopy_0',
            assetType: 'ad_copy',
            category: 'misleading',
            description: 'Fake urgency detected',
            excerpt: 'Only 2 left!',
            severity: 'high',
          },
        ],
      });

      const result = await runSafetyValidation(
        { adCopies: [{ primaryText: 'Only 2 portions left!' }] },
        null
      );

      expect(result.passed).toBe(false);
      expect(result.violations[0].category).toBe('misleading');
    });
  });
});
