import { Aftermath, Pool as AftermathPool } from 'aftermath-ts-sdk';
import { PoolInfo, TokenPrice } from '../common/types';

export class AftermathClient {
  private aftermath: Aftermath;
  
  constructor(network: "MAINNET" | "TESTNET" = "MAINNET") {
    this.aftermath = new Aftermath(network);
  }

  async init() {
    await this.aftermath.init();
  }

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

  private transformPoolToPoolInfo(pool: AftermathPool, poolId: string): PoolInfo {
    // We'll need to use the appropriate SDK methods to get this information
    return {
      id: poolId,
      tokens: [], // TODO: Get from pool data
      reserves: [], // TODO: Get from pool data
      fees: 0, // TODO: Get from pool data
      tvl: 0, // TODO: Get from pool data
      apy: 0 // TODO: Get from pool data
    };
  }

  async getPool(poolId: string): Promise<PoolInfo | undefined> {
    const pools = this.aftermath.Pools();
    const pool = await pools.getPool({ objectId: poolId });
    
    if (!pool) return undefined;
    return this.transformPoolToPoolInfo(pool, poolId);
  }

  async getAllPools(): Promise<PoolInfo[]> {
    const pools = this.aftermath.Pools();
    const allPools = await pools.getAllPools();
    
    return allPools.map((pool, index) => 
      this.transformPoolToPoolInfo(pool, `pool-${index}`) // You might need to get the actual pool ID differently
    );
  }
} 