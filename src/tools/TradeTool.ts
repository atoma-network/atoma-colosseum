import { Aftermath } from "aftermath-ts-sdk";

const af = new Aftermath("MAINNET");
const pools = af.Pools();

/**
 * Helper function to find matching tokens in a pool
 */
async function findTokensInPool(
  pool: any,
  coinInType: string,
  coinOutType: string
) {
  const availableTokens = Object.keys(pool.pool.coins);
  console.log("Available tokens:", availableTokens);
  console.log("Looking for tokens:", { coinInType, coinOutType });

  // Find matching tokens (case-insensitive and partial match)
  const findToken = (searchToken: string) => {
    return availableTokens.find((token) =>
      token.toLowerCase().includes(searchToken.toLowerCase())
    );
  };

  const matchedCoinIn = findToken(coinInType);
  const matchedCoinOut = findToken(coinOutType);

  if (!matchedCoinIn || !matchedCoinOut) {
    throw new Error(
      `Tokens not found in pool. Available tokens: ${availableTokens.join(
        ", "
      )}`
    );
  }

  console.log("Matched tokens:", { matchedCoinIn, matchedCoinOut });
  return { matchedCoinIn, matchedCoinOut };
}

/**
 * Gets spot price between two tokens in a pool
 */
export async function getPoolSpotPrice(
  poolId: string,
  coinInType: string,
  coinOutType: string,
  withFees: boolean = true
): Promise<string> {
  try {
    const pool = await pools.getPool({ objectId: poolId });
    if (!pool) {
      throw new Error(`Pool not found: ${poolId}`);
    }

    const { matchedCoinIn, matchedCoinOut } = await findTokensInPool(
      pool,
      coinInType,
      coinOutType
    );
    const spotPrice = pool.getSpotPrice({
      coinInType: matchedCoinIn,
      coinOutType: matchedCoinOut,
      withFees,
    });

    return JSON.stringify([
      {
        reasoning: "Successfully calculated spot price between tokens.",
        response: JSON.stringify(
          {
            spotPrice,
            coinIn: matchedCoinIn,
            coinOut: matchedCoinOut,
          },
          null,
          2
        ),
        status: "success",
        query: `Calculated spot price for ${coinInType} to ${coinOutType} in pool ${poolId}`,
        errors: [],
      },
    ]);
  } catch (error: any) {
    const errorId = Math.random().toString(36).substring(2, 15);
    return JSON.stringify([
      {
        reasoning:
          "The system encountered an issue while trying to calculate the spot price.",
        response: "The attempt to calculate spot price was unsuccessful.",
        status: "failure",
        query: `Attempted to calculate spot price for ${coinInType} to ${coinOutType} in pool ${poolId}`,
        errors: [`Error with ID: #${errorId}: ${error.message}`],
      },
    ]);
  }
}

/**
 * Gets trade amount out for a given input amount
 */
export async function getTradeAmountOut(
  poolId: string,
  coinInType: string,
  coinOutType: string,
  coinInAmount: bigint,
  referral: boolean = false
): Promise<string> {
  try {
    const pool = await pools.getPool({ objectId: poolId });
    if (!pool) {
      throw new Error(`Pool not found: ${poolId}`);
    }

    const { matchedCoinIn, matchedCoinOut } = await findTokensInPool(
      pool,
      coinInType,
      coinOutType
    );
    const amountOut = pool.getTradeAmountOut({
      coinInType: matchedCoinIn,
      coinOutType: matchedCoinOut,
      coinInAmount,
      referral,
    });

    return JSON.stringify([
      {
        reasoning: "Successfully calculated expected output amount for trade.",
        response: JSON.stringify(
          {
            amountOut: amountOut.toString(),
            coinIn: matchedCoinIn,
            coinOut: matchedCoinOut,
          },
          null,
          2
        ),
        status: "success",
        query: `Calculated output amount for ${coinInAmount} ${coinInType} to ${coinOutType}`,
        errors: [],
      },
    ]);
  } catch (error: any) {
    const errorId = Math.random().toString(36).substring(2, 15);
    return JSON.stringify([
      {
        reasoning:
          "The system encountered an issue while trying to calculate the trade output amount.",
        response:
          "The attempt to calculate trade output amount was unsuccessful.",
        status: "failure",
        query: `Attempted to calculate output for ${coinInAmount} ${coinInType} to ${coinOutType}`,
        errors: [`Error with ID: #${errorId}: ${error.message}`],
      },
    ]);
  }
}

/**
 * Gets trade route information
 */
