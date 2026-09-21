import type {
  CampaignObjective,
  OfferType,
  CTAType,
  LanguageCode,
  RegionalStyle,
  CampaignStyle,
} from '@/types';

/**
 * Wizard state. Field names/shapes intentionally mirror the Zod schema in
 * functions/src/functions/campaigns/generateCampaignStrategy.ts so building the
 * final callable payload is a direct, lossless mapping (see buildCampaignInput
 * in CampaignWizard.tsx). This is not a duplicate schema — it is a superset of
 * UI-only bookkeeping (step, selectedProductId, uploadedPhotos) plus the exact
 * fields the backend accepts.
 */
export interface WizardOffer {
  headline: string;
  description: string;
  price: string; // kept as string while editing, parsed to number before submit
  originalPrice: string;
  type: OfferType | null;
  terms: string;
}

export interface WizardDuration {
  start: string; // yyyy-mm-dd
  end: string; // yyyy-mm-dd
}

export interface WizardAudience {
  localities: string[];
  ageMin: string;
  ageMax: string;
  occasion: 'weekend' | 'festival' | 'weekday_lunch' | 'family' | '';
}

export interface UploadedPhoto {
  assetId: string;
  url: string;
  storagePath: string;
}

export interface CampaignWizardState {
  step: number;
  objective: CampaignObjective | null;
  selectedProductId: string | null;
  photos: UploadedPhoto[];
  offer: WizardOffer;
  duration: WizardDuration;
  audience: WizardAudience;
  cta: CTAType | null;
  primaryLanguage: LanguageCode | null;
  regionalStyle: RegionalStyle | null;
  campaignStyle: CampaignStyle | null;
}

export const createInitialWizardState = (): CampaignWizardState => ({
  step: 1,
  objective: null,
  selectedProductId: null,
  photos: [],
  offer: {
    headline: '',
    description: '',
    price: '',
    originalPrice: '',
    type: null,
    terms: '',
  },
  duration: {
    start: '',
    end: '',
  },
  audience: {
    localities: [],
    ageMin: '18',
    ageMax: '60',
    occasion: '',
  },
  cta: null,
  primaryLanguage: null,
  regionalStyle: null,
  campaignStyle: null,
});
