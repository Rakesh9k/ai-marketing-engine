/**
 * @jest-environment node
 *
 * Firestore rules coverage for collections that had no rules test (whatsapp_leads, marketingPlans,
 * marketingCalendarItems, partners, partner_referrals) plus targeted privilege-escalation and
 * re-pointing attacks (users.subscriptionId, campaigns/assets businessId and userId).
 *
 * Runs against the real Firestore emulator and the CURRENT firestore.rules; skipped (never silently
 * "passed") when no emulator is running. Every denial is paired with a positive control so a broken
 * fixture cannot masquerade as a passing security test.
 */
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { describe, beforeAll, beforeEach, afterAll, test } from '@jest/globals';

const describeIfEmulator = process.env['FIRESTORE_EMULATOR_HOST'] ? describe : describe.skip;

describeIfEmulator('Firestore rules coverage gaps and re-pointing attacks', () => {
  let env: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, port] = (process.env['FIRESTORE_EMULATOR_HOST'] as string).split(':');
    env = await initializeTestEnvironment({
      projectId: 'demo-project-rules-coverage',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
        host: host || 'localhost',
        port: Number(port) || 8080,
      },
    });
  });

  afterAll(async () => {
    await env.cleanup();
  });

  beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await db.collection('businesses').doc('biz_A').set({ userId: 'userA', name: 'A' });
      await db.collection('businesses').doc('biz_B').set({ userId: 'userB', name: 'B' });
      await db.collection('whatsapp_leads').doc('leadA').set({ businessId: 'biz_A', phone: 'x' });
      await db.collection('whatsapp_leads').doc('leadB').set({ businessId: 'biz_B', phone: 'y' });
      await db.collection('marketingPlans').doc('planA').set({ userId: 'userA', businessId: 'biz_A' });
      await db.collection('marketingPlans').doc('planB').set({ userId: 'userB', businessId: 'biz_B' });
      await db.collection('marketingCalendarItems').doc('itemA').set({ userId: 'userA', day: 1 });
      await db.collection('marketingCalendarItems').doc('itemB').set({ userId: 'userB', day: 1 });
      await db.collection('partners').doc('partA').set({ userId: 'userA', tier: 'gold' });
      await db.collection('partners').doc('partB').set({ userId: 'userB', tier: 'gold' });
      await db.collection('partner_referrals').doc('refA').set({ partnerId: 'userA', amount: 10 });
      await db.collection('partner_referrals').doc('refB').set({ partnerId: 'userB', amount: 10 });
      await db
        .collection('users')
        .doc('userA')
        .set({
          userId: 'userA',
          role: 'user',
          businessIds: ['biz_A'],
          agencyId: null,
          subscriptionId: 'sub_A',
          displayName: 'A',
        });
      await db
        .collection('campaigns')
        .doc('cA')
        .set({
          userId: 'userA',
          businessId: 'biz_A',
          status: 'draft',
          creditsReserved: 100,
          title: 'old',
        });
      await db
        .collection('assets')
        .doc('aA')
        .set({ userId: 'userA', businessId: 'biz_A', name: 'logo' });
    });
  });

  const userA = () => env.authenticatedContext('userA', { role: 'user', businessIds: ['biz_A'] });
  const userB = () => env.authenticatedContext('userB', { role: 'user', businessIds: ['biz_B'] });
  const anon = () => env.unauthenticatedContext();

  describe.each([
    ['marketingPlans', 'planA', 'planB'],
    ['marketingCalendarItems', 'itemA', 'itemB'],
  ])('%s', (collection, ownDoc, otherDoc) => {
    test('owner can read own doc (positive control)', async () => {
      await assertSucceeds(userA().firestore().collection(collection).doc(ownDoc).get());
    });
    test('another tenant and anonymous cannot read it', async () => {
      await assertFails(userA().firestore().collection(collection).doc(otherDoc).get());
      await assertFails(anon().firestore().collection(collection).doc(ownDoc).get());
    });
    test('nobody — not even the owner — can create, update or delete from the client', async () => {
      const col = userA().firestore().collection(collection);
      await assertFails(col.doc('new').set({ userId: 'userA' }));
      await assertFails(col.doc(ownDoc).update({ userId: 'userA', x: 1 }));
      await assertFails(col.doc(ownDoc).delete());
    });
    test('an unfiltered listing cannot enumerate other tenants', async () => {
      await assertFails(userA().firestore().collection(collection).get());
    });
  });

  describe('whatsapp_leads', () => {
    test('the business owner can read their lead (positive control)', async () => {
      await assertSucceeds(userA().firestore().collection('whatsapp_leads').doc('leadA').get());
    });
    test('another tenant and anonymous cannot read a lead (contains phone numbers)', async () => {
      await assertFails(userB().firestore().collection('whatsapp_leads').doc('leadA').get());
      await assertFails(anon().firestore().collection('whatsapp_leads').doc('leadA').get());
    });
    test('clients cannot write leads, even for their own business', async () => {
      const col = userA().firestore().collection('whatsapp_leads');
      await assertFails(col.doc('forged').set({ businessId: 'biz_A', phone: 'z' }));
      await assertFails(col.doc('leadA').update({ phone: 'changed' }));
      await assertFails(col.doc('leadA').delete());
    });
  });

  describe('partners and partner_referrals', () => {
    test('a partner can read their own partner and referral docs (positive control)', async () => {
      await assertSucceeds(userA().firestore().collection('partners').doc('partA').get());
      await assertSucceeds(userA().firestore().collection('partner_referrals').doc('refA').get());
    });
    test('other users and anonymous cannot read them', async () => {
      await assertFails(userA().firestore().collection('partners').doc('partB').get());
      await assertFails(userA().firestore().collection('partner_referrals').doc('refB').get());
      await assertFails(anon().firestore().collection('partners').doc('partA').get());
    });
    test('clients cannot grant themselves a tier or inflate referral amounts', async () => {
      await assertFails(userA().firestore().collection('partners').doc('partA').update({ tier: 'platinum' }));
      await assertFails(userA().firestore().collection('partners').doc('new').set({ userId: 'userA' }));
      await assertFails(userA().firestore().collection('partner_referrals').doc('refA').update({ amount: 1e6 }));
      await assertFails(userA().firestore().collection('partner_referrals').doc('refA').delete());
    });
  });

  describe('users.subscriptionId cannot be forged', () => {
    test('a benign self-update still works (positive control)', async () => {
      await assertSucceeds(
        userA().firestore().collection('users').doc('userA').update({ displayName: 'Renamed' })
      );
    });
    test('pointing at someone else\'s or an invented subscription is denied', async () => {
      const ref = userA().firestore().collection('users').doc('userA');
      await assertFails(ref.update({ subscriptionId: 'sub_B_premium' }));
      await assertFails(ref.update({ subscriptionId: null }));
    });
    test('a user with no subscription pointer cannot add one', async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await ctx
          .firestore()
          .collection('users')
          .doc('userA')
          .set({ userId: 'userA', role: 'user', businessIds: ['biz_A'], agencyId: null });
      });
      await assertFails(
        userA().firestore().collection('users').doc('userA').update({ subscriptionId: 'sub_stolen' })
      );
    });
    test('role, businessIds and agencyId escalation remains denied', async () => {
      const ref = userA().firestore().collection('users').doc('userA');
      await assertFails(ref.update({ role: 'admin' }));
      await assertFails(ref.update({ businessIds: ['biz_A', 'biz_B'] }));
      await assertFails(ref.update({ agencyId: 'agency_victim' }));
    });
    test('another user cannot write to this user doc, and cannot read it', async () => {
      await assertFails(userB().firestore().collection('users').doc('userA').update({ displayName: 'x' }));
      await assertFails(userB().firestore().collection('users').doc('userA').get());
    });
  });

  describe('re-pointing a resource into another tenant', () => {
    test('owner can edit a non-protected campaign field (positive control)', async () => {
      await assertSucceeds(userA().firestore().collection('campaigns').doc('cA').update({ title: 'new' }));
    });
    test('campaign cannot be re-pointed to another business or user', async () => {
      const ref = userA().firestore().collection('campaigns').doc('cA');
      await assertFails(ref.update({ businessId: 'biz_B' }));
      await assertFails(ref.update({ userId: 'userB' }));
    });
    test('campaign credit and status fields are server-only', async () => {
      const ref = userA().firestore().collection('campaigns').doc('cA');
      await assertFails(ref.update({ creditsReserved: 0 }));
      await assertFails(ref.update({ status: 'verified' }));
    });
    test('another tenant cannot touch the campaign', async () => {
      await assertFails(userB().firestore().collection('campaigns').doc('cA').update({ title: 'pwned' }));
      await assertFails(userB().firestore().collection('campaigns').doc('cA').get());
    });
    test('clients cannot create a campaign (cannot forge a verified one)', async () => {
      await assertFails(
        userA()
          .firestore()
          .collection('campaigns')
          .doc('forged')
          .set({ userId: 'userA', businessId: 'biz_A', status: 'verified', creditsReserved: 0 })
      );
    });
    test('asset can be edited in place but not re-pointed to another business or user', async () => {
      const ref = userA().firestore().collection('assets').doc('aA');
      await assertSucceeds(ref.update({ name: 'renamed' }));
      await assertFails(ref.update({ businessId: 'biz_B' }));
      await assertFails(ref.update({ userId: 'userB' }));
    });
  });
});
