import { RatesCalculator } from './RatesCalculator';
import { AftermathClient } from '../aftermath/AftermathClient';
import { PoolInfo } from '../common/types';

export class RatesManager {
  private aftermath: AftermathClient;

  constructor(network: "MAINNET" | "TESTNET" = "MAINNET") {
    this.aftermath = new AftermathClient(network);
  }

  /**
   * Get pool APY
   */
  async getPoolApy(poolId: string): Promise<number> {
    const pool = await this.aftermath.getPool(poolId);
    if (!pool?.apy) {
      throw new Error('Could not fetch pool APY');
    }
    return pool.apy;
  }

  /**
   * Get lending rate based on pool utilization
   */
  async getLendingRate(
    poolId: string,
    baseRate: number = 0.02, // 2% base rate
    multiplier: number = 0.2  // 20% multiplier
  ): Promise<number> {
    const pool = await this.aftermath.getPool(poolId);
    if (!pool) throw new Error('Pool not found');

    // Calculate utilization from reserves
    const borrowed = Number(pool.reserves[0]);
    const totalSupply = Number(pool.reserves[1]);
    const utilization = RatesCalculator.calculateUtilization(borrowed, totalSupply);

    return RatesCalculator.calculateLendingRate(utilization, baseRate, multiplier);
  }

  /**
   * Get best lending opportunities across pools
   */
  async getBestLendingOpportunities(
    minApy: number = 5 // 5% minimum APY
  ): Promise<PoolInfo[]> {
    const allPools = await this.aftermath.getAllPools();
    
    return allPools
      .filter(pool => (pool.apy || 0) >= minApy)
      .sort((a, b) => (b.apy || 0) - (a.apy || 0));
  }

  /**
   * Calculate impermanent loss for a pool position
   */
  calculateImpermanentLoss(
    initialPrice: number,
    currentPrice: number,
    poolShare: number
  ): number {
    const priceRatio = currentPrice / initialPrice;
    const sqrtRatio = Math.sqrt(priceRatio);
    
    const impLoss = 2 * sqrtRatio / (1 + priceRatio) - 1;
    return impLoss * poolShare;
  }
}
