import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { describe, beforeAll, afterAll, test, expect } from '@jest/globals';

describe('Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment | null = null;

  beforeAll(async () => {
    const firestoreEmulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
    if (!firestoreEmulatorHost) {
      console.log('Skipping Firestore security tests - emulator not available');
      return;
    }
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-project',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
        host: 'localhost',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  const skipIfNoEnv = () => {
    if (!testEnv) {
      return true;
    }
    return false;
  };

  test('User can read own user document', async () => {
    if (skipIfNoEnv()) return;
    const user = testEnv!.authenticatedContext('user1');
    const userDoc = user.firestore().collection('users').doc('user1');
    await expect(userDoc.set({ userId: 'user1', email: 'test@test.com' }))['toSucceed']();
    await expect(userDoc.get())['toSucceed']();
  });

  test('User cannot read other user document', async () => {
    if (skipIfNoEnv()) return;
    const user = testEnv!.authenticatedContext('user1');
    const userDoc = user.firestore().collection('users').doc('user2');
    await expect(userDoc.get())['toDeny']();
  });

  test('User can create business with own userId', async () => {
    if (skipIfNoEnv()) return;
    const user = testEnv!.authenticatedContext('user1');
    const business = user.firestore().collection('businesses').doc('biz1');
    await expect(
      business.set({
        userId: 'user1',
        name: 'Test Restaurant',
        category: 'restaurant',
        status: 'active',
      })
    )['toSucceed']();
  });

  test('User cannot create business with different userId', async () => {
    if (skipIfNoEnv()) return;
    const user = testEnv!.authenticatedContext('user1');
    const business = user.firestore().collection('businesses').doc('biz2');
    await expect(
      business.set({
        userId: 'user2',
        name: 'Test Restaurant',
        category: 'restaurant',
        status: 'active',
      })
    )['toDeny']();
  });

  test('User cannot read business they do not own', async () => {
    if (skipIfNoEnv()) return;
    const owner = testEnv!.authenticatedContext('owner1');
    await owner.firestore().collection('businesses').doc('biz1').set({
      userId: 'owner1',
      name: 'Owner Restaurant',
      category: 'restaurant',
      status: 'active',
    });

    const otherUser = testEnv!.authenticatedContext('user2');
    await expect(otherUser.firestore().collection('businesses').doc('biz1').get())['toDeny']();
  });

  test('User can read own business', async () => {
    if (skipIfNoEnv()) return;
    const user = testEnv!.authenticatedContext('user1');
    const business = user.firestore().collection('businesses').doc('biz1');
    await business.set({
      userId: 'user1',
      name: 'Test Restaurant',
      category: 'restaurant',
      status: 'active',
    });
    await expect(business.get())['toSucceed']();
  });

  test('User cannot update business they do not own', async () => {
    if (skipIfNoEnv()) return;
    const owner = testEnv!.authenticatedContext('owner1');
    await owner.firestore().collection('businesses').doc('biz1').set({
      userId: 'owner1',
      name: 'Owner Restaurant',
      category: 'restaurant',
      status: 'active',
    });

    const otherUser = testEnv!.authenticatedContext('user2');
    await expect(
      otherUser.firestore().collection('businesses').doc('biz1').update({
        name: 'Hacked Restaurant',
      })
    )['toDeny']();
  });

  test('User can update own business', async () => {
    if (skipIfNoEnv()) return;
    const user = testEnv!.authenticatedContext('user1');
    const business = user.firestore().collection('businesses').doc('biz1');
    await business.set({
      userId: 'user1',
      name: 'Test Restaurant',
      category: 'restaurant',
      status: 'active',
    });
    await expect(business.update({ name: 'Updated Name' }))['toSucceed']();
  });

  test('User cannot delete business (soft delete only)', async () => {
    if (skipIfNoEnv()) return;
    const user = testEnv!.authenticatedContext('user1');
    await user.firestore().collection('businesses').doc('biz1').set({
      userId: 'user1',
      name: 'Test Restaurant',
      category: 'restaurant',
      status: 'active',
    });
    await expect(user.firestore().collection('businesses').doc('biz1').delete())['toDeny']();
  });

  test('Agency member can access managed business', async () => {
    if (skipIfNoEnv()) return;
    const agencyUser = testEnv!.authenticatedContext('agency1', {
      role: 'agency_member',
      agencyId: 'agency_1',
    });
    const business = agencyUser.firestore().collection('businesses').doc('biz1');
    await business.set({
      agencyId: 'agency_1',
      agencyManaged: true,
      userId: 'client1',
      name: 'Client Restaurant',
      category: 'restaurant',
      status: 'active',
    });
    await expect(business.get())['toSucceed']();
  });

  test('Agency member cannot access unmanaged business', async () => {
    if (skipIfNoEnv()) return;
    const agencyUser = testEnv!.authenticatedContext('agency1', {
      role: 'agency_member',
      agencyId: 'agency_1',
    });
    const otherBusiness = agencyUser.firestore().collection('businesses').doc('biz2');
    await otherBusiness.set({
      agencyId: 'agency_2',
      agencyManaged: true,
      userId: 'client2',
      name: 'Other Restaurant',
      category: 'restaurant',
      status: 'active',
    });
    await expect(otherBusiness.get())['toDeny']();
  });
});
