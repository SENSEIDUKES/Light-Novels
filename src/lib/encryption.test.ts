import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encryptKey, decryptKey, secureStorage } from './encryption';

describe('encryption', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('encryptKey and decryptKey', () => {
    it('returns empty string for empty input', async () => {
      expect(await encryptKey('')).toBe('');
      expect(await decryptKey('')).toBe('');
    });

    it('returns unencrypted value if not encrypted', async () => {
      expect(await decryptKey('plain text')).toBe('plain text');
    });

    it('encrypts and decrypts a value', async () => {
      const plainText = 'super-secret-api-key';
      const encrypted = await encryptKey(plainText);
      expect(encrypted).not.toBe(plainText);
      expect(encrypted.startsWith('enc::')).toBe(true);

      const decrypted = await decryptKey(encrypted);
      expect(decrypted).toBe(plainText);
    });
  });

  describe('secureStorage', () => {
    it('setItem and getItem work correctly', async () => {
      const key = 'test-key';
      const value = 'secret-value';

      await secureStorage.setItem(key, value);
      const retrieved = await secureStorage.getItem(key);
      expect(retrieved).toBe(value);
      
      const raw = localStorage.getItem(key);
      expect(raw).not.toBe(value);
      expect(raw?.startsWith('enc::')).toBe(true);
    });

    it('removeItem works', async () => {
      const key = 'test-key';
      const value = 'secret-value';

      await secureStorage.setItem(key, value);
      secureStorage.removeItem(key);
      expect(await secureStorage.getItem(key)).toBe('');
    });

    it('setItem removes item if value is empty', async () => {
      const key = 'test-key';
      await secureStorage.setItem(key, 'value');
      await secureStorage.setItem(key, '');
      expect(localStorage.getItem(key)).toBeNull();
    });
  });
});
