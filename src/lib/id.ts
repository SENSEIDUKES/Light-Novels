export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for environments without randomUUID
  const useCrypto = typeof crypto !== 'undefined' && crypto.getRandomValues;
  const rnd = new Uint8Array(16);
  if (useCrypto) {
    crypto.getRandomValues(rnd);
  } else {
    for (let i = 0; i < 16; i++) {
      rnd[i] = (Math.random() * 256) | 0;
    }
  }

  // Set version (4) and variant (8, 9, a, or b)
  rnd[6] = (rnd[6] & 0x0f) | 0x40;
  rnd[8] = (rnd[8] & 0x3f) | 0x80;

  // Convert to hex string
  let uuid = '';
  for (let i = 0; i < 16; i++) {
    if (i === 4 || i === 6 || i === 8 || i === 10) {
      uuid += '-';
    }
    uuid += rnd[i].toString(16).padStart(2, '0');
  }
  return uuid;
};

export const generateId = (length: number = 10): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const useCrypto = typeof crypto !== 'undefined' && crypto.getRandomValues;

  let result = '';
  const bufferSize = Math.ceil(length * 1.2);
  const buffer = new Uint8Array(bufferSize);

  if (useCrypto) {
    crypto.getRandomValues(buffer);
  } else {
    for (let i = 0; i < bufferSize; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
  }

  let offset = 0;
  while (result.length < length) {
    if (offset >= buffer.length) {
      if (useCrypto) {
        crypto.getRandomValues(buffer);
      } else {
        for (let i = 0; i < bufferSize; i++) {
          buffer[i] = Math.floor(Math.random() * 256);
        }
      }
      offset = 0;
    }

    const byte = buffer[offset++];
    // Max value for 36 chars is 252 (36 * 7)
    if (byte < 252) {
      result += chars[byte % chars.length];
    }
  }

  return result;
};
