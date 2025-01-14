// Price related types
export interface TokenPrice {
  current: number;
  previous: number;
  lastUpdated: string;
  priceChange24h?: number;
}

// Base interface for raw pool data
export interface RawPoolInfo {
  id: string;
  tokens: string[];
  coinTypes?: string[];
  reserves: string[];
  fee?: number;
  tvl?: number;
  apy?: number;
}

// Processed pool data with converted types
export interface ProcessedPool extends Omit<RawPoolInfo, "reserves"> {
  reserves: bigint[];
  fees: number;
}

// Final pool info type
export interface PoolInfo extends RawPoolInfo {
  id: string;
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
