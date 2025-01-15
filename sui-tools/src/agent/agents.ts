import dotenv from "dotenv";
import path from "path";

// Configure dotenv with explicit path
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { AtomaSDK } from "atoma-sdk";
import { TOOL_DEFINITIONS } from "./toolDefinitions";
import {
  getTokenPrice,
  getCoinsPriceInfo,
  getPool,
  getAllPools,
  getPoolSpotPrice,
  getTradeRoute,
  getStakingPositions,
  getDcaOrders,
} from "../markets/PriceAnalysis";
import { COIN_ADDRESSES } from "../common/config";

// Initialize the Atoma SDK with proper authentication
const atomaSDK = new AtomaSDK({
  bearerAuth: process.env.ATOMASDK_BEARER_AUTH,
});

// Add new formatting functions
const formatSingleValue = (data: any, field: string, subfield?: string) => {
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

// Update the prompt template
const createPricePrompt = (query: string) => `
I am SuiSage, an expert agent specializing in Sui blockchain analytics. I help users understand pool metrics, market data, and token information through careful analysis and clear explanations.

**Capabilities:**
• Pool Information - Complete overview of any pool's performance
• Token Prices - Current prices and 24h changes for any Sui token
• Spot Prices - Exchange rates between any two tokens in a pool
• Pool Metrics:
  - TVL (Total Value Locked) - Total value of assets in the pool
  - APR (Annual Percentage Rate) - Yearly returns based on fees
  - Daily Fees - Trading fees earned in last 24 hours
  - Token Reserves - Amount of each token in the pool
• Trading Information:
  - Best Trading Routes
  - Price Impact Estimates
  - Optimal Swap Paths

**Reasoning Process:**
1. Task Analysis: I break down requests into clear sub-problems
2. Tool Selection: I choose the most appropriate tools for each sub-task
3. Data Validation: I verify I have all required information
4. Response Formation: I provide clear, contextualized answers

**Available Tools:**
${JSON.stringify(TOOL_DEFINITIONS.price_analysis.tools, null, 2)}

**Example Interactions:**

1. Complete Information Query:
User: "What's the APR of pool 0x123...?"
Reasoning: User wants pool APR, I have the pool ID and required tool
Action: Use get_pool_info to fetch pool data
Response: "The pool currently offers an APR of \${result.apr}%"

2. Insufficient Information Query:
User: "What's the spot price between tokens?"
Reasoning: Missing pool ID and specific tokens
Response: {
  "status": "needs_info",
  "request": "I need the following information to help you:
   1. The pool ID you're interested in
   2. The input token (e.g., SUI, USDC)
   3. The output token you want to compare with"
}

3. Error Case:
User: "Get leverage trading info"
Reasoning: No tools available for leverage trading
Response: {
  "status": "error",
  "error_message": "I apologize, but I don't have access to leverage trading information. I can help with spot prices, pool metrics, and basic trading information."
}

**Available Tokens:**
${Object.entries(COIN_ADDRESSES)
  .map(([symbol, address]) => `• ${symbol.padEnd(8)} ${address}`)
  .join("\n")}

User Query: ${query}

**Response Guidelines:**
• Analyze the query thoroughly using Chain of Thought reasoning
• Validate all required information is available
• Request specific missing information if needed
• Provide context with metrics and explanations
• Format numbers consistently with proper decimals
• Include percentage changes where relevant

**Response Format:**
{
  "status": "success" | "error" | "needs_info",
  "reasoning": "Detailed explanation of analysis and decision process",
  "actions": [{
    "tool": "tool_name",
    "input": {
      "param1": "value1"
    },
    "expected_outcome": "What information this tool should provide"
  }],
  "request": "Specific information needed from user (if status is needs_info)",
  "final_answer": "Clear, formatted response with context",
  "error_message": "Detailed error explanation (if status is error)"
}`;

// Add a type for the action results
interface ActionResult {
  tool: string;
  result: unknown;
}

// Update the formatting logic in getPriceInfo function
const formatPoolInfo = (data: any) => {
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

async function getPriceInfo(query: string) {
  try {
    // Get AI response
    const result = await atomaSDK.chat.create({
      messages: [
        {
          content: createPricePrompt(query),
          role: "user",
        },
      ],
      model: "meta-llama/Llama-3.3-70B-Instruct",
      maxTokens: 128,
    });

    // Extract JSON from markdown response
    const content = result.choices[0].message.content;
    const jsonMatch =
      content.match(/```(?:json)?\n([\s\S]*?)\n```/) ||
      content.match(/({[\s\S]*})/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : content.trim();

    try {
      // Parse the AI response
      const aiResponse = JSON.parse(jsonString);

      // Validate AI response
      if (aiResponse.status === "error") {
        throw new Error(aiResponse.error_message);
      }

      if (aiResponse.status === "requires_info") {
        return {
          status: "needs_info",
          request: aiResponse.request,
        };
      }

      // Execute the actions recommended by the AI
      const results: ActionResult[] = [];
      for (const action of aiResponse.actions) {
        console.log(`Executing action: ${action.tool}`);
        console.log("Input parameters:", action.input);

        let result = null;
        switch (action.tool) {
          case "get_token_price":
            result = await getTokenPrice(
              action.input.token_type,
              action.input.network
            );
            break;
          case "get_coins_price_info":
            result = await getCoinsPriceInfo(
              action.input.coins,
              action.input.network
            );
            break;
          case "get_pool_info":
            result = await getPool(action.input.pool_id, action.input.network);
            break;
          case "get_all_pools":
            result = await getAllPools(action.input.network);
            // Sort and limit pools for top N query
            if (query.toLowerCase().includes("top")) {
              const limit = query.match(/top\s+(\d+)/i)?.[1]
                ? parseInt(query.match(/top\s+(\d+)/i)![1])
                : 10;

              const sortField = query.includes("tvl")
                ? "tvl"
                : query.includes("fee")
                ? "fee"
                : query.includes("apr")
                ? "apr"
                : "tvl";

              result = result
                .sort((a: any, b: any) => b[sortField] - a[sortField])
                .slice(0, limit);
            }
            break;
          case "get_pool_spot_price":
            result = await getPoolSpotPrice(
              action.input.pool_id,
              action.input.coin_in_type,
              action.input.coin_out_type,
              action.input.with_fees,
              action.input.network
            );
            break;
          case "get_trade_route":
            result = await getTradeRoute(
              action.input.coin_in_type,
              action.input.coin_out_type,
              BigInt(action.input.coin_in_amount),
              action.input.network
            );
            break;
          case "get_staking_positions":
            result = await getStakingPositions(
              action.input.wallet_address,
              action.input.network
            );
            break;
          case "get_dca_orders":
            result = await getDcaOrders(
              action.input.wallet_address,
              action.input.network
            );
            break;
        }

        results.push({
          tool: action.tool,
          result,
        });
      }

      // Format final answer
      let finalAnswer = aiResponse.final_answer;
      if (results.length > 0 && results[0].result) {
        const data = results[0].result as any;
        const action = aiResponse.actions[0];

        // Handle top pools response
        if (
          action.tool === "get_all_pools" &&
          query.toLowerCase().includes("top")
        ) {
          const pools = data as any[];
          finalAnswer =
            `Here are the top ${pools.length} pools:\n\n` +
            pools
              .map(
                (pool, index) =>
                  `${index + 1}. Pool ${pool.id.slice(0, 8)}...${pool.id.slice(
                    -8
                  )}\n` +
                  `   • TVL: $${Number(pool.tvl).toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  })}\n` +
                  `   • Daily Fees: $${Number(pool.fee).toLocaleString(
                    "en-US",
                    { maximumFractionDigits: 2 }
                  )}\n` +
                  `   • APR: ${Number(pool.apr).toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  })}%`
              )
              .join("\n\n");
        }
        // If it's a pool info query, replace the entire result
        else if (
          action.tool === "get_pool_info" &&
          (finalAnswer.includes("${result}") ||
            finalAnswer === "Pool Information: No data available")
        ) {
          try {
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
            finalAnswer = `${fullSummary}\n\n${formatPoolInfo(data)}`;
          } catch (error) {
            console.error("Error formatting pool response:", error);
            finalAnswer = "Error processing pool information";
          }
        }
        // Add special handling for spot price
        else if (action.tool === "get_pool_spot_price") {
          const spotPrice = Number(data).toFixed(6);
          const inToken =
            action.input.coin_in_type.split("::").pop() || "token";
          const outToken =
            action.input.coin_out_type.split("::").pop() || "token";
          finalAnswer = `The current spot price is ${spotPrice} ${outToken} per ${inToken}`;
        }
        // Add special handling for fee queries
        else if (
          action.tool === "get_pool_info" &&
          query.toLowerCase().includes("fee")
        ) {
          const dailyFees = Number(data.fee).toLocaleString("en-US", {
            maximumFractionDigits: 2,
          });
          finalAnswer = `The daily trading fees for this pool are $${dailyFees}`;
        }
        // Add special handling for coin price queries
        else if (action.tool === "get_coins_price_info") {
          const prices = Object.entries(data).map(
            ([addr, info]: [string, any]) => {
              const symbol =
                Object.entries(COIN_ADDRESSES).find(
                  ([_, address]) => address === addr
                )?.[0] || addr.split("::")[2];

              return `${symbol}: $${Number(info.current).toLocaleString(
                "en-US",
                {
                  maximumFractionDigits: 2,
                }
              )}`;
            }
          );

          finalAnswer = `Current prices:\n${prices.join("\n")}`;
        } else {
          finalAnswer = finalAnswer.replace(
            /\${([^}]+)}/g,
            (match: string, p1: string) => {
              try {
                if (p1.includes("results[")) {
                  // For multiple coins (existing logic)
                  const matches = p1.match(/results\['([^']+)'\]\.(.+)/);
                  if (!matches) return match;
                  const [_, coin, field] = matches;

                  // special case for SUI's address
                  const normalizedCoin =
                    coin === "0x2::sui::SUI"
                      ? "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI"
                      : coin;

                  return data[normalizedCoin]?.[field]?.toFixed(3) || match;
                } else {
                  // For single result
                  const path = p1.replace(/^result\./, "").split(".");
                  let value = data;
                  for (const key of path) {
                    value = value[key];
                  }

                  // Special handling for arrays and objects
                  if (Array.isArray(value)) {
                    return value.length === 0
                      ? "No data found"
                      : JSON.stringify(value, null, 2);
                  } else if (typeof value === "object" && value !== null) {
                    if (action.tool === "get_pool_info") {
                      return formatPoolInfo(value);
                    }
                    return JSON.stringify(value, null, 2);
                  }

                  return !isNaN(value)
                    ? Number(value).toFixed(3)
                    : value?.toString() || "No data available";
                }
              } catch {
                return "Error processing data";
              }
            }
          );
        }
      }

      return {
        status: "success",
        reasoning: aiResponse.reasoning,
        results,
        final_answer: finalAnswer,
      };
    } catch (error) {
      console.error("Failed to parse AI response:", jsonString);
      throw new Error("Failed to parse AI response");
    }
  } catch (error) {
    console.error("Error:", error);
    return {
      status: "error",
      error_message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// Example usage
async function main() {
  // Test different queries
  const queries = [
    "Get me the prices of SUI",
    // "Show me the current prices of SUI, USDC, and BTC",
    // "Get information about pool 0x52ac89ee8c446638930f53129803f026a04028d2c0deef314321f71c69ab7f78?",
    // "Get fees for pool 0x52ac89ee8c446638930f53129803f026a04028d2c0deef314321f71c69ab7f78",
    "What's the spot price between afSUI and ksui in pool 0x52ac89ee8c446638930f53129803f026a04028d2c0deef314321f71c69ab7f78?",
    "What are the top 10 pools by tvl?",
    // "What are the top pools by fees?",
    // "What are the top pools by apr?",
    // "What are the top pools by volume?",
    // "What are the top pools by liquidity?",
    // "What are the top pools by reserves?",
    // "What are the top pools by token?",
    // "What are the top pools by token?",
  ];

  for (const query of queries) {
    console.log("\n-------------------");
    console.log("Query:", query);
    console.log("-------------------");

    const result = await getPriceInfo(query);
    console.log("Result:", JSON.stringify(result, null, 2));
  }
}

// Run the example if this file is run directly
if (require.main === module) {
  main().catch(console.error);
}

export { getPriceInfo };
