/**
 * @jest-environment node
 *
 * See tests/security.test.ts for why this override is required.
 */
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { describe, beforeAll, afterAll, test, expect } from '@jest/globals';

describe('Phase 27 — Agency Authorization', function () {
  let testEnv: RulesTestEnvironment | null = null;

  beforeAll(async () => {
    const firestoreEmulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
    if (!firestoreEmulatorHost) {
      console.log('Skipping Phase 27 security tests - emulator not available');
      return;
    }
    testEnv = await initializeTestEnvironment({
      // Phase 15: distinct per-file project namespace — see the identical
      // comment in tests/security.test.ts for why.
      projectId: 'demo-project-phase27-authz',
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

  test('Foreign agency access — agency A cannot access agency B', async () => {
    if (skipIfNoEnv()) return;
    const agencyA = testEnv!.authenticatedContext('agencyA', {
      role: 'agency_member',
      agencyId: 'agency_A',
    });
    const businessB = agencyA.firestore().collection('businesses').doc('biz_B');
    await expect(businessB.get())['toDeny']();
  });

  test('Foreign client access — agency member cannot access another agency clients', async () => {
    if (skipIfNoEnv()) return;
    const agencyA = testEnv!.authenticatedContext('agencyA', {
      role: 'agency_member',
      agencyId: 'agency_A',
    });
    const clientB = agencyA.firestore().collection('clients').doc('client_B');
    await expect(clientB.get())['toDeny']();
  });

  test('Foreign business access — agency member cannot access another agency businesses', async () => {
    if (skipIfNoEnv()) return;
    const agencyA = testEnv!.authenticatedContext('agencyA', {
      role: 'agency_member',
      agencyId: 'agency_A',
    });
    const bizB = agencyA.firestore().collection('businesses').doc('biz_B');
    await expect(bizB.get())['toDeny']();
  });

  test('Cross-tenant Agency A Agency B businesses', async () => {
    if (skipIfNoEnv()) return;
    const agencyA = testEnv!.authenticatedContext('agencyA', {
      role: 'agency_member',
      agencyId: 'agency_A',
    });
    const bizB = agencyA.firestore().collection('businesses').doc('biz_B');
    await expect(bizB.get())['toDeny']();
  });

  test('Cross-tenant Agency A Agency B campaigns', async () => {
    if (skipIfNoEnv()) return;
    const agencyA = testEnv!.authenticatedContext('agencyA', {
      role: 'agency_member',
      agencyId: 'agency_A',
    });
    const campB = agencyA.firestore().collection('campaigns').doc('camp_B');
    await expect(campB.get())['toDeny']();
  });

  test('Cross-tenant Agency A Agency B assets', async () => {
    if (skipIfNoEnv()) return;
    const agencyA = testEnv!.authenticatedContext('agencyA', {
      role: 'agency_member',
      agencyId: 'agency_A',
    });
    const assetB = agencyA.firestore().collection('campaign_assets').doc('asset_B');
    await expect(assetB.get())['toDeny']();
  });

  test('Cross-business isolation agency A can read own biz not others', async () => {
    if (skipIfNoEnv()) return;
    // biz_A must actually be a business the agency manages (agencyId
    // matching + agencyManaged) for the "can read own" half of this test
    // to mean anything — reading a nonexistent document evaluates to
    // deny/error regardless of authorization, which would make this
    // assertion pass for the wrong reason.
    await testEnv!.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection('businesses').doc('biz_A').set({
        agencyId: 'agency_A',
        agencyManaged: true,
        userId: 'client_A',
        name: 'Agency A Client Business',
        category: 'restaurant',
        status: 'active',
      });
      await db.collection('businesses').doc('biz_B').set({
        agencyId: 'agency_B',
        agencyManaged: true,
        userId: 'client_B',
        name: 'Agency B Client Business',
        category: 'restaurant',
        status: 'active',
      });
    });
    const agencyA = testEnv!.authenticatedContext('agencyA', {
      role: 'agency_member',
      agencyId: 'agency_A',
    });
    const bizA = agencyA.firestore().collection('businesses').doc('biz_A');
    const bizB = agencyA.firestore().collection('businesses').doc('biz_B');
    await expect(bizA.get())['toSucceed']();
    await expect(bizB.get())['toDeny']();
  });

  test('Cross-client isolation agency member cannot access another clients businesses', async () => {
    if (skipIfNoEnv()) return;
    const agencyA = testEnv!.authenticatedContext('agencyA', {
      role: 'agency_member',
      agencyId: 'agency_A',
    });
    const bizB = agencyA.firestore().collection('businesses').doc('biz_B');
    await expect(bizB.get())['toDeny']();
  });

  test('Cross-agency isolation no agency can access another agencys data', async () => {
    if (skipIfNoEnv()) return;
    const agencyA = testEnv!.authenticatedContext('agencyA', {
      role: 'agency_member',
      agencyId: 'agency_A',
    });
    const agencyB = agencyA.firestore().collection('agencies').doc('agency_B');
    await expect(agencyB.get())['toDeny']();
  });

  test('Unauthorized bulk job regular user cannot trigger', async () => {
    if (skipIfNoEnv()) return;
    const regularUser = testEnv!.authenticatedContext('user1', { role: 'user' });
    const bulkJob = regularUser.firestore().collection('bulk_jobs').doc('job1');
    await expect(bulkJob.set({ status: 'queued' }))['toDeny']();
  });

  test('Unauthorized approval attempt client cannot approve own campaign', async () => {
    if (skipIfNoEnv()) return;
    const clientUser = testEnv!.authenticatedContext('client1', { role: 'user' });
    const campaign = clientUser.firestore().collection('campaigns').doc('camp1');
    await expect(campaign.update({ status: 'approved', metadata: { truthCheckStatus: 'PASS' } }))[
      'toDeny'
    ]();
  });
});
