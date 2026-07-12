"use client";

import { secp256k1 } from "@noble/curves/secp256k1.js";
import { keccak_256 } from "@noble/hashes/sha3.js";

const isTestnet = process.env.NEXT_PUBLIC_NETWORK === "testnet";

// BSC public RPC
const BSC_RPC = isTestnet
  ? "https://data-seed-prebsc-1-s1.binance.org:8545/"
  : "https://bsc-dataseed.binance.org/";

async function rpcCall(method: string, params: unknown[]): Promise<any> {
  const res = await fetch(BSC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`BSC RPC error ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

export async function getBnbBalance(address: string): Promise<number> {
  const hexBalance = await rpcCall("eth_getBalance", [address, "latest"]);
  const wei = BigInt(hexBalance);
  return Number(wei) / 1e18;
}

export interface BnbTransaction {
  hash: string;
  type: "send" | "receive";
  amount: number;
  fee: number;
  timestamp: number | null;
  status: "confirmed" | "pending";
  otherAddress: string;
}

// BSC RPC no expone historial directamente — usamos BscScan API pública (sin key, límite básico)
const BSCSCAN_API = isTestnet
  ? "https://api-testnet.bscscan.com/api"
  : "https://api.bscscan.com/api";

function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  return new Uint8Array(h.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function encodeRLP(value: (string | Uint8Array | (string | Uint8Array)[])[]): Uint8Array {
  const encodeItem = (item: string | Uint8Array): Uint8Array => {
    const bytes = typeof item === "string" ? hexToBytes(item || "0x") : item;
    if (bytes.length === 1 && bytes[0] < 0x80) return bytes;
    const len = bytes.length;
    if (len <= 55) return new Uint8Array([0x80 + len, ...bytes]);
    const lenBytes = encodeLength(len);
    return new Uint8Array([0xb7 + lenBytes.length, ...lenBytes, ...bytes]);
  };

  const encodeLength = (n: number): Uint8Array => {
    const out: number[] = [];
    while (n > 0) { out.unshift(n & 0xff); n >>= 8; }
    return new Uint8Array(out);
  };

  const encodedItems = value.map((item) =>
    Array.isArray(item) ? encodeRLP(item) : encodeItem(item)
  );
  const total = encodedItems.reduce((s, b) => s + b.length, 0);
  if (total <= 55) {
    return new Uint8Array([0xc0 + total, ...encodedItems.flatMap((b) => [...b])]);
  }
  const lenBytes = encodeLength(total);
  return new Uint8Array([0xf7 + lenBytes.length, ...lenBytes, ...encodedItems.flatMap((b) => [...b])]);
}

function numToHex(n: bigint): string {
  if (n === 0n) return "0x";
  return "0x" + n.toString(16);
}

/**
 * Envía BNB real desde la wallet del usuario firmando la tx localmente.
 * privateKeyHex: clave privada en hex (sin 0x).
 * Retorna el hash de la transacción.
 */
export async function sendBNB(
  privateKeyHex: string,
  toAddress: string,
  amountBNB: number
): Promise<string> {
  const privKeyBytes = hexToBytes(privateKeyHex);
  const pubKey = secp256k1.getPublicKey(privKeyBytes, false);
  const addressBytes = keccak_256(pubKey.slice(1)).slice(-20);
  const fromAddress = "0x" + bytesToHex(addressBytes);

  const [nonce, gasPrice] = await Promise.all([
    rpcCall("eth_getTransactionCount", [fromAddress, "latest"]) as Promise<string>,
    rpcCall("eth_gasPrice", []) as Promise<string>,
  ]);

  const isTestnet = process.env.NEXT_PUBLIC_NETWORK === "testnet";
  const chainId = isTestnet ? 97n : 56n; // BSC mainnet 56n, BSC testnet 97n
  const gasLimit = 21000n;
  const value = BigInt(Math.round(amountBNB * 1e18));
  const nonceBig = BigInt(nonce);
  const gasPriceBig = BigInt(gasPrice);

  // EIP-155 signing: encode [nonce, gasPrice, gasLimit, to, value, data, chainId, 0, 0]
  const txData = [
    hexToBytes(numToHex(nonceBig)),
    hexToBytes(numToHex(gasPriceBig)),
    hexToBytes(numToHex(gasLimit)),
    hexToBytes(toAddress),
    hexToBytes(numToHex(value)),
    new Uint8Array(0), // data
    hexToBytes(numToHex(chainId)),
    new Uint8Array(0),
    new Uint8Array(0),
  ];

  const rlpEncoded = encodeRLP(txData);
  const hash = keccak_256(rlpEncoded);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sig: any = secp256k1.sign(hash, privKeyBytes, { lowS: true });
  const recovery: number = sig.recovery ?? 0;
  const v = BigInt(recovery) + 35n + chainId * 2n;

  const signedTx = [
    hexToBytes(numToHex(nonceBig)),
    hexToBytes(numToHex(gasPriceBig)),
    hexToBytes(numToHex(gasLimit)),
    hexToBytes(toAddress),
    hexToBytes(numToHex(value)),
    new Uint8Array(0),
    hexToBytes(numToHex(v)),
    hexToBytes("0x" + (sig.r as bigint).toString(16).padStart(64, "0")),
    hexToBytes("0x" + (sig.s as bigint).toString(16).padStart(64, "0")),
  ];

  const rawTx = "0x" + bytesToHex(encodeRLP(signedTx));
  return await rpcCall("eth_sendRawTransaction", [rawTx]) as string;
}

export async function getBnbTransactionHistory(
  address: string,
  limit = 20
): Promise<BnbTransaction[]> {
  const url = `${BSCSCAN_API}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`BscScan error ${res.status}`);
  const data = await res.json();

  if (data.status !== "1" || !Array.isArray(data.result)) return [];

  return data.result.map((tx: any) => {
    const isSend = tx.from.toLowerCase() === address.toLowerCase();
    const valueEth = Number(BigInt(tx.value)) / 1e18;
    const gasUsed = Number(tx.gasUsed ?? tx.gas ?? 0);
    const gasPrice = Number(tx.gasPrice ?? 0);
    const fee = (gasUsed * gasPrice) / 1e18;

    return {
      hash: tx.hash,
      type: isSend ? "send" : "receive",
      amount: valueEth,
      fee,
      timestamp: tx.timeStamp ? Number(tx.timeStamp) : null,
      status: tx.txreceipt_status === "1" ? "confirmed" : "pending",
      otherAddress: isSend ? tx.to : tx.from,
    };
  });
}
