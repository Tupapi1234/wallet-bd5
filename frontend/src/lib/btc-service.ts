"use client";

const BLOCKSTREAM_API = "https://blockstream.info/api";

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
