/**
 * Fetches real-time crypto prices using the public CoinGecko Simple Price API.
 */
export async function fetchLiveCryptoPrices(): Promise<Record<string, number>> {
  try {
    // CoinGecko IDs for our supported assets
    const ids = "solana,bitcoin,binancecoin,usd-coin,tether,bonk";
    const vs_currencies = "usd";
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vs_currencies}`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API returned status ${response.status}`);
    }

    const data = await response.json();
    
    // Map CoinGecko IDs to our internal asset symbols
    const prices: Record<string, number> = {
      SOL: data["solana"]?.usd || 0,
      BTC: data["bitcoin"]?.usd || 0,
      BNB: data["binancecoin"]?.usd || 0,
      USDC: data["usd-coin"]?.usd || 1,
      USDT: data["tether"]?.usd || 1,
      BONK: data["bonk"]?.usd || 0,
    };

    return prices;
  } catch (error) {
    console.error("Error fetching live crypto prices:", error);
    // Retornamos precios fallback por seguridad si la API de CoinGecko falla o tiene rate limit
    return {
      SOL: 135.20,
      BTC: 65420.50,
      BNB: 590.10,
      USDC: 1.00,
      USDT: 1.00,
      BONK: 0.000022
    };
  }
}
