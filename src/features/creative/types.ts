export type CreativeFormat =
  | 'instagram_post'
  | 'instagram_story'
  | 'whatsapp_status'
  | 'facebook_post'
  | 'google_business'
  | 'flyer'
  | 'festival'
  | 'menu';

export type CreativeType = 'image' | 'poster' | 'reel' | 'video' | 'post' | 'story';

export type CreativeStatus = 'draft' | 'generating' | 'ready' | 'approved' | 'used' | 'failed';

export interface CreativeVersion {
  versionId: string;
  versionNumber: number;
  label: string;
  previewUrl: string;
  headline?: string;
  caption?: string;
  createdAt: string;
}

export interface CreativeItem {
  id: string;
  title: string;
  type: CreativeType;
  format: CreativeFormat;
  status: CreativeStatus;
  previewUrl: string;
  prompt: string;
  businessId: string;
  businessName?: string;
  createdAt: string;
  updatedAt: string;
  offer?: {
    headline: string;
    type?: string;
    originalPrice?: string;
    price?: string;
    discount?: string;
  };
  copy?: {
    headline: string;
    caption: string;
    hashtags: string[];
    whatsappCopy: string;
  };
  versions?: CreativeVersion[];
  campaignId?: string;
  dimensions?: { width: number; height: number };
  language?: string;
  regionalStyle?: string;
}

export interface CreativeTemplate {
  id: string;
  name: string;
  type: CreativeType;
  format: CreativeFormat;
  vertical: 'restaurant' | 'salon' | 'real_estate' | 'all';
  category: 'offer' | 'festival' | 'product' | 'menu' | 'announcement';
  previewUrl: string;
  description: string;
  badge?: string;
  defaultHeadline: string;
  defaultOffer?: string;
}

export interface ReelScene {
  id: string;
  sceneNumber: number;
  title: string;
  timing: string;
  description: string;
  visualPrompt: string;
  audioScript: string;
  status: 'draft' | 'ready' | 'generating';
}
