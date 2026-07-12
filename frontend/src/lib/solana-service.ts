"use client";

import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  Keypair,
} from "@solana/web3.js";
import { 
  getOrCreateAssociatedTokenAccount, 
  createTransferInstruction 
} from "@solana/spl-token";

function decodeBase58(str: string): Uint8Array {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const bytes = [0];
  for (let i = 0; i < str.length; i++) {
    const value = ALPHABET.indexOf(str[i]);
    if (value < 0) throw new Error("Carácter inválido en Base58");
    let carry = value;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; i < str.length && str[i] === "1"; i++) {
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}

const isTestnet = process.env.NEXT_PUBLIC_NETWORK === "testnet";
const RPC_ENDPOINT = isTestnet
  ? "https://api.devnet.solana.com"
  : `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`;

export function getSolanaConnection(): Connection {
  return new Connection(RPC_ENDPOINT, "confirmed");
}

/**
 * Consulta el saldo real de SOL de una dirección en la red Solana.
 * Retorna el saldo en SOL (no en lamports).
 */
export async function getSolanaBalance(publicKeyStr: string): Promise<number> {
  const connection = getSolanaConnection();
  const pubKey = new PublicKey(publicKeyStr);
  const lamports = await connection.getBalance(pubKey);
  return lamports / LAMPORTS_PER_SOL;
}

export interface SolanaTokenBalance {
  mint: string;
  symbol: string;
  amount: number;
  decimals: number;
  uiAmount: number;
}

/**
 * Consulta los saldos de tokens SPL (USDC, BONK, etc.) de una dirección.
 */
export async function getSolanaTokenBalances(publicKeyStr: string): Promise<SolanaTokenBalance[]> {
  const connection = getSolanaConnection();
  const pubKey = new PublicKey(publicKeyStr);

  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  });

  return tokenAccounts.value.map((account) => {
    const info = account.account.data.parsed.info;
    return {
      mint: info.mint,
      symbol: info.mint,
      amount: info.tokenAmount.amount,
      decimals: info.tokenAmount.decimals,
      uiAmount: info.tokenAmount.uiAmount ?? 0,
    };
  });
}

export interface SolanaTransaction {
  signature: string;
  blockTime: number | null | undefined;
  type: "send" | "receive";
  amount: number;
  fee: number;
  otherAddress: string;
  status: "confirmed" | "failed";
}

/**
 * Obtiene el historial de transacciones reales de una dirección Solana.
 */
export async function getSolanaTransactionHistory(
  publicKeyStr: string,
  limit = 20
): Promise<SolanaTransaction[]> {
  const connection = getSolanaConnection();
  const pubKey = new PublicKey(publicKeyStr);

  const signatures = await connection.getSignaturesForAddress(pubKey, { limit });
  const results: SolanaTransaction[] = [];

  for (const sigInfo of signatures) {
    try {
      const tx = await connection.getParsedTransaction(sigInfo.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || !tx.meta) continue;

      const accountKeys = tx.transaction.message.accountKeys;
      const ownIndex = accountKeys.findIndex(
        (k) => k.pubkey.toBase58() === publicKeyStr
      );

      if (ownIndex === -1) continue;

      const preLamports = tx.meta.preBalances[ownIndex];
      const postLamports = tx.meta.postBalances[ownIndex];
      const delta = (postLamports - preLamports) / LAMPORTS_PER_SOL;
      const fee = tx.meta.fee / LAMPORTS_PER_SOL;

      const type = delta >= 0 ? "receive" : "send";

      const otherIndex = ownIndex === 0 ? 1 : 0;
      const otherAddress =
        accountKeys[otherIndex]?.pubkey.toBase58() ?? "unknown";

      results.push({
        signature: sigInfo.signature,
        blockTime: tx.blockTime,
        type,
        amount: Math.abs(delta),
        fee,
        otherAddress,
        status: tx.meta.err ? "failed" : "confirmed",
      });
    } catch {
      // Skip transactions that can't be parsed
    }
  }

  return results;
}

