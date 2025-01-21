import { Aftermath } from "aftermath-ts-sdk";
import { PoolInfo } from "../../@types/interface";

const af = new Aftermath("MAINNET");
const pools = af.Pools();

type RankingMetric = "apr" | "tvl" | "fees" | "volume";
type SortOrder = "asc" | "desc";

/**
 * Processes raw pool data into standardized format
 */
async function processPool(pool: any, poolId: string): Promise<PoolInfo> {
  try {
    const metrics = await pools.getPoolsStats({ poolIds: [poolId] });
    const poolMetrics = metrics[0];

    const tokens = Object.keys(pool.pool.coins || {});
    const reserves = tokens.map((token) => {
      const coinData = pool.pool.coins[token];
      return BigInt(coinData.normalizedBalance || 0);
    });

    return {
      id: poolId,
      tokens,
      reserves,
      fee: poolMetrics?.fees || 0,
      tvl: poolMetrics?.tvl || 0,
      apr: (poolMetrics?.apr || 0) * 100,
    };
  } catch (error: any) {
    console.error(`Error processing pool ${poolId}:`, error);
    return {
      id: poolId,
      tokens: [],
      reserves: [],
      fee: 0,
      tvl: 0,
      apr: 0,
    };
  }
}

/**
 * Gets pool information by ID
 */
export async function getPool(poolId: string): Promise<string> {
  try {
    const pool = await pools.getPool({ objectId: poolId });
    if (!pool) {
      return JSON.stringify([
        {
          reasoning: "Pool not found with the specified ID.",
          response: `No pool exists with ID: ${poolId}`,
          status: "failure",
          query: `Attempted to fetch pool with ID: ${poolId}`,
          errors: [`Pool not found: ${poolId}`],
        },
      ]);
    }
    const processedPool = await processPool(pool, poolId);
    return JSON.stringify([
      {
        reasoning:
          "Successfully retrieved pool information from Aftermath Finance.",
        response: JSON.stringify(processedPool, null, 2),
        status: "success",
        query: `Fetched pool with ID: ${poolId}`,
        errors: [],
      },
    ]);
  } catch (error: any) {
    const errorId = Math.random().toString(36).substring(2, 15);
    return JSON.stringify([
      {
        reasoning:
          "The system encountered an issue while trying to retrieve the pool information.",
        response: "The attempt to fetch pool information was unsuccessful.",
        status: "failure",
        query: `Attempted to fetch pool with ID: ${poolId}`,
        errors: [`Error with ID: #${errorId}: ${error.message}`],
      },
    ]);
  }
}

/**
 * Gets all available pools
 */
export async function getAllPools(): Promise<string> {
  try {
    const allPools = await pools.getAllPools();
    const processedPools = await Promise.all(
      allPools.map(async (pool) => {
        if (!pool.pool?.objectId) return null;
        return processPool(pool, pool.pool.objectId);
      })
    );

    const validPools = processedPools.filter(
      (pool): pool is PoolInfo => pool !== null && pool.tokens.length > 0
    );

    return JSON.stringify([
      {
        reasoning:
          "Successfully retrieved all available pools from Aftermath Finance.",
        response: JSON.stringify(validPools, null, 2),
        status: "success",
        query: "Fetched all available pools",
        errors: [],
      },
    ]);
  } catch (error: any) {
    const errorId = Math.random().toString(36).substring(2, 15);
    return JSON.stringify([
      {
        reasoning:
          "The system encountered an issue while trying to retrieve all pools.",
        response: "The attempt to fetch all pools was unsuccessful.",
        status: "failure",
        query: "Attempted to fetch all available pools",
        errors: [`Error with ID: #${errorId}: ${error.message}`],
      },
    ]);
  }
}

/**
 * Gets pool events (deposits/withdrawals)
 */
export async function getPoolEvents(
  poolId: string,
  eventType: "deposit" | "withdraw",
  limit: number = 10
): Promise<string> {
  try {
    const pool = await pools.getPool({ objectId: poolId });
    if (!pool) {
      throw new Error(`Pool not found: ${poolId}`);
    }

    const eventData =
      eventType === "deposit"
        ? await pool.getDepositEvents({ limit })
        : await pool.getWithdrawEvents({ limit });

    return JSON.stringify([
      {
        reasoning: `Successfully retrieved ${eventType} events for the pool.`,
        response: JSON.stringify(eventData, null, 2),
        status: "success",
        query: `Fetched ${eventType} events for pool: ${poolId}`,
        errors: [],
      },
    ]);
  } catch (error: any) {
    const errorId = Math.random().toString(36).substring(2, 15);
    return JSON.stringify([
      {
        reasoning: `The system encountered an issue while trying to retrieve ${eventType} events.`,
        response: "The attempt to fetch pool events was unsuccessful.",
        status: "failure",
        query: `Attempted to fetch ${eventType} events for pool: ${poolId}`,
        errors: [`Error with ID: #${errorId}: ${error.message}`],
      },
    ]);
  }
}

/**
 * Calculates pool APR based on volume and TVL
 */
export function calculatePoolApr(pool: any): number {
  try {
    const volume24h = Number(pool.pool.volume24h || 0) / 1e9;
    const tvl = Number(pool.pool.lpCoinSupply || 0) / 1e9;
    if (tvl === 0) return 0;

    const feeRate = Number(pool.pool.flatness || 0) / 1e9;
    const feeRevenue24h = volume24h * feeRate;
    const annualRevenue = feeRevenue24h * 365;
    return (annualRevenue / tvl) * 100;
  } catch (error) {
    console.error("Error calculating pool APR:", error);
    return 0;
  }
}

