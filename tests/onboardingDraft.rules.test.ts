/**
 * @jest-environment node
 *
 * Firestore rules for onboarding_drafts/{uid}: the owner can read their own draft; nobody can
 * write it from the client (saveOnboardingDraft, via the Admin SDK, is the only writer — otherwise a
 * client could forge `source: USER_CONFIRMED` on a fact). Needs the Firestore emulator; without
 * FIRESTORE_EMULATOR_HOST it shows up as SKIPPED, never as a false pass (same pattern as
 * tests/security.test.ts).
 */
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { afterAll, beforeAll, describe, test } from '@jest/globals';

const describeIfEmulator = process.env['FIRESTORE_EMULATOR_HOST'] ? describe : describe.skip;

describeIfEmulator('Firestore rules — onboarding_drafts', () => {
  let env: RulesTestEnvironment;

  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: 'demo-project-onboarding-drafts',
      firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: 'localhost', port: 8080 },
    });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .doc('onboarding_drafts/alice')
        .set({
          uid: 'alice',
          facts: { owner__name: { value: 'Alice', source: 'USER_CONFIRMED', confirmed: true } },
        });
    });
  });

  afterAll(async () => {
    await env?.cleanup();
  });

  test('the owner can read their own draft', async () => {
    await assertSucceeds(
      env.authenticatedContext('alice').firestore().doc('onboarding_drafts/alice').get()
    );
  });

  test("another signed-in user cannot read someone else's draft", async () => {
    await assertFails(
      env.authenticatedContext('bob').firestore().doc('onboarding_drafts/alice').get()
    );
  });

  test('an anonymous visitor cannot read a draft', async () => {
    await assertFails(
      env.unauthenticatedContext().firestore().doc('onboarding_drafts/alice').get()
    );
  });

  test('the owner cannot write their own draft from the client (no forged provenance)', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(db.doc('onboarding_drafts/alice').set({ uid: 'alice', facts: {} }));
    await assertFails(
      db.doc('onboarding_drafts/alice').update({
        'facts.owner__name': { value: 'Mallory', source: 'USER_CONFIRMED', confirmed: true },
      })
    );
  });

  test('nobody can create or delete drafts from the client', async () => {
    const db = env.authenticatedContext('bob').firestore();
    await assertFails(db.doc('onboarding_drafts/bob').set({ uid: 'bob' }));
    await assertFails(
      env.authenticatedContext('alice').firestore().doc('onboarding_drafts/alice').delete()
    );
  });
});
