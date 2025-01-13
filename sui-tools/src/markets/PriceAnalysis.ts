import { EventEmitter } from 'events';
import type { PriceAlert, PriceMonitor, TokenPrice } from '../common/types';

import { Aftermath } from 'aftermath-ts-sdk';
import {PoolInfo } from '../common/types';

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
    fee: pool.fee || 0,
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
): Promise<{[key: string]: TokenPrice}> {
  const aftermath = await initAftermath(network);
  const prices = aftermath.Prices();
  
  type RawPriceInfo = {
    price: number;
    priceChange24HoursPercentage: number;
  };
  
  const priceInfo = await prices.getCoinsToPriceInfo({ coins }) as {
    [key: string]: RawPriceInfo
  };
  
  return Object.entries(priceInfo).reduce((acc, [key, value]) => {
    acc[key] = {
      current: value.price,
      previous: value.price, // Todo: Calculate from 24h change
      lastUpdated: Date.now(),
      priceChange24h: value.priceChange24HoursPercentage
    };
    return acc;
  }, {} as {[key: string]: TokenPrice});
}

/**
 * Adds pool calculations
 * 
 * @param poolId - Unique identifier of the pool
 * @param coinInType - Token type of the input coin
 * @param coinOutType - Token type of the output coin
 * @param withFees - Whether to include fees in the calculation
 * @param network - Optional network override
 * @returns Spot price of the pool
 * @throws Error if pool not found or calculation fails
 * 
 * @example
 * const price = await getPoolSpotPrice("0x123...abc", "0x2::sui::SUI", "0x2::sui::SUI");
 * console.log(`Current price: $${price}`);
 */
export async function getPoolSpotPrice(
  poolId: string,
  coinInType: string,
  coinOutType: string,
  withFees: boolean = true,
  network?: "MAINNET" | "TESTNET"
): Promise<number> {
  const aftermath = await initAftermath(network);
  const pools = aftermath.Pools();
  const pool = await pools.getPool({ objectId: poolId });
  
  if (!pool) throw new Error(`Pool not found: ${poolId}`);
  
  // Type assertion after checking pool methods exist
  if (typeof pool.getSpotPrice !== 'function') {
    throw new Error('Pool does not support spot price calculation');
  }
  
  return pool.getSpotPrice({
    coinInType,
    coinOutType,
    withFees
  });
}

/**
 * Adds router functionality
 * 
 * @param coinInType - Token type of the input coin
 * @param coinOutType - Token type of the output coin
 * @param coinInAmount - Amount of the input coin
 * @param network - Optional network override
 * @returns Trade route information
 * @throws Error if router not found or route calculation fails
 * 
 * @example
 * const route = await getTradeRoute("0x2::sui::SUI", "0x2::sui::SUI", BigInt(100));
 * console.log(`Route:`, route);
 */
export async function getTradeRoute(
  coinInType: string,
  coinOutType: string,
  coinInAmount: bigint,
  network?: "MAINNET" | "TESTNET"
): Promise<any> {
  const aftermath = await initAftermath(network);
  const router = aftermath.Router();
  return router.getCompleteTradeRouteGivenAmountIn({
    coinInType,
    coinOutType,
    coinInAmount
  });
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