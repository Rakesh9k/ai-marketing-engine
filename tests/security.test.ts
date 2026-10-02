/**
 * @jest-environment node
 *
 * The jsdom environment (this project's default) does not work reliably
 * with @firebase/rules-unit-testing's WebChannel-based Firestore client —
 * operations hang until the test times out rather than actually reaching
 * the emulator (confirmed: every test here, including previously-untouched
 * ones, timed out under jsdom, then ran and completed in well under a
 * second each under 'node').
 *
 * Phase 37 QA Remediation (D-3): this file previously guarded every test
 * body with `if (skipIfNoEnv()) return;` inside a `beforeAll` that itself
 * only logged and returned when FIRESTORE_EMULATOR_HOST was unset. Jest
 * counts a test whose callback returns without throwing as PASSED, so a
 * run with no emulator reported all these security-rules tests as green —
 * identical in effect to not running them, but indistinguishable from a
 * real pass in the summary. Switched to the `describeIfEmulator` pattern
 * already used throughout functions/src/**\/*.test.ts, so a missing
 * emulator now shows up as SKIPPED in the Jest summary, never PASSED.
 */
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { describe, beforeAll, afterAll, afterEach, test, expect } from '@jest/globals';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

describeIfEmulator('Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment | null = null;

  beforeAll(async () => {
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

  test('User can read own user document', async () => {
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
    const user = testEnv!.authenticatedContext('user1');
    const userDoc = user.firestore().collection('users').doc('user1');
    await expect(userDoc.set({ userId: 'user1', email: 'test@test.com' }))['toDeny']();
  });

  test('Phase 11 CRITICAL: User cannot self-escalate role/agencyId/businessIds by writing their own user document', async () => {
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
    const user = testEnv!.authenticatedContext('user1');
    const userDoc = user.firestore().collection('users').doc('user2');
    await expect(userDoc.get())['toDeny']();
  });

  // businesses/{id} is read-only for clients (A2 in the fix plan):
  // create/update go exclusively through createBusiness/updateBusiness/
  // updateBusinessBrain (Admin SDK, bypasses these rules), which is the
  // only thing that keeps businessBrain.identity, custom claims, and
  // vertical consistency correct. The old unrestricted "owner can update"
  // rule let a client write userId/agencyId/businessBrain directly,
  // bypassing every one of those callables' validation. Fixture data below
  // is seeded with rules disabled, matching the same pattern already used
  // for users/{uid} above.
  test('Client cannot create a business document directly (server-only)', async () => {
    const user = testEnv!.authenticatedContext('user1');
    const business = user.firestore().collection('businesses').doc('biz1');
    await expect(
      business.set({
        userId: 'user1',
        name: 'Test Restaurant',
        category: 'restaurant',
        status: 'active',
      })
    )['toDeny']();
  });

  test('User cannot read business they do not own', async () => {
    await testEnv!.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('businesses').doc('biz1').set({
        userId: 'owner1',
        name: 'Owner Restaurant',
        category: 'restaurant',
        status: 'active',
      });
    });

    const otherUser = testEnv!.authenticatedContext('user2');
    await expect(otherUser.firestore().collection('businesses').doc('biz1').get())['toDeny']();
  });

  test('User can read own business', async () => {
    await testEnv!.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('businesses').doc('biz1').set({
        userId: 'user1',
        name: 'Test Restaurant',
        category: 'restaurant',
        status: 'active',
      });
    });
    const user = testEnv!.authenticatedContext('user1');
    await expect(user.firestore().collection('businesses').doc('biz1').get())['toSucceed']();
  });

  test('Client cannot update a business document directly, even their own (server-only)', async () => {
    await testEnv!.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('businesses').doc('biz1').set({
        userId: 'user1',
        name: 'Test Restaurant',
        category: 'restaurant',
        status: 'active',
      });
    });
    const user = testEnv!.authenticatedContext('user1');
    await expect(
      user.firestore().collection('businesses').doc('biz1').update({ name: 'Updated Name' })
    )['toDeny']();
  });

  test('User cannot delete business (soft delete only)', async () => {
    await testEnv!.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('businesses').doc('biz1').set({
        userId: 'user1',
        name: 'Test Restaurant',
        category: 'restaurant',
        status: 'active',
      });
    });
    const user = testEnv!.authenticatedContext('user1');
    await expect(user.firestore().collection('businesses').doc('biz1').delete())['toDeny']();
  });

  test('Agency member can access managed business', async () => {
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
      const user = testEnv!.authenticatedContext('user1', { businessIds: ['biz1'] });
      const reel = user.firestore().collection('reels').doc('reel3');
      await expect(
        reel.set({ reelId: 'reel3', businessId: 'biz1', userId: 'user1', status: 'draft' })
      )['toDeny']();
    });

    test('Owner cannot forge their own reel to "completed" or fabricate an outputUrl via Firestore write', async () => {
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

  // Phase 3: agencies/clients are unimplemented scaffolding (no code
  // anywhere creates/reads/updates them) but previously had broad,
  // exploitable rules sitting live regardless.
  describe('Agencies and clients (unused scaffolding) cannot be mass-assigned', () => {
    test('Agency owner cannot update their own agency document via Firestore (would previously allow hijacking ownerUserId or reassigning members)', async () => {
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('agencies')
          .doc('agency1')
          .set({
            agencyId: 'agency1',
            name: 'Test Agency',
            ownerUserId: 'owner1',
            vertical: 'restaurant',
            members: ['owner1'],
          });
      });
      const owner = testEnv!.authenticatedContext('owner1');
      const agency = owner.firestore().collection('agencies').doc('agency1');
      await expect(agency.update({ ownerUserId: 'attacker' }))['toDeny']();
      await expect(agency.update({ members: ['owner1', 'attacker'] }))['toDeny']();
    });

    test('Agency owner cannot delete their own agency document via Firestore', async () => {
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('agencies')
          .doc('agency2')
          .set({
            agencyId: 'agency2',
            name: 'Test Agency 2',
            ownerUserId: 'owner1',
            vertical: 'restaurant',
            members: ['owner1'],
          });
      });
      const owner = testEnv!.authenticatedContext('owner1');
      await expect(owner.firestore().collection('agencies').doc('agency2').delete())['toDeny']();
    });

    test('Owner can still read their own agency document', async () => {
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('agencies')
          .doc('agency3')
          .set({
            agencyId: 'agency3',
            name: 'Test Agency 3',
            ownerUserId: 'owner1',
            vertical: 'restaurant',
            members: ['owner1'],
          });
      });
      const owner = testEnv!.authenticatedContext('owner1');
      await expect(owner.firestore().collection('agencies').doc('agency3').get())['toSucceed']();
    });

    test('User cannot create a client document directly (the old rule was trivially satisfiable by setting agencyId to one of their own businessIds)', async () => {
      const user = testEnv!.authenticatedContext('user1', { businessIds: ['biz_own'] });
      await expect(
        user
          .firestore()
          .collection('clients')
          .doc('client1')
          .set({
            clientId: 'client1',
            name: 'Forged Client',
            agencyId: 'biz_own',
            businessIds: ['biz_own'],
            userId: 'user1',
          })
      )['toDeny']();
    });

    test('Client-document owner cannot update it via Firestore (previously unrestricted field mass-assignment)', async () => {
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('clients')
          .doc('client2')
          .set({
            clientId: 'client2',
            name: 'Test Client',
            agencyId: 'agency1',
            businessIds: ['biz1'],
            userId: 'user1',
          });
      });
      const user = testEnv!.authenticatedContext('user1');
      await expect(
        user
          .firestore()
          .collection('clients')
          .doc('client2')
          .update({ businessIds: ['biz1', 'biz_victim'] })
      )['toDeny']();
    });
  });

  // Phase 3: assets/{assetId} allowed an owner to update ANY field
  // (including businessId) with no invariant check — the same class of bug
  // already fixed for products/{productId} and campaigns/{campaignId}.
  describe('Assets cannot be re-pointed to another tenant via update', () => {
    test('Owner cannot change businessId on their own asset via Firestore update', async () => {
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('assets').doc('asset1').set({
          assetId: 'asset1',
          userId: 'user1',
          businessId: 'biz_own',
          type: 'photo',
          storagePath: 'assets/user1/asset1.jpg',
        });
      });
      const user = testEnv!.authenticatedContext('user1', { businessIds: ['biz_own'] });
      const asset = user.firestore().collection('assets').doc('asset1');
      await expect(asset.update({ businessId: 'biz_victim' }))['toDeny']();
    });

    test('Owner CAN still update ordinary editable asset fields (businessId untouched)', async () => {
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('assets').doc('asset2').set({
          assetId: 'asset2',
          userId: 'user1',
          businessId: 'biz_own',
          type: 'photo',
          storagePath: 'assets/user1/asset2.jpg',
          status: 'active',
        });
      });
      const user = testEnv!.authenticatedContext('user1', { businessIds: ['biz_own'] });
      const asset = user.firestore().collection('assets').doc('asset2');
      await expect(asset.update({ status: 'archived' }))['toSucceed']();
    });
  });

  // Phase 3: collections with no matching rule block are denied by default,
  // but these blocks now say so explicitly (see comment in firestore.rules).
  // These tests confirm the explicit denial actually behaves the same as
  // the implicit default it replaced, for every server-internal collection.
  describe('Server-internal collections are fully inaccessible to any client', () => {
    test('creative_feedback is not readable or writable by any authenticated user', async () => {
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('creative_feedback').doc('fb1').set({
          feedbackId: 'fb1',
          userId: 'user1',
          businessId: 'biz1',
          sentiment: 'positive',
        });
      });
      const db = testEnv!.authenticatedContext('user1').firestore();
      await expect(db.collection('creative_feedback').doc('fb1').get())['toDeny']();
      await expect(db.collection('creative_feedback').doc('fb2').set({ userId: 'user1' }))[
        'toDeny'
      ]();
    });

    test('creative_preferences is not readable or writable by any authenticated user', async () => {
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('creative_preferences').doc('pref1').set({
          userId: 'user1',
          businessId: 'biz1',
        });
      });
      const user = testEnv!.authenticatedContext('user1');
      await expect(user.firestore().collection('creative_preferences').doc('pref1').get())[
        'toDeny'
      ]();
    });

    test('idempotency_keys, rate_limits, and processed_webhook_events are not readable or writable by any authenticated user', async () => {
      const db = testEnv!.authenticatedContext('user1').firestore();
      await expect(db.collection('idempotency_keys').doc('k1').set({ key: 'k1' }))['toDeny']();
      await expect(db.collection('rate_limits').doc('r1').set({ userId: 'user1' }))['toDeny']();
      await expect(db.collection('processed_webhook_events').doc('e1').set({ eventId: 'e1' }))[
        'toDeny'
      ]();
    });
  });

  // Phase 15 Campaign Persistence audit — regression test for a real,
  // verified-broken production bug: src/services/database.ts's
  // campaignService.getByIdempotencyKey() previously queried
  // `metadata.idempotencyKey` alone, with no `userId` filter. Firestore
  // evaluates security rules against a query's POTENTIAL result set, not
  // just its actual results — since campaigns/{id}'s read rule requires
  // `resource.data.userId == request.auth.uid`, a query with no `userId`
  // clause can never be proven safe for every possible match, so Firestore
  // denies the ENTIRE query rather than silently filtering. This is
  // confirmed here directly against the real rules, not inferred from
  // reading the rules file.
  describe('Idempotency-key campaign lookup query must be scoped by userId (Phase 15)', () => {
    test('a campaigns query filtered by metadata.idempotencyKey WITHOUT a userId clause is denied outright', async () => {
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('campaigns')
          .doc('campA')
          .set({
            campaignId: 'campA',
            userId: 'user1',
            businessId: 'biz1',
            status: 'generated',
            metadata: { idempotencyKey: 'idem-key-1' },
          });
      });
      const db = testEnv!.authenticatedContext('user1', { businessIds: ['biz1'] }).firestore();
      const unscopedQuery = db
        .collection('campaigns')
        .where('metadata.idempotencyKey', '==', 'idem-key-1')
        .limit(1);
      await expect(unscopedQuery.get())['toDeny']();
    });

    test('the SAME query, scoped by userId (the actual fix), succeeds and returns the campaign', async () => {
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('campaigns')
          .doc('campB')
          .set({
            campaignId: 'campB',
            userId: 'user1',
            businessId: 'biz1',
            status: 'generated',
            metadata: { idempotencyKey: 'idem-key-2' },
          });
      });
      const db = testEnv!.authenticatedContext('user1', { businessIds: ['biz1'] }).firestore();
      const scopedQuery = db
        .collection('campaigns')
        .where('userId', '==', 'user1')
        .where('metadata.idempotencyKey', '==', 'idem-key-2')
        .limit(1);
      const snap = await scopedQuery.get();
      expect(snap.empty).toBe(false);
      expect(snap.docs[0]!.id).toBe('campB');
    });

    test("the scoped query correctly returns nothing for a DIFFERENT user's idempotency key (no cross-tenant leak)", async () => {
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('campaigns')
          .doc('campC')
          .set({
            campaignId: 'campC',
            userId: 'userB',
            businessId: 'biz_b',
            status: 'generated',
            metadata: { idempotencyKey: 'idem-key-shared-guess' },
          });
      });
      const userA = testEnv!.authenticatedContext('userA', { businessIds: ['biz_a'] }).firestore();
      const q = userA
        .collection('campaigns')
        .where('userId', '==', 'userA')
        .where('metadata.idempotencyKey', '==', 'idem-key-shared-guess')
        .limit(1);
      const snap = await q.get();
      expect(snap.empty).toBe(true);
    });
  });

  describe('Meta Social Connections & Server-Only Collections Security', () => {
    test('user can read their own socialConnections subcollection, but user B cannot read user A socialConnections', async () => {
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('users')
          .doc('userA')
          .collection('socialConnections')
          .doc('meta_p1')
          .set({
            connectionId: 'meta_p1',
            userId: 'userA',
            provider: 'meta',
            status: 'active',
          });
      });

      const userADb = testEnv!.authenticatedContext('userA').firestore();
      const userBDb = testEnv!.authenticatedContext('userB').firestore();

      const userASnap = await userADb
        .collection('users')
        .doc('userA')
        .collection('socialConnections')
        .doc('meta_p1')
        .get();
      expect(userASnap.exists).toBe(true);

      const userBSnap = userBDb
        .collection('users')
        .doc('userA')
        .collection('socialConnections')
        .doc('meta_p1')
        .get();
      await expect(userBSnap).rejects.toThrow();
    });

    test('clients cannot write directly to socialConnections subcollection (forced server-only callables)', async () => {
      const userADb = testEnv!.authenticatedContext('userA').firestore();
      const writeAttempt = userADb
        .collection('users')
        .doc('userA')
        .collection('socialConnections')
        .doc('meta_p2')
        .set({
          connectionId: 'meta_p2',
          userId: 'userA',
          provider: 'meta',
          status: 'active',
        });

      await expect(writeAttempt).rejects.toThrow();
    });

    test('clients cannot read or write metaCredentials, metaOAuthStates, or pendingMetaSessions (server-only collections)', async () => {
      const userADb = testEnv!.authenticatedContext('userA').firestore();

      await expect(userADb.collection('metaCredentials').doc('meta_p1').get()).rejects.toThrow();
      await expect(
        userADb.collection('metaCredentials').doc('meta_p1').set({ secret: 'hacked' })
      ).rejects.toThrow();

      await expect(userADb.collection('metaOAuthStates').doc('s1').get()).rejects.toThrow();
      await expect(
        userADb.collection('metaOAuthStates').doc('s1').set({ secret: 'hacked' })
      ).rejects.toThrow();

      await expect(userADb.collection('pendingMetaSessions').doc('s1').get()).rejects.toThrow();
      await expect(
        userADb.collection('pendingMetaSessions').doc('s1').set({ secret: 'hacked' })
      ).rejects.toThrow();
    });

    test('publishJobs allows owner read access, denies other users, and denies client write access', async () => {
      await testEnv!.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        await adminDb.collection('publishJobs').doc('job_userA').set({
          jobId: 'job_userA',
          userId: 'userA',
          businessId: 'bizA',
          campaignId: 'campA',
          status: 'scheduled',
        });
      });

      const userADb = testEnv!.authenticatedContext('userA').firestore();
      const userBDb = testEnv!.authenticatedContext('userB').firestore();

      // Owner can read
      const ownerRead = await userADb.collection('publishJobs').doc('job_userA').get();
      expect(ownerRead.exists).toBe(true);

      // Other user cannot read owner's job
      await expect(userBDb.collection('publishJobs').doc('job_userA').get()).rejects.toThrow();

      // Client write (create, update, delete) is disallowed
      await expect(
        userADb.collection('publishJobs').doc('job_userA_2').set({
          jobId: 'job_userA_2',
          userId: 'userA',
          status: 'published',
        })
      ).rejects.toThrow();

      await expect(
        userADb.collection('publishJobs').doc('job_userA').update({
          status: 'published',
        })
      ).rejects.toThrow();
    });

    test('scheduledPosts allows owner read access, denies other users, and denies client write access', async () => {
      await testEnv!.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        await adminDb.collection('scheduledPosts').doc('sch_userA').set({
          scheduledPostId: 'sch_userA',
          userId: 'userA',
          businessId: 'bizA',
          campaignId: 'campA',
          status: 'scheduled',
        });
      });

      const userADb = testEnv!.authenticatedContext('userA').firestore();
      const userBDb = testEnv!.authenticatedContext('userB').firestore();

      // Owner can read
      const ownerRead = await userADb.collection('scheduledPosts').doc('sch_userA').get();
      expect(ownerRead.exists).toBe(true);

      // Other user cannot read owner's scheduled post
      await expect(userBDb.collection('scheduledPosts').doc('sch_userA').get()).rejects.toThrow();

      // Client write (create, update, delete) is disallowed
      await expect(
        userADb.collection('scheduledPosts').doc('sch_userA_2').set({
          scheduledPostId: 'sch_userA_2',
          userId: 'userA',
          status: 'scheduled',
        })
      ).rejects.toThrow();

      await expect(
        userADb.collection('scheduledPosts').doc('sch_userA').update({
          status: 'published',
        })
      ).rejects.toThrow();
    });
  });
});
