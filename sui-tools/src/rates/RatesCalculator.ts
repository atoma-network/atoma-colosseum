export class RatesCalculator {
  static aprToApy(apr: number, compoundingFrequency: number = 365): number {
    return (Math.pow(1 + apr / compoundingFrequency, compoundingFrequency) - 1) * 100;
  }

  static apyToApr(apy: number, compoundingFrequency: number = 365): number {
    return (Math.pow(1 + apy, 1 / compoundingFrequency) - 1) * compoundingFrequency * 100;
  }

  static calculateLendingRate(utilization: number, baseRate: number, multiplier: number): number {
    return baseRate + (utilization * multiplier);
  }

  static calculateUtilization(borrowed: number, totalSupply: number): number {
    if (totalSupply === 0) return 0;
    return (borrowed / totalSupply) * 100;
  }
} 