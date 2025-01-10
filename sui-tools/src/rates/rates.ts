import { getPool, getAllPools } from '../aftermath/AftermathClient';
import { PoolInfo } from '../common/types';

/**
 * Converts Annual Percentage Rate (APR) to Annual Percentage Yield (APY)
 * 
 * Uses the compound interest formula to calculate the effective annual yield:
 * APY = (1 + APR/n)^n - 1, where n is the compounding frequency
 * 
 * @param apr - The annual percentage rate as a decimal (e.g., 0.05 for 5%)
 * @param compoundingFrequency - Number of times interest is compounded per year (default: 365 for daily)
 * @returns The APY as a percentage (e.g., 5.127 for 5.127% APY)
 * 
 * @example
 * const apy = aprToApy(0.05); // 5% APR
 * console.log(`APY: ${apy}%`); // APY: 5.127%
 */
export function aprToApy(
  apr: number, 
  compoundingFrequency: number = 365
): number {
  return (Math.pow(1 + apr / compoundingFrequency, compoundingFrequency) - 1) * 100;
}

/**
 * Converts Annual Percentage Yield (APY) to Annual Percentage Rate (APR)
 * 
 * @param apy - The annual percentage yield as a decimal
 * @param compoundingFrequency - Number of times interest is compounded per year
 * @returns The APR as a percentage
 */
export function apyToApr(
  apy: number, 
  compoundingFrequency: number = 365
): number {
  return (Math.pow(1 + apy, 1 / compoundingFrequency) - 1) * compoundingFrequency * 100;
}

/**
 * Calculates the lending interest rate based on pool utilization
 * 
 * Uses a linear interest rate model where rate increases with utilization:
 * rate = baseRate + (utilization × multiplier)
 * 
 * @param utilization - The pool utilization ratio (0-100)
 * @param baseRate - The minimum interest rate when utilization is 0 (default: 0.02 for 2%)
 * @param multiplier - Rate multiplier for utilization (default: 0.2)
 * @returns The lending rate as a percentage
 * 
 * @example
 * const rate = calculateLendingRate(75); // 75% utilization
 * console.log(`Lending rate: ${rate}%`); // 17%
 */
export function calculateLendingRate(
  utilization: number,
  baseRate: number = 0.02,
  multiplier: number = 0.2
): number {
  return baseRate + (utilization * multiplier);
}

/**
 * Calculates the utilization ratio of a lending pool
 * 
 * @param borrowed - Total amount borrowed
 * @param supplied - Total supply in the pool
 * @returns The utilization ratio as a percentage
 */
export function calculateUtilization(
  borrowed: number,
  supplied: number
): number {
  if (supplied === 0) return 0;
  return borrowed / supplied;
}

/**
 * Calculates impermanent loss for a liquidity position
 * 
 * Impermanent loss occurs when the price ratio between pooled assets changes.
 * The formula used is: IL = 2√(P2/P1)/(1 + P2/P1) - 1
 * where P1 is initial price and P2 is current price
 * 
 * @param initialPrice - Initial price ratio when liquidity was provided
 * @param currentPrice - Current price ratio
 * @param poolShare - Share of the pool owned as decimal (e.g., 0.1 for 10%)
 * @returns The impermanent loss as a percentage (negative value)
 * 
 * @example
 * const loss = calculateImpermanentLoss(1000, 1500, 0.1);
 * console.log(`Impermanent loss: ${loss}%`);
 */
export function calculateImpermanentLoss(
  initialPrice: number,
  currentPrice: number,
  poolShare: number
): number {
  const priceRatio = currentPrice / initialPrice;
  const sqrtRatio = Math.sqrt(priceRatio);
  const impLoss = (2 * sqrtRatio) / (1 + priceRatio) - 1;
  return impLoss * poolShare * 100;
}

/**
 * Fetches and calculates the APY for a specific pool
 * 
 * If the pool has no explicit APY, calculates it based on utilization rate
 * 
 * @param poolId - The unique identifier of the pool
 * @param network - Optional network override ("MAINNET" | "TESTNET")
 * @returns The pool's APY as a percentage
 * @throws Error if pool not found or calculation fails
 * 
 * @example
 * const apy = await getPoolApy("pool_123");
 * console.log(`Pool APY: ${apy}%`);
 */
export async function getPoolApy(
  poolId: string,
  network?: "MAINNET" | "TESTNET"
): Promise<number> {
  const pool = await getPool(poolId, network);
  if (!pool) {
    throw new Error(`Pool not found: ${poolId}`);
  }
  
  if (pool.apy === undefined) {
    const utilization = calculateUtilization(
      Number(pool.reserves[0] || 0),
      Number(pool.reserves[1] || 0)
    );
    return calculateLendingRate(utilization);
  }
  
  return pool.apy;
}

/**
 * Calculates the lending rate for a specific pool
 * 
 * @param poolId - The unique identifier of the pool
 * @param baseRate - Base interest rate as decimal
 * @param multiplier - Rate multiplier
 * @returns The lending rate as a percentage
 */
export async function getLendingRate(
  poolId: string,
  baseRate: number = 0.02,
  multiplier: number = 0.2,
  network?: "MAINNET" | "TESTNET"
): Promise<number> {
  const pool = await getPool(poolId, network);
  if (!pool) throw new Error('Pool not found');
  
  const utilization = calculateUtilization(
    Number(pool?.reserves?.[0] ?? 0),
    Number(pool?.reserves?.[1] ?? 0)
  );

  return calculateLendingRate(utilization, baseRate, multiplier);
}

/**
 * Retrieves the best lending opportunities across all pools
 * 
 * Fetches all pools and sorts them by APY, filtering out low-yield opportunities
 * 
 * @param minApy - Minimum APY threshold in percentage (default: 5)
 * @param network - Optional network override
 * @returns Array of pools sorted by APY in descending order
 * 
 * @example
 * const opportunities = await getBestLendingOpportunities(5);
 * opportunities.forEach(pool => {
 *   console.log(`Pool ${pool.id}: ${pool.apy}% APY`);
 * });
 */
export async function getBestLendingOpportunities(
  minApy: number = 5,
  network?: "MAINNET" | "TESTNET"
): Promise<PoolInfo[]> {
  const allPools = await getAllPools(network);
  return allPools
    .filter(pool => (pool.apy || 0) >= minApy)
    .sort((a, b) => (b.apy || 0) - (a.apy || 0));
}

/**
 * Calculates impermanent loss for a specific pool position
 * 
 * @param initialPrice - Initial price ratio
 * @param currentPrice - Current price ratio
 * @param poolShare - Share of the pool owned
 * @returns The impermanent loss as a percentage
 */
export function calculatePoolImpermanentLoss(
  initialPrice: number,
  currentPrice: number,
  poolShare: number
): number {
  return calculateImpermanentLoss(initialPrice, currentPrice, poolShare);
}
