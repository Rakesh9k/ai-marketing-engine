import type { Product, Campaign, BrandKit, Business } from '@/types';

export type AssistantRole = 'user' | 'mitra';

export type MessageType =
  | 'text'
  | 'product_card'
  | 'campaign_card'
  | 'creative_preview'
  | 'progress'
  | 'confirmation'
  | 'recommendation';

export interface AssistantAction {
  id: string;
  label: string;
  url?: string;
  type: 'navigate' | 'create_campaign' | 'create_creative' | 'update_brain' | 'custom';
  payload?: Record<string, unknown>;
}

export interface AssistantProgressStep {
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface AssistantMessage {
  id: string;
  conversationId: string;
  role: AssistantRole;
  content: string;
  type: MessageType;
  actions?: AssistantAction[];
  progressSteps?: AssistantProgressStep[];
  productData?: Partial<Product>;
  campaignData?: Partial<Campaign>;
  createdAt: string;
}

export interface AssistantConversation {
  id: string;
  userId: string;
  businessId: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
  createdAt: string;
}

export interface AssistantRecommendation {
  id: string;
  category: 'urgent' | 'opportunity' | 'followup' | 'brain';
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  impactBadge?: string;
  dismissed?: boolean;
}

export interface AssistantPageContext {
  route: string;
  pageTitle: string;
  entityType?: 'product' | 'campaign' | 'creative' | 'brain' | 'analytics';
  entityId?: string;
  selectedProduct?: Product | null;
  selectedCampaign?: Campaign | null;
  business?: Business | null;
  brandKit?: BrandKit | null;
}
