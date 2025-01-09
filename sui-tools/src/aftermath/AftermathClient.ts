import { Aftermath } from 'aftermath-ts-sdk';
import { TokenPrice, PoolInfo } from '../common/types';

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
  
  return {
    current: priceInfo.price,
    previous: priceInfo.price,
    lastUpdated: Date.now(),
    priceChange24h: priceInfo.priceChange24HoursPercentage
  };
}

/**
 * Converts raw pool data to our standardized format
 */
function processPool(pool: any, poolId: string): PoolInfo {
  return {
    id: poolId,
    tokens: pool.coinTypes || [],
    reserves: (pool.reserves || []).map((r: string) => BigInt(r)),
    fees: pool.fee || 0,
    tvl: pool.tvl || 0,
    apy: pool.apy || 0
  };
}

/**
 * Retrieves detailed information about a specific liquidity pool
 * 
 * Fetches pool data including tokens, reserves, fees, TVL, and APY.
 * Converts raw data into standardized format with proper types.
 * 
 * @param poolId - Unique identifier of the pool
 * @param network - Optional network override
 * @returns Processed pool information or undefined if pool not found
 * @throws Error if fetch fails
 * 
 * @example
 * const pool = await getPool("0x123...abc");
 * if (pool) {
 *   console.log(`Pool TVL: $${pool.tvl}`);
 *   console.log(`Pool APY: ${pool.apy}%`);
 * }
 */
export async function getPool(
  poolId: string,
  network?: "MAINNET" | "TESTNET"
): Promise<PoolInfo | undefined> {
  const aftermath = await initAftermath(network);
  const pools = aftermath.Pools();
  const pool = await pools.getPool({ objectId: poolId });
  
  if (!pool) return undefined;
  return processPool(pool, poolId);
}

/**
 * Fetches information about all available liquidity pools
 * 
 * Retrieves and processes data for all pools on the Aftermath platform.
 * Each pool includes tokens, reserves, fees, TVL, and APY information.
 * 
 * @param network - Optional network override
 * @returns Array of processed pool information
 * @throws Error if pools fetch fails
 * 
 * @example
 * const pools = await getAllPools();
 * pools.forEach(pool => {
 *   console.log(`Pool ${pool.id}:`);
 *   console.log(`  TVL: $${pool.tvl}`);
 *   console.log(`  APY: ${pool.apy}%`);
 * });
 */
export async function getAllPools(
  network?: "MAINNET" | "TESTNET"
): Promise<PoolInfo[]> {
  const aftermath = await initAftermath(network);
  const pools = aftermath.Pools();
  const allPools = await pools.getAllPools();
  
  return allPools.map((pool, index) => processPool(pool, `pool-${index}`));
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