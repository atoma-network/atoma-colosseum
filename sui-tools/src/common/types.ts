import { Pool, ApiIndexerEventsBody, IndexerEventsWithCursor, PoolDepositEvent, PoolWithdrawEvent } from 'aftermath-ts-sdk';

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
export interface ProcessedPool extends Omit<RawPoolInfo, 'reserves'> {
  reserves: bigint[];
  fees: number;
}

// Final pool info type
export interface PoolInfo extends RawPoolInfo {
  // Additional pool info properties if needed
}

// Extend the base Pool type with our additional properties
export interface AftermathPool {
  getSpotPrice(params: { coinInType: string; coinOutType: string; withFees?: boolean }): number;
  getTradeAmountOut(params: { coinInType: string; coinOutType: string; coinInAmount: bigint; referral?: boolean }): bigint;
  getTradeAmountIn(params: { coinInType: string; coinOutType: string; coinOutAmount: bigint; referral?: boolean }): bigint;
  getDepositEvents(inputs: ApiIndexerEventsBody): Promise<IndexerEventsWithCursor<PoolDepositEvent>>;
  getWithdrawEvents(inputs: ApiIndexerEventsBody): Promise<IndexerEventsWithCursor<PoolWithdrawEvent>>;
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

// Add SDK type definitions
interface CoinPriceInfo {
  price: number;
  priceChange24HoursPercentage: number;
}

interface CoinsToPriceInfo {
  [key: string]: CoinPriceInfo;
}

interface SpotPriceParams {
  coinInType: string;
  coinOutType: string;
  withFees?: boolean;
}

export interface PriceMonitor {
  addAlert: (coinType: string, threshold: number, isUpperBound: boolean, callback: (price: number) => void) => PriceAlert;
  removeAlert: (alert: PriceAlert) => void;
  getAlerts: () => PriceAlert[];
  checkAlerts: () => Promise<void>;
  startMonitoring: (interval: number) => void;
  stopMonitoring: () => void;
}

