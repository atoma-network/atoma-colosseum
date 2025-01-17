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
exports.initAftermath = initAftermath;
exports.getPricesApi = getPricesApi;
exports.getPoolsApi = getPoolsApi;
exports.getTokenPrice = getTokenPrice;
exports.getCoinsPriceInfo = getCoinsPriceInfo;
exports.getPool = getPool;
exports.getAllPools = getAllPools;
exports.getPoolSpotPrice = getPoolSpotPrice;
exports.getTradeRoute = getTradeRoute;
exports.getStakingPositions = getStakingPositions;
exports.getDcaOrders = getDcaOrders;
const aftermath_ts_sdk_1 = require("aftermath-ts-sdk");
/** --------------------------------------------------------------------------
 *                            Initialization
 *
 * --------------------------------------------------------------------------
 */
let aftermathInstance = null;
/**
 * Initializes the Aftermath SDK client
 *
 * Creates and initializes a singleton instance of the Aftermath SDK.
 * Subsequent calls return the existing instance.
 *
 * @param network - Network to connect to ("MAINNET" | "TESTNET")
 * @returns Initialized Aftermath SDK instance
 * @throws Error if initialization fails
 *
 * @example
 * const client = await initAftermath("MAINNET");
 * const prices = client.Prices();
 */
function initAftermath() {
    return __awaiter(this, arguments, void 0, function* (network = "MAINNET") {
        if (!aftermathInstance) {
            aftermathInstance = new aftermath_ts_sdk_1.Aftermath(network);
            yield aftermathInstance.init();
        }
        return aftermathInstance;
    });
}
/**
 * Gets the Prices API instance
 *
 * @param network - Optional network override
 * @returns The Prices API instance
 *
 * @example
 * const pricesApi = await getPricesApi();
 * const info = await pricesApi.getCoinPriceInfo({ coin: "0x2::sui::SUI" });
 */
function getPricesApi(network) {
    return __awaiter(this, void 0, void 0, function* () {
        const aftermath = yield initAftermath(network);
        return aftermath.Prices();
    });
}
/**
 * Gets the Pools API instance
 *
 * @param network - Optional network override
 * @returns The Pools API instance
 *
 * @example
 * const poolsApi = await getPoolsApi();
 * const info = await poolsApi.getPool({ objectId: "pool_123" });
 */
function getPoolsApi(network) {
    return __awaiter(this, void 0, void 0, function* () {
        const aftermath = yield initAftermath(network);
        return aftermath.Pools();
    });
}
/** --------------------------------------------------------------------------
 *                            Price Operations
 *
 *           These are the basic building blocks for price operations
 *
 * --------------------------------------------------------------------------
 */
/**
 * Fetches current price and 24h change for a token
 *
 * Retrieves real-time price data from Aftermath's price oracle.
 * Includes the current price, 24-hour price change, and timestamp.
 *
 * @param tokenType - Token address (e.g., "0x2::sui::SUI")
 * @param network - Optional network override
 * @returns Token price information
 * @throws Error if price fetch fails
 *
 * @example
 * const price = await getTokenPrice("0x2::sui::SUI");
 * console.log(`Current price: $${price.current}`);
 * console.log(`24h change: ${price.priceChange24h}%`);
 */
