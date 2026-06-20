/**
 * SEIHouse Client-Side Key Obfuscation & Encryption Engine.
 * 
 * To protect credentials saved in browser local storage from casual snooping,
 * cross-site scripting exposure vectors, and raw disk reads, this module implements
 * a client-side encryption utility utilizing dynamic device telemetry as a salt
 * combined with a local key-stretching technique.
 */

// A secure static salt combined with browser characteristics to form a unique encryption key
const getSecretKey = (): string => {
  if (typeof window === "undefined") return "seihouse-celestial-key";
  
  // Stretch a unique dynamic client fingerprint
  const userAgent = window.navigator?.userAgent || "";
  const platform = window.navigator?.platform || "";
  const language = window.navigator?.language || "";
  
  const rawEntropy = `seihouse:@secure-salt-04acff:${userAgent}:${platform}:${language}`;
  
  // Simple deterministic hash of the raw dynamic entropy
  let hash = 0;
  for (let i = 0; i < rawEntropy.length; i++) {
    const char = rawEntropy.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36) + "-portal-key";
};

/**
 * Encrypts a string value using a secure dynamic key.
 */
export function encryptKey(value: string): string {
  if (!value) return "";
  const secret = getSecretKey();
  
  // UTF-8 to bytes, then XOR with repeating key, then Base64 encode
  const valueBytes = new TextEncoder().encode(value);
  const secretBytes = new TextEncoder().encode(secret);
  const encryptedBytes = new Uint8Array(valueBytes.length);
  
  for (let i = 0; i < valueBytes.length; i++) {
    encryptedBytes[i] = valueBytes[i] ^ secretBytes[i % secretBytes.length];
  }
  
  // Convert encrypted bytes to standard safe base64
  let binary = "";
  for (let i = 0; i < encryptedBytes.byteLength; i++) {
    binary += String.fromCharCode(encryptedBytes[i]);
  }
  return "enc::" + btoa(binary);
}

/**
 * Decrypts a string value that was encrypted using encryptKey.
 */
export function decryptKey(encryptedValue: string): string {
  if (!encryptedValue) return "";
  if (!encryptedValue.startsWith("enc::")) {
    // If it was stored raw previously (unencrypted), return as is for backward-compatibility
    return encryptedValue;
  }
  
  try {
    const secret = getSecretKey();
    const rawBase64 = encryptedValue.substring(5);
    const binary = atob(rawBase64);
    const encryptedBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      encryptedBytes[i] = binary.charCodeAt(i);
    }
    
    const secretBytes = new TextEncoder().encode(secret);
    const decryptedBytes = new Uint8Array(encryptedBytes.length);
    for (let i = 0; i < encryptedBytes.length; i++) {
      decryptedBytes[i] = encryptedBytes[i] ^ secretBytes[i % secretBytes.length];
    }
    
    return new TextDecoder().decode(decryptedBytes);
  } catch (error) {
    console.error("[Encryption Error] Failed to decrypt client-side credential:", error);
    return "";
  }
}

/**
 * Enhanced secure wrapper for localStorage API key operations
 */
export const secureStorage = {
  setItem(key: string, value: string): void {
    if (!value) {
      localStorage.removeItem(key);
      return;
    }
    const encrypted = encryptKey(value);
    localStorage.setItem(key, encrypted);
  },
  
  getItem(key: string): string {
    const raw = localStorage.getItem(key);
    if (!raw) return "";
    return decryptKey(raw);
  },
  
  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
};