/**
 * Envía SOL real desde la wallet del usuario a una dirección destino.
 * Requiere la clave privada en formato Base58.
 * Retorna la firma de la transacción.
 */
export async function sendSOL(
  privateKeyBase58: string,
  toAddressStr: string,
  amountSOL: number
): Promise<string> {
  const connection = getSolanaConnection();

  const privateKeyBytes = decodeBase58(privateKeyBase58);
  const senderKeypair = Keypair.fromSecretKey(privateKeyBytes);

  const toPublicKey = new PublicKey(toAddressStr);
  const lamports = Math.round(amountSOL * LAMPORTS_PER_SOL);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: senderKeypair.publicKey,
      toPubkey: toPublicKey,
      lamports,
    })
  );

  const signature = await sendAndConfirmTransaction(connection, transaction, [
    senderKeypair,
  ]);

  return signature;
}

/**
 * Estima la comisión actual de una transacción SOL en la red.
 * Retorna la comisión en SOL.
 */
export async function estimateSolanaFee(): Promise<number> {
  try {
    const connection = getSolanaConnection();
    const { value } = await connection.getFeeForMessage(
      new Transaction().compileMessage()
    );
    return (value ?? 5000) / LAMPORTS_PER_SOL;
  } catch {
    return 5000 / LAMPORTS_PER_SOL;
  }
}

/**
 * Consulta los NFTs de una dirección usando Helius DAS API.
 */
export async function getSolanaNFTs(publicKeyStr: string): Promise<any[]> {
  const response = await fetch(RPC_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'my-id',
      method: 'getAssetsByOwner',
      params: {
        ownerAddress: publicKeyStr,
        page: 1,
        limit: 50,
      }
    })
  });
  
  const { result } = await response.json();
  if (!result || !result.items) return [];

  return result.items.map((item: any) => {
    // Only return NFTs (typically items without decimals or specific interface)
    // The DAS API returns all assets, including tokens, so we filter out regular fungible tokens if possible.
    // In DAS, NFTs often have interface 'V1_NFT' or 'Custom'
    const imageUrl = item.content?.links?.image || item.content?.files?.[0]?.uri || 'linear-gradient(135deg, #14F195 0%, #9945FF 100%)';
    const name = item.content?.metadata?.name || 'Unknown NFT';
    return {
      id: item.id,
      name,
      collection: item.grouping?.find((g: any) => g.group_key === 'collection')?.group_value || name,
      chain: 'solana',
      imageUrl,
      description: item.content?.metadata?.description || '',
      mintAddress: item.id,
    };
  }).filter((nft: any) => nft.name !== 'Unknown NFT');
}

/**
 * Envía un NFT (SPL Token con balance de 1) desde la wallet del usuario a una dirección destino.
 * Requiere la clave privada en formato Base58.
 * Retorna la firma de la transacción.
 */
export async function sendSolanaNFT(
  privateKeyBase58: string,
  toAddressStr: string,
  mintAddressStr: string
): Promise<string> {
  const connection = getSolanaConnection();
  const privateKeyBytes = decodeBase58(privateKeyBase58);
  const senderKeypair = Keypair.fromSecretKey(privateKeyBytes);
  const toPublicKey = new PublicKey(toAddressStr);
  const mintPublicKey = new PublicKey(mintAddressStr);

  const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    senderKeypair,
    mintPublicKey,
    senderKeypair.publicKey
  );

  const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    senderKeypair,
    mintPublicKey,
    toPublicKey
  );

  const transaction = new Transaction().add(
    createTransferInstruction(
      senderTokenAccount.address,
      recipientTokenAccount.address,
      senderKeypair.publicKey,
      1 // NFTs siempre se envían en cantidad 1, asumiendo 0 decimales
    )
  );

  const signature = await sendAndConfirmTransaction(connection, transaction, [
    senderKeypair,
  ]);

  return signature;
}
