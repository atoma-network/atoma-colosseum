import { COIN_ADDRESSES } from "../common/config";
import { TokenPrice, PoolInfo } from "../common/types";

// Format single value with proper formatting
export const formatSingleValue = (
  data: any,
  field: string,
  subfield?: string
) => {
  if (!data) return "Data not available";

  let value = data[field];
  if (subfield && typeof value === "object") {
    value = value[subfield];
  }

  switch (field) {
    case "apr":
      return `APR: ${value}%`;
    case "tvl":
      return `TVL: $${Number(value).toLocaleString("en-US", {
        maximumFractionDigits: 2,
      })}`;
    case "reserves":
      if (typeof value === "object" && Array.isArray(value)) {
        const tokenNames = data.tokens.map((addr: string) => {
          const symbol =
            Object.entries(COIN_ADDRESSES).find(
              ([_, address]) => address === addr
            )?.[0] || "Unknown";
          return symbol;
        });

        if (subfield && !isNaN(parseInt(subfield))) {
          const idx = parseInt(subfield);
          const formattedValue = (
            Number(value[idx]) /
            1e9 /
            1e6
          ).toLocaleString("en-US", {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          });
          return `${tokenNames[idx]} Reserve: ${formattedValue}M`;
        }
      }
      return `${field}: ${value}`;
    default:
      return `${field}: ${value}`;
  }
};

// Format pool information with proper structure
export const formatPoolInfo = (data: any) => {
  if (!data) return "Pool information not available";

  try {
    // Format token names
    const tokenNames = data.tokens.map((addr: string) => {
      const symbol =
        Object.entries(COIN_ADDRESSES).find(
          ([_, address]) => address === addr
        )?.[0] ||
        addr.split("::")[2] ||
        "Unknown";
      return symbol;
    });

    // Format reserves with proper decimals
    const reserves = data.reserves.map((r: string | bigint): string => {
      const value = Number(r) / 1e9; // Convert from Sui decimals
      return value.toLocaleString("en-US", {
        maximumFractionDigits: 2,
      });
    });

    // Create token-reserve pairs
    const tokenReservePairs = tokenNames.map(
      (token: string, i: number) => `${token.padEnd(10)}: ${reserves[i]}`
    );

    // Format pool metrics
    const tvl = Number(data.tvl).toLocaleString("en-US", {
      maximumFractionDigits: 2,
    });
    const fees = Number(data.fee).toLocaleString("en-US", {
      maximumFractionDigits: 2,
    });
    const apr = Number(data.apr).toLocaleString("en-US", {
      maximumFractionDigits: 2,
    });

    return `Pool Information
================
ID: ${data.id}

Tokens and Reserves:
${tokenReservePairs.join("\n")}

Pool Stats:
• TVL: $${tvl}
• Daily Fees: $${fees}
• APR: ${apr}%`;
  } catch (error) {
    console.error("Error formatting pool info:", error);
    return "Error formatting pool information";
  }
};

// Format price information with proper structure
export const formatPrice = (price: TokenPrice, symbol: string) => {
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: price.current >= 100 ? 2 : 4,
  }).format(price.current);

  const change = price.priceChange24h > 0 ? "+" : "";
  const changePercent = `${change}${price.priceChange24h.toFixed(2)}%`;

  return `${symbol}: ${formattedPrice} (${changePercent})`;
};

// Format pool list with proper structure
export const formatPoolList = (pools: PoolInfo[], limit: number = 10) => {
  return pools
    .slice(0, limit)
    .map((pool, index) => {
      return `${index + 1}. Pool ${pool.id}
    TVL: $${pool.tvl?.toLocaleString()}
    APR: ${pool.apr?.toFixed(2)}%
    Daily Fees: $${pool.fee?.toLocaleString()}`;
    })
    .join("\n\n");
};

// Format response for different types of queries
export const formatResponse = (
  action: { tool: string; input: Record<string, any> },
  data: any,
  query: string
) => {
  switch (action.tool) {
    case "get_pool_info":
      const tvl = Number(data.tvl).toLocaleString("en-US", {
        maximumFractionDigits: 2,
      });
      const fees = Number(data.fee).toLocaleString("en-US", {
        maximumFractionDigits: 2,
      });
      const apr = Number(data.apr).toLocaleString("en-US", {
        maximumFractionDigits: 2,
      });

      const summary = `This pool has a Total Value Locked (TVL) of $${tvl}, generates $${fees} in daily fees, and offers an APR of ${apr}%.`;

      // Get token information
      const tokenInfo = data.tokens
        .map((addr: string) => {
          const symbol =
            Object.entries(COIN_ADDRESSES).find(
              ([_, address]) => address === addr
            )?.[0] ||
            addr.split("::")[2] ||
            "Unknown";
          return symbol;
        })
        .join(", ");

      const fullSummary = `${summary}\nThe pool contains the following tokens: ${tokenInfo}`;
      return `${fullSummary}\n\n${formatPoolInfo(data)}`;

    case "get_pool_spot_price":
      const spotPrice = Number(data).toFixed(6);
      const inToken = action.input.coin_in_type.split("::").pop() || "token";
      const outToken = action.input.coin_out_type.split("::").pop() || "token";
      return `The current spot price is ${spotPrice} ${outToken} per ${inToken}`;

    case "get_coins_price_info":
      const prices = Object.entries(data).map(([addr, info]: [string, any]) => {
        const symbol =
          Object.entries(COIN_ADDRESSES).find(
            ([_, address]) => address === addr
          )?.[0] || addr.split("::")[2];

        return `${symbol}: $${Number(info.current).toLocaleString("en-US", {
          maximumFractionDigits: 2,
        })}`;
      });

      return `Current prices:\n${prices.join("\n")}`;

    default:
      return JSON.stringify(data, null, 2);
  }
};
