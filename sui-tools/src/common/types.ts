import { Pool as BaseAftermathPool } from 'aftermath-ts-sdk';

// Price related types
export interface TokenPrice {
  current: number;
  previous: number;
  lastUpdated: number;
  priceChange24h?: number;
}

export interface PriceAlert {
  coinType: string;
  threshold: number;
  isUpperBound: boolean;
  callback: (price: number) => void;
}

// Pool related types
export interface PoolInfo extends ProcessedPool {
  // Additional pool info properties if needed
}

// Extend the base Pool type with our additional properties
export interface AftermathPool extends BaseAftermathPool {
  coinTypes?: string[];
  reserves?: string[];  // Keep as string[] for raw data
  fee?: number;
  tvl?: number;
  apy?: number;
}

// Separate interface for processed pool data
export interface ProcessedPool {
  id: string;
  tokens: string[];
  reserves: bigint[];  // Converted to bigint[]
  fees: number;
  tvl?: number;
  apy?: number;
}

export interface AftermathPoolStats {
  tvl: number;
  volume24h: number;
  apy: number;
  fees: number;
}

// Transaction related types
export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  slippage: number;
  referrer?: string;
}

export interface DepositParams {
  poolId: string;
  amounts: {[key: string]: bigint};
  slippage: number;
  referrer?: string;
}

export interface TokenBalance {
  token: string;
  amount: bigint;
  symbol?: string;
  decimals?: number;
}

// Network related types
export interface NetworkConfig {
  fullnode: string;
  faucet?: string;
}

export interface NetworkConfigs {
  MAINNET: NetworkConfig;
  TESTNET: NetworkConfig;
}

export interface TokenAddresses {
  [key: string]: string;
}

export interface AftermathAddresses {
  POOLS: {
    [key: string]: string;
  };
  ROUTER: string;
}

export interface TransactionDefaults {
  slippage: number;
  gasBudget: number;
  referralFee: number;
}
