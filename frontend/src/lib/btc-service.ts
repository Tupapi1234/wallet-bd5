"use client";

const BLOCKSTREAM_API = "https://blockstream.info/api";

interface UTXO {
  txid: string;
  vout: number;
  value: number; // satoshis
}

async function getUTXOs(address: string): Promise<UTXO[]> {
  const res = await fetch(`${BLOCKSTREAM_API}/address/${address}/utxo`);
  if (!res.ok) throw new Error(`Blockstream UTXO error ${res.status}`);
  return await res.json();
}

async function getFeeRate(): Promise<number> {
  const res = await fetch(`${BLOCKSTREAM_API}/fee-estimates`);
  if (!res.ok) return 10; // fallback: 10 sat/vbyte
  const data = await res.json();
  return Math.ceil(data["3"] ?? data["6"] ?? 10); // confirmación en ~3 bloques
}

async function broadcastTx(txHex: string): Promise<string> {
  const res = await fetch(`${BLOCKSTREAM_API}/tx`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: txHex,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Broadcast error: ${err}`);
  }
  return await res.text(); // txid
}

/**
 * Envía BTC real. Usa UTXOs de la dirección para construir y firmar la tx.
 * privateKeyHex: clave privada en hex (32 bytes).
 * Retorna el txid de la transacción.
 */
export async function sendBTC(
  privateKeyHex: string,
  toAddress: string,
  amountBTC: number
): Promise<string> {
  // Import bitcoinjs-lib dinámicamente para evitar problemas SSR
  const bitcoin = await import("bitcoinjs-lib");
  const { ECPairFactory } = await import("ecpair");
  const tinysecp = await import("tiny-secp256k1");

  const ECPair = ECPairFactory(tinysecp);
  const network = bitcoin.networks.bitcoin;

  const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKeyHex, "hex"), { network });
  const { address: fromAddress } = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network });

  if (!fromAddress) throw new Error("No se pudo derivar la dirección BTC.");

  const utxos = await getUTXOs(fromAddress);
  if (utxos.length === 0) throw new Error("No hay fondos disponibles (sin UTXOs).");

  const feeRate = await getFeeRate();
  const amountSats = Math.round(amountBTC * 1e8);

  // Seleccionar UTXOs suficientes (greedy)
  let inputTotal = 0;
  const selectedUtxos: UTXO[] = [];
  for (const utxo of utxos.sort((a, b) => b.value - a.value)) {
    selectedUtxos.push(utxo);
    inputTotal += utxo.value;
    if (inputTotal >= amountSats + feeRate * 250) break; // estimación inicial
  }

  const estimatedFee = feeRate * (148 * selectedUtxos.length + 34 * 2 + 10);
  const change = inputTotal - amountSats - estimatedFee;

  if (change < 0) throw new Error("Saldo insuficiente para cubrir el monto y la comisión.");

  const psbt = new bitcoin.Psbt({ network });

  for (const utxo of selectedUtxos) {
    const txRes = await fetch(`${BLOCKSTREAM_API}/tx/${utxo.txid}/hex`);
    const txHex = await txRes.text();
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      nonWitnessUtxo: Buffer.from(txHex, "hex"),
    });
  }

  psbt.addOutput({ address: toAddress, value: BigInt(amountSats) });
  if (change > 546) { // dust threshold
    psbt.addOutput({ address: fromAddress, value: BigInt(change) });
  }

  psbt.signAllInputs(keyPair);
  psbt.finalizeAllInputs();

  const txHex = psbt.extractTransaction().toHex();
  return await broadcastTx(txHex);
}

export interface BtcAddressInfo {
  balance: number; // en BTC
  txCount: number;
}

export async function getBtcBalance(address: string): Promise<number> {
  const res = await fetch(`${BLOCKSTREAM_API}/address/${address}`);
  if (!res.ok) throw new Error(`Blockstream error ${res.status}`);
  const data = await res.json();
  const confirmedSats: number = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
  return confirmedSats / 1e8;
}

export interface BtcTransaction {
  txid: string;
  type: "send" | "receive";
  amount: number;
  fee: number;
  timestamp: number | null;
  status: "confirmed" | "pending";
  otherAddress: string;
}

export async function getBtcTransactionHistory(
  address: string,
  limit = 20
): Promise<BtcTransaction[]> {
  const res = await fetch(`${BLOCKSTREAM_API}/address/${address}/txs`);
  if (!res.ok) throw new Error(`Blockstream error ${res.status}`);
  const txs: any[] = await res.json();

  return txs.slice(0, limit).map((tx) => {
    const inputValue = tx.vin.reduce((sum: number, vin: any) => {
      const mine = vin.prevout?.scriptpubkey_address === address;
      return sum + (mine ? vin.prevout.value : 0);
    }, 0);

    const outputToMe = tx.vout.reduce((sum: number, vout: any) => {
      return sum + (vout.scriptpubkey_address === address ? vout.value : 0);
    }, 0);

    const outputFromMe = tx.vout.reduce((sum: number, vout: any) => {
      return sum + (vout.scriptpubkey_address !== address ? vout.value : 0);
    }, 0);

    const isSend = inputValue > 0;
    const amount = isSend ? outputFromMe / 1e8 : outputToMe / 1e8;
    const fee = (tx.fee ?? 0) / 1e8;

    const otherAddress = isSend
      ? tx.vout.find((v: any) => v.scriptpubkey_address !== address)?.scriptpubkey_address ?? "unknown"
      : tx.vin[0]?.prevout?.scriptpubkey_address ?? "unknown";

    return {
      txid: tx.txid,
      type: isSend ? "send" : "receive",
      amount,
      fee,
      timestamp: tx.status?.block_time ?? null,
      status: tx.status?.confirmed ? "confirmed" : "pending",
      otherAddress,
    };
  });
}
