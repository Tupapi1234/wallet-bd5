import { Connection, Keypair, SystemProgram, Transaction, PublicKey, sendAndConfirmTransaction, ComputeBudgetProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";

const isTestnet = process.env.NEXT_PUBLIC_NETWORK === "testnet";
const SOLANA_RPC = isTestnet 
  ? "https://api.devnet.solana.com" 
  : "https://mainnet.helius-rpc.com/?api-key=" + process.env.NEXT_PUBLIC_HELIUS_API_KEY;

export type PriorityLevel = "baja" | "estandar" | "alta";

const SOLANA_COMPUTE_UNITS = {
  baja: 1000,
  estandar: 5000,
  alta: 20000
};

export async function sendSOL(
  privateKeyBase58: string, 
  recipientAddress: string, 
  amountSOL: number, 
  priority: PriorityLevel = "estandar"
): Promise<string> {
  const connection = new Connection(SOLANA_RPC, "confirmed");
  
  // Decodificar clave privada y generar Keypair
  const secretKey = bs58.decode(privateKeyBase58);
  const fromKeypair = Keypair.fromSecretKey(secretKey);

  let toPubkey: PublicKey;
  try {
    toPubkey = new PublicKey(recipientAddress);
  } catch (error) {
    throw new Error("Dirección Solana destinataria inválida.");
  }

  // Verificar si se está enviando a la misma dirección
  if (fromKeypair.publicKey.toString() === toPubkey.toString()) {
    throw new Error("No puedes enviarte SOL a ti mismo.");
  }

  // Convertir monto a lamports
  const lamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);

  // Construir la transacción
  const transaction = new Transaction();

  // Añadir la tarifa de prioridad basada en el nivel seleccionado
  const computePrice = SOLANA_COMPUTE_UNITS[priority];
  const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: computePrice,
  });
  transaction.add(modifyComputeUnits);

  // Añadir instrucción de transferencia
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey,
      lamports,
    })
  );

  // Obtener último blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromKeypair.publicKey;

  // Firmar y enviar
  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [fromKeypair]
    );
    return signature;
  } catch (error: any) {
    console.error("Error transmitiendo transacción en Solana:", error);
    throw new Error("Error al transmitir transacción. Revisa si hay suficiente balance o si la red está congestionada.");
  }
}
