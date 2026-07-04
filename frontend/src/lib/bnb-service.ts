"use client";

// BSC public RPC — no API key required
const BSC_RPC = "https://bsc-dataseed.binance.org/";

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
const BSCSCAN_API = "https://api.bscscan.com/api";

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
