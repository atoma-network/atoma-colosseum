// Price related types
export interface TokenPrice {
  current: number;
  previous: number;
  lastUpdated: string;
  priceChange24h: number;
}

// Base interface for raw pool data
export interface RawPoolInfo {
  id: string;
  tokens: string[];
  coinTypes?: string[];
  reserves: bigint[];
  fee?: number; // Daily fees in USD
  tvl?: number; // Total Value Locked in USD
  apr?: number; // Annual Percentage Rate
}

// Processed pool data with converted types
export interface ProcessedPool extends Omit<RawPoolInfo, "reserves"> {
  reserves: bigint[];
  fees: number; // Daily fees in USD
}

// Final pool info type
export interface PoolInfo {
  id: string;
  tokens: string[];
  reserves: bigint[];
  fee: number; // Daily fees in USD
  tvl: number; // Total Value Locked in USD
  apr: number; // Annual Percentage Rate
}

export interface PoolMetrics {
  poolId: string;
  volume: number;
  tvl: number;
  fees: number;
  apr: number;
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

export interface LendingInfo {
  asset: string;
  lendingApr: number;
  borrowingApr: number;
  utilization: number;
}
