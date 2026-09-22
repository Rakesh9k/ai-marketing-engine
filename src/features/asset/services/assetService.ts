import { getFirebaseFunctions } from '@/lib/firebase/client';
import { getFirebaseDb } from '@/lib/firebase/client';
import { httpsCallable } from 'firebase/functions';
import {
  doc,
  getDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDocs,
  collection,
} from 'firebase/firestore';
import { assetConverter } from '@/lib/firebase/converters';
import type { Asset, AssetType } from '@/types';
import { validateFile, compressImage } from './assetValidation';
import { businessService } from '@/services/database';

/**
 * Generates a UUID v4 string.
 */
const hexChars = '0123456789abcdef'.split('');

const generateId = (): string => {
  // UUID v4: 8-4-4-4-12 characters
  const s = [];
  for (let i = 0; i < 16; i++) {
    s[i] = hexChars[Math.floor(Math.random() * hexChars.length)];
  }
  // Insert hyphens at the standard positions
  s[8] = '-';
  s[13] = '-';
  // UUID v4: set 4th version bits (s[12] = '4')
  s[14] = '-';
  s[15] = '4';
  // Set uuid version and random variant (s[16] = '8', '9', 'a', or 'b')
  s[18] = '-';
  s[19] = hexChars[Math.floor(Math.random() * 4) + 8];

  return s.join('');
};

function getDb() {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firestore not initialized');
  }
  return db;
}

function getAssetRef(assetId: string) {
  return doc(getDb(), 'assets', assetId).withConverter(assetConverter);
}

/**
 * Uploads an image to Firebase Storage via signed URL and returns the asset metadata.
 *
 * @param file - The image file to upload
 * @param userId - The authenticated user's ID
 * @param businessId - The business the asset belongs to
 * @param assetType - The type of asset (poster, headline, etc.)
 * @returns Asset metadata object
 * @throws Error if upload fails
 */
const uploadImage = async (
  file: File,
  userId: string,
  businessId: string,
  assetType: AssetType = 'poster'
): Promise<Asset> => {
  // 1. Validate the file
  const validationError = validateFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  // 2. Compress image if needed (before upload)
  const compressedBlob = await compressImage(file);
  const fileToUpload =
    compressedBlob instanceof File
      ? compressedBlob
      : new File([compressedBlob], file.name, { type: file.type });

  // 3. Read the real image dimensions up front so confirmUpload (below) can
  // persist them on the asset record in a single write — the backend's
  // validation schema requires width/height to be positive when provided.
  const dimensions = await getImageDimensions(fileToUpload);

  // 4. Generate unique asset ID
  const assetId = generateId();

  // 5. Get signed upload URL from Cloud Function
  const functions = getFirebaseFunctions();
  if (!functions) {
    throw new Error('Firebase Functions not initialized');
  }
  const getUploadUrl = httpsCallable(functions, 'getUploadUrl');
  const { data: uploadData } = (await getUploadUrl({
    businessId,
    assetType,
    fileName: file.name,
    contentType: fileToUpload.type,
    fileSize: fileToUpload.size,
  })) as { data: { uploadUrl: string; storagePath: string; assetId: string; expiresAt: string } };

  const { uploadUrl, storagePath } = uploadData;

  // 6. Upload to Firebase Storage using signed URL
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: fileToUpload,
    headers: {
      'Content-Type': fileToUpload.type,
    },
  });

  if (!uploadResponse.ok) {
    throw new Error(`Upload failed: ${uploadResponse.statusText}`);
  }

  // 7. Confirm upload and create asset record, with the real dimensions
  // read in step 3 — the backend persists the asset record in this single
  // call, so no follow-up patch write is needed.
  const functions2 = getFirebaseFunctions();
  if (!functions2) {
    throw new Error('Firebase Functions not initialized');
  }
  const confirmUpload = httpsCallable(functions2, 'confirmUpload');
  const { data: confirmData } = (await confirmUpload({
    businessId,
    storagePath,
    assetType,
    metadata: {
      originalName: file.name,
      mimeType: fileToUpload.type,
      size: fileToUpload.size,
      width: dimensions.width,
      height: dimensions.height,
    },
  })) as { data: { assetId: string; asset: any; downloadURL: string } };

  const { assetId: confirmedAssetId, downloadURL } = confirmData;

  return {
    assetId: confirmedAssetId || assetId,
    userId,
    businessId,
    name: file.name,
    description: undefined,
    storagePath,
    fileName: storagePath.split('/').pop() || 'unknown',
    mimeType: fileToUpload.type,
    size: fileToUpload.size,
    width: dimensions.width,
    height: dimensions.height,
    assetType,
    status: 'completed',
    previewUrl: downloadURL,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

// eslint-disable-next-line @typescript-eslint/no-floating-promises
/**
 * Gets image dimensions from a File object.
 */
const getImageDimensions = async (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    // Create object URL to avoid loading large files into memory
    const objectUrl = URL.createObjectURL(file);
    img.onload = function () {
      // Use default dimensions if image has zero size
      const w = img.width > 0 ? img.width : 1024;
      const h = img.height > 0 ? img.height : 1024;
      URL.revokeObjectURL(objectUrl);
      resolve({ width: w, height: h });
    };
    img.onerror = function () {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: 1024, height: 1024 });
    };
    img.src = objectUrl;
  });
};

