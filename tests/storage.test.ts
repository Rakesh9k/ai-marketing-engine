/**
 * @jest-environment node
 *
 * See tests/security.test.ts for why this override is required.
 *
 * Phase 11: this file previously used the Node.js admin-style
 * @google-cloud/storage API (`.bucket('test-bucket').file(...)`) against
 * `RulesTestContext.storage()`, which actually returns a `firebase/storage`
 * CLIENT SDK instance (no `.bucket()` method at all) — every test here
 * threw `TypeError: user.storage(...).bucket is not a function` and had
 * never actually run a single assertion against the emulator. Rewritten to
 * use the real modular `firebase/storage` client API (`ref`, `uploadString`,
 * `getMetadata`), which is what `RulesTestContext.storage()` is designed to
 * be used with.
 *
 * Phase 37 QA Remediation (D-3): had the same misleading-pass harness
 * defect as tests/security.test.ts (see that file's header for the
 * mechanism) — every test guarded itself with `if (skipIfNoEnv()) return;`
 * so a run without STORAGE_EMULATOR_HOST reported all these as PASSED
 * rather than SKIPPED. Switched to the same `describeIfEmulator` pattern.
 */
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { ref, uploadString, getMetadata } from 'firebase/storage';
import { describe, beforeAll, afterAll, test, expect } from '@jest/globals';

