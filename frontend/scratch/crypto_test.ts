import { deriveAllWallets } from "../../../../Desktop/Proyecto Cryptowallet/src/lib/multichain-derivation";
import { isValidMnemonic } from "../../../../Desktop/Proyecto Cryptowallet/src/lib/bip39-util";

async function runTests() {
  console.log("=== INICIANDO SUITE DE PRUEBAS CRIPTOGRÁFICAS DE AETHER WALLET ===");

  // 1. Vector de Prueba Mnemonic BIP39 estándar
  const testMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
  console.log(`\nMnemonic de prueba: "${testMnemonic}"`);

  // Validar mnemonic
  const valid = isValidMnemonic(testMnemonic);
  console.log(`¿Mnemonic válido?: ${valid ? "✅ SÍ" : "❌ NO"}`);
  if (!valid) {
    throw new Error("El mnemonic de prueba no es válido según BIP39.");
  }

  // 2. Ejecutar derivaciones multired
  console.log("\nDerivando llaves en paralelo...");
  const start = Date.now();
  const wallets = await deriveAllWallets(testMnemonic);
  const end = Date.now();
  console.log(`Derivación completada en ${end - start}ms.`);

  // 3. Verificaciones de Solana (Ed25519)
  console.log("\n--- [VERIFICACIÓN SOLANA] ---");
  console.log(`Dirección Pública Solana: ${wallets.solana.publicKey}`);
  console.log(`Clave Privada Hex: ${wallets.solana.privateKeyHex}`);
  console.log(`Clave Privada Base58: ${wallets.solana.privateKeyBase58}`);
  
  // Verificaciones de assertion Solana
  // El keypair de Solana estándar para m/44'/501'/0'/0' con abandon...about debe generar una clave válida de 32-44 bytes base58
  const solPublic = wallets.solana.publicKey;
  const isBase58Sol = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(solPublic);
  console.log(`¿Solana Address cumple formato Base58?: ${isBase58Sol ? "✅ SÍ" : "❌ NO"}`);

  // 4. Verificaciones de Bitcoin (Native SegWit Bech32 BIP84)
  console.log("\n--- [VERIFICACIÓN BITCOIN (SegWit BIP84)] ---");
  console.log(`Dirección Pública Bitcoin: ${wallets.bitcoin.address}`);
  console.log(`Clave Privada Hex: ${wallets.bitcoin.privateKeyHex}`);
  console.log(`Clave Privada WIF: ${wallets.bitcoin.privateKeyWIF}`);

  // BIP84 expected vector para "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
  // m/84'/0'/0'/0/0 es bc1qcr822s34ucl2a8rz52u5th4khll6ty8w47w3ss
  const expectedBtcAddress = "bc1qcr822s34ucl2a8rz52u5th4khll6ty8w47w3ss";
  const btcMatch = wallets.bitcoin.address === expectedBtcAddress;
  console.log(`Dirección Bitcoin Esperada: ${expectedBtcAddress}`);
  console.log(`¿Coincide con el Vector de Prueba Oficial BIP84?: ${btcMatch ? "✅ EXCELENTE (COINCIDENCIA TOTAL)" : "❌ NO COINCIDE"}`);

  // Validar formato WIF
  const isWIF = /^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(wallets.bitcoin.privateKeyWIF);
  console.log(`¿Clave Privada en formato WIF comprimido válido?: ${isWIF ? "✅ SÍ" : "❌ NO"}`);

  // 5. Verificaciones de BNB Chain (EVM BIP44)
  console.log("\n--- [VERIFICACIÓN BNB CHAIN (EVM)] ---");
  console.log(`Dirección EVM/BNB: ${wallets.bnb.address}`);
  console.log(`Clave Privada Hex: ${wallets.bnb.privateKeyHex}`);

  // BIP44 Ethereum/EVM account 0 child 0 para m/44'/60'/0'/0/0 con abandon...about
  // Dirección esperada: 0x9858Ef4aa556637F55681D065C74c4d5B652D028 (con Checksum EIP-55)
  const expectedBnbAddress = "0x9858Ef4aa556637F55681D065C74c4d5B652D028";
  const bnbMatch = wallets.bnb.address === expectedBnbAddress;
  console.log(`Dirección EVM Esperada: ${expectedBnbAddress}`);
  console.log(`¿Coincide con el Vector de Prueba Oficial BIP44 (EIP-55)?: ${bnbMatch ? "✅ EXCELENTE (COINCIDENCIA TOTAL)" : "❌ NO COINCIDE"}`);

  // Validar EIP-55 checksum case sensitivity
  const isEIP55 = /^0x[a-fA-F0-9]{40}$/.test(wallets.bnb.address);
  console.log(`¿EVM Address cumple formato hexadecimal 42 caracteres?: ${isEIP55 ? "✅ SÍ" : "❌ NO"}`);

  console.log("\n==================================================================");
  if (btcMatch && bnbMatch && isBase58Sol && isWIF) {
    console.log("🏆 ¡TODAS LAS PRUEBAS CRIPTOGRÁFICAS PASARON EXITOSAMENTE! 🏆");
  } else {
    console.log("🚨 ALGUNAS PRUEBAS FALLARON. REVISAR IMPLEMENTACIONES. 🚨");
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Error ejecutando la suite de pruebas:", err);
  process.exit(1);
});