function getTokenPrice(tokenType, network) {
    return __awaiter(this, void 0, void 0, function* () {
        const aftermath = yield initAftermath(network);
        const prices = aftermath.Prices();
        const priceInfo = yield prices.getCoinPriceInfo({ coin: tokenType });
        // Get current price and ensure price change is a number
        const current = Number(priceInfo.price);
        const priceChange24h = Number(priceInfo.priceChange24HoursPercentage || 0);
        // Calculate previous price from the percentage change
        const previous = current / (1 + priceChange24h / 100);
        return {
            current,
            previous,
            lastUpdated: new Date().toISOString(),
            priceChange24h: Number(priceChange24h.toFixed(2)),
        };
    });
}
/**
 * Gets price information for multiple coins from Aftermath Finance
 *
 * Fetches current prices, 24h changes, and other metrics for a list of tokens.
 * Converts the raw Aftermath price data into a standardized format.
 *
 * @param coins - Array of token addresses (e.g., ["0x2::sui::SUI", "0x2::usdc::USDC"])
 * @param network - Network to query ("MAINNET" | "TESTNET")
 * @returns Object mapping coin addresses to price information:
 *          {
 *            "0x2::sui::SUI": {
 *              current: 1.23,        // Current price in USD
 *              previous: 1.20,       // Price 24h ago in USD
 *              lastUpdated: 123...,  // Unix timestamp
 *              priceChange24h: 2.5   // 24h change percentage
 *            },
 *            ...
 *          }
 * @throws Error if price fetch fails or invalid token addresses
 *
 * @example
 * const prices = await getCoinsPriceInfo(["0x2::sui::SUI"]);
 * console.log(`SUI price: $${prices["0x2::sui::SUI"].current}`);
 * console.log(`24h change: ${prices["0x2::sui::SUI"].priceChange24h}%`);
 */
function getCoinsPriceInfo(coins, network) {
    return __awaiter(this, void 0, void 0, function* () {
        const aftermath = yield initAftermath(network);
        const prices = aftermath.Prices();
        const priceInfo = (yield prices.getCoinsToPriceInfo({ coins }));
        return Object.entries(priceInfo).reduce((acc, [key, value]) => {
            acc[key] = {
                current: value.price,
                previous: value.price / (1 + value.priceChange24HoursPercentage / 100),
                lastUpdated: new Date().toISOString(),
                priceChange24h: value.priceChange24HoursPercentage,
            };
            return acc;
        }, {});
    });
}
/** --------------------------------------------------------------------------
 *                            Pool Operations
 * --------------------------------------------------------------------------
 */
/**
 * Processes raw pool data into standardized format
 */
function processPool(pool, poolId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Get pool metrics from Aftermath API
            const aftermath = yield initAftermath();
            const metrics = yield aftermath
                .Pools()
                .getPoolsStats({ poolIds: [poolId] });
            const poolMetrics = metrics[0]; // Get first pool's metrics since we query for specific poolId
            // Extract coin types and their reserves
            const tokens = Object.keys(pool.pool.coins || {});
            const reserves = tokens.map((token) => {
                const coinData = pool.pool.coins[token];
                return BigInt(coinData.normalizedBalance || 0);
            });
            return {
                id: poolId,
                tokens,
                reserves,
                fee: (poolMetrics === null || poolMetrics === void 0 ? void 0 : poolMetrics.fees) || 0,
                tvl: (poolMetrics === null || poolMetrics === void 0 ? void 0 : poolMetrics.tvl) || 0,
                apr: ((poolMetrics === null || poolMetrics === void 0 ? void 0 : poolMetrics.apr) || 0) * 100, // Convert to percentage
            };
        }
        catch (error) {
            console.error(`Error processing pool ${poolId}:`, error);
            // console.error('Pool metrics:', metrics); // Add this for debugging
            return {
                id: poolId,
                tokens: [],
                reserves: [],
                fee: 0,
                tvl: 0,
                apr: 0,
            };
        }
    });
}
/**
 * Gets pool information by ID
 */
function getPool(poolId, network) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const aftermath = yield initAftermath(network);
            const pools = aftermath.Pools();
            const pool = yield pools.getPool({ objectId: poolId });
            if (!pool)
                return undefined;
            return processPool(pool, poolId);
        }
        catch (error) {
            console.error("Error fetching pool:", error);
            return undefined;
        }
    });
}
/**
 * Gets all available pools
 */
