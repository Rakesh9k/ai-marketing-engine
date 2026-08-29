import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export { healthCheck } from './healthCheck';
export { createBusiness } from './functions/business/createBusiness';
export { getBusiness } from './functions/business/getBusiness';
export { listBusinesses } from './functions/business/listBusinesses';
export { updateBusiness } from './functions/business/updateBusiness';
export { createBrandKit } from './functions/brandKit/createBrandKit';
export { getBrandKit } from './functions/brandKit/getBrandKit';
export { updateBrandKit } from './functions/brandKit/updateBrandKit';
export { createProduct } from './functions/products/createProduct';
export { listProducts } from './functions/products/listProducts';
export { getProduct } from './functions/products/getProduct';
export { updateProduct } from './functions/products/updateProduct';
export { archiveProduct } from './functions/products/archiveProduct';
export { createCampaign } from './functions/campaigns/createCampaign';
export { generateCampaignStrategy } from './functions/campaigns/generateCampaignStrategy';
export { getCampaign } from './functions/campaigns/getCampaign';
export { listCampaigns } from './functions/campaigns/listCampaigns';
export { updateCampaign } from './functions/campaigns/updateCampaign';
export { updateCampaignStatus } from './functions/campaigns/updateCampaignStatus';
export { onUserCreatedHandler } from './functions/auth/onUserCreated';
export { onUserDeletedHandler } from './functions/auth/onUserCreated';
export { getUploadUrl } from './functions/assets/getUploadUrl';
export { confirmUpload } from './functions/assets/confirmUpload';
