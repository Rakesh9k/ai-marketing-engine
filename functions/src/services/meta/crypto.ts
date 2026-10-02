import crypto from 'crypto';
import { getEnvConfig } from '../../config/env';
import type { EncryptedField } from '../../types/meta';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;

function getEncryptionKey(): Buffer {
  const rawKey =
    getEnvConfig().META_TOKEN_ENCRYPTION_KEY || process.env['META_TOKEN_ENCRYPTION_KEY'] || '';
  if (!rawKey) {
    // In local development/emulator testing without explicit secret set,
    // derive a fallback key from project ID so tests run deterministically.
    const fallbackSeed = process.env['GCLOUD_PROJECT'] || 'mitra-dev-encryption-key-fallback-32b';
    return crypto.createHash('sha256').update(fallbackSeed).digest();
  }
  return crypto.createHash('sha256').update(rawKey).digest();
}

/**
 * Encrypts sensitive tokens server-side using AES-256-GCM before storage.
 */
export function encryptToken(plainText: string): EncryptedField {
  if (!plainText) {
    throw new Error('Cannot encrypt empty token');
  }
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

/**
 * Decrypts server-side encrypted tokens for Graph API calls.
 */
export function decryptToken(encrypted: EncryptedField): string {
  if (!encrypted || !encrypted.encryptedData || !encrypted.iv || !encrypted.authTag) {
    throw new Error('Invalid encrypted token payload');
  }
  const key = getEncryptionKey();
  const iv = Buffer.from(encrypted.iv, 'hex');
  const authTag = Buffer.from(encrypted.authTag, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
