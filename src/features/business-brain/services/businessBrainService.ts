import { getDoc, doc, collection, getDocs, query, where } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/client';
import type {
  Business,
  BrandKit,
  Product,
  BusinessProfile,
  BrandProfile,
  LocalizationProfile,
  BusinessRules,
  BusinessBrain,
  BusinessBrainContext,
} from '@/types';
import { businessService } from '@/services/database';
import { brandKitService } from '@/services/database';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
function getDb(): import('firebase/firestore').Firestore {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firestore not initialized');
  }
  return db;
}

export async function getBusinessBrainContext(
  userId: string,
  businessId?: string
): Promise<BusinessBrainContext> {
  // If no businessId provided, try to load the user's first active business
  const targetBusinessId = businessId || (await _getUserBusinessId(userId));

  if (!targetBusinessId) {
    throw new Error('BUSINESS_NOT_FOUND: No business found for this user');
  }

  // Load the business document
  const businessRef = doc(getDb(), 'businesses', targetBusinessId);
  const businessSnap = await getDoc(businessRef);

  if (!businessSnap.exists()) {
    throw new Error('BUSINESS_NOT_FOUND: Business document does not exist');
  }

  const businessData = businessSnap.data() as Business;

  // Ownership validation: user must own this business
  if (businessData.userId !== userId) {
    throw new Error('UNAUTHORIZED: User does not own this business');
  }

  // 1. Build BusinessProfile from Business type
  const businessProfile: BusinessProfile = {
    businessId: businessData.businessId,
    businessName: businessData.name,
    businessCategory: businessData.category,
    city: businessData.location?.city || '',
    state: businessData.location?.state || '',
    locality: businessData.location?.locality,
    phone: businessData.contact?.phone || '',
    whatsapp: businessData.contact?.whatsapp || '',
    operatingModes: _deriveOperatingModes(businessData),
  };

  // 2. Build BrandProfile from BrandKit
  let brandKit: BrandKit | null = null;
  try {
    brandKit = await brandKitService.get(businessData.businessId);
  } catch {
    // BrandKit may not exist yet; continue with defaults
  }

  const kb = brandKit as any;
  const brandProfile: BrandProfile = {
    businessId: businessData.businessId,
    brandName: kb?.brandName,
    tagline: kb?.tagline,
    brandTone: kb?.tone || 'professional',
    brandPersonality: kb?.personality || ' neutral',
    visualPreferences: kb?.visualPreferences || '',
    colors: {
      primary: kb?.colors?.primary || '#FFFFFF',
      secondary: kb?.colors?.secondary,
      accent: kb?.colors?.accent,
      background: kb?.colors?.background,
      text: kb?.colors?.text || '#1A1A1A',
    },
    fonts: {
      heading: kb?.fonts?.heading || 'serif',
      body: kb?.fonts?.body || 'serif',
    },
  };

  // 3. Build LocalizationProfile
  const bbLoc = businessData.businessBrain?.localization;
  const localizationProfile: LocalizationProfile = {
    country: 'India',
    state: businessData.location?.state || '',
    city: businessData.location?.city || '',
    locality: businessData.location?.locality || '',
    primaryLanguage: bbLoc?.primaryLanguage || 'en',
    secondaryLanguage: bbLoc?.secondaryLanguage || 'te',
    languageMixing: bbLoc?.languageMixing || 'minimal',
    regionalStyle: bbLoc?.regionalStyle || 'neutral',
    slangPreference: bbLoc?.slangIntensity || 'none',
    audienceDescription: businessData.businessBrain?.audience?.targetCustomer || '',
    brandTone: brandProfile.brandTone,
    campaignStyle: (businessData.businessBrain?.brand?.personality as any) || 'business',
    contentFormat: 'poster',
  };

  // 4. Load ProductCatalog from products collection
  const products = await _loadProductsByBusiness(targetBusinessId);

  // 5. Extract BusinessRules from BusinessBrain or use defaults
  const rules = _extractBusinessRules(businessData.businessBrain?.businessRules);

  // Return the normalized context
  return {
    business: businessProfile,
    brand: brandProfile,
    localization: localizationProfile,
    products,
    rules,
  };
}

