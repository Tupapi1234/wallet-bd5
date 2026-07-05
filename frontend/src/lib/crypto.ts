/**
 * Client-side cryptographic utilities using the native Web Crypto API.
 * Encrypts and decrypts sensitive data (seed phrases, private keys)
 * locally using AES-GCM-256 derived from the user's PIN/Password via PBKDF2.
 *
 * SECURITY: This module runs EXCLUSIVELY on the client.
 * No seed phrase or private key ever leaves the browser.
 */

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts cleartext using a PIN.
 * Returns a payload string: "saltHex:ivHex:ciphertextHex"
 */
export async function encryptData(text: string, pin: string): Promise<string> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);

  const enc = new TextEncoder();
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(text)
  );

  return `${bufferToHex(salt)}:${bufferToHex(iv)}:${bufferToHex(ciphertextBuffer)}`;
}

/**
 * Decrypts a payload string using the PIN.
 * Throws if the PIN is incorrect.
 */
export async function decryptData(payload: string, pin: string): Promise<string> {
  const [saltHex, ivHex, ciphertextHex] = payload.split(":");
  if (!saltHex || !ivHex || !ciphertextHex) {
    throw new Error("Formato de datos cifrados inválido.");
  }

  const key = await deriveKey(pin, hexToBuffer(saltHex));

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: hexToBuffer(ivHex) },
      key,
      hexToBuffer(ciphertextHex)
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch {
    throw new Error("PIN de seguridad incorrecto.");
  }
}
