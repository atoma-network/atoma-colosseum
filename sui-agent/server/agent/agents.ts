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
import { TokenPrice } from "../common/types";

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
I am SuiSage, your friendly Sui blockchain assistant. I help users understand pool metrics and market data in simple terms.

When you ask me about:
• TVL - I'll show you the total value of assets in the pool
• APR - I'll explain the annual returns based on trading fees
• Daily Fees - I'll tell you how much the pool earned in the last 24 hours
• Pool Info - I'll give you a complete overview of the pool's performance

Available Tools:
${JSON.stringify(TOOL_DEFINITIONS.price_analysis.tools, null, 2)}

Example Conversations:
User: "What's the APR of this pool?"
SuiSage: "Let me check the annual returns for this pool based on its trading activity."
Response: "\${result.apr}%"

User: "Show me the daily fees"
SuiSage: "I'll look up how much this pool earned in trading fees today."
Response: "$\${result.fee}"

User: "Tell me about this pool"
SuiSage: "I'll gather all the important metrics about this pool, including its size, returns, and token reserves."
Response: "\${result}"

Available Coins:
${Object.entries(COIN_ADDRESSES)
  .map(([symbol, address]) => `- ${symbol} (${address})`)
  .join("\n")}

User Query: ${query}

Important: 
- Explain concepts in simple terms
- Use friendly, conversational language
- Focus on what matters to users
- Avoid technical jargon unless necessary

Provide your response in the following JSON format:
{
  "status": "success" | "error" | "requires_info",
  "reasoning": "Explain what you're checking and why it matters to the user",
  "actions": [{
    "tool": "tool_name",
    "input": {
      "param1": "value1"
    },
    "expected_outcome": "What information you'll provide to the user"
  }],
  "final_answer": "Your clear and friendly response with the data"
}`;

// Add a type for the action results
interface ActionResult {
  tool: string;
  result: unknown;
}

// Update the formatting logic in getPriceInfo function
const formatPoolInfo = (data: any) => {
  if (!data) return "Pool information not available";

  const tokenNames = data.tokens.map((addr: string) => {
    const symbol =
      Object.entries(COIN_ADDRESSES).find(
        ([_, address]) => address === addr
      )?.[0] || "Unknown";
    return symbol;
  });

  const reserves = data.reserves.map((r: string | bigint): string => {
    const value = Number(r) / 1e9;
    return value.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    });
  });

  const tokenReservePairs = tokenNames.map(
    (token: string, i: number) =>
      `${token.padEnd(10)}: ${reserves[i].padStart(12)}`
  );

  return `Pool Information
================
ID: ${data.id}

Tokens and Reserves:
${tokenReservePairs.join("\n")}

Pool Stats:
• TVL: $${Number(data.tvl).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}
• Daily Fees: $${Number(data.fee).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}
• APR: ${Number(data.apr).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}%`;
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

        // Execute the appropriate tool
        let result:unknown = null;
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

      // Format final answer using the results
      let finalAnswer = aiResponse.final_answer;
      if (results.length > 0 && results[0].result) {
        const data = results[0].result as any;
        const action = aiResponse.actions[0];

        // If it's a pool info query, replace the entire result
        if (
          action.tool === "get_pool_info" &&
          (finalAnswer.includes("${result}") ||
            finalAnswer === "Pool Information: No data available")
        ) {
          const summary = `This pool has a Total Value Locked (TVL) of $${Number(
            data.tvl
          ).toLocaleString("en-US", {
            maximumFractionDigits: 2,
          })}, generates $${Number(data.fee).toLocaleString("en-US", {
            maximumFractionDigits: 2,
          })} in daily fees, and offers an APR of ${Number(
            data.apr
          ).toLocaleString("en-US", {
            maximumFractionDigits: 2,
          })}%.`;

          finalAnswer = `${summary}\n\n${formatPoolInfo(data)}`;
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
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// Example usage
async function main() {
  // Test different queries
  const queries = [
    "Get me the prices of SUI and USDC",
    "Show me the current prices of SUI, USDC, and BTC",
    "Get information about pool 0x52ac89ee8c446638930f53129803f026a04028d2c0deef314321f71c69ab7f78?",
    "Get fees for pool 0x52ac89ee8c446638930f53129803f026a04028d2c0deef314321f71c69ab7f78",
    "What's the spot price between afSUI and ksui in pool 0x52ac89ee8c446638930f53129803f026a04028d2c0deef314321f71c69ab7f78?",
    "What are the top pools by tvl?",
    "What are the top pools by fees?",
    "What are the top pools by apr?",
    "What are the top pools by volume?",
    "What are the top pools by liquidity?",
    "What are the top pools by reserves?",
    "What are the top pools by token?",
    "What are the top pools by token?",
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
