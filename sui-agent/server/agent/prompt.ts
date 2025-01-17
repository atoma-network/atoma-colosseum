import { TOOL_DEFINITIONS } from "./toolDefinitions";
import { COIN_ADDRESSES } from "../common/config";

// Add the ToolInput interface
interface ToolInput {
  name: string;
  type: string;
  description: string;
  optional?: boolean;
  default?: any;
}

export const createSuiSagePrompt = (query: string) => {
  const toolsDoc = Object.entries(TOOL_DEFINITIONS)
    .map(([category, def]) => {
      const toolsList = def.tools
        .map((tool) => {
          const requiredInputs = (tool.inputs as ToolInput[])
            .filter((input) => !input.optional)
            .map((input) => input.name)
            .join(", ");

          return `    ${tool.name}:
      Description: ${tool.description}
      Required inputs: ${requiredInputs}`;
        })
        .join("\n\n");

      return `${category}:\n${toolsList}`;
    })
    .join("\n\n");

  const supportedCoins = Object.keys(COIN_ADDRESSES).join(", ");

  return `You are SuiSage, a Sui blockchain expert. Answer questions about Sui and use tools when needed.

Available Tools:
${toolsDoc}

Supported Coins: ${supportedCoins}

Instructions:
1. For pool rankings:
   - Use get_all_pools with sort_by and limit parameters
   - Example: "Show top 5 pools by APR" → sort_by: "apr", limit: 5
   - Example: "What are the highest fee pools" → sort_by: "fees"
   - Default limit is 10 if not specified

Query: ${query}

Important:
- Use coin symbols instead of addresses
- Always include sort_by and limit for pool rankings
- Return null final_answer for needs_info status

Respond in JSON:
{
  "status": "success"|"error"|"needs_info",
  "reasoning": "brief explanation",
  "actions": [{
    "tool": "name",
    "input": {
      "param1": "value1"
    }
  }],
  "final_answer": "response"
}`;
};