/**
 * Deletes an asset from Storage and Firestore.
 *
 * @param assetId - The asset ID to delete
 * @param businessId - The business the asset belongs to
 * @param userId - The authenticated user's ID
 */
const deleteAsset = async (assetId: string, businessId: string, userId: string): Promise<void> => {
  // Verify ownership
  const businesses = await businessService.getByUserId(userId);
  const userBusinesses = businesses.filter(
    (b: { businessId: string; status: string }) =>
      b.businessId === businessId && b.status !== 'archived'
  );

  if (userBusinesses.length === 0) {
    throw new Error('You do not have access to this business');
  }

  // 1. Get the asset to find the storage path
  const assetRef = getAssetRef(assetId);
  const assetSnap = await getDoc(assetRef);

  if (!assetSnap.exists()) {
    throw new Error('Asset not found');
  }

  const asset = assetSnap.data();

  // Verify the asset belongs to the business
  if (asset.businessId !== businessId) {
    throw new Error('Asset does not belong to this business');
  }

  // 2. Delete from Firebase Storage
  const functions = getFirebaseFunctions();
  if (!functions) {
    throw new Error('Firebase Functions not initialized');
  }
  const deleteFromStorage = httpsCallable(functions, 'deleteAsset');
  await deleteFromStorage({ storagePath: asset.storagePath });

  // 3. Delete the Firestore document
  await deleteDoc(assetRef);
};

/**
 * Gets an asset by ID.
 *
 * @param assetId - The asset ID to retrieve
 * @param businessId - The business the asset belongs to
 * @param userId - The authenticated user's ID
 */
const getAsset = async (
  assetId: string,
  businessId: string,
  userId: string
): Promise<Asset | null> => {
  // Verify ownership
  const businesses = await businessService.getByUserId(userId);
  const userBusinesses = businesses.filter(
    (b: { businessId: string; status: string }) =>
      b.businessId === businessId && b.status !== 'archived'
  );

  if (userBusinesses.length === 0) {
    return null;
  }

  const assetRef = getAssetRef(assetId);
  const assetSnap = await getDoc(assetRef);

  if (!assetSnap.exists()) {
    return null;
  }

  const asset = assetSnap.data();

  // Verify the asset belongs to the business
  if (asset.businessId !== businessId) {
    return null;
  }

  return asset;
};

/**
 * Lists assets for a business.
 *
 * @param businessId - The business ID
 * @param userId - The authenticated user's ID
 */
const listAssets = async (businessId: string, userId: string): Promise<Asset[]> => {
  // Verify ownership
  const businesses = await businessService.getByUserId(userId);
  const userBusinesses = businesses.filter(
    (b: { businessId: string; status: string }) =>
      b.businessId === businessId && b.status !== 'archived'
  );

  if (userBusinesses.length === 0) {
    return [];
  }

  const assetsQuery = query(
    collection(getDb(), 'assets').withConverter(assetConverter),
    where('businessId', '==', businessId),
    orderBy('createdAt', 'desc')
  );

  const snap = await getDocs(assetsQuery);
  return snap.docs.map((doc) => doc.data());
};

// Export all named exports
export { uploadImage, deleteAsset, getAsset, listAssets, validateFile, compressImage };
export type { Asset, AssetType };
