import { Aftermath } from 'aftermath-ts-sdk';
import { PoolInfo, SwapParams, TokenPrice } from '../common/types';

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

  async getPool(poolId: string): Promise<PoolInfo | undefined> {
    const pools = this.aftermath.Pools();
    const pool = await pools.getPool({ objectId: poolId });
    
    return {
      id: poolId,
      tokens: pool.tokens,
      reserves: pool.reserves.map(BigInt),
      fees: pool.fees,
      tvl: pool.tvl,
      apy: pool.apy
    };
  }

  async getAllPools(): Promise<PoolInfo[]> {
    const pools = this.aftermath.Pools();
    const allPools = await pools.getAllPools();
    
    return allPools.map(pool => ({
      id: pool.objectId,
      tokens: pool.tokens,
      reserves: pool.reserves.map(BigInt),
      fees: pool.fees,
      tvl: pool.tvl,
      apy: pool.apy
    }));
  }
} 