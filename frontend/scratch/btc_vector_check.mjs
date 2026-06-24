import { mnemonicToSeed } from "@scure/bip39";
import { HDKey } from "@scure/bip32";
import { sha256 } from "@noble/hashes/sha2.js";
import { ripemd160 } from "@noble/hashes/legacy.js";
import { bech32 } from "@scure/base";

const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const seed = await mnemonicToSeed(mnemonic);
const root = HDKey.fromMasterSeed(seed);
const child = root.derive("m/84'/0'/0'/0/0");
const shaHash = sha256(child.publicKey);
const hash160 = ripemd160(shaHash);
const words = bech32.toWords(hash160);
const vw = new Uint8Array(1 + words.length);
vw[0] = 0; vw.set(words, 1);
console.log("BTC Address (BIP84 m/84/0/0/0/0):", bech32.encode("bc", vw));
