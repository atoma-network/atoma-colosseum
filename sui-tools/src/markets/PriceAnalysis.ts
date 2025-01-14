import { Aftermath } from "aftermath-ts-sdk";
import { PoolInfo, TokenPrice } from "../common/types";

/** --------------------------------------------------------------------------
 *                            Initialization
 *
 * --------------------------------------------------------------------------
 */

let aftermathInstance: Aftermath | null = null;

/**
 * Initializes the Aftermath SDK client
 *
 * Creates and initializes a singleton instance of the Aftermath SDK.
 * Subsequent calls return the existing instance.
 *
 * @param network - Network to connect to ("MAINNET" | "TESTNET")
 * @returns Initialized Aftermath SDK instance
 * @throws Error if initialization fails
 *
 * @example
 * const client = await initAftermath("MAINNET");
 * const prices = client.Prices();
 */
export async function initAftermath(
  network: "MAINNET" | "TESTNET" = "MAINNET"
): Promise<Aftermath> {
  if (!aftermathInstance) {
    aftermathInstance = new Aftermath(network);
    await aftermathInstance.init();
  }
  return aftermathInstance;
}

/**
 * Gets the Prices API instance
 *
 * @param network - Optional network override
 * @returns The Prices API instance
 *
 * @example
 * const pricesApi = await getPricesApi();
 * const info = await pricesApi.getCoinPriceInfo({ coin: "0x2::sui::SUI" });
 */
export async function getPricesApi(network?: "MAINNET" | "TESTNET") {
  const aftermath = await initAftermath(network);
  return aftermath.Prices();
}

/**
 * Gets the Pools API instance
 *
 * @param network - Optional network override
 * @returns The Pools API instance
 *
 * @example
 * const poolsApi = await getPoolsApi();
 * const info = await poolsApi.getPool({ objectId: "pool_123" });
 */
export async function getPoolsApi(network?: "MAINNET" | "TESTNET") {
  const aftermath = await initAftermath(network);
  return aftermath.Pools();
}

/** --------------------------------------------------------------------------
 *                            Price Operations
 *
 *           These are the basic building blocks for price operations
 *
 * --------------------------------------------------------------------------
 */

/**
 * Fetches current price and 24h change for a token
 *
 * Retrieves real-time price data from Aftermath's price oracle.
 * Includes the current price, 24-hour price change, and timestamp.
 *
 * @param tokenType - Token address (e.g., "0x2::sui::SUI")
 * @param network - Optional network override
 * @returns Token price information
 * @throws Error if price fetch fails
 *
 * @example
 * const price = await getTokenPrice("0x2::sui::SUI");
 * console.log(`Current price: $${price.current}`);
 * console.log(`24h change: ${price.priceChange24h}%`);
 */
export async function getTokenPrice(
  tokenType: string,
  network?: "MAINNET" | "TESTNET"
): Promise<TokenPrice> {
  const aftermath = await initAftermath(network);
  const prices = aftermath.Prices();
  const priceInfo = await prices.getCoinPriceInfo({ coin: tokenType });

  // Get current price and ensure price change is a number
  const current = Number(priceInfo.price);
  const priceChange24h = Number(priceInfo.priceChange24HoursPercentage || 0);

  // Calculate previous price from the percentage change
  const previous = current / (1 + priceChange24h / 100);

  return {
    current,
    previous,
    lastUpdated: new Date().toISOString(),
    priceChange24h: Number(priceChange24h.toFixed(2)),
  };
}

/**
 * Gets price information for multiple coins from Aftermath Finance
 *
 * Fetches current prices, 24h changes, and other metrics for a list of tokens.
 * Converts the raw Aftermath price data into a standardized format.
 *
 * @param coins - Array of token addresses (e.g., ["0x2::sui::SUI", "0x2::usdc::USDC"])
 * @param network - Network to query ("MAINNET" | "TESTNET")
 * @returns Object mapping coin addresses to price information:
 *          {
 *            "0x2::sui::SUI": {
 *              current: 1.23,        // Current price in USD
 *              previous: 1.20,       // Price 24h ago in USD
 *              lastUpdated: 123...,  // Unix timestamp
 *              priceChange24h: 2.5   // 24h change percentage
 *            },
 *            ...
 *          }
 * @throws Error if price fetch fails or invalid token addresses
 *
 * @example
 * const prices = await getCoinsPriceInfo(["0x2::sui::SUI"]);
 * console.log(`SUI price: $${prices["0x2::sui::SUI"].current}`);
 * console.log(`24h change: ${prices["0x2::sui::SUI"].priceChange24h}%`);
 */
export async function getCoinsPriceInfo(
  coins: string[],
  network?: "MAINNET" | "TESTNET"
): Promise<{ [key: string]: TokenPrice }> {
  const aftermath = await initAftermath(network);
  const prices = aftermath.Prices();

  type RawPriceInfo = {
    price: number;
    priceChange24HoursPercentage: number;
  };

  const priceInfo = (await prices.getCoinsToPriceInfo({ coins })) as {
    [key: string]: RawPriceInfo;
  };

  return Object.entries(priceInfo).reduce((acc, [key, value]) => {
    acc[key] = {
      current: value.price,
      previous: value.price / (1 + value.priceChange24HoursPercentage / 100),
      lastUpdated: new Date().toISOString(),
      priceChange24h: value.priceChange24HoursPercentage,
    };
    return acc;
  }, {} as { [key: string]: TokenPrice });
}

