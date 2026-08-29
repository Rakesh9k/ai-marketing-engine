import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { describe, beforeAll, afterAll, test, expect } from '@jest/globals';

describe('Storage Security Rules', () => {
  let testEnv: RulesTestEnvironment | null = null;

  beforeAll(async () => {
    const storageEmulatorHost = process.env['STORAGE_EMULATOR_HOST'];
    if (!storageEmulatorHost) {
      console.log('Skipping Storage security tests - emulator not available');
      return;
    }
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-project',
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

  const skipIfNoEnv = () => {
    if (!testEnv) {
      return true;
    }
    return false;
  };

  test('User can read own business assets', async () => {
    if (skipIfNoEnv()) return;
    const user = testEnv!.authenticatedContext('user1', {
      businessIds: ['biz1'],
    });
    const bucket = (user.storage() as any).bucket('test-bucket');
    const file = bucket.file('businesses/biz1/assets/asset1/test.jpg');
    await expect(file.exists()).resolves.toEqual([true]);
  });

  test('User cannot access other business assets', async () => {
    if (skipIfNoEnv()) return;
    const user = testEnv!.authenticatedContext('user1', {
      businessIds: ['biz1'],
    });
    const bucket = (user.storage() as any).bucket('test-bucket');
    const file = bucket.file('businesses/biz2/assets/asset1/test.jpg');
    await expect(file.exists()).resolves.toEqual([false]);
  });

  test('User can write to own business assets', async () => {
    if (skipIfNoEnv()) return;
    const user = testEnv!.authenticatedContext('user1', {
      businessIds: ['biz1'],
    });
    const bucket = (user.storage() as any).bucket('test-bucket');
    const file = bucket.file('businesses/biz1/assets/asset1/test.jpg');
    await expect(file.save('test content')).resolves.toBeDefined();
  });

  test('User cannot write to other business assets', async () => {
    if (skipIfNoEnv()) return;
    const user = testEnv!.authenticatedContext('user1', {
      businessIds: ['biz1'],
    });
    const bucket = (user.storage() as any).bucket('test-bucket');
    const file = bucket.file('businesses/biz2/assets/asset1/test.jpg');
    await expect(file.save('test content')).rejects.toThrow();
  });

  test('User can write to temp uploads', async () => {
    if (skipIfNoEnv()) return;
    const user = testEnv!.authenticatedContext('user1');
    const bucket = (user.storage() as any).bucket('test-bucket');
    const file = bucket.file('temp/user1/test.jpg');
    await expect(file.save('test content')).resolves.toBeDefined();
  });

  test('User cannot write to other user temp uploads', async () => {
    if (skipIfNoEnv()) return;
    const user = testEnv!.authenticatedContext('user1');
    const bucket = (user.storage() as any).bucket('test-bucket');
    const file = bucket.file('temp/user2/test.jpg');
    await expect(file.save('test content')).rejects.toThrow();
  });
});
