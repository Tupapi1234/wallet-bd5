"use client";

import { generateMnemonic, mnemonicToSeed, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { Keypair } from "@solana/web3.js";
import { derivePath } from "ed25519-hd-key";

/**
 * Generates a 12-word seed phrase (128 bits of entropy) using the BIP39 English wordlist.
 */
export function generate12WordMnemonic(): string {
  return generateMnemonic(wordlist, 128);
}

/**
 * Validates whether a given mnemonic phrase conforms to the BIP39 standard and the English wordlist.
 */
export function isValidMnemonic(mnemonic: string): boolean {
  if (!mnemonic) return false;
  return validateMnemonic(mnemonic.trim().toLowerCase(), wordlist);
}

/**
 * Converts a BIP39 mnemonic phrase to a binary seed buffer (512 bits / 64 bytes).
 */
export async function mnemonicToSeedBuffer(mnemonic: string, passphrase = ""): Promise<Uint8Array> {
  return await mnemonicToSeed(mnemonic.trim().toLowerCase(), passphrase);
}

/**
 * Helper to convert Uint8Array to a hex string.
 */
function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Helper to encode a Uint8Array into a Base58 string (avoids external dependency issues in Next.js).
 */
function encodeBase58(buffer: Uint8Array): string {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const digits = [0];
  for (let i = 0; i < buffer.length; i++) {
    let carry = buffer[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let string = "";
  // handle leading zeros
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
    string += ALPHABET[0];
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    string += ALPHABET[digits[i]];
  }
  return string;
}

export interface DerivedSolanaKeypair {
  publicKey: string;
  privateKeyHex: string;
  privateKeyBase58: string;
}

/**
 * Derives a Solana keypair from a 12-word seed phrase.
 * Uses the standard derivation path m/44'/501'/0'/0'.
 *
 * @param mnemonic The 12-word seed phrase.
 * @returns Derived Solana public key and private key strings.
 */
export async function deriveSolanaKeypair(mnemonic: string): Promise<DerivedSolanaKeypair> {
  if (!isValidMnemonic(mnemonic)) {
    throw new Error("Frase semilla inválida.");
  }

  // 1. Convert mnemonic to 64-byte seed buffer
  const seedBuffer = await mnemonicToSeedBuffer(mnemonic);
  const seedHex = uint8ArrayToHex(seedBuffer);

  // 2. Derive key from standard path m/44'/501'/0'/0' (hardened)
  const path = "m/44'/501'/0'/0'";
  const derived = derivePath(path, seedHex);

  // 3. Generate Keypair from the derived 32-byte seed
  const keypair = Keypair.fromSeed(derived.key);

  return {
    publicKey: keypair.publicKey.toBase58(),
    privateKeyHex: uint8ArrayToHex(keypair.secretKey),
    privateKeyBase58: encodeBase58(keypair.secretKey),
  };
}
