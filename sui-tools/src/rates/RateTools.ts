/**
 * Converts Annual Percentage Rate (APR) to Annual Percentage Yield (APY)
 * 
 * This function calculates the effective annual yield when interest is compounded
 * multiple times per year. The formula used is: APY = (1 + APR/n)^n - 1,
 * where n is the number of times interest is compounded per year.
 * 
 * @param apr - The annual percentage rate as a decimal (e.g., 0.05 for 5% APR)
 * @param compoundingFrequency - Number of times interest is compounded per year (default: 365 for daily)
 * @returns The APY as a percentage (e.g., 5.13 for 5.13% APY)
 * 
 * @example
 * const apy = aprToApy(0.05); // 5% APR
 * console.log(`APY: ${apy}%`); // APY: 5.13%
 */
export function aprToApy(apr: number, compoundingFrequency: number = 365): number {
  return (Math.pow(1 + apr / compoundingFrequency, compoundingFrequency) - 1) * 100;
}

/**
 * Converts Annual Percentage Yield (APY) to Annual Percentage Rate (APR)
 * 
 * This function calculates the nominal interest rate that, when compounded
 * at the specified frequency, will result in the given APY.
 * The formula used is: APR = n * ((1 + APY)^(1/n) - 1),
 * where n is the compounding frequency.
 * 
 * @param apy - The annual percentage yield as a decimal (e.g., 0.0513 for 5.13% APY)
 * @param compoundingFrequency - Number of times interest is compounded per year (default: 365 for daily)
 * @returns The APR as a percentage (e.g., 5.00 for 5% APR)
 * 
 * @example
 * const apr = apyToApr(0.0513); // 5.13% APY
 * console.log(`APR: ${apr}%`); // APR: 5.00%
 */
export function apyToApr(apy: number, compoundingFrequency: number = 365): number {
  return (Math.pow(1 + apy, 1 / compoundingFrequency) - 1) * compoundingFrequency * 100;
}

/**
 * Calculates the lending interest rate based on pool utilization
 * 
 * This function implements a linear interest rate model where the rate increases
 * as utilization increases. The formula is: rate = baseRate + (utilization * multiplier).
 * This encourages borrowing when utilization is low and discourages it when high.
 * 
 * @param utilization - The pool utilization ratio as a percentage (0-100)
 * @param baseRate - The minimum interest rate when utilization is 0 (as a decimal)
 * @param multiplier - Factor that determines how quickly rate increases with utilization
 * @returns The lending rate as a percentage
 * 
 * @example
 * const rate = calculateLendingRate(80, 0.02, 0.2); // 80% utilization, 2% base rate, 0.2 multiplier
 * console.log(`Lending rate: ${rate}%`); // Lending rate: 18%
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
 * The utilization ratio represents what percentage of the available funds
 * are currently being borrowed. This is a key metric for determining
 * interest rates and assessing pool efficiency.
 * 
 * @param borrowed - The total amount borrowed from the pool
 * @param totalSupply - The total amount supplied to the pool
 * @returns The utilization ratio as a percentage (0-100)
 * @throws Error if totalSupply is 0
 * 
 * @example
 * const utilization = calculateUtilization(800000, 1000000); // 800k borrowed from 1M total
 * console.log(`Utilization: ${utilization}%`); // Utilization: 80%
 */
export function calculateUtilization(borrowed: number, totalSupply: number): number {
  if (totalSupply === 0) return 0;
  return (borrowed / totalSupply) * 100;
}

/**
 * Calculates impermanent loss for a liquidity position
 * 
 * Impermanent loss occurs when the price ratio of tokens in a liquidity pool
 * changes compared to when liquidity was provided. This function calculates
 * the percentage loss compared to simply holding the tokens.
 * 
 * @param initialPrice - The price ratio when liquidity was provided
 * @param currentPrice - The current price ratio
 * @param poolShare - The share of the pool owned (as a decimal, e.g., 0.1 for 10%)
 * @returns The impermanent loss as a percentage (negative number)
 * 
 * @example
 * const loss = calculateImpermanentLoss(1000, 1500, 0.1); // Price increased 50%, 10% pool share
 * console.log(`Impermanent loss: ${loss}%`);
 */
export function calculateImpermanentLoss(
  initialPrice: number,
  currentPrice: number,
  poolShare: number
): number {
  const priceRatio = currentPrice / initialPrice;
  const sqrtRatio = Math.sqrt(priceRatio);
  const impLoss = 2 * sqrtRatio / (1 + priceRatio) - 1;
  return impLoss * poolShare;
} 