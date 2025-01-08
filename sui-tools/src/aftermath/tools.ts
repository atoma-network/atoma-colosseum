import { Aftermath } from 'aftermath-ts-sdk';
import { TokenPrice, PoolInfo } from '../common/types';

/**
 * Creates and initializes an Aftermath client for interacting with the Aftermath Finance protocol
 * 
 * @param network - The network to connect to ("MAINNET" | "TESTNET")
 * @returns An initialized Aftermath client instance
 * @throws Error if initialization fails
 * 
 * @example
 * const aftermath = await initAftermath("MAINNET");
 */
export async function initAftermath(network: "MAINNET" | "TESTNET" = "MAINNET"): Promise<Aftermath> {
  const aftermath = new Aftermath(network);
  await aftermath.init();
  return aftermath;
}

/**
 * Retrieves the current price and 24h price change for a specific token
 * 
 * @param aftermath - An initialized Aftermath client
 * @param tokenType - The token type address (e.g. "0x2::sui::SUI")
 * @returns TokenPrice object containing current price, previous price, last update timestamp and 24h price change
 * @throws Error if price fetch fails
 * 
 * @example
 * const price = await getTokenPrice(aftermath, "0x2::sui::SUI");
 * console.log(`Current price: $${price.current}`);
 * console.log(`24h change: ${price.priceChange24h}%`);
 */
export async function getTokenPrice(aftermath: Aftermath, tokenType: string): Promise<TokenPrice> {
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
 * Retrieves detailed information about a specific liquidity pool
 * 
 * @param aftermath - An initialized Aftermath client
 * @param poolId - The unique identifier of the pool
 * @returns Pool information including tokens, reserves, fees, TVL and APY
 * @throws Error if pool does not exist or fetch fails
 * 
 * @example
 * const pool = await getPool(aftermath, "pool_123");
 * console.log(`Pool TVL: $${pool.tvl}`);
 * console.log(`Pool APY: ${pool.apy}%`);
 */
export async function getPool(aftermath: Aftermath, poolId: string): Promise<PoolInfo | undefined> {
  const pools = aftermath.Pools();
  const pool = await pools.getPool({ objectId: poolId });
  
  if (!pool) return undefined;

  return {
    id: poolId,
    tokens: [], // TODO: Get from pool data
    reserves: [], // TODO: Get from pool data
    fees: 0, // TODO: Get from pool data
    tvl: 0, // TODO: Get from pool data
    apy: 0 // TODO: Get from pool data
  };
}

/**
 * Retrieves information about all available liquidity pools
 * 
 * @param aftermath - An initialized Aftermath client
 * @returns Array of pool information objects
 * @throws Error if pools fetch fails
 * 
 * @example
 * const pools = await getAllPools(aftermath);
 * pools.forEach(pool => {
 *   console.log(`Pool ${pool.id} TVL: $${pool.tvl}`);
 * });
 */
export async function getAllPools(aftermath: Aftermath): Promise<PoolInfo[]> {
  const pools = aftermath.Pools();
  const allPools = await pools.getAllPools();
  
  return allPools.map((pool, index) => ({
    id: `pool-${index}`, // TODO: Get actual pool ID
    tokens: [], // TODO: Get from pool data
    reserves: [], // TODO: Get from pool data
    fees: 0, // TODO: Get from pool data
    tvl: 0, // TODO: Get from pool data
    apy: 0 // TODO: Get from pool data
  }));
} 