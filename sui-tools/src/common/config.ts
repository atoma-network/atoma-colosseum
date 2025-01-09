import { NetworkConfigs, TokenAddresses, AftermathAddresses, TransactionDefaults } from './types';

// Network configuration
export const NETWORK_CONFIG: NetworkConfigs = {
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
export const TOKEN_ADDRESSES: TokenAddresses = {
  SUI: "0x2::sui::SUI",
  USDC: "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::USDC",
  USDT: "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::USDT",
  WETH: "0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::WETH"
};

// Aftermath protocol addresses
export const AFTERMATH_ADDRESSES: AftermathAddresses = {
  POOLS: {
    SUI_USDC: "0x52ac89ee8c446638930f53129803f026a04028d2c0deef314321f71c69ab7f78", // SUI-USDC pool
    SUI_USDT: "0x2e041f3fd93646dcc877f783c1f2b7fa62d30271bdef1f21ef002cebf857bded", // SUI-USDT pool
    WETH_USDC: "0x5eb2dfcdd1b15d2021328258f6d5ec081e9a0cdbc5889aa952faa434ce5c5f7e"  // WETH-USDC pool
  },
  ROUTER: "0x0000000000000000000000000000000000000000000000000000000000000000" // Replace with actual router address
};
// Default transaction settings
export const TX_DEFAULTS: TransactionDefaults = {
  slippage: 0.01, // 1%
  gasBudget: 2000000,
  referralFee: 0.001 // 0.1%
};

