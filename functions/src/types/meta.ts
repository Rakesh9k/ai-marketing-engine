export type ConnectionProvider = 'meta';

export type SocialConnectionStatus =
  'pending' | 'active' | 'expired' | 'revoked' | 'error' | 'disconnected';

export interface MetaFacebookPageMetadata {
  id: string;
  name: string;
  username?: string;
  pictureUrl?: string;
}

export interface MetaInstagramAccountMetadata {
  id?: string;
  username?: string;
  accountType?: 'BUSINESS' | 'MEDIA_CREATOR' | string;
  name?: string;
  profilePictureUrl?: string;
}

export interface SocialConnection {
  connectionId: string;
  userId: string;
  businessId?: string;
  provider: ConnectionProvider;
  status: SocialConnectionStatus;
  facebookPage: MetaFacebookPageMetadata;
  instagram: MetaInstagramAccountMetadata;
  permissions: string[];
  tokenReference: string;
  connectedAt: string;
  updatedAt: string;
  lastValidatedAt?: string;
  metadata: {
    metaApiVersion: string;
  };
}

export interface EncryptedField {
  encryptedData: string;
  iv: string;
  authTag: string;
}

export interface EncryptedCredentialDoc {
  connectionId: string;
  userId: string;
  userAccessToken: EncryptedField;
  pageAccessToken: EncryptedField;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MetaOAuthStateDoc {
  stateId: string;
  userId: string;
  businessId?: string;
  stateHash: string;
  createdAt: string;
  expiresAt: string;
  consumedAt?: string;
  redirectPath?: string;
}

export interface PendingMetaPage {
  pageId: string;
  pageName: string;
  pageUsername?: string;
  pictureUrl?: string;
  instagramAccount?: {
    id: string;
    username?: string;
    accountType?: string;
    name?: string;
    profilePictureUrl?: string;
  };
}

export interface PendingPageSelectionSession {
  stateId: string;
  userId: string;
  businessId?: string;
  pages: PendingMetaPage[];
  userAccessToken: string;
  pageAccessTokens: Record<string, string>; // pageId -> pageAccessToken
  expiresAt: string;
}

export interface MetaOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface MetaRawPage {
  id: string;
  name: string;
  username?: string;
  access_token: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
  instagram_business_account?: {
    id: string;
  };
}

export interface MetaRawInstagramAccount {
  id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  account_type?: string;
}

export type MetaPerformanceStatus = 'pending' | 'available' | 'partial' | 'unavailable' | 'error';

export type MetaPerformanceErrorCode =
  | 'AUTH_REQUIRED'
  | 'CONNECTION_REVOKED'
  | 'PERMISSION_DENIED'
  | 'POST_NOT_FOUND'
  | 'METRIC_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'META_API_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface MetaMetrics {
  likes?: number | null;
  comments?: number | null;
  reach?: number | null;
  impressions?: number | null;
  shares?: number | null;
  videoViews?: number | null;
  clicks?: number | null;
}

export interface PostPerformanceRecord {
  performanceId: string;
  campaignId: string;
  businessId: string;
  userId: string;
  publishJobId?: string | null;
  scheduledPostId?: string | null;
  calendarItemId?: string | null;
  platform: 'instagram' | 'facebook';
  contentType: 'post' | 'reel';
  externalPostId: string;
  status: MetaPerformanceStatus;
  metrics: MetaMetrics;
  errorCode?: MetaPerformanceErrorCode | null;
  errorMessage?: string | null;
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
}
