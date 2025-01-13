import dotenv from "dotenv";
dotenv.config();
import { AtomaSDK } from "atoma-sdk";
import { TOOL_DEFINITIONS } from "./toolDefinitions";
import { getTokenPrice, getCoinsPriceInfo } from "../markets/PriceAnalysis";

// Add console.log to debug
console.log("API Key:", process.env.ATOMA_API_KEY ? "Present" : "Missing");

// Initialize the Atoma SDK with proper authentication
const atomaSDK = new AtomaSDK({
  bearerAuth: process.env.ATOMA_API_KEY,
});

// Create the prompt template for price queries
const createPricePrompt = (query: string) => `
You are SuiSage, an expert agent specializing in the Sui blockchain. 
Your task is to analyze the user's price-related query and determine the appropriate tool to use.

Available Tools:
${JSON.stringify(TOOL_DEFINITIONS.price_analysis.tools, null, 2)}

User Query: ${query}

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
      }

      results.push({
        tool: action.tool,
        result,
      });
    }

    // Format the final answer using the results
    let finalAnswer = aiResponse.final_answer;
    if (results.length > 0 && results[0].result) {
      const priceData = results[0].result as any;
      finalAnswer = finalAnswer.replace(
        /\${([^}]+)}/g,
        (match: string, p1: string) => {
          try {
            // Handle nested paths like "output.current"
            const path = p1.split(".");
            let value = priceData;
            for (const key of path) {
              value = value[key];
            }
            return value?.toString() || match;
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
    "Get me the price and 24h change for SUI and BTC",
    "What was the price of SUI yesterday?",
  ];

  for (const query of queries) {
    console.log("\n-------------------");
    console.log("Query:", query);
    console.log("-------------------");

    const result = await getPriceInfo(query);
    console.log("Result:", JSON.stringify(result, null, 2));
  }
}

// Run the example if this file is being executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { getPriceInfo };