/**
 * Gets ranked pools by specified metric
 */
export async function getRankedPools(
  metric: RankingMetric = "tvl",
  limit: number = 10,
  order: SortOrder = "desc"
): Promise<string> {
  try {
    const allPools = await pools.getAllPools();
    const processedPools = await Promise.all(
      allPools.map(async (pool) => {
        if (!pool.pool?.objectId) return null;
        return processPool(pool, pool.pool.objectId);
      })
    );

    const validPools = processedPools.filter(
      (pool): pool is PoolInfo => pool !== null && pool.tokens.length > 0
    );

    // Sort pools based on the specified metric
    const sortedPools = validPools.sort((a, b) => {
      let valueA: number, valueB: number;

      switch (metric) {
        case "apr":
          valueA = a.apr;
          valueB = b.apr;
          break;
        case "tvl":
          valueA = a.tvl;
          valueB = b.tvl;
          break;
        case "fees":
          valueA = a.fee;
          valueB = b.fee;
          break;
        case "volume":
          valueA = a.tvl * a.fee; // Using TVL * fee as a proxy for volume
          valueB = b.tvl * b.fee;
          break;
        default:
          valueA = a.tvl;
          valueB = b.tvl;
      }

      return order === "desc" ? valueB - valueA : valueA - valueB;
    });

    // Take only the requested number of pools
    const topPools = sortedPools.slice(0, limit);

    // Format the response with ranking information
    const rankedPools = topPools.map((pool, index) => ({
      rank: index + 1,
      ...pool,
      metrics: {
        apr: `${pool.apr.toFixed(2)}%`,
        tvl: `$${pool.tvl.toLocaleString()}`,
        fee: `${(pool.fee * 100).toFixed(2)}%`,
        volume: `$${(pool.tvl * pool.fee).toLocaleString()}`, // Estimated volume
      },
    }));

    return JSON.stringify([
      {
        reasoning: `Successfully retrieved top ${limit} pools ranked by ${metric}.`,
        response: JSON.stringify(
          {
            metric,
            order,
            pools: rankedPools,
          },
          null,
          2
        ),
        status: "success",
        query: `Retrieved top ${limit} pools ranked by ${metric} in ${order}ending order`,
        errors: [],
      },
    ]);
  } catch (error: any) {
    const errorId = Math.random().toString(36).substring(2, 15);
    return JSON.stringify([
      {
        reasoning:
          "The system encountered an issue while trying to retrieve ranked pools.",
        response: "The attempt to fetch ranked pools was unsuccessful.",
        status: "failure",
        query: `Attempted to fetch top ${limit} pools ranked by ${metric}`,
        errors: [`Error with ID: #${errorId}: ${error.message}`],
      },
    ]);
  }
}

/**
 * Gets pools filtered by specific criteria
 */
export async function getFilteredPools(
  minTvl?: number,
  minApr?: number,
  tokens?: string[]
): Promise<string> {
  try {
    const allPools = await pools.getAllPools();
    const processedPools = await Promise.all(
      allPools.map(async (pool) => {
        if (!pool.pool?.objectId) return null;
        return processPool(pool, pool.pool.objectId);
      })
    );

    let filteredPools = processedPools.filter((pool): pool is PoolInfo => {
      if (!pool || pool.tokens.length === 0) return false;

      // Apply TVL filter
      if (minTvl && pool.tvl < minTvl) return false;

      // Apply APR filter
      if (minApr && pool.apr < minApr) return false;

      // Apply token filter
      if (tokens) {
        const poolTokens = pool.tokens.map((t) => t.toLowerCase());
        const hasRequiredTokens = tokens.every((token) =>
          poolTokens.some((poolToken) =>
            poolToken.includes(token.toLowerCase())
          )
        );
        if (!hasRequiredTokens) return false;
      }

      return true;
    });

    // Format the response with detailed metrics
    const formattedPools = filteredPools.map((pool) => ({
      ...pool,
      metrics: {
        apr: `${pool.apr.toFixed(2)}%`,
        tvl: `$${pool.tvl.toLocaleString()}`,
        fee: `${(pool.fee * 100).toFixed(2)}%`,
        volume: `$${(pool.tvl * pool.fee).toLocaleString()}`, // Estimated volume
      },
    }));

    return JSON.stringify([
      {
        reasoning:
          "Successfully retrieved pools matching the specified criteria.",
        response: JSON.stringify(
          {
            filters: {
              minTvl,
              minApr,
              tokens,
            },
            poolCount: formattedPools.length,
            pools: formattedPools,
          },
          null,
          2
        ),
        status: "success",
        query: `Retrieved pools with${minTvl ? ` min TVL $${minTvl}` : ""}${
          minApr ? ` min APR ${minApr}%` : ""
        }${tokens ? ` containing tokens ${tokens.join(", ")}` : ""}`,
        errors: [],
      },
    ]);
  } catch (error: any) {
    const errorId = Math.random().toString(36).substring(2, 15);
    return JSON.stringify([
      {
        reasoning:
          "The system encountered an issue while trying to retrieve filtered pools.",
        response: "The attempt to fetch filtered pools was unsuccessful.",
        status: "failure",
        query: "Attempted to fetch filtered pools",
        errors: [`Error with ID: #${errorId}: ${error.message}`],
      },
    ]);
  }
}
