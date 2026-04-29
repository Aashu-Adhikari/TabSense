// Simple obfuscation/encryption for API keys
// Note: In a real-world scenario with a backend, a proper KMS would be used.
// For a standalone extension, we obfuscate to prevent plain-text storage.

const ENCRYPTION_KEY = 'TabSense_Secure_Key_2026';

export function encryptKey(text) {
  if (!text) return text;
  try {
    return btoa(
      Array.from(text)
        .map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)))
        .join('')
    );
  } catch (e) {
    console.error('Encryption failed:', e);
    return text;
  }
}

export function decryptKey(encoded) {
  if (!encoded) return encoded;
  try {
    // Basic check to see if it might be base64 (encrypted) vs raw key
    // Most raw API keys are alphanumeric + dashes, but this is a simple heuristic
    // If atob fails, it will fall to catch and return the original string (unencrypted)
    const decoded = atob(encoded);
    return Array.from(decoded)
      .map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)))
      .join('');
  } catch (e) {
    // If decryption fails, assume it was never encrypted (e.g. legacy data)
    return encoded;
  }
}