/** --------------------------------------------------------------------------
 *                            Pool Operations
 * --------------------------------------------------------------------------
 */

/**
 * Processes raw pool data into standardized format
 */
async function processPool(pool: any, poolId: string): Promise<PoolInfo> {
  try {
    // Extract coin types and their reserves
    const tokens = Object.keys(pool.pool.coins || {});
    const reserves = tokens.map((token) => {
      const coinData = pool.pool.coins[token];
      return BigInt(coinData.normalizedBalance || 0);
    });

    return {
      id: poolId,
      tokens,
      reserves,
      fee: Number(pool.pool.flatness || 0) / 1e9,
      tvl: Number(pool.pool.lpCoinSupply || 0) / 1e9,
      apy: 0,
    };
  } catch (error) {
    console.error(`Error processing pool ${poolId}:`, error);
    return {
      id: poolId,
      tokens: [],
      reserves: [],
      fee: 0,
      tvl: 0,
      apy: 0,
    };
  }
}

/**
 * Gets pool information by ID
 */
export async function getPool(
  poolId: string,
  network?: "MAINNET" | "TESTNET"
): Promise<PoolInfo | undefined> {
  try {
    const aftermath = await initAftermath(network);
    const pools = aftermath.Pools();
    const pool = await pools.getPool({ objectId: poolId });
    if (!pool) return undefined;
    return processPool(pool, poolId);
  } catch (error) {
    console.error("Error fetching pool:", error);
    return undefined;
  }
}

/**
 * Gets all available pools
 */
export async function getAllPools(
  network?: "MAINNET" | "TESTNET"
): Promise<PoolInfo[]> {
  try {
    const aftermath = await initAftermath(network);
    const pools = aftermath.Pools();
    const allPools = await pools.getAllPools();

    // Process all pools and filter out invalid ones
    const processedPools = await Promise.all(
      allPools.map(async (pool) => {
        if (!pool.pool?.objectId) return null;
        return processPool(pool, pool.pool.objectId);
      })
    );

    return processedPools.filter(
      (pool): pool is PoolInfo => pool !== null && pool.tokens.length > 0
    );
  } catch (error) {
    console.error("Error fetching all pools:", error);
    return [];
  }
}

/**
 * Gets spot price between two tokens in a pool
 */
export async function getPoolSpotPrice(
  poolId: string,
  coinInType: string,
  coinOutType: string,
  withFees: boolean = true,
  network?: "MAINNET" | "TESTNET"
): Promise<number> {
  try {
    const aftermath = await initAftermath(network);
    const pools = aftermath.Pools();
    const pool = await pools.getPool({ objectId: poolId });

    if (!pool) {
      throw new Error(`Pool not found: ${poolId}`);
    }

    // Log available tokens in pool for debugging
    console.log("Available tokens in pool:", Object.keys(pool.pool.coins));
    console.log("Looking for tokens:", { coinInType, coinOutType });

    // Check if tokens exist in pool
    if (!pool.pool.coins[coinInType] || !pool.pool.coins[coinOutType]) {
      throw new Error(
        `Tokens not found in pool. Available tokens: ${Object.keys(
          pool.pool.coins
        ).join(", ")}`
      );
    }

    const spotPrice = pool.getSpotPrice({
      coinInType,
      coinOutType,
      withFees,
    });

    return spotPrice;
  } catch (error) {
    console.error(`Error getting spot price for pool ${poolId}:`, error);
    throw new Error(
      `Failed to get spot price: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Gets trade route information
 */
export async function getTradeRoute(
  coinInType: string,
  coinOutType: string,
  coinInAmount: bigint,
  network?: "MAINNET" | "TESTNET"
): Promise<any> {
  try {
    const aftermath = await initAftermath(network);
    const router = aftermath.Router();

    return router.getCompleteTradeRouteGivenAmountIn({
      coinInType,
      coinOutType,
      coinInAmount,
    });
  } catch (error) {
    console.error("Error getting trade route:", error);
    throw new Error(
      `Failed to get trade route: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Adds staking functionality
 *
 * @param walletAddress - Address of the wallet
 * @param network - Optional network override
 * @returns Staking positions information
 * @throws Error if staking not found or positions fetch fails
 *
 * @example
 * const positions = await getStakingPositions("0x123...abc");
 * console.log(`Staking positions:`, positions);
 */
export async function getStakingPositions(
  walletAddress: string,
  network?: "MAINNET" | "TESTNET"
): Promise<any> {
  const aftermath = await initAftermath(network);
  const staking = aftermath.Staking();
  return staking.getStakingPositions({ walletAddress });
}

/**
 * Adds DCA functionality
 *
 * @param walletAddress - Address of the wallet
 * @param network - Optional network override
 * @returns DCA orders information
 * @throws Error if DCA not found or orders fetch fails
 *
 * @example
 * const orders = await getDcaOrders("0x123...abc");
 * console.log(`DCA orders:`, orders);
 */
export async function getDcaOrders(
  walletAddress: string,
  network?: "MAINNET" | "TESTNET"
): Promise<any> {
  const aftermath = await initAftermath(network);
  const dca = aftermath.Dca();
  return dca.getActiveDcaOrders({ walletAddress });
}
