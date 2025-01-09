import { EventEmitter } from "events";
import { getTokenPrice } from "../aftermath/AftermathClient";
import { TokenPrice, PriceAlert } from "../common/types";

let monitorInstance: EventEmitter | null = null;
let prices: Map<string, TokenPrice> = new Map();
let alerts: PriceAlert[] = [];
let updateInterval: NodeJS.Timeout | null = null;
let trackedTokens: Set<string> = new Set();

/**
 * Initializes price monitoring for specified tokens
 */
export async function initPriceMonitor(
  tokenAddresses: string[],
  network: "MAINNET" | "TESTNET" = "MAINNET"
): Promise<EventEmitter> {
  if (!monitorInstance) {
    monitorInstance = new EventEmitter();
  }
  
  tokenAddresses.forEach(addr => trackedTokens.add(addr));
  await updatePrices(network);
  
  // Update prices every 30 seconds
  updateInterval = setInterval(() => {
    updatePrices(network);
  }, 30_000);

  return monitorInstance;
}

/**
 * Adds a new token to monitor
 */
export async function addToken(
  tokenAddress: string,
  network?: "MAINNET" | "TESTNET"
): Promise<void> {
  trackedTokens.add(tokenAddress);
  await updatePrices(network);
}

/**
 * Sets a price alert for a token
 */
export function setPriceAlert(
  coinType: string,
  threshold: number,
  isUpperBound: boolean,
  callback: (price: number) => void
): void {
  alerts.push({ coinType, threshold, isUpperBound, callback });
}

/**
 * Gets current price for a token
 */
export function getPrice(tokenAddress: string): TokenPrice | undefined {
  return prices.get(tokenAddress);
}

/**
 * Gets price volatility for a token
 */
export function getVolatility(tokenAddress: string): number | undefined {
  const price = prices.get(tokenAddress);
  if (!price || !price.previous) return undefined;
  return ((price.current - price.previous) / price.previous) * 100;
}

/**
 * Gets all tracked prices
 */
export function getAllPrices(): Map<string, TokenPrice> {
  return new Map(prices);
}

/**
 * Stops price monitoring
 */
export function stopMonitor(): void {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

// Private helper functions

async function updatePrices(network?: "MAINNET" | "TESTNET"): Promise<void> {
  try {
    const tokens = Array.from(trackedTokens);
    
    for (const tokenAddr of tokens) {
      const oldPrice = prices.get(tokenAddr);
      const priceInfo = await getTokenPrice(tokenAddr, network);
      
      const newPrice: TokenPrice = {
        current: priceInfo.current,
        previous: oldPrice?.current || priceInfo.current,
        lastUpdated: Date.now(),
        priceChange24h: priceInfo.priceChange24h
      };

      prices.set(tokenAddr, newPrice);
      
      if (monitorInstance) {
        monitorInstance.emit('priceUpdate', {
          token: tokenAddr,
          price: newPrice
        });
      }

      checkPriceAlerts(tokenAddr, priceInfo.current);
    }
  } catch (error) {
    if (monitorInstance) {
      monitorInstance.emit('error', error);
    }
  }
}

function checkPriceAlerts(tokenAddr: string, currentPrice: number): void {
  alerts.forEach(alert => {
    if (alert.coinType !== tokenAddr) return;

    if (alert.isUpperBound && currentPrice >= alert.threshold) {
      alert.callback(currentPrice);
    } else if (!alert.isUpperBound && currentPrice <= alert.threshold) {
      alert.callback(currentPrice);
    }
  });
} 