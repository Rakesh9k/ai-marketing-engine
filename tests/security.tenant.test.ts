/**
 * @jest-environment node
 *
 * Tenant-isolation matrix for the launch-scope collections, run against the real Firestore
 * emulator (skipped, never silently "passed", when no emulator is running).
 *
 * Ownership model (from firestore.rules): businesses/{id}.userId owns the business; products,
 * campaigns and assets hang off businessId; request.auth.token.businessIds is the server-minted
 * claim list. Client SDK writes to products are allowed only inside the caller's own business.
 */
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { describe, beforeAll, beforeEach, afterAll, test, expect } from '@jest/globals';

const describeIfEmulator = process.env['FIRESTORE_EMULATOR_HOST'] ? describe : describe.skip;

describeIfEmulator(
  'Tenant isolation (products, businesses, campaigns, credits, admin data)',
  () => {
    let env: RulesTestEnvironment;

    beforeAll(async () => {
      env = await initializeTestEnvironment({
        projectId: 'demo-project-tenant-isolation',
        firestore: {
          rules: readFileSync('firestore.rules', 'utf8'),
          host: 'localhost',
          port: 8080,
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
        await db.collection('products').doc('pA').set({ businessId: 'biz_A', name: 'Product A' });
        await db.collection('products').doc('pB').set({ businessId: 'biz_B', name: 'Product B' });
        await db
          .collection('campaigns')
          .doc('cA')
          .set({ userId: 'userA', businessId: 'biz_A', status: 'verified', creditsReserved: 1 });
        await db
          .collection('campaigns')
          .doc('cB')
          .set({ userId: 'userB', businessId: 'biz_B', status: 'verified', creditsReserved: 1 });
        await db.collection('usage').doc('uA').set({ userId: 'userA', creditsUsed: 1 });
        await db.collection('usage').doc('uB').set({ userId: 'userB', creditsUsed: 1 });
        await db.collection('subscriptions').doc('sB').set({ userId: 'userB', plan: 'free' });
        await db
          .collection('users')
          .doc('userA')
          .set({
            userId: 'userA',
            role: 'user',
            businessIds: ['biz_A'],
            agencyId: null,
          });
        await db.collection('processed_webhook_events').doc('e1').set({ x: 1 });
      });
    });

    const userA = () => env.authenticatedContext('userA', { role: 'user', businessIds: ['biz_A'] });
    const userB = () => env.authenticatedContext('userB', { role: 'user', businessIds: ['biz_B'] });
    const anon = () => env.unauthenticatedContext();

    describe('products', () => {
      test('anonymous: read, list, create, update, delete all denied', async () => {
        const col = anon().firestore().collection('products');
        await expect(col.doc('pA').get())['toDeny']();
        await expect(col.where('businessId', '==', 'biz_A').get())['toDeny']();
        await expect(col.doc('new').set({ businessId: 'biz_A' }))['toDeny']();
        await expect(col.doc('pA').update({ name: 'x' }))['toDeny']();
        await expect(col.doc('pA').delete())['toDeny']();
      });

      test('owner: read / query / create / update / delete own product allowed', async () => {
        const col = userA().firestore().collection('products');
        await expect(col.doc('pA').get())['toSucceed']();
        await expect(col.where('businessId', '==', 'biz_A').get())['toSucceed']();
        await expect(col.doc('pA2').set({ businessId: 'biz_A', name: 'New' }))['toSucceed']();
        await expect(col.doc('pA').update({ name: 'Renamed' }))['toSucceed']();
        await expect(col.doc('pA').delete())['toSucceed']();
      });

      test('IDOR: userA cannot read, query, update or delete userB products', async () => {
        const col = userA().firestore().collection('products');
        await expect(col.doc('pB').get())['toDeny']();
        await expect(col.where('businessId', '==', 'biz_B').get())['toDeny']();
        await expect(col.doc('pB').update({ name: 'pwned' }))['toDeny']();
        await expect(col.doc('pB').delete())['toDeny']();
      });

      test('an unfiltered collection listing is denied (cannot enumerate other tenants)', async () => {
        await expect(userA().firestore().collection('products').get())['toDeny']();
      });

      test('ownership spoof: cannot create a product inside another business', async () => {
        const col = userA().firestore().collection('products');
        await expect(col.doc('evil').set({ businessId: 'biz_B', name: 'x' }))['toDeny']();
      });

      test('ownership spoof: cannot re-point an owned product into another tenant', async () => {
        const col = userA().firestore().collection('products');
        await expect(col.doc('pA').update({ businessId: 'biz_B' }))['toDeny']();
      });

      test('cannot overwrite another tenant product by reusing its document id', async () => {
        const col = userA().firestore().collection('products');
        await expect(col.doc('pB').set({ businessId: 'biz_A', name: 'hijack' }))['toDeny']();
      });

      test('a client with no businessIds claim cannot create products', async () => {
        const noClaim = env.authenticatedContext('userA', { role: 'user' });
        await expect(
          noClaim.firestore().collection('products').doc('x').set({ businessId: 'biz_A' })
        )['toDeny']();
      });
    });

    describe('businesses and Business Brain', () => {
      test('owner can read own business; cannot read another; no client writes at all', async () => {
        const col = userA().firestore().collection('businesses');
        await expect(col.doc('biz_A').get())['toSucceed']();
        await expect(col.doc('biz_B').get())['toDeny']();
        await expect(col.doc('biz_A').update({ businessBrain: { tone: 'x' } }))['toDeny']();
        await expect(col.doc('biz_A').update({ userId: 'userB' }))['toDeny']();
        await expect(col.doc('biz_B').update({ name: 'x' }))['toDeny']();
        await expect(col.doc('biz_A').delete())['toDeny']();
      });

      test('anonymous cannot read any business', async () => {
        await expect(anon().firestore().collection('businesses').doc('biz_A').get())['toDeny']();
      });
    });

    describe('campaigns', () => {
      test('owner reads own, cannot read another tenant campaign', async () => {
        const col = userA().firestore().collection('campaigns');
        await expect(col.doc('cA').get())['toSucceed']();
        await expect(col.doc('cB').get())['toDeny']();
        await expect(col.where('businessId', '==', 'biz_B').get())['toDeny']();
      });

      test('nobody can delete a campaign from the client', async () => {
        await expect(userA().firestore().collection('campaigns').doc('cA').delete())['toDeny']();
      });

      test('a client cannot forge a Truth-Check-verified campaign by creating one', async () => {
        const col = userA().firestore().collection('campaigns');
        await expect(
          col.doc('forged').set({
            userId: 'userA',
            businessId: 'biz_A',
            status: 'verified',
            creditsReserved: 0,
            metadata: { truthCheckStatus: 'PASS' },
          })
        )['toDeny']();
      });
    });

    describe('credits, plan and billing are server-owned', () => {
      test('usage / subscriptions / transactions: reads are owner-only, writes always denied', async () => {
        const a = userA().firestore();
        await expect(a.collection('usage').doc('uA').get())['toSucceed']();
        await expect(a.collection('usage').doc('uB').get())['toDeny']();
        await expect(a.collection('subscriptions').doc('sB').get())['toDeny']();
        await expect(a.collection('usage').doc('uA').update({ creditsUsed: -999999 }))['toDeny']();
        await expect(a.collection('usage').doc('new').set({ userId: 'userA' }))['toDeny']();
        await expect(
          a.collection('subscriptions').doc('sA').set({ userId: 'userA', plan: 'agency' })
        )['toDeny']();
        await expect(a.collection('transactions').doc('t').set({ userId: 'userA', amount: 1000 }))[
          'toDeny'
        ]();
      });

      test('a user cannot change their own plan, credits or role on the user document', async () => {
        const doc = userA().firestore().collection('users').doc('userA');
        await expect(doc.update({ role: 'admin' }))['toDeny']();
        await expect(doc.update({ subscriptionId: 'sub_x' }))['toDeny']();
        await expect(doc.update({ businessIds: ['biz_A', 'biz_B'] }))['toDeny']();
      });
    });

    describe('admin / internal data', () => {
      test('internal collections are inaccessible to users and anonymous', async () => {
        for (const ctx of [anon(), userA()]) {
          const db = ctx.firestore();
          await expect(db.collection('processed_webhook_events').doc('e1').get())['toDeny']();
          await expect(db.collection('rate_limits').doc('x').get())['toDeny']();
          await expect(db.collection('idempotency_keys').doc('x').get())['toDeny']();
          await expect(db.collection('metaCredentials').doc('x').get())['toDeny']();
          // Billing ledgers written by the Paddle webhook: never client-readable or writable.
          await expect(db.collection('paddle_grants').doc('txn_x').get())['toDeny']();
          await expect(db.collection('paddle_adjustments').doc('adj_x').get())['toDeny']();
          await expect(
            db.collection('paddle_grants').doc('txn_x').set({ status: 'granted', userId: 'userA' })
          )['toDeny']();
        }
      });

      test("another user's user document is unreadable; a normal user token with role=user is not admin", async () => {
        await expect(userB().firestore().collection('users').doc('userA').get())['toDeny']();
      });

      test('only a verified role=admin custom claim may read other users documents', async () => {
        const admin = env.authenticatedContext('root', { role: 'admin' });
        await expect(admin.firestore().collection('users').doc('userA').get())['toSucceed']();
        // admin is read-only: it cannot write other users documents from the client either
        await expect(admin.firestore().collection('users').doc('userA').update({ role: 'admin' }))[
          'toDeny'
        ]();
      });
    });
  }
);
