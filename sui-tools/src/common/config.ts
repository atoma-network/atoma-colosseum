// Network configuration
export const NETWORK_CONFIG = {
  MAINNET: {
    fullnode: "https://fullnode.mainnet.sui.io",
    faucet: undefined
  },
  TESTNET: {
    fullnode: "https://fullnode.testnet.sui.io",
    faucet: "https://faucet.testnet.sui.io/gas"
  }
};

// Common token addresses
export const TOKEN_ADDRESSES = {
  SUI: "0x2::sui::SUI",
  USDC: "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::USDC",
  USDT: "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::USDT",
  WETH: "0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::WETH"
};

// Aftermath protocol addresses
export const AFTERMATH_ADDRESSES = {
  POOLS: {
    SUI_USDC: "0x...", //  pool addresses
    SUI_USDT: "0x...",
    WETH_USDC: "0x..."
  },
  ROUTER: "0x...", //router address
};

// Default transaction settings
export const TX_DEFAULTS = {
  slippage: 0.01, // 1%
  gasBudget: 2000000,
  referralFee: 0.001 // 0.1%
};
