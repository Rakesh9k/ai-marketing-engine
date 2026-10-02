import { encryptToken, decryptToken } from './crypto';

describe('Meta Token Encryption (crypto.ts)', () => {
  it('encrypts and decrypts a plain text token correctly', () => {
    const originalToken = 'EAABsb7890xyz_mock_meta_access_token_value_123456789';
    const encrypted = encryptToken(originalToken);

    expect(encrypted.encryptedData).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.authTag).toBeDefined();
    expect(encrypted.encryptedData).not.toEqual(originalToken);

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toEqual(originalToken);
  });

  it('throws error when attempting to decrypt tampered data', () => {
    const originalToken = 'test-token-secret';
    const encrypted = encryptToken(originalToken);

    // Tamper with the encrypted hex
    const tampered = {
      ...encrypted,
      encryptedData: encrypted.encryptedData.startsWith('0')
        ? '1' + encrypted.encryptedData.slice(1)
        : '0' + encrypted.encryptedData.slice(1),
    };

    expect(() => decryptToken(tampered)).toThrow();
  });

  it('throws error when encrypting empty token', () => {
    expect(() => encryptToken('')).toThrow(/empty token/i);
  });
});
