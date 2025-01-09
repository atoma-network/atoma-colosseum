import { EventEmitter } from "events";
import { getTokenPrice } from "../aftermath/AftermathClient";
import { TokenPrice, PriceAlert } from '../common/types';

let monitorInstance: EventEmitter | null = null;
let prices: Map<string, TokenPrice> = new Map();
let alerts: PriceAlert[] = [];
let updateInterval: NodeJS.Timeout | null = null;
let trackedTokens: Set<string> = new Set();

/**
 * Initializes price monitoring for specified tokens
 * 
 * Creates an event emitter that broadcasts price updates and alerts.
 * Only one monitor instance is maintained (singleton pattern).
 * 
 * @param tokenAddresses - Array of token addresses to monitor
 * @param network - Optional network override ("MAINNET" | "TESTNET")
 * @returns EventEmitter that emits 'priceUpdate' and 'error' events
 * 
 * @example
 * const monitor = await initPriceMonitor([
 *   "0x2::sui::SUI",
 *   "0x...::coin::USDC"
 * ]);
 * 
 * monitor.on('priceUpdate', ({token, price}) => {
 *   console.log(`${token}: $${price.current}`);
 * });
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
  if (!updateInterval) {
    updateInterval = setInterval(() => {
      updatePrices(network).catch(error => {
        if (monitorInstance) {
          monitorInstance.emit('error', error);
        }
      });
    }, 30000);
  }

  return monitorInstance;
}

/**
 * Sets up a price alert for a specific token
 * 
 * Triggers callback when price crosses the specified threshold.
 * 
 * @param tokenAddr - Token address to monitor
 * @param threshold - Price threshold to trigger alert
 * @param isUpperBound - If true, alerts when price goes above threshold
 * @param callback - Function to call when alert triggers
 * 
 * @example
 * setPriceAlert(
 *   "0x2::sui::SUI",
 *   2.0,  // Alert when SUI > $2
 *   true,
 *   (price) => console.log(`SUI reached $${price}!`)
 * );
 */
export function setPriceAlert(
  tokenAddr: string,
  threshold: number,
  isUpperBound: boolean,
  callback: (price: number) => void
): void {
  alerts.push({
    coinType: tokenAddr,
    threshold,
    isUpperBound,
    callback
  });
}

/**
 * Calculates price volatility for a token
 * 
 * Volatility is measured as percentage change between current and previous price.
 * 
 * @param tokenAddr - Token address to check volatility
 * @returns Volatility as a percentage, or undefined if insufficient data
 * 
 * @example
 * const volatility = getVolatility("0x2::sui::SUI");
 * if (volatility !== undefined) {
 *   console.log(`SUI volatility: ${volatility}%`);
 * }
 */
export function getVolatility(tokenAddr: string): number | undefined {
  const price = prices.get(tokenAddr);
  if (!price || !price.previous) return undefined;
  
  return ((price.current - price.previous) / price.previous) * 100;
}

/**
 * Stops the price monitoring
 * 
 * Clears the update interval and resets the monitor state.
 */
export function stopPriceMonitor(): void {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
  prices.clear();
  alerts = [];
  trackedTokens.clear();
  monitorInstance = null;
}

/**
 * Updates prices for all tracked tokens
 * 
 * Internal function that fetches new prices and emits updates.
 */
async function updatePrices(network: "MAINNET" | "TESTNET"): Promise<void> {
  try {
    for (const tokenAddr of trackedTokens) {
      const priceInfo = await getTokenPrice(tokenAddr, network);
      const oldPrice = prices.get(tokenAddr);
      
      prices.set(tokenAddr, {
        ...priceInfo,
        previous: oldPrice?.current || priceInfo.current
      });

      if (monitorInstance) {
        monitorInstance.emit('priceUpdate', {
          token: tokenAddr,
          price: priceInfo
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

/**
 * Checks if any price alerts should be triggered
 * 
 * Internal function that evaluates alert conditions.
 */
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