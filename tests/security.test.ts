/**
 * @jest-environment node
 *
 * The jsdom environment (this project's default) does not work reliably
 * with @firebase/rules-unit-testing's WebChannel-based Firestore client —
 * operations hang until the test times out rather than actually reaching
 * the emulator (confirmed: every test here, including previously-untouched
 * ones, timed out under jsdom, then ran and completed in well under a
 * second each under 'node').
 */
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { describe, beforeAll, afterAll, afterEach, test, expect } from '@jest/globals';

describe('Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment | null = null;

  beforeAll(async () => {
    const firestoreEmulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
    if (!firestoreEmulatorHost) {
      console.log('Skipping Firestore security tests - emulator not available');
      return;
    }
    testEnv = await initializeTestEnvironment({
      // Phase 15: each rules-test file gets its own emulator project
      // namespace. Jest runs test files in separate parallel worker
      // processes; all four rules-test files previously shared the literal
      // 'demo-project' ID against the same running emulator, so one file's
      // afterEach/afterAll clearFirestore()/cleanup() could wipe another
      // file's fixtures mid-test — a real race, confirmed by re-running the
      // full suite repeatedly and observing a different, unrelated test
      // fail each time. The Firestore/Storage emulators keep each project
      // ID fully isolated, so distinct IDs make these files independent.
      projectId: 'demo-project-security-rules',
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

  // Several tests reuse the same doc id (e.g. 'biz1') with different
  // owners; without clearing between tests, a later test's .set() on an
  // id created by an earlier test is evaluated as an update (against the
  // earlier test's owner) rather than a create, producing spurious denials
  // unrelated to what that test actually checks.
  afterEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
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
    // users/{uid} is only ever created server-side (the onUserCreated Auth
    // trigger, via the Admin SDK) — seed it the same way here, bypassing
    // rules, rather than through a client .set() the rules now correctly
    // reject (Phase 11: "allow create: if false" on this collection).
    await testEnv!.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection('users')
        .doc('user1')
        .set({ userId: 'user1', email: 'test@test.com', role: 'user', businessIds: [] });
    });
    const user = testEnv!.authenticatedContext('user1');
    const userDoc = user.firestore().collection('users').doc('user1');
    await expect(userDoc.get())['toSucceed']();
  });

  test('Phase 11: User CANNOT create their own user document via the client SDK (server-only)', async () => {
    if (skipIfNoEnv()) return;
    const user = testEnv!.authenticatedContext('user1');
    const userDoc = user.firestore().collection('users').doc('user1');
    await expect(userDoc.set({ userId: 'user1', email: 'test@test.com' }))['toDeny']();
  });

  test('Phase 11 CRITICAL: User cannot self-escalate role/agencyId/businessIds by writing their own user document', async () => {
    if (skipIfNoEnv()) return;
    await testEnv!.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection('users')
        .doc('user1')
        .set({
          userId: 'user1',
          email: 'test@test.com',
          role: 'user',
          businessIds: ['biz_own'],
          agencyId: null,
        });
    });
    const user = testEnv!.authenticatedContext('user1');
    const userDoc = user.firestore().collection('users').doc('user1');

    // Before the Phase 11 fix, this update succeeded outright — any
    // authenticated user could write role: 'admin' and agencyId: '<any
    // other agency>' directly to their own document, and any backend flow
    // that re-reads this document to refresh Firebase Auth custom claims
    // (functions/src/functions/business/createBusiness.ts) would bake
    // that forged value into their real, verified auth token — granting
    // full cross-tenant access to that agency's data everywhere in this
    // project's rules.
    await expect(userDoc.update({ role: 'admin' }))['toDeny']();
    await expect(userDoc.update({ agencyId: 'agency_victim' }))['toDeny']();
    await expect(userDoc.update({ businessIds: ['biz_own', 'biz_victim_not_mine'] }))['toDeny']();
    await expect(userDoc.update({ subscriptionId: 'sub_forged' }))['toDeny']();

    // A legitimate, non-privileged field must still be editable.
    await expect(userDoc.update({ displayName: 'New Name' }))['toSucceed']();
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
    const business = user.firestore().collection('businesses').doc('biz1');
    await business.set({
      userId: 'user1',
      name: 'Test Restaurant',
      category: 'restaurant',
      status: 'active',
    });
    await expect(business.delete())['toDeny']();
  });

  test('Agency member can access managed business', async () => {
    if (skipIfNoEnv()) return;
    // A business document is always created by its own owning user (or
    // server-side) — the businesses/{id} create rule requires
    // request.resource.data.userId == request.auth.uid, so an agency
    // member's own client SDK can never .set() a business doc on behalf
    // of a client (nor should it be able to). Seed it as the client would
    // really be created, bypassing rules, then test the agency member's
    // read access to it.
    await testEnv!.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('businesses').doc('biz1').set({
        agencyId: 'agency_1',
        agencyManaged: true,
        userId: 'client1',
        name: 'Client Restaurant',
        category: 'restaurant',
        status: 'active',
      });
    });
    const agencyUser = testEnv!.authenticatedContext('agency1', {
      role: 'agency_member',
      agencyId: 'agency_1',
    });
    const business = agencyUser.firestore().collection('businesses').doc('biz1');
    await expect(business.get())['toSucceed']();
  });

  test('Agency member cannot access unmanaged business', async () => {
    if (skipIfNoEnv()) return;
    await testEnv!.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('businesses').doc('biz2').set({
        agencyId: 'agency_2',
        agencyManaged: true,
        userId: 'client2',
        name: 'Other Restaurant',
        category: 'restaurant',
        status: 'active',
      });
    });
    const agencyUser = testEnv!.authenticatedContext('agency1', {
      role: 'agency_member',
      agencyId: 'agency_1',
    });
    const otherBusiness = agencyUser.firestore().collection('businesses').doc('biz2');
    await expect(otherBusiness.get())['toDeny']();
  });

  // Phase 6 — Truth Check: client cannot manufacture a verified/completed
  // campaign status or forge Truth Check status directly via Firestore.
  describe('Campaign verification fields cannot be forged by the client', () => {
    test('Owner cannot directly set campaign status to "completed" via Firestore write', async () => {
      if (skipIfNoEnv()) return;
      const user = testEnv!.authenticatedContext('user1', { businessIds: ['biz1'] });
      const campaign = user.firestore().collection('campaigns').doc('camp1');
      await campaign.set({
        userId: 'user1',
        businessId: 'biz1',
        status: 'draft',
        creditsReserved: 140,
        offer: { headline: 'Test Offer' },
      });
      await expect(campaign.update({ status: 'completed' }))['toDeny']();
    });

    test('Owner cannot forge metadata.truthCheckStatus from FAIL to PASS via Firestore write', async () => {
      if (skipIfNoEnv()) return;
      const user = testEnv!.authenticatedContext('user1', { businessIds: ['biz1'] });
      const campaign = user.firestore().collection('campaigns').doc('camp2');
      await campaign.set({
        userId: 'user1',
        businessId: 'biz1',
        status: 'failed',
        creditsReserved: 140,
        metadata: { idempotencyKey: 'key-1', truthCheckStatus: 'FAIL' },
      });
      await expect(campaign.update({ 'metadata.truthCheckStatus': 'PASS' }))['toDeny']();
    });

    test('Owner cannot alter creditsReserved/creditsUsed via Firestore write', async () => {
      if (skipIfNoEnv()) return;
      const user = testEnv!.authenticatedContext('user1', { businessIds: ['biz1'] });
      const campaign = user.firestore().collection('campaigns').doc('camp3');
      await campaign.set({
        userId: 'user1',
        businessId: 'biz1',
        status: 'draft',
        creditsReserved: 140,
        creditsUsed: 0,
      });
      await expect(campaign.update({ creditsReserved: 1 }))['toDeny']();
      await expect(campaign.update({ creditsUsed: 0 - 140 }))['toDeny']();
    });

    test('Owner CAN still update ordinary editable campaign fields (status/credits untouched)', async () => {
      if (skipIfNoEnv()) return;
      const user = testEnv!.authenticatedContext('user1', { businessIds: ['biz1'] });
      const campaign = user.firestore().collection('campaigns').doc('camp4');
      await campaign.set({
        userId: 'user1',
        businessId: 'biz1',
        status: 'draft',
        creditsReserved: 140,
        offer: { headline: 'Old Headline' },
      });
      await expect(campaign.update({ offer: { headline: 'New Headline' } }))['toSucceed']();
    });

    test('Client cannot write to campaign_assets at all (verification-bearing collection is server-only)', async () => {
      if (skipIfNoEnv()) return;
      const user = testEnv!.authenticatedContext('user1', { businessIds: ['biz1'] });
      const asset = user.firestore().collection('campaign_assets').doc('asset1');
      await expect(
        asset.set({ campaignId: 'camp1', businessId: 'biz1', userId: 'user1', status: 'completed' })
      )['toDeny']();
    });
  });

  // "Create a Reel" — reels/{reelId} is entirely server-owned (created only
  // by createReelProject.ts, transitioned only by generateReel.ts, both via
  // the Admin SDK which bypasses these rules). The client can read its own
  // reels but can never create, update (including forging a 'completed'
  // status or an outputUrl), or delete one directly via Firestore.
  describe('Reels collection is fully server-owned', () => {
    test('Owner can read their own reel', async () => {
      if (skipIfNoEnv()) return;
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('reels').doc('reel1').set({
          reelId: 'reel1',
          businessId: 'biz1',
          userId: 'user1',
          status: 'completed',
        });
      });
      const user = testEnv!.authenticatedContext('user1', { businessIds: ['biz1'] });
      const reel = user.firestore().collection('reels').doc('reel1');
      await expect(reel.get())['toSucceed']();
    });

    test('A different user without business access cannot read the reel', async () => {
      if (skipIfNoEnv()) return;
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('reels').doc('reel2').set({
          reelId: 'reel2',
          businessId: 'biz1',
          userId: 'user1',
          status: 'draft',
        });
      });
      const otherUser = testEnv!.authenticatedContext('user2', { businessIds: ['biz_other'] });
      const reel = otherUser.firestore().collection('reels').doc('reel2');
      await expect(reel.get())['toDeny']();
    });

    test('Client cannot create a reel project directly via Firestore (must go through createReelProject)', async () => {
      if (skipIfNoEnv()) return;
      const user = testEnv!.authenticatedContext('user1', { businessIds: ['biz1'] });
      const reel = user.firestore().collection('reels').doc('reel3');
      await expect(
        reel.set({ reelId: 'reel3', businessId: 'biz1', userId: 'user1', status: 'draft' })
      )['toDeny']();
    });

    test('Owner cannot forge their own reel to "completed" or fabricate an outputUrl via Firestore write', async () => {
      if (skipIfNoEnv()) return;
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('reels').doc('reel4').set({
          reelId: 'reel4',
          businessId: 'biz1',
          userId: 'user1',
          status: 'rendering',
          creditsReserved: 80,
        });
      });
      const user = testEnv!.authenticatedContext('user1', { businessIds: ['biz1'] });
      const reel = user.firestore().collection('reels').doc('reel4');
      await expect(
        reel.update({ status: 'completed', outputUrl: 'https://forged.example/reel.mp4' })
      )['toDeny']();
    });

    test('Owner cannot delete a reel via Firestore', async () => {
      if (skipIfNoEnv()) return;
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('reels').doc('reel5').set({
          reelId: 'reel5',
          businessId: 'biz1',
          userId: 'user1',
          status: 'failed',
        });
      });
      const user = testEnv!.authenticatedContext('user1', { businessIds: ['biz1'] });
      const reel = user.firestore().collection('reels').doc('reel5');
      await expect(reel.delete())['toDeny']();
    });
  });

  // Phase 11: explicit cross-tenant IDOR tests — User A holding a valid,
  // authenticated session attempts to read/write User B's campaign, asset,
  // and usage documents purely by knowing (or guessing) their IDs. This is
  // the "attacker ignores the frontend and calls the backend/Firestore
  // directly" scenario the phase mandates.
  describe('Cross-tenant IDOR — campaign, asset, usage', () => {
    test("User A cannot read User B's campaign (campaign IDOR)", async () => {
      if (skipIfNoEnv()) return;
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('campaigns')
          .doc('camp_b1')
          .set({
            userId: 'userB',
            businessId: 'biz_b',
            status: 'completed',
            creditsReserved: 140,
            offer: { headline: 'Business B campaign' },
          });
      });
      const userA = testEnv!.authenticatedContext('userA', { businessIds: ['biz_a'] });
      await expect(userA.firestore().collection('campaigns').doc('camp_b1').get())['toDeny']();
    });

    test("User A cannot update User B's campaign by guessing its ID", async () => {
      if (skipIfNoEnv()) return;
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('campaigns')
          .doc('camp_b2')
          .set({
            userId: 'userB',
            businessId: 'biz_b',
            status: 'completed',
            creditsReserved: 140,
            offer: { headline: 'Business B campaign' },
          });
      });
      const userA = testEnv!.authenticatedContext('userA', { businessIds: ['biz_a'] });
      await expect(
        userA
          .firestore()
          .collection('campaigns')
          .doc('camp_b2')
          .update({
            offer: { headline: 'Hacked by A' },
          })
      )['toDeny']();
    });

    test("User A cannot read User B's campaign asset (asset IDOR)", async () => {
      if (skipIfNoEnv()) return;
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('campaign_assets').doc('asset_b1').set({
          campaignId: 'camp_b1',
          businessId: 'biz_b',
          userId: 'userB',
          type: 'poster',
          status: 'completed',
        });
      });
      const userA = testEnv!.authenticatedContext('userA', { businessIds: ['biz_a'] });
      await expect(userA.firestore().collection('campaign_assets').doc('asset_b1').get())[
        'toDeny'
      ]();
    });

    test("User A cannot read User B's usage/credit history (usage IDOR)", async () => {
      if (skipIfNoEnv()) return;
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('usage').doc('userB_2026-01-01').set({
          usageId: 'userB_2026-01-01',
          userId: 'userB',
          planId: 'business',
          creditsUsed: 900,
        });
      });
      const userA = testEnv!.authenticatedContext('userA');
      await expect(userA.firestore().collection('usage').doc('userB_2026-01-01').get())['toDeny']();
    });

    test("User A cannot read User B's transaction/payment records (financial IDOR)", async () => {
      if (skipIfNoEnv()) return;
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('transactions').doc('tx_b1').set({
          transactionId: 'tx_b1',
          userId: 'userB',
          type: 'subscription',
          amount: 999,
          status: 'completed',
        });
      });
      const userA = testEnv!.authenticatedContext('userA');
      await expect(userA.firestore().collection('transactions').doc('tx_b1').get())['toDeny']();
    });

    test("User A cannot read User B's subscription (entitlement IDOR)", async () => {
      if (skipIfNoEnv()) return;
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('subscriptions').doc('sub_b1').set({
          subscriptionId: 'sub_b1',
          userId: 'userB',
          planId: 'agency',
          status: 'active',
        });
      });
      const userA = testEnv!.authenticatedContext('userA');
      await expect(userA.firestore().collection('subscriptions').doc('sub_b1').get())['toDeny']();
    });

    test("Knowing a resource ID alone is not authorization: User A with a valid businessId of their OWN still cannot read Business B's brand kit by ID", async () => {
      if (skipIfNoEnv()) return;
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection('businesses').doc('biz_b').set({
          userId: 'userB',
          name: 'Business B',
          category: 'restaurant',
          status: 'active',
        });
        await db
          .collection('brand_kits')
          .doc('biz_b')
          .set({
            businessId: 'biz_b',
            brand: { tone: 'friendly' },
          });
      });
      const userA = testEnv!.authenticatedContext('userA', { businessIds: ['biz_a'] });
      await expect(userA.firestore().collection('brand_kits').doc('biz_b').get())['toDeny']();
    });
  });
});
