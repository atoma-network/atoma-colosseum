import { Aftermath } from 'aftermath-ts-sdk';
import { PoolInfo, TokenPrice, AftermathPool } from '../common/types';

/**
 * **AftermathClient**
 * 
 * A client for interacting with the Aftermath Finance protocol. This class provides methods
 * to fetch token prices, pool information, and manage protocol interactions.
 * 
 * @example
 * const client = new AftermathClient("MAINNET");
 * await client.init();
 * const price = await client.getTokenPrice("0x2::sui::SUI");
 */
export class AftermathClient {
  private aftermath: Aftermath;
  
  /**
   * Creates a new instance of the AftermathClient
   * 
   * @param network - The network to connect to ("MAINNET" | "TESTNET")
   */
  constructor(network: "MAINNET" | "TESTNET" = "MAINNET") {
    this.aftermath = new Aftermath(network);
  }

  /**
   * Initializes the Aftermath client
   * 
   * @throws Error if initialization fails
   * @example
   * await client.init();
   */
  async init(): Promise<void> {
    await this.aftermath.init();
  }

  /**
   * Retrieves the current price and 24h price change for a specific token
   * 
   * @param tokenType - The token type address (e.g. "0x2::sui::SUI")
   * @returns TokenPrice object containing current price, previous price, last update timestamp and 24h price change
   * @throws Error if price fetch fails
   * 
   * @example
   * const price = await client.getTokenPrice("0x2::sui::SUI");
   * console.log(`Current price: $${price.current}`);
   * console.log(`24h change: ${price.priceChange24h}%`);
   */
  async getTokenPrice(tokenType: string): Promise<TokenPrice> {
    const prices = this.aftermath.Prices();
    const priceInfo = await prices.getCoinPriceInfo({ coin: tokenType });
    
    return {
      current: priceInfo.price,
      previous: priceInfo.price,
      lastUpdated: Date.now(),
      priceChange24h: priceInfo.priceChange24HoursPercentage
    };
  }

  /**
   * Transforms an Aftermath pool object into our standardized PoolInfo format
   * 
   * @param pool - The Aftermath pool object
   * @param poolId - The unique identifier of the pool
   * @returns A standardized PoolInfo object
   * @private
   */
  private transformPoolToPoolInfo(pool: AftermathPool, poolId: string): PoolInfo {
    return {
      id: poolId,
      tokens: pool.coinTypes || [],
      reserves: (pool.reserves || []).map(r => BigInt(r)),
      fees: pool.fee || 0,
      tvl: pool.tvl || 0,
      apy: pool.apy || 0
    };
  }

  /**
   * Retrieves detailed information about a specific liquidity pool
   * 
   * @param poolId - The unique identifier of the pool
   * @returns Pool information including tokens, reserves, fees, TVL and APY
   * @throws Error if pool does not exist or fetch fails
   * 
   * @example
   * const pool = await client.getPool("pool_123");
   * console.log(`Pool TVL: $${pool.tvl}`);
   * console.log(`Pool APY: ${pool.apy}%`);
   */
  async getPool(poolId: string): Promise<PoolInfo | undefined> {
    const pools = this.aftermath.Pools();
    const pool = await pools.getPool({ objectId: poolId });
    
    if (!pool) return undefined;
    return this.transformPoolToPoolInfo(pool, poolId);
  }

  /**
   * Retrieves information about all available liquidity pools
   * 
   * @returns Array of pool information objects
   * @throws Error if pools fetch fails
   * 
   * @example
   * const pools = await client.getAllPools();
   * pools.forEach(pool => {
   *   console.log(`Pool ${pool.id} TVL: $${pool.tvl}`);
   * });
   */
  async getAllPools(): Promise<PoolInfo[]> {
    const pools = this.aftermath.Pools();
    const allPools = await pools.getAllPools();
    
    return allPools.map((pool, index) => 
      this.transformPoolToPoolInfo(pool, `pool-${index}`)
    );
  }

  /**
   * Gets the underlying Aftermath instance
   * 
   * @returns The initialized Aftermath instance
   * @throws Error if client is not initialized
   * 
   * @example
   * const aftermath = client.getAftermathInstance();
   */
  getAftermathInstance(): Aftermath {
    return this.aftermath;
  }

  /**
   * Gets the Prices API instance from Aftermath
   * 
   * @returns The Prices API instance
   * @example
   * const prices = client.getPricesApi();
   * const priceInfo = await prices.getCoinPriceInfo({ coin: "0x2::sui::SUI" });
   */
  getPricesApi() {
    return this.aftermath.Prices();
  }

  /**
   * Gets the Pools API instance from Aftermath
   * 
   * @returns The Pools API instance
   * @example
   * const pools = client.getPoolsApi();
   * const poolInfo = await pools.getPool({ objectId: "pool_123" });
   */
  getPoolsApi() {
    return this.aftermath.Pools();
  }
}

/**
 * Creates and initializes an AftermathClient instance
 * 
 * @param network - The network to connect to ("MAINNET" | "TESTNET")
 * @returns An initialized AftermathClient instance
 * @throws Error if initialization fails
 * 
 * @example
 * const client = await initAftermathClient("MAINNET");
 * const price = await client.getTokenPrice("0x2::sui::SUI");
 */
export async function initAftermathClient(network: "MAINNET" | "TESTNET" = "MAINNET"): Promise<AftermathClient> {
  const client = new AftermathClient(network);
  await client.init();
  return client;
} 