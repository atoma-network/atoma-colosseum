import { AftermathClient } from '../aftermath/AftermathClient';
import { PoolInfo } from '../common/types';

/**
 * **RatesManager**
 * 
 * The `RatesManager` class provides a suite of financial rate calculations and interfaces with the Aftermath platform to fetch pool data and lending opportunities. It includes methods to convert between APR and APY, calculate lending rates based on pool utilization, determine impermanent loss for liquidity positions, and retrieve the best lending opportunities.
 */
export class RatesManager {
  private aftermath: AftermathClient;

  /**
   * Constructs a new `RatesManager` instance.
   * 
   * @param network - The network environment to connect to, either `"MAINNET"` or `"TESTNET"`. Defaults to `"MAINNET"`.
   * 
   * @example
   * const ratesManager = new RatesManager("TESTNET");
   */
  constructor(network: "MAINNET" | "TESTNET" = "MAINNET") {
    this.aftermath = new AftermathClient(network);
  }

  /**
   * **Converts Annual Percentage Rate (APR) to Annual Percentage Yield (APY).**
   * 
   * This method calculates the effective annual yield when interest is compounded multiple times per year. It's useful for understanding the real return on investment after compounding.
   * 
   * The formula used is:
   * 
   * \[
   * \text{APY} = \left(1 + \frac{\text{APR}}{n}\right)^n - 1
   * \]
   * 
   * where:
   * - **APR** is the annual percentage rate expressed as a decimal (e.g., 0.05 for 5% APR).
   * - **n** is the number of times interest is compounded per year.
   * 
   * @param apr - The annual percentage rate as a decimal.
   * @param compoundingFrequency - The number of compounding periods per year (default is 365 for daily compounding).
   * @returns The APY as a percentage (e.g., 5.127% for 5% APR compounded daily).
   * 
   * @example
   * const apy = ratesManager.aprToApy(0.05); // APR of 5%
   * console.log(`APY: ${apy}%`); // Outputs: APY: 5.127109512665782%
   */
  aprToApy(apr: number, compoundingFrequency: number = 365): number {
    return (Math.pow(1 + apr / compoundingFrequency, compoundingFrequency) - 1) * 100;
  }

  /**
   * **Converts Annual Percentage Yield (APY) to Annual Percentage Rate (APR).**
   * 
   * This method calculates the nominal interest rate that would result in the given APY when compounded at the specified frequency. It's useful for comparing investments with different compounding intervals.
   * 
   * The formula used is:
   * 
   * \[
   * \text{APR} = n \times \left( (1 + \text{APY})^{\frac{1}{n}} - 1 \right)
   * \]
   * 
   * where:
   * - **APY** is the annual percentage yield expressed as a decimal.
   * - **n** is the compounding frequency per year.
   * 
   * @param apy - The annual percentage yield as a decimal.
   * @param compoundingFrequency - The number of compounding periods per year (default is 365 for daily compounding).
   * @returns The APR as a percentage.
   * 
   * @example
   * const apr = ratesManager.apyToApr(0.051271); // APY of 5.1271%
   * console.log(`APR: ${apr}%`); // Outputs: APR: 5%
   */
  apyToApr(apy: number, compoundingFrequency: number = 365): number {
    return (Math.pow(1 + apy, 1 / compoundingFrequency) - 1) * compoundingFrequency * 100;
  }

  /**
   * **Calculates the lending interest rate based on pool utilization.**
   * 
   * Implements a linear interest rate model where the rate increases proportionally with the pool's utilization ratio. This encourages borrowing when utilization is low and discourages it when high.
   * 
   * The formula used is:
   * 
   * \[
   * \text{Lending Rate} = \text{baseRate} + (\text{Utilization} \times \text{multiplier})
   * \]
   * 
   * where:
   * - **Utilization** is the pool utilization ratio (0 to 100%).
   * - **baseRate** is the minimum interest rate when utilization is 0.
   * - **multiplier** determines how quickly the rate increases with utilization.
   * 
   * @param utilization - The pool utilization ratio as a percentage (between 0 and 100).
   * @param baseRate - The base interest rate as a decimal (default is 0.02 for 2%).
   * @param multiplier - The rate at which interest increases with utilization (default is 0.2).
   * @returns The lending rate as a percentage.
   * 
   * @example
   * const rate = ratesManager.calculateLendingRate(75); // 75% utilization
   * console.log(`Lending rate: ${rate}%`); // Outputs: Lending rate: 17%
   */
  calculateLendingRate(
    utilization: number, 
    baseRate: number = 0.02, 
    multiplier: number = 0.2
  ): number {
    return baseRate + (utilization * multiplier);
  }