const emulatorHost = process.env['STORAGE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

describeIfEmulator('Storage Security Rules', () => {
  let testEnv: RulesTestEnvironment | null = null;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      // Phase 15: distinct per-file project namespace — see the identical
      // comment in tests/security.test.ts for why.
      projectId: 'demo-project-storage-rules',
      storage: {
        rules: readFileSync('storage.rules', 'utf8'),
        host: 'localhost',
        port: 9199,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  // businesses/{businessId}/** requires both read and write to be gated on
  // the same rule, so "can read own" must actually upload the file first
  // (bypassing rules, as the real generation pipeline would have already
  // done) — reading a file that was never uploaded proves nothing about
  // authorization, only that a 404 isn't mistaken for an ALLOW.
  test('User can read own business assets', async () => {
    await testEnv!.withSecurityRulesDisabled(async (context) => {
      const seedRef = ref(context.storage(), 'businesses/biz1/assets/asset1/test.jpg');
      await uploadString(seedRef, 'seed content');
    });

    const user = testEnv!.authenticatedContext('user1', { businessIds: ['biz1'] });
    const fileRef = ref(user.storage(), 'businesses/biz1/assets/asset1/test.jpg');
    await expect(getMetadata(fileRef)).resolves.toBeDefined();
  });

  test('User cannot read other business assets', async () => {
    await testEnv!.withSecurityRulesDisabled(async (context) => {
      const seedRef = ref(context.storage(), 'businesses/biz2/assets/asset1/test.jpg');
      await uploadString(seedRef, 'seed content');
    });

    const user = testEnv!.authenticatedContext('user1', { businessIds: ['biz1'] });
    const fileRef = ref(user.storage(), 'businesses/biz2/assets/asset1/test.jpg');
    await expect(getMetadata(fileRef)).rejects.toThrow();
  });

  // Phase 4 Storage Security Audit: businesses/{businessId}/{allPaths=**}
  // write access was closed entirely (previously "allow read, write" for any
  // business member) — no application code anywhere uses the client SDK to
  // write here. Every real upload goes through a signed URL minted by
  // getUploadUrl.ts/getReelClipUploadUrl.ts, confirmed server-side via
  // confirmUpload.ts/confirmReelClipUpload.ts, neither of which is subject
  // to these rules (Admin SDK bypasses them). The open client-SDK write path
  // had no size or content-type limit at all — this test now proves that
  // path is closed, not merely untested.
  test('Business member CANNOT write to business assets via the client SDK (server-only, via signed URL + confirmUpload)', async () => {
    const user = testEnv!.authenticatedContext('user1', { businessIds: ['biz1'] });
    const fileRef = ref(user.storage(), 'businesses/biz1/assets/asset1/test.jpg');
    await expect(uploadString(fileRef, 'test content')).rejects.toThrow();
  });

  test('User cannot write to other business assets', async () => {
    const user = testEnv!.authenticatedContext('user1', { businessIds: ['biz1'] });
    const fileRef = ref(user.storage(), 'businesses/biz2/assets/asset1/test.jpg');
    await expect(uploadString(fileRef, 'test content')).rejects.toThrow();
  });

  // Phase 4: temp/{userId}/{fileName} is unimplemented scaffolding — no code
  // anywhere reads or writes it, and the "TTL enforced by Cloud Function"
  // cleanup the old comment claimed does not exist. Closed entirely rather
  // than left open with no size/content-type limit and no cleanup.
  test('User CANNOT write to their own temp uploads (path closed — unused, no TTL cleanup ever existed)', async () => {
    const user = testEnv!.authenticatedContext('user1');
    const fileRef = ref(user.storage(), 'temp/user1/test.jpg');
    await expect(uploadString(fileRef, 'test content')).rejects.toThrow();
  });

  test("User cannot write to another user's temp uploads", async () => {
    const user = testEnv!.authenticatedContext('user1');
    const fileRef = ref(user.storage(), 'temp/user2/test.jpg');
    await expect(uploadString(fileRef, 'test content')).rejects.toThrow();
  });

  // Phase 11: explicit "generated creative isolation" and "temp upload
  // read isolation" tests — the earlier version of this file only covered
  // businesses/** writes and temp/** writes, never businesses/** cross-user
  // READ of a generated creative, nor temp/** cross-user READ.
  test("Phase 11: User cannot download another business's generated creative via Storage", async () => {
    await testEnv!.withSecurityRulesDisabled(async (context) => {
      const seedRef = ref(
        context.storage(),
        'businesses/biz2/campaigns/camp2/generated/poster_1.png'
      );
      await uploadString(seedRef, 'generated creative bytes');
    });
    const user = testEnv!.authenticatedContext('user1', { businessIds: ['biz1'] });
    const fileRef = ref(user.storage(), 'businesses/biz2/campaigns/camp2/generated/poster_1.png');
    await expect(getMetadata(fileRef)).rejects.toThrow();
  });

  test("Phase 11: User cannot read another user's temp upload", async () => {
    await testEnv!.withSecurityRulesDisabled(async (context) => {
      const seedRef = ref(context.storage(), 'temp/user2/private-upload.jpg');
      await uploadString(seedRef, 'private bytes');
    });
    const user = testEnv!.authenticatedContext('user1');
    const fileRef = ref(user.storage(), 'temp/user2/private-upload.jpg');
    await expect(getMetadata(fileRef)).rejects.toThrow();
  });

  // Phase 11: agency member Storage access — the equivalent of
  // firestore.rules' "agency member can access managed business" test,
  // against storage.rules' resource.metadata.agencyId check.
  test("Phase 11: Agency member CAN access a managed business's assets when object metadata carries the matching agencyId", async () => {
    await testEnv!.withSecurityRulesDisabled(async (context) => {
      const seedRef = ref(context.storage(), 'businesses/biz_managed/assets/a1/test.jpg');
      await uploadString(seedRef, 'seed content', undefined, {
        customMetadata: { agencyId: 'agency_1' },
      });
    });
    const agencyUser = testEnv!.authenticatedContext('agency1', {
      role: 'agency_member',
      agencyId: 'agency_1',
    });
    const fileRef = ref(agencyUser.storage(), 'businesses/biz_managed/assets/a1/test.jpg');
    await expect(getMetadata(fileRef)).resolves.toBeDefined();
  });

  test("Phase 11: Agency member CANNOT access an unmanaged business's assets (different agencyId metadata)", async () => {
    await testEnv!.withSecurityRulesDisabled(async (context) => {
      const seedRef = ref(context.storage(), 'businesses/biz_unmanaged/assets/a1/test.jpg');
      await uploadString(seedRef, 'seed content', undefined, {
        customMetadata: { agencyId: 'agency_2' },
      });
    });
    const agencyUser = testEnv!.authenticatedContext('agency1', {
      role: 'agency_member',
      agencyId: 'agency_1',
    });
    const fileRef = ref(agencyUser.storage(), 'businesses/biz_unmanaged/assets/a1/test.jpg');
    await expect(getMetadata(fileRef)).rejects.toThrow();
  });
});
