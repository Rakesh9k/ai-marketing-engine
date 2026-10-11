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
/**
 * Whether the OFFER has dates of its own. Separate from the campaign's duration: running a campaign from the 10th
 * to the 15th does not make the offer valid from the 10th to the 15th. Nothing is assumed:
 *   none            the owner gave no offer dates (the default)
 *   whole_campaign  the owner said the offer is valid for exactly the campaign's dates
 *   custom          the owner gave the offer its own start and end
 */
export type OfferValidityMode = 'none' | 'whole_campaign' | 'custom';

export interface WizardOfferValidity {
  mode: OfferValidityMode;
  start: string; // yyyy-mm-dd, used when mode is 'custom'
  end: string; // yyyy-mm-dd, used when mode is 'custom'
}

export interface WizardOffer {
  headline: string;
  description: string;
  price: string; // kept as string while editing, parsed to number before submit
  originalPrice: string;
  type: OfferType | null;
  terms: string;
  /** Missing means 'none'. */
  validity?: WizardOfferValidity;
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
  type: 'post' | 'reel' | null;
  templateId: string | null;
  styleId: string | null;
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
  type: null,
  templateId: null,
  styleId: null,
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
    validity: { mode: 'none', start: '', end: '' },
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
