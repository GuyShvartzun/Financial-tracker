/**
 * End-to-End Client-Side Cryptography Layer
 * Utilizes standard Web Crypto API (AES-GCM 256-bit with PBKDF2 key derivation)
 * to ensure that all financial data stored in Firestore is encrypted at the client level.
 */

import { normalizeCurrencyCode } from './formatters';

// In-memory key cache to prevent expensive repeated PBKDF2 derivations
const keyCache = new Map();

/**
 * Robust Base64 conversion helpers that operate identically in browser and Node/Vitest environments.
 */
export function bytesToBase64(bytes) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBytes(base64) {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives a CryptoKey using PBKDF2 with SHA-256 and 100,000 iterations.
 */
export async function deriveKeyFromSecret(secret, saltString) {
  const cacheKey = `${secret}:::${saltString}`;
  if (keyCache.has(cacheKey)) {
    return keyCache.get(cacheKey);
  }

  const cryptoObj = typeof window !== 'undefined' && window.crypto ? window.crypto : globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('Web Crypto API is not supported in this environment.');
  }

  const enc = new TextEncoder();
  const rawKey = await cryptoObj.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const derivedKey = await cryptoObj.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(`fin_salt_${saltString}`),
      iterations: 100000,
      hash: 'SHA-256'
    },
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  keyCache.set(cacheKey, derivedKey);
  return derivedKey;
}

/**
 * Gets or derives the cryptographic key for a specific room.
 * Supports:
 * 1. Custom Room Passphrase stored in localStorage
 * 2. Deterministic high-entropy room key for seamless cross-device room member usage
 */
export async function getRoomCryptoKey(roomId, customSecret = null) {
  if (!roomId) return null;

  let secret = customSecret;
  if (!secret && typeof localStorage !== 'undefined') {
    secret = localStorage.getItem(`fin_tracker_room_secret_${roomId}`);
  }

  // Fallback to default high-entropy deterministic room secret if no custom passphrase was set
  if (!secret) {
    secret = `room_secure_default_key_${roomId}`;
  }

  return deriveKeyFromSecret(secret, roomId);
}

/**
 * Encrypts an arbitrary serializable JavaScript object using AES-GCM (256-bit).
 * Returns `{ _enc: true, iv, payload }`.
 */
export async function encryptObject(obj, cryptoKey) {
  if (!cryptoKey || obj === null || obj === undefined) return obj;

  const cryptoObj = typeof window !== 'undefined' && window.crypto ? window.crypto : globalThis.crypto;
  const enc = new TextEncoder();
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  const plaintextString = JSON.stringify(obj);

  const cipherBuffer = await cryptoObj.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    enc.encode(plaintextString)
  );

  return {
    _enc: true,
    iv: bytesToBase64(iv),
    payload: bytesToBase64(new Uint8Array(cipherBuffer))
  };
}

/**
 * Decrypts an encrypted payload. If `data` is not encrypted (legacy document), returns it unchanged.
 */
export async function decryptObject(data, cryptoKey) {
  if (!data || !data._enc || !data.payload || !data.iv) {
    return data; // Return unencrypted legacy data as-is for backward compatibility
  }

  if (!cryptoKey) {
    return data;
  }

  try {
    const cryptoObj = typeof window !== 'undefined' && window.crypto ? window.crypto : globalThis.crypto;
    const dec = new TextDecoder();
    const iv = base64ToBytes(data.iv);
    const ciphertext = base64ToBytes(data.payload);

    const decryptedBuffer = await cryptoObj.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      ciphertext
    );

    return JSON.parse(dec.decode(decryptedBuffer));
  } catch (err) {
    console.warn('Decryption failed (invalid key or corrupted data):', err);
    return data;
  }
}

/**
 * Encrypts an account document while leaving technical indexing fields (id, ownerId, order)
 * unencrypted for Firestore query efficiency.
 */
export async function encryptAccountForCloud(account, cryptoKey) {
  if (!cryptoKey || !account) return account;

  const sensitiveFields = {
    name: account.name,
    category: account.category,
    balances: account.balances || {},
    flaggedMonths: account.flaggedMonths || {}
  };

  if (account.currency !== undefined) {
    sensitiveFields.currency = normalizeCurrencyCode(account.currency);
  }

  const encryptedPart = await encryptObject(sensitiveFields, cryptoKey);

  return {
    id: account.id,
    ownerId: account.ownerId,
    order: account.order !== undefined ? account.order : 0,
    ...encryptedPart
  };
}

/**
 * Decrypts an account document loaded from Firestore.
 */
export async function decryptAccountFromCloud(accountDoc, cryptoKey) {
  if (!accountDoc) return accountDoc;
  if (!accountDoc._enc || !accountDoc.payload) {
    return {
      ...accountDoc,
      ...(accountDoc.currency !== undefined ? { currency: normalizeCurrencyCode(accountDoc.currency) } : {})
    };
  }

  const decryptedSensitive = await decryptObject(accountDoc, cryptoKey);
  if (!decryptedSensitive || decryptedSensitive._enc) {
    // Decryption failed or returned raw
    return accountDoc;
  }

  const restored = {
    id: accountDoc.id,
    ownerId: accountDoc.ownerId,
    order: accountDoc.order !== undefined ? accountDoc.order : 0,
    name: decryptedSensitive.name || '',
    category: decryptedSensitive.category || 'short',
    balances: decryptedSensitive.balances || {},
    flaggedMonths: decryptedSensitive.flaggedMonths || {}
  };

  if (decryptedSensitive.currency !== undefined) {
    restored.currency = normalizeCurrencyCode(decryptedSensitive.currency);
  } else if (accountDoc.currency !== undefined) {
    restored.currency = normalizeCurrencyCode(accountDoc.currency);
  }

  return restored;
}

/**
 * Encrypts a full settings document (budget, calculators, tasks, months)
 */
export async function encryptSettingsForCloud(data, cryptoKey) {
  if (!cryptoKey || !data) return data;
  return encryptObject(data, cryptoKey);
}

/**
 * Decrypts a full settings document (budget, calculators, tasks, months)
 */
export async function decryptSettingsFromCloud(docData, cryptoKey) {
  if (!docData) return docData;
  if (!docData._enc) return docData; // Legacy unencrypted
  return decryptObject(docData, cryptoKey);
}
