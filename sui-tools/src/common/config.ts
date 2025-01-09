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
  USDC: "0x2::usdc::USDC",
  USDT: "0x2::usdt::USDT",
  WETH: "0x2::weth::WETH",
  // Add other tokens as needed
};

// Aftermath protocol addresses
export const AFTERMATH_ADDRESSES: AftermathAddresses = {
  POOLS: {
    SUI_USDC: "0x...", //  pool addresses
    SUI_USDT: "0x...",
    WETH_USDC: "0x..."
  },
  ROUTER: "0x..." //router address
};

// Default transaction settings
export const TX_DEFAULTS: TransactionDefaults = {
  slippage: 0.01, // 1%
  gasBudget: 2000000,
  referralFee: 0.001 // 0.1%
};
