import { describe, it, expect } from 'vitest';
import {
  deriveKeyFromSecret,
  encryptObject,
  decryptObject,
  encryptAccountForCloud,
  decryptAccountFromCloud,
  encryptSettingsForCloud,
  decryptSettingsFromCloud,
  getRoomCryptoKey
} from '../utils/crypto';

describe('End-to-End Client-Side Cryptography Module', () => {
  it('derives a valid AES-GCM CryptoKey using PBKDF2', async () => {
    const key = await deriveKeyFromSecret('my_secure_passphrase_123', 'room_abc');
    expect(key).toBeDefined();
    expect(key.algorithm.name).toBe('AES-GCM');
  });

  it('encrypts and decrypts an arbitrary object losslessly', async () => {
    const key = await deriveKeyFromSecret('pass_456', 'room_123');
    const originalData = {
      salary: 25000,
      bank: 'Bank Hapoalim',
      numbers: [1, 2, 3],
      nested: { a: 'בדיקה בעברית', b: true }
    };

    const encrypted = await encryptObject(originalData, key);
    expect(encrypted._enc).toBe(true);
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.payload).toBeDefined();
    expect(typeof encrypted.payload).toBe('string');
    // Ensure plaintext is not exposed in ciphertext
    expect(encrypted.payload).not.toContain('Hapoalim');
    expect(encrypted.payload).not.toContain('25000');

    const decrypted = await decryptObject(encrypted, key);
    expect(decrypted).toEqual(originalData);
  });

  it('encrypts sensitive account fields while preserving technical indexing fields', async () => {
    const key = await deriveKeyFromSecret('room_secret', 'room_789');
    const account = {
      id: 'acc_001',
      name: 'קרן השתלמות מיטב',
      category: 'medium',
      order: 3,
      ownerId: 'user_xyz',
      balances: { '08/2026': 85400, '07/2026': 82100 },
      flaggedMonths: { '08/2026': true }
    };

    const cloudDoc = await encryptAccountForCloud(account, key);
    // Indexing metadata preserved for Firestore querying
    expect(cloudDoc.id).toBe('acc_001');
    expect(cloudDoc.ownerId).toBe('user_xyz');
    expect(cloudDoc.order).toBe(3);
    expect(cloudDoc._enc).toBe(true);
    // Sensitive data must NOT be in the cloudDoc root
    expect(cloudDoc.name).toBeUndefined();
    expect(cloudDoc.balances).toBeUndefined();
    expect(cloudDoc.category).toBeUndefined();

    // Decrypting restores full account object
    const restored = await decryptAccountFromCloud(cloudDoc, key);
    expect(restored).toEqual(account);
  });

  it('encrypts and restores account currency (USD, EUR, ILS) losslessly through cloud encryption', async () => {
    const key = await deriveKeyFromSecret('room_secret', 'room_curr');
    const accountUSD = {
      id: 'acc_usd',
      name: 'חשבון השקעות דולרי',
      category: 'long',
      currency: 'USD',
      order: 1,
      ownerId: 'u1',
      balances: { '08/2026': 50000 },
      flaggedMonths: {}
    };

    const cloudDoc = await encryptAccountForCloud(accountUSD, key);
    expect(cloudDoc.currency).toBeUndefined(); // Currency is encrypted, not plain on root
    expect(cloudDoc._enc).toBe(true);

    const decrypted = await decryptAccountFromCloud(cloudDoc, key);
    expect(decrypted.currency).toBe('USD');
    expect(decrypted.name).toBe('חשבון השקעות דולרי');

    // Test with EUR
    const accountEUR = { ...accountUSD, id: 'acc_eur', currency: 'EUR' };
    const cloudDocEUR = await encryptAccountForCloud(accountEUR, key);
    const decryptedEUR = await decryptAccountFromCloud(cloudDocEUR, key);
    expect(decryptedEUR.currency).toBe('EUR');
  });

  it('handles legacy unencrypted accounts gracefully (backward compatibility)', async () => {
    const key = await deriveKeyFromSecret('room_secret', 'room_789');
    const legacyAccount = {
      id: 'legacy_01',
      name: 'חשבון ישן',
      category: 'short',
      order: 0,
      ownerId: 'u1',
      balances: { '08/2026': 12000 }
    };

    const result = await decryptAccountFromCloud(legacyAccount, key);
    expect(result).toEqual(legacyAccount);
  });

  it('encrypts and decrypts settings documents (budget, calculators, tasks, months)', async () => {
    const key = await deriveKeyFromSecret('room_secret', 'room_settings');
    const budget = {
      incomes: [{ id: 'inc_1', name: 'משכורת', amount: 20000 }],
      fixed: [{ id: 'fix_1', name: 'שכר דירה', amount: 6500 }],
      variables: [],
      savings: []
    };

    const encryptedBudget = await encryptSettingsForCloud(budget, key);
    expect(encryptedBudget._enc).toBe(true);
    expect(encryptedBudget.payload).not.toContain('משכורת');

    const decryptedBudget = await decryptSettingsFromCloud(encryptedBudget, key);
    expect(decryptedBudget).toEqual(budget);
  });

  it('generates a consistent room key for authorized members', async () => {
    const key1 = await getRoomCryptoKey('room_test_123');
    const key2 = await getRoomCryptoKey('room_test_123');
    expect(key1).toBeDefined();
    expect(key2).toBeDefined();

    const data = { secretMessage: 'חסיון פיננסי מלא' };
    const enc = await encryptObject(data, key1);
    const dec = await decryptObject(enc, key2);
    expect(dec).toEqual(data);
  });

  it('guarantees that database administrators cannot see account balances or names in cloud documents', async () => {
    const key = await getRoomCryptoKey('room_secret_999');
    const privateAccount = {
      id: 'acc_top_secret',
      name: 'חשבון השקעות שוויצרי',
      category: 'medium',
      order: 1,
      ownerId: 'user_david',
      balances: { '08/2026': 1500000 },
      flaggedMonths: {}
    };

    const cloudStoredDoc = await encryptAccountForCloud(privateAccount, key);

    // What a Firebase Console viewer or database admin sees:
    const serializedDoc = JSON.stringify(cloudStoredDoc);
    expect(serializedDoc).not.toContain('חשבון השקעות שוויצרי');
    expect(serializedDoc).not.toContain('1500000');
    expect(serializedDoc).not.toContain('medium');
    expect(cloudStoredDoc._enc).toBe(true);

    // What the authorized user's browser client sees after decryption:
    const authorizedRestored = await decryptAccountFromCloud(cloudStoredDoc, key);
    expect(authorizedRestored.name).toBe('חשבון השקעות שוויצרי');
    expect(authorizedRestored.balances['08/2026']).toBe(1500000);
    expect(authorizedRestored.category).toBe('medium');
  });

  it('guarantees that pension and mortgage loans are encrypted in cloud settings', async () => {
    const key = await getRoomCryptoKey('room_secret_calcs');
    const sensitiveCalcs = {
      pension: { balance: 450000, monthlyDeposit: 3500 },
      mortgage: { propertyValue: 2800000, tracks: [{ amount: 1200000, rate: 4.8 }] }
    };

    const cloudDoc = await encryptSettingsForCloud(sensitiveCalcs, key);
    const serialized = JSON.stringify(cloudDoc);
    expect(serialized).not.toContain('450000');
    expect(serialized).not.toContain('2800000');
    expect(serialized).not.toContain('1200000');

    const restored = await decryptSettingsFromCloud(cloudDoc, key);
    expect(restored).toEqual(sensitiveCalcs);
  });
});

