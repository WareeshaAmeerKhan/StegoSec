/**
 * StegoSec – Cryptographic Core
 * All operations use the browser's built-in Web Crypto API.
 */

export const MAGIC_HEADER  = new TextEncoder().encode('STEG');
export const DECOY_HEADER  = new TextEncoder().encode('DECY');

/** Generate a random salt */
export function generateSalt(length = 16) {
  return window.crypto.getRandomValues(new Uint8Array(length));
}

// ─────────────────────────────────────────────
//  KEY DERIVATION
// ─────────────────────────────────────────────

/**
 * Derives the Master Key from password + userId using PBKDF2-SHA256.
 * The key is extractable so we can display its hex to the user once.
 */
export async function deriveMasterKey(password, userId, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password + userId),
    { name: 'PBKDF2' }, false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 390000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,          // extractable – so we can show hex once at signup
    ['encrypt', 'decrypt']
  );
}

/**
 * Derives a Shared Session Key via HKDF.
 * @param {Uint8Array} sharedSecret - the raw shared secret bytes
 * @param {string} label - context label (e.g. both user IDs sorted and joined)
 */
export async function deriveSharedSessionKey(sharedSecret, label = 'StegoSec-Session') {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', sharedSecret, { name: 'HKDF' }, false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF', hash: 'SHA-256',
      salt: new TextEncoder().encode(label),
      info: new Uint8Array(),
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ─────────────────────────────────────────────
//  SYMMETRIC ENCRYPTION / DECRYPTION
// ─────────────────────────────────────────────

/**
 * Encrypts plaintext with a CryptoKey (AES-GCM).
 * Output: HEADER(4) | IV(12) | CIPHERTEXT
 */
export async function encryptWithKey(plaintext, key, isDecoy = false) {
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  const cipher = new Uint8Array(cipherBuf);
  const header = isDecoy ? DECOY_HEADER : MAGIC_HEADER;
  const out = new Uint8Array(4 + 12 + cipher.length);
  out.set(header, 0);
  out.set(iv, 4);
  out.set(cipher, 16);
  return out;
}

/**
 * Decrypts a payload produced by encryptWithKey.
 * Returns { message, isDecoy }
 */
export async function decryptWithKey(payload, key) {
  if (payload.length < 17) throw new Error('Payload too small.');
  const header = payload.slice(0, 4);
  const isMagic = MAGIC_HEADER.every((v, i) => v === header[i]);
  const isDecoy = DECOY_HEADER.every((v, i) => v === header[i]);
  if (!isMagic && !isDecoy) throw new Error('Invalid magic header.');
  const iv     = payload.slice(4, 16);
  const cipher = payload.slice(16);
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    return { message: new TextDecoder().decode(plain), isDecoy };
  } catch {
    throw new Error('Decryption failed – wrong key or corrupted data.');
  }
}

// ─────────────────────────────────────────────
//  DENIABLE ENCRYPTION
// ─────────────────────────────────────────────

/**
 * Creates a combined Deniable payload:
 * [4-byte decoy-len][decoy blob][4-byte real-len][real blob]
 * Both blobs are independently encrypted (with the SAME shared key in this
 * single-key demo; the decoy uses DECOY_HEADER so it can be distinguished).
 */
export async function createDeniablePayload(realText, decoyText, sharedKey) {
  const decoyBlob = await encryptWithKey(decoyText, sharedKey, true);
  const realBlob  = await encryptWithKey(realText,  sharedKey, false);
  const out = new Uint8Array(4 + decoyBlob.length + 4 + realBlob.length);
  const dv  = new DataView(out.buffer);
  dv.setUint32(0, decoyBlob.length, false);
  out.set(decoyBlob, 4);
  dv.setUint32(4 + decoyBlob.length, realBlob.length, false);
  out.set(realBlob, 4 + decoyBlob.length + 4);
  return out;
}

/**
 * Tries to decrypt a possibly deniable payload.
 * Returns { message, isDecoy, isDeniable }
 * Properly validates keys for deniable encryption.
 */
export async function decryptAuto(payload, sharedKey, forceDecoy = false) {
  // Try interpreting as a deniable combined payload first
  try {
    const dv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    const decoyLen = dv.getUint32(0, false);
    if (decoyLen > 0 && decoyLen + 8 < payload.length) {
      const decoyBlob = payload.slice(4, 4 + decoyLen);
      const realStart = 4 + decoyLen;
      const realLen   = dv.getUint32(realStart, false);
      const realBlob  = payload.slice(realStart + 4, realStart + 4 + realLen);
      
      if (realBlob.length === realLen && realLen > 16) {
        if (forceDecoy) {
          const decoyResult = await decryptWithKey(decoyBlob, sharedKey);
          return { ...decoyResult, isDeniable: true, decoyAvailable: true, correctKey: false };
        }

        try {
          // Try to decrypt real message
          const realResult = await decryptWithKey(realBlob, sharedKey);
          // Real decryption succeeded - this is the correct key
          return { ...realResult, isDeniable: true, decoyAvailable: true, correctKey: true };
        } catch {
          // Real decryption failed - try decoy instead
          try {
            const decoyResult = await decryptWithKey(decoyBlob, sharedKey);
            // Decoy decrypted - this might be a wrong key showing decoy
            return { ...decoyResult, isDeniable: true, decoyAvailable: false, correctKey: false };
          } catch {
            // Both failed - truly wrong key
            throw new Error('Invalid key or corrupted data.');
          }
        }
      }
    }
  } catch (e) {
    // If deniable format fails, try as plain payload
    if (e.message === 'Invalid key or corrupted data.') throw e;
  }
  
  if (forceDecoy) throw new Error('No decoy message found in this payload.');

  // Plain single payload
  const result = await decryptWithKey(payload, sharedKey);
  return { ...result, isDeniable: false, correctKey: true };
}

// ─────────────────────────────────────────────
//  KEY WRAPPING (for secure storage)
// ─────────────────────────────────────────────

/**
 * Wraps (encrypts) a raw key buffer with a CryptoKey (master key).
 * Returns a base64 string: IV(12) | CIPHERTEXT
 */
export async function wrapRawKey(rawKeyBytes, wrappingKey) {
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrappingKey, rawKeyBytes);
  const combined = new Uint8Array(12 + enc.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(enc), 12);
  return btoa(String.fromCharCode(...combined));
}

/**
 * Unwraps a key string produced by wrapRawKey.
 * Returns the raw key bytes.
 */
export async function unwrapRawKey(b64, wrappingKey) {
  const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const iv     = combined.slice(0, 12);
  const cipher = combined.slice(12);
  const plain  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, wrappingKey, cipher);
  return new Uint8Array(plain);
}

/**
 * Converts a CryptoKey to hex string for display.
 */
export async function keyToHex(cryptoKey) {
  const raw = await crypto.subtle.exportKey('raw', cryptoKey);
  return Array.from(new Uint8Array(raw)).map(b => b.toString(16).padStart(2, '0')).join('');
}
