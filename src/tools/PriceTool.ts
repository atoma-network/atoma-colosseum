import { Aftermath } from "aftermath-ts-sdk";
import axios from "axios";
const af = new Aftermath("MAINNET");
const prices = af.Prices();
import { COIN_ADDRESSES, COIN_SYNONYMS } from "../../@types/interface";

/**
 * Normalizes a coin symbol by handling various formats and synonyms
 * @param symbol - Raw coin symbol input
 * @returns Normalized coin symbol or null if not recognized
 */
function normalizeCoinSymbol(symbol: string): string | null {
  const normalized = symbol
    .trim()
    .toUpperCase()
    .replace(/[^A-Z_]/g, "");
  return COIN_SYNONYMS[normalized] || null;
}

export async function getCoinPrice(coin: string): Promise<string> {
  try {
    const response: any = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price`,
      {
        params: {
          ids: coin,
          vs_currencies: "usd",
        },
      }
    );

    const price = response.data[coin]?.usd;
    if (price !== undefined) {
      return `The current price of ${coin} is $${price}.`;
    } else {
      return `Price information for ${coin} is not available.`;
    }
  } catch (error: any) {
    return `Error fetching price for ${coin}: ${error.message}`;
  }
}

/**
 * Gets price information for multiple coins from Aftermath Finance
 *
 * Fetches current prices, 24h changes, and other metrics for a list of tokens.
 * Converts the raw Aftermath price data into a standardized format.
 *
 * @param coins - Comma-separated string of coin symbols (e.g., "SUI,USDC") or addresses
 * @returns JSON string containing price information or error response
 * @throws Error if price fetch fails or invalid token addresses
 */
export async function coinsToPrice(coins: string): Promise<string> {
  try {
    const coinTypes = coins.split(",").map((coin) => {
      const trimmed = coin.trim();
      // If the input looks like an address, use it directly
      if (trimmed.includes("::")) {
        return trimmed;
      }
      // Otherwise, try to normalize the symbol and look up the address
      const normalizedSymbol = normalizeCoinSymbol(trimmed);
      if (!normalizedSymbol) {
        throw new Error(`Unknown coin symbol: ${trimmed}`);
      }
      const address =
        COIN_ADDRESSES[normalizedSymbol as keyof typeof COIN_ADDRESSES];
      if (!address) {
        throw new Error(`No address mapping for coin: ${trimmed}`);
      }
      return address;
    });

    const priceInfo = await prices.getCoinsToPrice({ coins: coinTypes });
    return JSON.stringify([
      {
        reasoning:
          "Successfully retrieved current price information from Aftermath Finance for the requested coins.",
        response: JSON.stringify(priceInfo, null, 2),
        status: "success",
        query: `Fetched prices for coins: ${coins}`,
        errors: [],
      },
    ]);
  } catch (error: any) {
    const errorId = Math.random().toString(36).substring(2, 15);
    return JSON.stringify([
      {
        reasoning:
          "The system encountered an issue while trying to retrieve the prices of the specified coins from Aftermath Finance, which led to an error.",
        response:
          "The attempt to fetch prices for the given coins was unsuccessful due to an unknown coin symbol.",
        status: "failure",
        query: `Attempted to fetch prices for coins: ${coins}`,
        errors: [`Error with ID: #${errorId}: ${error.message}`],
      },
    ]);
  }
}
