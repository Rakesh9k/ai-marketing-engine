import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';

// Mock dependencies for pure unit tests
jest.mock('../../middleware/auth', () => ({
  verifyBusinessAccess: jest.fn().mockImplementation((userId: string, _businessId: string) => {
    if (userId === 'unauthorized-user') {
      const { HttpsError } = require('firebase-functions/v2/https');
      throw new HttpsError('permission-denied', 'User does not have access to business');
    }
    return Promise.resolve();
  }),
}));

jest.mock('../../middleware/rateLimit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/firestore', () => ({
  deleteAssetDoc: jest.fn().mockResolvedValue(undefined),
}));

import { deleteAsset } from './deleteAsset';
import { deleteAssetDoc } from '../../services/firestore';
import { verifyBusinessAccess } from '../../middleware/auth';

function callableRequest(data: unknown, uid?: string) {
  return { data, auth: uid ? { uid, token: {} as any } : undefined } as any;
}

describe('deleteAsset callable function (Unit tests)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. rejects unauthenticated requests', async () => {
    await expect(
      (deleteAsset as any).run(callableRequest({ storagePath: 'businesses/b1/p/img.png' }))
    ).rejects.toThrow(/Authentication required|unauthenticated/i);
  });

  it('2. rejects invalid or missing storagePath format', async () => {
    const userId = `user-${uuid()}`;

    // Empty/missing storage path
    await expect(
      (deleteAsset as any).run(callableRequest({ storagePath: '' }, userId))
    ).rejects.toThrow();

    // Storage path missing businesses/ prefix
    await expect(
      (deleteAsset as any).run(callableRequest({ storagePath: 'invalid/path/file.png' }, userId))
    ).rejects.toThrow(/permission-denied|storagePath does not belong/i);
  });

  it('3. rejects unauthorized deletion (calling user lacks business access or explicit businessId mismatch)', async () => {
    const ownerId = `user-${uuid()}`;
    const storagePath = `businesses/biz-123/products/image.png`;

    // Attacker without access to business
    await expect(
      (deleteAsset as any).run(callableRequest({ storagePath }, 'unauthorized-user'))
    ).rejects.toThrow(/User does not have access to business|permission-denied/i);

    // Mismatched explicit businessId
    await expect(
      (deleteAsset as any).run(
        callableRequest({ storagePath, businessId: 'different-biz' }, ownerId)
      )
    ).rejects.toThrow(/permission-denied|storagePath does not belong/i);
  });

  it('4. authorized deletion succeeds (calls storage delete and deleteAssetDoc)', async () => {
    const ownerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    const assetId = `asset-${uuid()}`;
    const storagePath = `businesses/${businessId}/products/${assetId}.png`;

    const mockFile = {
      exists: jest.fn().mockResolvedValue([true]),
      delete: jest.fn().mockResolvedValue([{}]),
    };
    const mockBucket = {
      file: jest.fn().mockReturnValue(mockFile),
    };
    const bucketSpy = jest.spyOn(admin.storage(), 'bucket').mockReturnValue(mockBucket as any);

    const result = await (deleteAsset as any).run(
      callableRequest({ storagePath, businessId, assetId }, ownerId)
    );

    expect(result.success).toBe(true);
    expect(verifyBusinessAccess).toHaveBeenCalledWith(ownerId, businessId);
    expect(mockBucket.file).toHaveBeenCalledWith(storagePath);
    expect(mockFile.delete).toHaveBeenCalled();
    expect(deleteAssetDoc).toHaveBeenCalledWith(assetId);

    bucketSpy.mockRestore();
  });

  it('5. handles storage deletion errors safely', async () => {
    const ownerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    const assetId = `asset-${uuid()}`;
    const storagePath = `businesses/${businessId}/products/${assetId}.png`;

    const mockFile = {
      exists: jest.fn().mockResolvedValue([true]),
      delete: jest.fn().mockRejectedValue(new Error('Storage service unavailable')),
    };
    const mockBucket = {
      file: jest.fn().mockReturnValue(mockFile),
    };
    const bucketSpy = jest.spyOn(admin.storage(), 'bucket').mockReturnValue(mockBucket as any);

    await expect(
      (deleteAsset as any).run(callableRequest({ storagePath, businessId, assetId }, ownerId))
    ).rejects.toThrow(/Failed to delete file from storage/i);

    bucketSpy.mockRestore();
  });

  it('6. handles non-existent storage file gracefully and completes Firestore cleanup', async () => {
    const ownerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    const assetId = `asset-${uuid()}`;
    const storagePath = `businesses/${businessId}/products/missing.png`;

    const mockFile = {
      exists: jest.fn().mockResolvedValue([false]),
      delete: jest.fn(),
    };
    const mockBucket = {
      file: jest.fn().mockReturnValue(mockFile),
    };
    const bucketSpy = jest.spyOn(admin.storage(), 'bucket').mockReturnValue(mockBucket as any);

    const result = await (deleteAsset as any).run(
      callableRequest({ storagePath, businessId, assetId }, ownerId)
    );

    expect(result.success).toBe(true);
    expect(mockFile.delete).not.toHaveBeenCalled();
    expect(deleteAssetDoc).toHaveBeenCalledWith(assetId);

    bucketSpy.mockRestore();
  });
});
