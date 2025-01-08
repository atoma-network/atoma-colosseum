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

export interface PoolInfo {
  id: string;
  tokens: string[];
  reserves: bigint[];
  fees: number;
  tvl?: number;
  apy?: number;
}

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

export interface AftermathPoolStats {
  tvl: number;
  volume24h: number;
  apy: number;
  fees: number;
}