  /**
   * **Calculates the utilization ratio of a lending pool.**
   * 
   * The utilization ratio indicates what percentage of the total supplied assets are currently borrowed. It's a key metric for assessing the efficiency and liquidity of the pool.
   * 
   * The formula used is:
   * 
   * \[
   * \text{Utilization Ratio} = \left( \frac{\text{Borrowed}}{\text{Total Supply}} \right) \times 100\%
   * \]
   * 
   * @param borrowed - The total amount borrowed from the pool.
   * @param totalSupply - The total amount of assets supplied to the pool.
   * @returns The utilization ratio as a percentage.
   * @throws An error if `totalSupply` is zero to prevent division by zero.
   * 
   * @example
   * const utilization = ratesManager.calculateUtilization(500000, 1000000);
   * console.log(`Utilization: ${utilization}%`); // Outputs: Utilization: 50%
   */
  calculateUtilization(borrowed: number, totalSupply: number): number {
    if (totalSupply === 0) throw new Error('Total supply cannot be zero.');
    return (borrowed / totalSupply) * 100;
  }

  /**
   * **Calculates impermanent loss for a liquidity position.**
   * 
   * Impermanent loss occurs when the price of tokens in a liquidity pool changes relative to when they were deposited. This function computes the difference in value between holding the tokens versus providing liquidity.
   * 
   * The formula used is derived from the constant product formula for automated market makers:
   * 
   * \[
   * \text{Impermanent Loss} = \left( \frac{2 \sqrt{\text{Price Ratio}}}{1 + \text{Price Ratio}} \right) - 1
   * \]
   * 
   * - **Price Ratio** is the ratio of the current price to the initial price.
   * 
   * @param initialPrice - The price ratio when liquidity was first provided.
   * @param currentPrice - The current price ratio.
   * @param poolShare - The proportion of the pool owned as a decimal (e.g., 0.1 for 10%).
   * @returns The impermanent loss as a percentage (negative value indicates a loss).
   * 
   * @example
   * const loss = ratesManager.calculateImpermanentLoss(1, 1.5, 0.1);
   * console.log(`Impermanent loss: ${loss}%`); // Outputs the impermanent loss percentage
   */
  calculateImpermanentLoss(
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
   * **Fetches the Annual Percentage Yield (APY) for a specific pool.**
   * 
   * This method retrieves the APY from the Aftermath platform, which reflects the expected annual return from lending assets in the pool.
   * 
   * @param poolId - The unique identifier of the pool.
   * @returns A promise that resolves to the pool's APY as a percentage.
   * @throws An error if the pool's APY cannot be fetched.
   * 
   * @example
   * ratesManager.getPoolApy('pool123').then(apy => {
   *   console.log(`Pool APY: ${apy}%`);
   * }).catch(error => {
   *   console.error(error.message);
   * });
   */
  async getPoolApy(poolId: string): Promise<number> {
    const pool = await this.aftermath.getPool(poolId);
    if (!pool?.apy) {
      throw new Error('Could not fetch pool APY');
    }
    return pool.apy;
  }

  /**
   * **Calculates the lending rate for a specific pool based on its current utilization.**
   * 
   * This method fetches the pool data from the Aftermath platform, computes the utilization ratio, and then calculates the lending rate using the linear interest rate model.
   * 
   * @param poolId - The unique identifier of the pool.
   * @param baseRate - The base interest rate as a decimal (default is 0.02 for 2%).
   * @param multiplier - The rate at which interest increases with utilization (default is 0.2).
   * @returns A promise that resolves to the lending rate as a percentage.
   * @throws An error if the pool is not found.
   * 
   * @example
   * ratesManager.getLendingRate('pool123').then(rate => {
   *   console.log(`Lending Rate: ${rate}%`);
   * }).catch(error => {
   *   console.error(error.message);
   * });
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
    const utilization = this.calculateUtilization(borrowed, totalSupply);

    return this.calculateLendingRate(utilization, baseRate, multiplier);
  }

  /**
   * **Retrieves the best lending opportunities across all pools.**
   * 
   * This method gathers all pools from the Aftermath platform, filters them based on a minimum APY threshold, and sorts them in descending order of APY.
   * 
   * @param minApy - The minimum APY required to consider a pool as a good opportunity (default is 5%).
   * @returns A promise that resolves to an array of `PoolInfo` objects representing the best lending opportunities.
   * 
   * @example
   * ratesManager.getBestLendingOpportunities(7).then(pools => {
   *   pools.forEach(pool => {
   *     console.log(`Pool ID: ${pool.id}, APY: ${pool.apy}%`);
   *   });
   * });
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
   * **Calculates impermanent loss for a specific pool position.**
   * 
   * This method serves as a convenience wrapper around `calculateImpermanentLoss`, allowing for direct calculation related to a pool position.
   * 
   * @param initialPrice - The price ratio when liquidity was first provided.
   * @param currentPrice - The current price ratio.
   * @param poolShare - The proportion of the pool owned as a decimal.
   * @returns The impermanent loss as a percentage.
   * 
   * @example
   * const impLoss = ratesManager.calculateImpermanentLossForPool(1000, 1200, 0.05);
   * console.log(`Impermanent Loss: ${impLoss}%`);
   */
  calculateImpermanentLossForPool(
    initialPrice: number,
    currentPrice: number,
    poolShare: number
  ): number {
    return this.calculateImpermanentLoss(initialPrice, currentPrice, poolShare);
  }
}
