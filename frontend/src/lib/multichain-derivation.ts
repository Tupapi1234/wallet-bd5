"use client";

import { HDKey } from "@scure/bip32";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { ripemd160 } from "@noble/hashes/legacy.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { bech32 } from "@scure/base";
import { mnemonicToSeedBuffer, isValidMnemonic, deriveSolanaKeypair, DerivedSolanaKeypair } from "./bip39-util";

// ==========================================
// CRYPTOGRAPHIC UTILITIES & FORMATTERS
// ==========================================

/**
 * Encodes a byte array as a hex string.
 */
function bytesToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Implements EIP-55: Mixed-case checksum address creation for EVM chains.
 */
export function toEVMChecksumAddress(address: string): string {
  const cleanAddress = address.toLowerCase().replace("0x", "");
  // Convert the string characters to UTF-8 bytes for Keccak hashing
  const addressBytes = new TextEncoder().encode(cleanAddress);
  const hash = keccak_256(addressBytes);
  const hashHex = bytesToHex(hash);
  
  let checksumAddress = "0x";
  for (let i = 0; i < cleanAddress.length; i++) {
    const char = cleanAddress[i];
    if (/[a-f]/.test(char) && parseInt(hashHex[i], 16) >= 8) {
      checksumAddress += char.toUpperCase();
    } else {
      checksumAddress += char;
    }
  }
  return checksumAddress;
}

/**
 * Formats a Secp256k1 private key into Bitcoin's Wallet Import Format (WIF)
 * for compressed public keys (Mainnet).
 */
export function toBitcoinWIF(privateKeyBytes: Uint8Array): string {
  // WIF compressed format: [0x80/0xef (version)] + [32 bytes private key] + [0x01 (compressed flag)]
  const wifBytes = new Uint8Array(1 + 32 + 1);
  const isTestnet = process.env.NEXT_PUBLIC_NETWORK === "testnet";
  wifBytes[0] = isTestnet ? 0xef : 0x80; // Mainnet private key prefix is 0x80, Testnet is 0xef
  wifBytes.set(privateKeyBytes, 1);
  wifBytes[33] = 0x01; // Compressed public key flag
  
  // Double SHA-256 for checksum
  const firstHash = sha256(wifBytes);
  const secondHash = sha256(firstHash);
  const checksum = secondHash.slice(0, 4);
  
  // Combine bytes + checksum
  const finalBytes = new Uint8Array(wifBytes.length + 4);
  finalBytes.set(wifBytes, 0);
  finalBytes.set(checksum, wifBytes.length);
  
  // Custom simple Base58 encoder to avoid external library conflicts
  return encodeBase58(finalBytes);
}

/**
 * Base58 encoder helper (conforms to Bitcoin's alphabet).
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

// ==========================================
// MULTI-CHAIN KEY DERIVATION INTERFACES
// ==========================================

export interface DerivedEVMKeypair {
  address: string;
  privateKeyHex: string;
}

export interface DerivedBitcoinKeypair {
  address: string;
  privateKeyHex: string;
  privateKeyWIF: string;
}

export interface MultichainWallets {
  solana: DerivedSolanaKeypair;
  bitcoin: DerivedBitcoinKeypair;
  bnb: DerivedEVMKeypair;
}

// ==========================================
// ENGINE FUNCTIONS
// ==========================================

/**
 * Derives a BNB Chain (EVM) keypair from a seed phrase.
 * Path: m/44'/60'/0'/0/0 (Standard EVM BIP44)
 */
export async function deriveBNBKeypair(mnemonic: string): Promise<DerivedEVMKeypair> {
  if (!isValidMnemonic(mnemonic)) {
    throw new Error("Frase semilla inválida.");
  }

  const seed = await mnemonicToSeedBuffer(mnemonic);
  const root = HDKey.fromMasterSeed(seed);
  
  // Derivation path m/44'/60'/0'/0/0
  const child = root.derive("m/44'/60'/0'/0/0");
  
  if (!child.privateKey) {
    throw new Error("No se pudo derivar la clave privada BNB.");
  }

  // Derive uncompressed public key (65 bytes, starts with 0x04)
  const uncompressedPubKey = secp256k1.getPublicKey(child.privateKey, false);
  
  // Slice off the first byte (0x04) to get the raw 64-byte public key coordinate
  const rawPubKey = uncompressedPubKey.slice(1);
  
  // Calculate Keccak-256 hash of raw coordinate
  const hash = keccak_256(rawPubKey);
  
  // Take last 20 bytes as address
  const addressBytes = hash.slice(-20);
  const rawAddress = "0x" + bytesToHex(addressBytes);
  
  // Convert to premium EIP-55 checksum format
  const checksumAddress = toEVMChecksumAddress(rawAddress);

  return {
    address: checksumAddress,
    privateKeyHex: bytesToHex(child.privateKey)
  };
}

/**
 * Derives a Bitcoin Native SegWit Bech32 keypair from a seed phrase.
 * Path: m/84'/0'/0'/0/0 (Standard Native SegWit BIP84)
 */
export async function deriveBitcoinKeypair(mnemonic: string): Promise<DerivedBitcoinKeypair> {
  if (!isValidMnemonic(mnemonic)) {
    throw new Error("Frase semilla inválida.");
  }

  const seed = await mnemonicToSeedBuffer(mnemonic);
  const root = HDKey.fromMasterSeed(seed);
  
  // Derivation path m/84'/0'/0'/0/0 (BIP84 Mainnet) or m/84'/1'/0'/0/0 (BIP84 Testnet)
  const isTestnet = process.env.NEXT_PUBLIC_NETWORK === "testnet";
  const path = isTestnet ? "m/84'/1'/0'/0/0" : "m/84'/0'/0'/0/0";
  const child = root.derive(path);
  
  if (!child.privateKey) {
    throw new Error("No se pudo derivar la clave privada Bitcoin.");
  }

  // 1. Get compressed public key (33 bytes) from bip32 node
  const compressedPubKey = child.publicKey;
  if (!compressedPubKey) {
    throw new Error("No se pudo obtener la clave pública Bitcoin.");
  }

  // 2. Perform HASH160: RIPEMD160(SHA256(compressedPubKey))
  const shaHash = sha256(compressedPubKey);
  const hash160 = ripemd160(shaHash);

  // 3. Convert 20-byte hash160 to 5-bit words
  const words = bech32.toWords(hash160);

  // 4. Prepend witness version 0 (for Native SegWit v0)
  const versionedWords = new Uint8Array(1 + words.length);
  versionedWords[0] = 0;
  versionedWords.set(words, 1);

  // 5. Encode using Bech32 with human-readable part 'bc' (Mainnet) or 'tb' (Testnet)
  const address = bech32.encode(isTestnet ? "tb" : "bc", versionedWords);

  return {
    address,
    privateKeyHex: bytesToHex(child.privateKey),
    privateKeyWIF: toBitcoinWIF(child.privateKey)
  };
}

/**
 * Derives all three target blockchain wallets in parallel.
 */
export async function deriveAllWallets(mnemonic: string): Promise<MultichainWallets> {
  const [solana, bitcoin, bnb] = await Promise.all([
    deriveSolanaKeypair(mnemonic),
    deriveBitcoinKeypair(mnemonic),
    deriveBNBKeypair(mnemonic)
  ]);

  return {
    solana,
    bitcoin,
    bnb
  };
}
