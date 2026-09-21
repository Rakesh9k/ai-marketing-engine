/**
 * Phase 15 — proves createProduct actually persists ownership (productId
 * -> businessId) and that the backend, not just Firestore rules, rejects
 * a user creating a product under a business they do not own.
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { createProduct } from './createProduct';
import { createBusinessDoc, getProductDoc } from '../../services/firestore';
import type { Business } from '../../types';

function callableRequest(data: unknown, uid: string) {
  return { data, auth: { uid, token: {} as any } } as any;
}

function makeBusiness(businessId: string, userId: string): Business {
  return {
    businessId,
    userId,
    name: 'Test Restaurant',
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

function makeProductInput(businessId: string) {
  return {
    businessId,
    name: 'Paneer Biryani',
    price: 299,
    category: 'main' as const,
    images: [{ url: 'https://storage.example.com/img.png', storagePath: 'x/y.png', isPrimary: true }],
  };
}

describeIfEmulator('createProduct — ownership and persistence (Phase 15)', () => {
  const db = admin.firestore();

  afterAll(async () => {
    await admin.app().delete();
  });

  it('an authorized business owner creates a product that persists with the correct businessId', async () => {
    const userId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, userId));

    const result = await (createProduct as any).run(
      callableRequest(makeProductInput(businessId), userId)
    );
    expect(result.product.productId).toBeDefined();

    const persisted = await getProductDoc(result.product.productId);
    expect(persisted).not.toBeNull();
    expect(persisted!.businessId).toBe(businessId);
    expect(persisted!.name).toBe('Paneer Biryani');
  });

  it('CRITICAL: a user cannot create a product under a business they do not own (backend-enforced, not just rules)', async () => {
    const ownerId = `user-${uuid()}`;
    const attackerId = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await createBusinessDoc(makeBusiness(businessId, ownerId));

    await expect(
      (createProduct as any).run(callableRequest(makeProductInput(businessId), attackerId))
    ).rejects.toThrow();

    // No product should have been created as a side effect of the denied
    // attempt.
    const snap = await db.collection('products').where('businessId', '==', businessId).get();
    expect(snap.size).toBe(0);
  });

  it('rejects creating a product under a businessId that does not exist at all (not just wrong owner)', async () => {
    const userId = `user-${uuid()}`;
    await expect(
      (createProduct as any).run(callableRequest(makeProductInput(`nonexistent-${uuid()}`), userId))
    ).rejects.toThrow();
  });
});
