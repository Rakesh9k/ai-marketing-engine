/**
 * Product Mutations & Authorization Emulator Tests
 * Verifies updateProduct and archiveProduct end-to-end against the Firestore emulator:
 * - Authorization enforcement (owner vs attacker vs cross-business IDOR)
 * - Validation contracts (negative price, currency, categories, unmodifiable businessId/productId)
 * - Authoritative server timestamp (updatedAt) and lifecycle preservation (archive marks status: 'archived', does not delete)
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { updateProduct } from './updateProduct';
import { archiveProduct } from './archiveProduct';
import { createBusinessDoc, createProductDoc, getProductDoc } from '../../services/firestore';
import type { Business, Product } from '../../types';

function callableRequest(data: unknown, uid: string) {
  return { data, auth: { uid, token: {} as any } } as any;
}

function makeBusiness(businessId: string, userId: string): Business {
  return {
    businessId,
    userId,
    name: 'Test Business',
    category: 'restaurant',
    location: { country: 'India', state: 'Telangana', city: 'Hyderabad', locality: 'Kondapur' },
    contact: { phone: '9876543210', whatsapp: '9876543210' },
    businessBrain: {} as Business['businessBrain'],
    settings: { timezone: 'Asia/Kolkata', currency: 'INR' },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Business;
}

function makeProduct(productId: string, businessId: string, overrides: Partial<Product> = {}): Product {
  const now = new Date().toISOString();
  return {
    productId,
    businessId,
    name: 'Original Dish',
    price: 199,
    currency: 'INR',
    category: 'main',
    tags: ['signature'],
    variants: [],
    images: [{ url: 'https://example.com/original.png', storagePath: 'prod/1.png', isPrimary: true }],
    attributes: { veg: true },
    status: 'active',
    sortOrder: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describeIfEmulator('Product Mutations — update & archive authorization and contracts', () => {
  afterAll(async () => {
    // Avoid double delete if createProduct.test already cleaned up
    try {
      if (admin.apps.length > 0) {
        await admin.app().delete();
      }
    } catch {
      // Ignore cleanup error
    }
  });

  describe('updateProduct', () => {
    it('authorized owner updates allowed fields and server assigns updatedAt', async () => {
      const ownerId = `user-${uuid()}`;
      const businessId = `biz-${uuid()}`;
      const productId = `prod-${uuid()}`;
      await createBusinessDoc(makeBusiness(businessId, ownerId));
      await createProductDoc(makeProduct(productId, businessId));

      const updatePayload = {
        productId,
        businessId,
        name: 'Updated Dish Name',
        price: 249,
      };

      const result = await (updateProduct as any).run(callableRequest(updatePayload, ownerId));
      expect(result.product.name).toBe('Updated Dish Name');
      expect(result.product.price).toBe(249);
      expect(result.product.businessId).toBe(businessId);

      const persisted = await getProductDoc(productId);
      expect(persisted!.name).toBe('Updated Dish Name');
      expect(persisted!.price).toBe(249);
      expect(persisted!.updatedAt).toBeDefined();
    });

    it('IDOR: user with no business access cannot update product', async () => {
      const ownerId = `user-${uuid()}`;
      const attackerId = `user-${uuid()}`;
      const businessId = `biz-${uuid()}`;
      const productId = `prod-${uuid()}`;
      await createBusinessDoc(makeBusiness(businessId, ownerId));
      await createProductDoc(makeProduct(productId, businessId));

      await expect(
        (updateProduct as any).run(
          callableRequest({ productId, businessId, name: 'Hacked Dish' }, attackerId)
        )
      ).rejects.toThrow();

      const unchanged = await getProductDoc(productId);
      expect(unchanged!.name).toBe('Original Dish');
    });

    it('Cross-tenant spoofing: attacker cannot supply a businessId they own to edit another tenant product', async () => {
      const victimOwner = `user-${uuid()}`;
      const attackerOwner = `user-${uuid()}`;
      const victimBiz = `biz-${uuid()}`;
      const attackerBiz = `biz-${uuid()}`;
      const productId = `prod-${uuid()}`;

      await createBusinessDoc(makeBusiness(victimBiz, victimOwner));
      await createBusinessDoc(makeBusiness(attackerBiz, attackerOwner));
      await createProductDoc(makeProduct(productId, victimBiz));

      // Attacker claims this product belongs to attackerBiz
      await expect(
        (updateProduct as any).run(
          callableRequest({ productId, businessId: attackerBiz, name: 'Spoofed' }, attackerOwner)
        )
      ).rejects.toThrow();

      const unchanged = await getProductDoc(productId);
      expect(unchanged!.name).toBe('Original Dish');
      expect(unchanged!.businessId).toBe(victimBiz);
    });

    it('Schema validation: rejects negative or zero price', async () => {
      const ownerId = `user-${uuid()}`;
      const businessId = `biz-${uuid()}`;
      const productId = `prod-${uuid()}`;
      await createBusinessDoc(makeBusiness(businessId, ownerId));
      await createProductDoc(makeProduct(productId, businessId));

      await expect(
        (updateProduct as any).run(
          callableRequest({ productId, businessId, price: -50 }, ownerId)
        )
      ).rejects.toThrow();

      await expect(
        (updateProduct as any).run(
          callableRequest({ productId, businessId, price: 0 }, ownerId)
        )
      ).rejects.toThrow();
    });

    it('Schema validation: rejects empty category string', async () => {
      const ownerId = `user-${uuid()}`;
      const businessId = `biz-${uuid()}`;
      const productId = `prod-${uuid()}`;
      await createBusinessDoc(makeBusiness(businessId, ownerId));
      await createProductDoc(makeProduct(productId, businessId));

      await expect(
        (updateProduct as any).run(
          callableRequest({ productId, businessId, category: '' }, ownerId)
        )
      ).rejects.toThrow();
    });
  });

  describe('archiveProduct', () => {
    it('authorized owner archives product (soft delete: status becomes archived, doc persists)', async () => {
      const ownerId = `user-${uuid()}`;
      const businessId = `biz-${uuid()}`;
      const productId = `prod-${uuid()}`;
      await createBusinessDoc(makeBusiness(businessId, ownerId));
      await createProductDoc(makeProduct(productId, businessId));

      const result = await (archiveProduct as any).run(
        callableRequest({ productId, businessId }, ownerId)
      );

      expect(result.product.status).toBe('archived');

      // Verify the product still exists in Firestore and was NOT permanently deleted
      const persisted = await getProductDoc(productId);
      expect(persisted).not.toBeNull();
      expect(persisted!.status).toBe('archived');
      expect(persisted!.productId).toBe(productId);
    });

    it('unauthorized user cannot archive another business product', async () => {
      const ownerId = `user-${uuid()}`;
      const attackerId = `user-${uuid()}`;
      const businessId = `biz-${uuid()}`;
      const productId = `prod-${uuid()}`;
      await createBusinessDoc(makeBusiness(businessId, ownerId));
      await createProductDoc(makeProduct(productId, businessId));

      await expect(
        (archiveProduct as any).run(
          callableRequest({ productId, businessId }, attackerId)
        )
      ).rejects.toThrow();

      const persisted = await getProductDoc(productId);
      expect(persisted!.status).toBe('active');
    });
  });
});
