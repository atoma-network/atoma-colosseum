"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aprToApy = aprToApy;
exports.apyToApr = apyToApr;
exports.calculateLendingRate = calculateLendingRate;
exports.calculateUtilization = calculateUtilization;
exports.calculateImpermanentLoss = calculateImpermanentLoss;
exports.getPoolApr = getPoolApr;
exports.getLendingRate = getLendingRate;
exports.getBestLendingOpportunities = getBestLendingOpportunities;
exports.calculatePoolImpermanentLoss = calculatePoolImpermanentLoss;
exports.getLendingRates = getLendingRates;
const PriceAnalysis_1 = require("../markets/PriceAnalysis");
/** --------------------------------------------------------------------------
 *                            Yield Analysis
 *
 * --------------------------------------------------------------------------
 */
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
function aprToApy(apr, compoundingFrequency = 365) {
    return ((Math.pow(1 + apr / compoundingFrequency, compoundingFrequency) - 1) * 100);
}
/**
 * Converts Annual Percentage Yield (APY) to Annual Percentage Rate (APR)
 *
 * @param apy - The annual percentage yield as a decimal
 * @param compoundingFrequency - Number of times interest is compounded per year
 * @returns The APR as a percentage
 */
function apyToApr(apy, compoundingFrequency = 365) {
    return ((Math.pow(1 + apy, 1 / compoundingFrequency) - 1) *
        compoundingFrequency *
        100);
}
/** --------------------------------------------------------------------------
 *                            Yield Calculations
 *
 * --------------------------------------------------------------------------
 */
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
function calculateLendingRate(utilization, baseRate = 0.02, multiplier = 0.2) {
    return baseRate + utilization * multiplier;
}
/**
 * Calculates the utilization ratio of a lending pool
 *
 * @param borrowed - Total amount borrowed
 * @param supplied - Total supply in the pool
 * @returns The utilization ratio as a percentage
 */
function calculateUtilization(borrowed, supplied) {
    return (borrowed / supplied) * 100;
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
function calculateImpermanentLoss(initialPrice, currentPrice, poolShare) {
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
/** --------------------------------------------------------------------------
 *                            Pool Operations
 *
 * --------------------------------------------------------------------------
 */
/**
 * Fetches and calculates the APR for a specific pool
 *
 * If the pool has no explicit APR, calculates it based on utilization rate
 *
 * @param poolId - The unique identifier of the pool
 * @param network - Optional network override ("MAINNET" | "TESTNET")
 * @returns The pool's APR as a percentage
 * @throws Error if pool not found or calculation fails
 *
 * @example
 * const apr = await getPoolApr("pool_123");
 * console.log(`Pool APR: ${apr}%`);
 */
function getPoolApr(poolId, network) {
    return __awaiter(this, void 0, void 0, function* () {
        const pool = yield (0, PriceAnalysis_1.getPool)(poolId, network);
        if (!pool) {
            throw new Error(`Pool not found: ${poolId}`);
        }
        // The APR is already calculated in PriceAnalysis
        return pool.apr;
    });
}
/**
 * Calculates the lending rate for a specific pool
 *
 * @param poolId - The unique identifier of the pool
 * @param baseRate - Base interest rate as decimal
 * @param multiplier - Rate multiplier
 * @returns The lending rate as a percentage
 */
function getLendingRate(poolId_1) {
    return __awaiter(this, arguments, void 0, function* (poolId, baseRate = 0.02, multiplier = 0.2, network) {
        var _a, _b, _c, _d;
        const pool = yield (0, PriceAnalysis_1.getPool)(poolId, network);
        if (!pool)
            throw new Error("Pool not found");
        const utilization = calculateUtilization(Number((_b = (_a = pool === null || pool === void 0 ? void 0 : pool.reserves) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : 0), Number((_d = (_c = pool === null || pool === void 0 ? void 0 : pool.reserves) === null || _c === void 0 ? void 0 : _c[1]) !== null && _d !== void 0 ? _d : 0));
        return calculateLendingRate(utilization, baseRate, multiplier);
    });
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
function getBestLendingOpportunities() {
    return __awaiter(this, arguments, void 0, function* (minApr = 5, network) {
        const allPools = yield (0, PriceAnalysis_1.getAllPools)(network);
        return allPools
            .filter((pool) => (pool.apr || 0) >= minApr)
            .sort((a, b) => (b.apr || 0) - (a.apr || 0));
    });
}
/**
 * Calculates impermanent loss for a specific pool position
 *
 * @param initialPrice - Initial price ratio
 * @param currentPrice - Current price ratio
 * @param poolShare - Share of the pool owned
 * @returns The impermanent loss as a percentage
 */
function calculatePoolImpermanentLoss(initialPrice, currentPrice, poolShare) {
    return calculateImpermanentLoss(initialPrice, currentPrice, poolShare);
}
function getLendingRates(asset_1) {
    return __awaiter(this, arguments, void 0, function* (asset, network = "mainnet") {
        const borrowed = 1000; // Example values, replace with actual data
        const supplied = 2000;
        return {
            asset,
            lendingApr: calculateLendingApr(borrowed, supplied),
            borrowingApr: calculateBorrowingApr(borrowed, supplied),
            utilization: calculateUtilization(borrowed, supplied),
        };
    });
}
// Update any APY calculations to APR
function calculateLendingApr(borrowed, supplied) {
    // Temporary implementation
    return 0;
}
function calculateBorrowingApr(borrowed, supplied) {
    // Temporary implementation
    return 0;
}
