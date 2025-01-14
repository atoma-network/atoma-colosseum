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
} from "../markets/PriceAnalysis";
import { COIN_ADDRESSES } from "../common/config";

// Initialize the Atoma SDK with proper authentication
const atomaSDK = new AtomaSDK({
  bearerAuth: process.env.ATOMASDK_BEARER_AUTH,
});

// Create the prompt template for price queries
const createPricePrompt = (query: string) => `
You are SuiSage, an expert agent specializing in the Sui blockchain. 
Your task is to analyze the user's price-related query and determine the appropriate tool to use.

Available Tools:
${JSON.stringify(TOOL_DEFINITIONS.price_analysis.tools, null, 2)}

Available Coins:
${Object.entries(COIN_ADDRESSES)
  .map(([symbol, address]) => `- ${symbol} (${address})`)
  .join("\n")}

User Query: ${query}

Important: 
- When referencing values in your final_answer, use the format \${result.fieldname}
- For multiple coins, use \${results['coinAddress'].fieldname}
- Always use the full coin address when specifying coins
- All listed coins can be queried for price information

Provide your response in the following JSON format:
{
  "status": "success" | "error" | "requires_info",
  "reasoning": "Explain why you chose this tool and approach",
  "actions": [{
    "tool": "tool_name",
    "input": {
      "param1": "value1",
      "param2": "value2"
    },
    "expected_outcome": "What you expect this tool to return"
  }],
  "final_answer": "How you will present the result to the user"
}
`;

// Add a type for the action results
interface ActionResult {
  tool: string;
  result: unknown;
}

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
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;

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
      }

      results.push({
        tool: action.tool,
        result,
      });
    }

    // Format final answer using the results
    let finalAnswer = aiResponse.final_answer;
    if (results.length > 0 && results[0].result) {
      const priceData = results[0].result as any;
      finalAnswer = finalAnswer.replace(
        /\${([^}]+)}/g,
        (match: string, p1: string) => {
          try {
            //single and multiple coin results
            if (p1.includes("results[")) {
              // For multiple coins
              const matches = p1.match(/results\['([^']+)'\]\.(.+)/);
              if (!matches) return match;
              const [_, coin, field] = matches;

              // special case for SUI's address
              const normalizedCoin =
                coin === "0x2::sui::SUI"
                  ? "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI"
                  : coin;

              return priceData[normalizedCoin]?.[field]?.toFixed(3) || match;
            } else {
              // For single coin (existing logic)
              const path = p1.replace(/^result\./, "").split(".");
              let value = priceData;
              for (const key of path) {
                value = value[key];
              }
              return !isNaN(value)
                ? Number(value).toFixed(3)
                : value?.toString() || match;
            }
          } catch {
            return match;
          }
        }
      );
    }

    return {
      status: "success",
      reasoning: aiResponse.reasoning,
      results,
      final_answer: finalAnswer,
    };
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
    "What is the current price of SUI?",
    //"Get me the prices of SUI and USDC",
    //"Show me the current prices of SUI, USDC, and BTC",
    //"Get information about pool 0x52ac89ee8c446638930f53129803f026a04028d2c0deef314321f71c69ab7f78?",
    //"What's the spot price between SUI and USDC in pool 0x52ac89ee8c446638930f53129803f026a04028d2c0deef314321f71c69ab7f78?",
    "what is the price of AFSUI",
    "what is the price of MSUI",
    "what is the price of CERT",
    "what is the price of SPRING_SUI",
    "what is the price of KSUI",
    "what is the price of HASUI",
    "what is the price of STSUI",
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
