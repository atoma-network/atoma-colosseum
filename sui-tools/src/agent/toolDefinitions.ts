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
    ],
  },
  yield_analysis: {
    name: "yield_analysis",
    description: "Tools for analyzing yields and APY calculations",
    tools: [
      {
        name: "get_pool_apy",
        description: "Fetches and calculates the APY for a specific pool",
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
          description: "Pool's APY as a percentage",
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