function getAllPools(network) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const aftermath = yield initAftermath(network);
            const pools = aftermath.Pools();
            const allPools = yield pools.getAllPools();
            // Process all pools and filter out invalid ones
            const processedPools = yield Promise.all(allPools.map((pool) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                if (!((_a = pool.pool) === null || _a === void 0 ? void 0 : _a.objectId))
                    return null;
                return processPool(pool, pool.pool.objectId);
            })));
            return processedPools.filter((pool) => pool !== null && pool.tokens.length > 0);
        }
        catch (error) {
            console.error("Error fetching all pools:", error);
            return [];
        }
    });
}
/**
 * Gets spot price between two tokens in a pool
 */
function getPoolSpotPrice(poolId_1, coinInType_1, coinOutType_1) {
    return __awaiter(this, arguments, void 0, function* (poolId, coinInType, coinOutType, withFees = true, network) {
        try {
            const aftermath = yield initAftermath(network);
            const pools = aftermath.Pools();
            const pool = yield pools.getPool({ objectId: poolId });
            if (!pool) {
                throw new Error(`Pool not found: ${poolId}`);
            }
            // Log available tokens in pool for debugging
            console.log("Available tokens in pool:", Object.keys(pool.pool.coins));
            console.log("Looking for tokens:", { coinInType, coinOutType });
            // Check if tokens exist in pool
            if (!pool.pool.coins[coinInType] || !pool.pool.coins[coinOutType]) {
                throw new Error(`Tokens not found in pool. Available tokens: ${Object.keys(pool.pool.coins).join(", ")}`);
            }
            const spotPrice = pool.getSpotPrice({
                coinInType,
                coinOutType,
                withFees,
            });
            return spotPrice;
        }
        catch (error) {
            console.error(`Error getting spot price for pool ${poolId}:`, error);
            throw new Error(`Failed to get spot price: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    });
}
/**
 * Gets trade route information
 */
function getTradeRoute(coinInType, coinOutType, coinInAmount, network) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const aftermath = yield initAftermath(network);
            const router = aftermath.Router();
            return router.getCompleteTradeRouteGivenAmountIn({
                coinInType,
                coinOutType,
                coinInAmount,
            });
        }
        catch (error) {
            console.error("Error getting trade route:", error);
            throw new Error(`Failed to get trade route: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    });
}
/**
 * Adds staking functionality
 *
 * @param walletAddress - Address of the wallet
 * @param network - Optional network override
 * @returns Staking positions information
 * @throws Error if staking not found or positions fetch fails
 *
 * @example
 * const positions = await getStakingPositions("0x123...abc");
 * console.log(`Staking positions:`, positions);
 */
function getStakingPositions(walletAddress, network) {
    return __awaiter(this, void 0, void 0, function* () {
        const aftermath = yield initAftermath(network);
        const staking = aftermath.Staking();
        return staking.getStakingPositions({ walletAddress });
    });
}
/**
 * Adds DCA functionality
 *
 * @param walletAddress - Address of the wallet
 * @param network - Optional network override
 * @returns DCA orders information
 * @throws Error if DCA not found or orders fetch fails
 *
 * @example
 * const orders = await getDcaOrders("0x123...abc");
 * console.log(`DCA orders:`, orders);
 */
function getDcaOrders(walletAddress, network) {
    return __awaiter(this, void 0, void 0, function* () {
        const aftermath = yield initAftermath(network);
        const dca = aftermath.Dca();
        return dca.getActiveDcaOrders({ walletAddress });
    });
}
function calculatePoolApr(pool) {
    try {
        // Get volume and TVL
        const volume24h = Number(pool.pool.volume24h || 0) / 1e9;
        const tvl = Number(pool.pool.lpCoinSupply || 0) / 1e9;
        if (tvl === 0)
            return 0;
        // Calculate fee revenue
        const feeRate = Number(pool.pool.flatness || 0) / 1e9;
        const feeRevenue24h = volume24h * feeRate;
        // Annualize the daily revenue
        const annualRevenue = feeRevenue24h * 365;
        // Calculate APR: (Annual Revenue / TVL) * 100
        const apr = (annualRevenue / tvl) * 100;
        return apr;
    }
    catch (error) {
        console.error("Error calculating pool APR:", error);
        return 0;
    }
}