export async function getTradeRoute(
  coinInType: string,
  coinOutType: string,
  coinInAmount: bigint
): Promise<string> {
  try {
    const router = af.Router();
    // For router, we need to find the tokens across all pools
    const allPools = await pools.getAllPools();
    let matchedCoinIn = coinInType;
    let matchedCoinOut = coinOutType;

    // Try to find tokens in any pool
    for (const pool of allPools) {
      try {
        const { matchedCoinIn: foundIn, matchedCoinOut: foundOut } =
          await findTokensInPool(pool, coinInType, coinOutType);
        matchedCoinIn = foundIn;
        matchedCoinOut = foundOut;
        break;
      } catch (e) {
        continue;
      }
    }

    const route = await router.getCompleteTradeRouteGivenAmountIn({
      coinInType: matchedCoinIn,
      coinOutType: matchedCoinOut,
      coinInAmount,
    });

    return JSON.stringify([
      {
        reasoning: "Successfully found trade route between tokens.",
        response: JSON.stringify(
          {
            route,
            coinIn: matchedCoinIn,
            coinOut: matchedCoinOut,
          },
          null,
          2
        ),
        status: "success",
        query: `Found trade route for ${coinInAmount} ${coinInType} to ${coinOutType}`,
        errors: [],
      },
    ]);
  } catch (error: any) {
    const errorId = Math.random().toString(36).substring(2, 15);
    return JSON.stringify([
      {
        reasoning:
          "The system encountered an issue while trying to find a trade route.",
        response: "The attempt to find a trade route was unsuccessful.",
        status: "failure",
        query: `Attempted to find trade route for ${coinInAmount} ${coinInType} to ${coinOutType}`,
        errors: [`Error with ID: #${errorId}: ${error.message}`],
      },
    ]);
  }
}

/**
 * Gets deposit transaction data
 */
export async function getDepositTransaction(
  poolId: string,
  walletAddress: string,
  amountsIn: { [key: string]: bigint },
  slippage: number = 0.01,
  referrer?: string
): Promise<string> {
  try {
    const pool = await pools.getPool({ objectId: poolId });
    if (!pool) {
      throw new Error(`Pool not found: ${poolId}`);
    }

    // Convert token symbols in amountsIn to full addresses
    const availableTokens = Object.keys(pool.pool.coins);
    const convertedAmountsIn: { [key: string]: bigint } = {};

    for (const [token, amount] of Object.entries(amountsIn)) {
      const matchedToken = availableTokens.find((t) =>
        t.toLowerCase().includes(token.toLowerCase())
      );
      if (!matchedToken) {
        throw new Error(
          `Token ${token} not found in pool. Available tokens: ${availableTokens.join(
            ", "
          )}`
        );
      }
      convertedAmountsIn[matchedToken] = amount;
    }

    const tx = await pool.getDepositTransaction({
      walletAddress,
      amountsIn: convertedAmountsIn,
      slippage,
      referrer,
    });

    return JSON.stringify([
      {
        reasoning: "Successfully generated deposit transaction data.",
        response: JSON.stringify(
          {
            tx,
            convertedAmounts: convertedAmountsIn,
          },
          null,
          2
        ),
        status: "success",
        query: `Generated deposit transaction for pool ${poolId}`,
        errors: [],
      },
    ]);
  } catch (error: any) {
    const errorId = Math.random().toString(36).substring(2, 15);
    return JSON.stringify([
      {
        reasoning:
          "The system encountered an issue while trying to generate the deposit transaction.",
        response:
          "The attempt to generate deposit transaction was unsuccessful.",
        status: "failure",
        query: `Attempted to generate deposit transaction for pool ${poolId}`,
        errors: [`Error with ID: #${errorId}: ${error.message}`],
      },
    ]);
  }
}

/**
 * Gets withdraw transaction data
 */
export async function getWithdrawTransaction(
  poolId: string,
  walletAddress: string,
  amountsOutDirection: { [key: string]: bigint },
  lpCoinAmount: bigint,
  slippage: number = 0.01,
  referrer?: string
): Promise<string> {
  try {
    const pool = await pools.getPool({ objectId: poolId });
    if (!pool) {
      throw new Error(`Pool not found: ${poolId}`);
    }

    // Convert token symbols in amountsOutDirection to full addresses
    const availableTokens = Object.keys(pool.pool.coins);
    const convertedAmountsOut: { [key: string]: bigint } = {};

    for (const [token, amount] of Object.entries(amountsOutDirection)) {
      const matchedToken = availableTokens.find((t) =>
        t.toLowerCase().includes(token.toLowerCase())
      );
      if (!matchedToken) {
        throw new Error(
          `Token ${token} not found in pool. Available tokens: ${availableTokens.join(
            ", "
          )}`
        );
      }
      convertedAmountsOut[matchedToken] = amount;
    }

    const tx = await pool.getWithdrawTransaction({
      walletAddress,
      amountsOutDirection: convertedAmountsOut,
      lpCoinAmount,
      slippage,
      referrer,
    });

    return JSON.stringify([
      {
        reasoning: "Successfully generated withdraw transaction data.",
        response: JSON.stringify(
          {
            tx,
            convertedAmounts: convertedAmountsOut,
          },
          null,
          2
        ),
        status: "success",
        query: `Generated withdraw transaction for pool ${poolId}`,
        errors: [],
      },
    ]);
  } catch (error: any) {
    const errorId = Math.random().toString(36).substring(2, 15);
    return JSON.stringify([
      {
        reasoning:
          "The system encountered an issue while trying to generate the withdraw transaction.",
        response:
          "The attempt to generate withdraw transaction was unsuccessful.",
        status: "failure",
        query: `Attempted to generate withdraw transaction for pool ${poolId}`,
        errors: [`Error with ID: #${errorId}: ${error.message}`],
      },
    ]);
  }
}
