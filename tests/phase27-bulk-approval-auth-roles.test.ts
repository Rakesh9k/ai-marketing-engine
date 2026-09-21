/**
 * @jest-environment node
 *
 * See tests/security.test.ts for why this override is required.
 */
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { describe, beforeAll, afterAll, test, expect } from '@jest/globals';

describe('Phase 27 — Bulk Jobs, Approvals, Auth, Roles', function () {
  let testEnv: RulesTestEnvironment | null = null;

  beforeAll(async () => {
    const firestoreEmulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
    if (!firestoreEmulatorHost) {
      console.log('Skipping Phase 27 bulk/approval/auth/roles tests - emulator not available');
      return;
    }
    testEnv = await initializeTestEnvironment({
      // Phase 15: distinct per-file project namespace — see the identical
      // comment in tests/security.test.ts for why.
      projectId: 'demo-project-phase27-bulk',
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

  // ── Auth tests ────────────────────────────────────────────────────────

  describe('Authentication & Roles', () => {
    test('Regular user role is "user"', async () => {
      if (skipIfNoEnv()) return;
      // users/{uid} is only ever created server-side; seed it the same
      // way (bypassing rules) rather than reading a document that was
      // never written, which would make data()?.role undefined regardless
      // of authorization.
      await testEnv!.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('users')
          .doc('user1')
          .set({ userId: 'user1', email: 'user1@test.com', role: 'user', businessIds: [] });
      });
      const user = testEnv!.authenticatedContext('user1', { role: 'user' });
      const userDoc = user.firestore().collection('users').doc('user1');
      await expect(userDoc.get())['toSucceed']();
      const data = (await userDoc.get()).data() as any;
      expect(data?.role).toBe('user');
    });

    // Phase 11 audit finding: 'agency_admin' is not a role this project's
    // rules or backend code actually recognizes anywhere — only 'user',
    // 'agency_member', and 'admin' are referenced in firestore.rules and
    // functions/src/middleware/auth.ts. isAgencyMember() specifically
    // checks role == 'agency_member', not 'agency_admin'. This test
    // predates an agency-admin-vs-member distinction that was never
    // actually implemented; skipped (not deleted) so it isn't silently
    // forgotten if that role is built later, and so it doesn't read as an
    // unexplained security regression in the meantime.
    test.skip('Agency admin role can access agency features (not implemented: no "agency_admin" role exists in current rules/backend)', async () => {
      if (skipIfNoEnv()) return;
      const admin = testEnv!.authenticatedContext('admin1', {
        role: 'agency_admin',
        agencyId: 'agency_1',
      });
      // Admin should be able to read their agency
      const agency = admin.firestore().collection('agencies').doc('agency_1');
      await expect(agency.get())['toSucceed']();
    });

    test('Agency member role cannot access admin-only operations', async () => {
      if (skipIfNoEnv()) return;
      const member = testEnv!.authenticatedContext('member1', {
        role: 'agency_member',
        agencyId: 'agency_1',
      });
      // Member trying admin operation should be denied
      // (e.g., trying to create agency where only admin can)
      const agencyCreate = member.firestore().collection('agencies').doc('new_agency');
      // Agency creation is restricted; this tests the rules block non-admin
      await expect(agencyCreate.set({ name: 'Test' }))['toDeny']();
    });
  });

  // ── Bulk job tests ───────────────────────────────────────────────────
  // Phase 11 audit finding: no `bulk_jobs` collection exists anywhere in
  // firestore.rules, and no backend code (functions/src) references
  // "bulk_jobs" at all — this describes a not-yet-built feature. The two
  // "can create" tests below are skipped (their own assertions are also
  // inconsistent with each other — both expect toSucceed for what their
  // names describe as opposite outcomes); the "regular user cannot
  // create" test still passes today, correctly, simply because Firestore
  // denies writes to any collection with no matching `match` block at all
  // (default-deny) — not because bulk-job-specific authorization exists.

  describe('Bulk Job Authorization', () => {
    test.skip('Bulk job — agency admin can create (not implemented: no bulk_jobs collection/rules exist)', async () => {
      if (skipIfNoEnv()) return;
      const admin = testEnv!.authenticatedContext('admin1', {
        role: 'agency_admin',
        agencyId: 'agency_1',
      });
      const job = admin.firestore().collection('bulk_jobs').doc('job_admin');
      await expect(job.set({ status: 'queued', agencyId: 'agency_1' }))['toSucceed']();
    });

    test.skip('Bulk job — agency member cannot create without proper agencyId (not implemented: no bulk_jobs collection/rules exist)', async () => {
      if (skipIfNoEnv()) return;
      const member = testEnv!.authenticatedContext('member1', {
        role: 'agency_member',
        agencyId: 'agency_1',
      });
      // Member can create bulk jobs within their agency
      const job = member.firestore().collection('bulk_jobs').doc('job_member');
      await expect(job.set({ status: 'queued', agencyId: 'agency_1' }))['toSucceed']();
    });

    test('Bulk job — regular user cannot create bulk jobs', async () => {
      if (skipIfNoEnv()) return;
      const user = testEnv!.authenticatedContext('user1', { role: 'user' });
      const job = user.firestore().collection('bulk_jobs').doc('job_user');
      await expect(job.set({ status: 'queued' }))['toDeny']();
    });
  });

  // ── Approval workflow tests ──────────────────────────────────────────

  describe('Approval Workflow', () => {
    // Phase 11 audit finding: campaigns' current update rule only ever
    // grants write access to the campaign's own resource.data.userId
    // (functions/src/functions/campaigns/... never delegates campaign
    // status updates to an agency admin/member) — there is no
    // agency-based UPDATE path for campaigns today, only READ. An agency
    // "approval" capability, if it's added later, needs its own explicit
    // rule; skipped rather than asserting behavior the product doesn't
    // implement.
    test.skip('Campaign — agency admin can approve (not implemented: campaigns have no agency-based update rule)', async () => {
      if (skipIfNoEnv()) return;
      const admin = testEnv!.authenticatedContext('admin1', {
        role: 'agency_admin',
        agencyId: 'agency_1',
      });
      const campaign = admin.firestore().collection('campaigns').doc('camp1');
      // Admins can update campaign status within allowed bounds;
      // the actual Truth Check gate is server-side, but rules should allow
      // agency admin to set status to pending/approved
      await expect(campaign.update({ status: 'pending' }))['toSucceed']();
    });

    test('Campaign — regular user cannot set approved status', async () => {
      if (skipIfNoEnv()) return;
      const user = testEnv!.authenticatedContext('user1', { role: 'user' });
      const campaign = user.firestore().collection('campaigns').doc('camp1');
      // Users can update their own campaigns but NOT Truth Check fields;
      // setting status to 'approved' should be denied or restricted
      await expect(campaign.update({ status: 'approved' }))['toDeny']();
    });

    test.skip('Campaign — version-aware: regeneration resets approval (not implemented: same agency-update-rule gap as above)', async () => {
      if (skipIfNoEnv()) return;
      // This tests the conceptual behavior; the actual version-aware
      // approval reset is implemented in generateCampaignStrategy.ts
      // Firestore rules test that setting a new version-related status
      // is handled correctly
      const admin = testEnv!.authenticatedContext('admin1', {
        role: 'agency_admin',
        agencyId: 'agency_1',
      });
      const campaign = admin.firestore().collection('campaigns').doc('camp1');
      // Setting status to 'regenerate' concept is handled in code;
      // rules should allow the status transition
      await expect(campaign.update({ status: 'generating_copy' }))['toSucceed']();
    });
  });

  // ── Cross-tenant isolation tests ─────────────────────────────────────

  describe('Cross-Tenant Isolation', () => {
    test('Agency A cannot access Agency B agencies collection', async () => {
      if (skipIfNoEnv()) return;
      const agencyA = testEnv!.authenticatedContext('agencyA', {
        role: 'agency_member',
        agencyId: 'agency_A',
      });
      const agencyB = agencyA.firestore().collection('agencies').doc('agency_B');
      await expect(agencyB.get())['toDeny']();
    });

    test('Agency A cannot access Agency B clients', async () => {
      if (skipIfNoEnv()) return;
      const agencyA = testEnv!.authenticatedContext('agencyA', {
        role: 'agency_member',
        agencyId: 'agency_A',
      });
      const clientB = agencyA.firestore().collection('clients').doc('client_B');
      await expect(clientB.get())['toDeny']();
    });

    test('Agency A cannot access Agency B businesses', async () => {
      if (skipIfNoEnv()) return;
      const agencyA = testEnv!.authenticatedContext('agencyA', {
        role: 'agency_member',
        agencyId: 'agency_A',
      });
      const bizB = agencyA.firestore().collection('businesses').doc('biz_B');
      await expect(bizB.get())['toDeny']();
    });

    test('Agency A cannot access Agency B campaigns', async () => {
      if (skipIfNoEnv()) return;
      const agencyA = testEnv!.authenticatedContext('agencyA', {
        role: 'agency_member',
        agencyId: 'agency_A',
      });
      const campB = agencyA.firestore().collection('campaigns').doc('camp_B');
      await expect(campB.get())['toDeny']();
    });

    test('Agency A cannot access Agency B assets/campaign-assets', async () => {
      if (skipIfNoEnv()) return;
      const agencyA = testEnv!.authenticatedContext('agencyA', {
        role: 'agency_member',
        agencyId: 'agency_A',
      });
      const assetB = agencyA.firestore().collection('campaign_assets').doc('asset_B');
      await expect(assetB.get())['toDeny']();
    });
  });
});
