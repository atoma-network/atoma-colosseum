// First, let's define proper types for tool inputs
interface BaseToolInput {
  name: string;
  type: string;
  description: string;
  optional?: boolean;
}

interface StringToolInput extends BaseToolInput {
  type: "string";
  default?: string;
}

interface NumberToolInput extends BaseToolInput {
  type: "number";
  default?: number;
}

interface BooleanToolInput extends BaseToolInput {
  type: "boolean";
  default?: boolean;
}

type ToolInput = StringToolInput | NumberToolInput | BooleanToolInput;

// Update the tool definitions
export const TOOL_DEFINITIONS = {
  price_analysis: {
    name: "price_analysis",
    description:
      "Tools for analyzing token prices and market data on Sui blockchain",
    tools: [
      {
        name: "get_token_price",
        description:
          "Fetches current price and 24h change for a specific token",
        inputs: [
          {
            name: "token_type",
            type: "string",
            description: "Token address or identifier (e.g., '0x2::sui::SUI')",
          },
          {
            name: "network",
            type: "string",
            description: "Network to query ('MAINNET' or 'TESTNET')",
            optional: true,
            default: "MAINNET",
          },
        ],
        output: {
          type: "object",
          description: "Token price information",
          schema: {
            current: "number",
            previous: "number",
            lastUpdated: "number",
            priceChange24h: "number",
          },
        },
      },
      {
        name: "get_coins_price_info",
        description: "Gets price information for multiple coins simultaneously",
        inputs: [
          {
            name: "coins",
            type: "array",
            description: "Array of token addresses to query",
            items: {
              type: "string",
              description: "Token address or identifier",
            },
          },
          {
            name: "network",
            type: "string",
            description: "Network to query ('MAINNET' or 'TESTNET')",
            optional: true,
            default: "MAINNET",
          },
        ],
        output: {
          type: "object",
          description: "Map of coin addresses to their price information",
          schema: {
            type: "Record<string, TokenPrice>",
          },
        },
      },
      {
        name: "get_pool_info",
        description:
          "Get detailed information about a liquidity pool including reserves, TVL, APR, and daily fees",
        inputs: [
          {
            name: "pool_id",
            type: "string",
            description: "Unique identifier of the pool",
          },
          {
            name: "network",
            type: "string",
            description: "Network to query ('MAINNET' or 'TESTNET')",
            optional: true,
            default: "MAINNET",
          },
        ],
        output: {
          type: "object",
          description:
            "Pool information including tokens, reserves, fees, TVL, and APR",
        },
      },
      {
        name: "get_all_pools",
        description:
          "Get pool information sorted by specified metric (tvl, apr, fees). Default limit is 10 pools.",
        inputs: [
          {
            name: "sort_by",
            type: "string" as const,
            description: "Metric to sort by: 'tvl', 'apr', or 'fees'",
            optional: true,
            default: "tvl",
          },
          {
            name: "limit",
            type: "number" as const,
            description: "Number of pools to return",
            optional: true,
            default: 10,
          },
        ] as ToolInput[],
        output: {
          type: "array",
          description: "Array of pool information",
        },
      },
      {
        name: "get_pool_spot_price",
        description: "Gets the spot price between two tokens in a pool",
        inputs: [
          {
            name: "pool_id",
            type: "string",
            description: "Unique identifier of the pool",
          },
          {
            name: "coin_in_type",
            type: "string",
            description: "Token type of the input coin",
          },
          {
            name: "coin_out_type",
            type: "string",
            description: "Token type of the output coin",
          },
          {
            name: "with_fees",
            type: "boolean",
            description: "Whether to include fees in calculation",
            optional: true,
            default: true,
          },
        ],
        output: {
          type: "number",
          description: "Spot price of the pool",
        },
      },
      {
        name: "get_trade_route",
        description: "Gets optimal trade route between two tokens",
        inputs: [
          {
            name: "coin_in_type",
            type: "string",
            description: "Input token address",
          },
          {
            name: "coin_out_type",
            type: "string",
            description: "Output token address",
          },
          {
            name: "coin_in_amount",
            type: "string",
            description: "Amount of input token (in smallest units)",
          },
          {
            name: "network",
            type: "string",
            description: "Optional network override (MAINNET | TESTNET)",
            optional: true,
            default: "MAINNET",
          },
        ],
        output: {
          type: "object",
          description: "Trade route information",
          schema: {
            route: "string[]",
            estimated_cost: "number",
          },
        },
      },
      {
        name: "get_staking_positions",
        description: "Gets staking positions for a wallet",
        inputs: [
          {
            name: "wallet_address",
            type: "string",
            description: "Address of the wallet to query",
          },
          {
            name: "network",
            type: "string",
            description: "Optional network override (MAINNET | TESTNET)",
            optional: true,
            default: "MAINNET",
          },
        ],
        output: {
          type: "object",
          description: "Staking positions for the wallet",
          schema: {
            positions: "string[]",
          },
        },
      },
      {
        name: "get_dca_orders",
        description: "Gets DCA (Dollar Cost Average) orders for a wallet",
        inputs: [
          {
            name: "wallet_address",
            type: "string",
            description: "Address of the wallet to query",
          },
          {
            name: "network",
            type: "string",
            description: "Optional network override (MAINNET | TESTNET)",
            optional: true,
            default: "MAINNET",
          },
        ],
        output: {
          type: "object",
          description: "DCA orders for the wallet",
          schema: {
            orders: "string[]",
          },
        },
        final_answer_template: "DCA Orders for wallet:\n${result}",
      },
    ],
  },
  yield_analysis: {
    name: "yield_analysis",
    description: "Tools for analyzing yields and APR calculations",
    tools: [
      {
        name: "get_pool_apr",
        description: "Fetches and calculates the APR for a specific pool",
        inputs: [
          {
            name: "pool_id",
            type: "string",
            description: "The unique identifier of the pool",
          },
          {
            name: "network",
            type: "string",
            description: "Network to query ('MAINNET' or 'TESTNET')",
            optional: true,
            default: "MAINNET",
          },
        ],
        output: {
          type: "number",
          description: "Pool's APR as a percentage",
        },
      },
      {
        name: "get_best_lending_opportunities",
        description:
          "Retrieves the best lending opportunities across all pools",
        inputs: [
          {
            name: "min_apy",
            type: "number",
            description: "Minimum APY threshold in percentage",
            optional: true,
            default: 5,
          },
          {
            name: "network",
            type: "string",
            description: "Network to query ('MAINNET' or 'TESTNET')",
            optional: true,
            default: "MAINNET",
          },
        ],
        output: {
          type: "array",
          description: "Array of pools sorted by APY in descending order",
          items: {
            type: "object",
            schema: {
              id: "string",
              apy: "number",
              tokens: "string[]",
              tvl: "number",
            },
          },
        },
      },
    ],
  },
  transaction: {
    name: "transaction",
    description: "Tools for building and executing transactions",
    tools: [
      {
        name: "build_transfer_tx",
        description: "Builds a transaction for transferring tokens",
        inputs: [
          {
            name: "from_address",
            type: "string",
            description: "Sender's address",
          },
          {
            name: "to_address",
            type: "string",
            description: "Recipient's address",
          },
          {
            name: "token_type",
            type: "string",
            description: "Type of token to transfer",
          },
          {
            name: "amount",
            type: "string",
            description:
              "Amount to transfer (as a string to handle large numbers)",
          },
        ],
        output: {
          type: "object",
          description: "Transaction block ready for signing",
        },
      },
      {
        name: "estimate_gas",
        description: "Estimates the gas cost for executing a transaction",
        inputs: [
          {
            name: "transaction",
            type: "object",
            description: "Transaction block to estimate",
          },
        ],
        output: {
          type: "string",
          description: "Estimated gas cost in MIST (as a string)",
        },
      },
    ],
  },
};

// Export the types
export type {
  ToolInput,
  BaseToolInput,
  StringToolInput,
  NumberToolInput,
  BooleanToolInput,
};
