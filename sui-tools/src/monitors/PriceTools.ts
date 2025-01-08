import { Aftermath } from "aftermath-ts-sdk";
import { TokenPrice, PriceAlert } from '../common/types';
import { EventEmitter } from "events";

/**
 * Creates and initializes a price monitoring event emitter
 * 
 * This function sets up an event emitter that will be used to broadcast price updates
 * and alerts. The emitter will emit the following events:
 * - 'priceUpdate': When new price data is available
 * - 'error': When an error occurs during price fetching
 * 
 * @returns An initialized EventEmitter instance
 * 
 * @example
 * const emitter = createPriceEmitter();
 * emitter.on('priceUpdate', ({token, price}) => {
 *   console.log(`${token} price: $${price.current}`);
 * });
 */
export function createPriceEmitter(): EventEmitter {
  return new EventEmitter();
}

/**
 * Creates and initializes the price monitoring infrastructure
 * 
 * @param network - The network to connect to ("MAINNET" | "TESTNET")
 * @returns An initialized Aftermath client for price monitoring
 * @throws Error if initialization fails
 * 
 * @example
 * const priceMonitor = await initPriceMonitor("MAINNET");
 */
export async function initPriceMonitor(network: "MAINNET" | "TESTNET" = "MAINNET"): Promise<Aftermath> {
  const aftermath = new Aftermath(network);
  await aftermath.init();
  return aftermath;
}

/**
 * Updates prices for tracked tokens and emits price update events
 * 
 * This function fetches the latest prices for the specified tokens and emits
 * price update events through the provided emitter. It also checks price alerts
 * and triggers callbacks when alert conditions are met.
 * 
 * @param aftermath - An initialized Aftermath client
 * @param emitter - The event emitter for price updates
 * @param tokens - Array of token addresses to track
 * @param alerts - Array of price alerts to check
 * @returns Map of token addresses to their current prices
 * @throws Error if price fetch fails
 * 
 * @example
 * const prices = await updatePrices(
 *   aftermath,
 *   emitter,
 *   ["0x2::sui::SUI"],
 *   [{
 *     coinType: "0x2::sui::SUI",
 *     threshold: 2.0,
 *     isUpperBound: true,
 *     callback: (price) => console.log(`Alert: SUI above $${price}`)
 *   }]
 * );
 */
export async function updatePrices(
  aftermath: Aftermath,
  emitter: EventEmitter,
  tokens: string[],
  alerts: PriceAlert[]
): Promise<Map<string, TokenPrice>> {
  const prices = new Map<string, TokenPrice>();
  
  try {
    const pricesApi = aftermath.Prices();
    const priceInfo = await pricesApi.getCoinsToPriceInfo({ coins: tokens });

    for (const [tokenAddr, info] of Object.entries(priceInfo)) {
      const price: TokenPrice = {
        current: info.price,
        previous: prices.get(tokenAddr)?.current || info.price,
        lastUpdated: Date.now(),
        priceChange24h: info.priceChange24HoursPercentage
      };

      prices.set(tokenAddr, price);
      
      // Emit price update
      emitter.emit('priceUpdate', {
        token: tokenAddr,
        price
      });

      // Check alerts
      checkPriceAlerts(tokenAddr, price.current, alerts);
    }
  } catch (error) {
    emitter.emit('error', error);
    throw error;
  }

  return prices;
}

/**
 * Checks if any price alerts should be triggered
 * 
 * This function evaluates each price alert against the current price
 * and triggers the alert callback if conditions are met.
 * 
 * @param tokenAddr - The token address being checked
 * @param currentPrice - The current price of the token
 * @param alerts - Array of price alerts to check
 * 
 * @example
 * checkPriceAlerts("0x2::sui::SUI", 2.5, [{
 *   coinType: "0x2::sui::SUI",
 *   threshold: 2.0,
 *   isUpperBound: true,
 *   callback: (price) => console.log(`Alert: SUI above $${price}`)
 * }]);
 */
export function checkPriceAlerts(
  tokenAddr: string,
  currentPrice: number,
  alerts: PriceAlert[]
): void {
  alerts.forEach(alert => {
    if (alert.coinType !== tokenAddr) return;

    if (alert.isUpperBound && currentPrice >= alert.threshold) {
      alert.callback(currentPrice);
    } else if (!alert.isUpperBound && currentPrice <= alert.threshold) {
      alert.callback(currentPrice);
    }
  });
}

/**
 * Calculates price volatility as percentage change
 * 
 * @param current - Current price
 * @param previous - Previous price
 * @returns Volatility as a percentage
 * 
 * @example
 * const volatility = calculateVolatility(1.05, 1.00);
 * console.log(`Volatility: ${volatility}%`); // Volatility: 5%
 */
export function calculateVolatility(current: number, previous: number): number {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
} 