/**
 * Derives operating modes from the business data.
 */
function _deriveOperatingModes(
  business: Business
):
  | 'dine-in'
  | 'takeaway'
  | 'delivery'
  | 'dine-in & takeaway'
  | 'dine-in & delivery'
  | 'takeaway & delivery'
  | 'dine-in & takeaway & delivery' {
  if (business.businessBrain) {
    const dining = String(business.businessBrain.identity?.description || '');
    const lower = dining.toLowerCase();
    if (lower.includes('delivery') && !lower.includes('dine-in')) return 'takeaway & delivery';
    if (lower.includes('takeaway') && !lower.includes('dine-in')) return 'dine-in & takeaway';
    if (lower.includes('dine-in') && lower.includes('takeaway') && lower.includes('delivery'))
      return 'dine-in & takeaway & delivery';
    if (lower.includes('dine-in') && lower.includes('takeaway')) return 'dine-in & takeaway';
    if (lower.includes('dine-in') && lower.includes('delivery')) return 'dine-in & delivery';
  }
  return 'dine-in';
}

/**
 * Loads products for a given business from Firestore.
 */
async function _loadProductsByBusiness(businessId: string): Promise<Product[]> {
  const productsRef = collection(getDb(), 'products');
  const q = query(
    productsRef,
    where('businessId', '==', businessId),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => {
    const data = doc.data() as {
      businessId: string;
      name: string;
      description?: string;
      price: number;
      originalPrice?: number;
      currency: 'INR';
      category: string;
      tags?: string[];
      variants?: Array<{ name: string; price: number; attributes?: Record<string, unknown> }>;
      images?: Array<{ url: string; storagePath: string; isPrimary: boolean }>;
      attributes?: Record<string, unknown>;
      status: string;
      sortOrder?: number;
      createdAt?: string;
      updatedAt?: string;
    };
    return {
      productId: doc.id,
      businessId: data.businessId,
      name: data.name,
      description: data.description,
      price: data.price,
      originalPrice: data.originalPrice,
      currency: data.currency,
      category: data.category,
      tags: data.tags || [],
      variants: data.variants || [],
      images: data.images || [],
      attributes: data.attributes || {},
      status: data.status,
      sortOrder: data.sortOrder,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as Product;
  });
}

/**
 * Extracts BusinessRules from the BusinessBrain, or returns defaults.
 */
function _extractBusinessRules(businessBrainRules?: BusinessBrain['businessRules']): BusinessRules {
  if (businessBrainRules) {
    return {
      factuality: {
        allowCreativeFraming: true,
        requireExplicitPricing: true,
        prohibitInventedProducts: true,
        prohibitInventedClaims: true,
      },
      availability: {
        displayUnavailableItems: false,
        minimumOrderRequired: true,
        deliveryRadiusKm: businessBrainRules.deliveryRadiusKm || 50,
      },
      communication: {
        contactInformationAllowed: true,
        operatingHoursRespectRequired: true,
        brandRestrictions: [],
      },
    };
  }

  // Default rules when no BusinessBrain data exists
  return {
    factuality: {
      allowCreativeFraming: true,
      requireExplicitPricing: true,
      prohibitInventedProducts: true,
      prohibitInventedClaims: true,
    },
    availability: {
      displayUnavailableItems: false,
      minimumOrderRequired: true,
      deliveryRadiusKm: 50,
    },
    communication: {
      contactInformationAllowed: true,
      operatingHoursRespectRequired: true,
      brandRestrictions: [],
    },
  };
}

/**
 * Gets the user's first active business ID from Firestore.
 */
async function _getUserBusinessId(userId: string): Promise<string | null> {
  const businesses = await businessService.getByUserId(userId);
  if (businesses.length === 0) {
    return null;
  }
  const activeBusiness = businesses.find((b) => b.status !== 'archived')!;
  return activeBusiness.businessId;
}
