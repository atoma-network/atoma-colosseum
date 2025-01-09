import { Aftermath } from "aftermath-ts-sdk";
import { EventEmitter } from "events";

/**
 * **TokenPrice**
 * 
 * An interface representing the price information of a token.
 */
interface TokenPrice {
  /** The current price of the token. */
  current: number;
  /** The previous price of the token. */
  previous: number;
  /** Timestamp of the last price update. */
  lastUpdated: number;
  /** Percentage change in price over the last 24 hours. */
  priceChange24h?: number;
}

/**
 * **PriceAlert**
 * 
 * An interface representing a price alert configuration.
 */
interface PriceAlert {
  /** The token address to monitor. */
  coinType: string;
  /** The price threshold to trigger the alert. */
  threshold: number;
  /** True for upper bound alerts, false for lower bound alerts. */
  isUpperBound: boolean;
  /** The callback function to execute when the alert is triggered. */
  callback: (price: number) => void;
}

/**
 * **PriceMonitor**
 * 
 * The `PriceMonitor` class provides functionalities to monitor token prices, set up price alerts, and emit events on price updates or alerts. It interfaces with the Aftermath platform to fetch real-time price data.
 */
export class PriceMonitor extends EventEmitter {
  private aftermath: Aftermath;
  private prices: Map<string, TokenPrice>;
  private alerts: PriceAlert[];
  private updateInterval: NodeJS.Timeout | null;
  private trackedTokens: Set<string>;

  /**
   * **Constructs a new `PriceMonitor` instance.**
   * 
   * @param network - The network environment to connect to, either `"MAINNET"` or `"TESTNET"`. Defaults to `"MAINNET"`.
   * 
   * @example
   * const priceMonitor = new PriceMonitor("TESTNET");
   */
  constructor(network: "MAINNET" | "TESTNET" = "MAINNET") {
    super();
    this.aftermath = new Aftermath(network);
    this.prices = new Map();
    this.alerts = [];
    this.updateInterval = null;
    this.trackedTokens = new Set();
  }

  /**
   * **Initializes the price monitor and starts tracking specified tokens.**
   * 
   * @param tokenAddresses - An array of token addresses (coin types) to monitor.
   * @returns A promise that resolves when initialization is complete.
   * 
   * @example
   * await priceMonitor.init(["0x2::sui::SUI", "0x2::aptos::APT"]);
   */
  public async init(tokenAddresses: string[]): Promise<void> {
    await this.aftermath.init();
    tokenAddresses.forEach(addr => this.trackedTokens.add(addr));
    await this.updatePrices();
    
    // Update prices every 30 seconds
    this.updateInterval = setInterval(() => {
      this.updatePrices();
    }, 30_000);
  }

  /**
   * **Adds a new token to the monitoring list.**
   * 
   * This method allows dynamic addition of tokens to be tracked by the price monitor.
   * 
   * @param tokenAddress - The token address (coin type) to add.
   * @returns A promise that resolves when the token is added.
   * 
   * @example
   * await priceMonitor.addToken("0x2::bitcoin::BTC");
   */
  public async addToken(tokenAddress: string): Promise<void> {
    this.trackedTokens.add(tokenAddress);
    await this.updatePrices();
  }

  /**
   * **Sets a price alert for a specific token.**
   * 
   * This method allows setting up alerts that trigger a callback when a token's price crosses a specified threshold.
   * 
   * @param coinType - The token address (coin type) to monitor.
   * @param threshold - The price threshold to trigger the alert.
   * @param isUpperBound - Set to `true` for upper bound alerts (price goes above threshold), `false` for lower bound alerts (price goes below threshold).
   * @param callback - The function to call when the alert is triggered.
   * 
   * @example
   * priceMonitor.setPriceAlert(
   *   "0x2::sui::SUI",
   *   2.0,
   *   true,
   *   (price) => console.log(`Alert: SUI price has risen above $${price}`)
   * );
   */
  public setPriceAlert(
    coinType: string, 
    threshold: number, 
    isUpperBound: boolean,
    callback: (price: number) => void
  ): void {
    this.alerts.push({
      coinType,
      threshold,
      isUpperBound,
      callback
    });
  }

  /**
   * **Retrieves the current price information for a specific token.**
   * 
   * @param tokenAddress - The token address (coin type) to query.
   * @returns An object containing the token's price information, or `undefined` if not available.
   * 
   * @example
   * const priceInfo = priceMonitor.getPrice("0x2::sui::SUI");
   * console.log(`Current price: $${priceInfo?.current}`);
   */
  public getPrice(tokenAddress: string): TokenPrice | undefined {
    return this.prices.get(tokenAddress);
  }

  /**
   * **Calculates the price volatility for a specific token.**
   * 
   * Volatility is computed as the percentage change between the current and previous prices.
   * 
   * @param tokenAddress - The token address (coin type) to analyze.
   * @returns The volatility percentage, or `undefined` if insufficient data.
   * 
   * @example
   * const volatility = priceMonitor.getVolatility("0x2::sui::SUI");
   * console.log(`Volatility: ${volatility}%`);
   */
  public getVolatility(tokenAddress: string): number | undefined {
    const price = this.prices.get(tokenAddress);
    if (!price || !price.previous) return undefined;
    
    return ((price.current - price.previous) / price.previous) * 100;
  }

  /**
   * **Retrieves the prices of all tracked tokens.**
   * 
   * @returns A map of token addresses to their price information.
   * 
   * @example
   * const allPrices = priceMonitor.getAllPrices();
   * allPrices.forEach((priceInfo, token) => {
   *   console.log(`${token}: $${priceInfo.current}`);
   * });
   */
  public getAllPrices(): Map<string, TokenPrice> {
    return new Map(this.prices);
  }

  /**
   * **Stops the price monitoring process.**
   * 
   * This method clears the price update interval and stops fetching new price data.
   * 
   * @example
   * priceMonitor.stop();
   */
  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * **Updates the prices of all tracked tokens and handles alerts.**
   * 
   * This private method fetches the latest price data for all tracked tokens, updates internal state, emits price update events, and checks for any price alerts that need to be triggered.
   * 
   * @returns A promise that resolves when the update is complete.
   */
  private async updatePrices(): Promise<void> {
    try {
      const pricesApi = this.aftermath.Prices();
      const tokens = Array.from(this.trackedTokens);
      
      const priceInfo = await pricesApi.getCoinsToPriceInfo({ 
        coins: tokens 
      });

      // Update prices and check alerts
      for (const [tokenAddr, info] of Object.entries(priceInfo)) {
        const oldPrice = this.prices.get(tokenAddr);
        
        const newPrice: TokenPrice = {
          current: info.price,
          previous: oldPrice?.current || info.price,
          lastUpdated: Date.now(),
          priceChange24h: info.priceChange24HoursPercentage
        };

        this.prices.set(tokenAddr, newPrice);
        
        // Emit price update event
        this.emit('priceUpdate', {
          token: tokenAddr,
          price: newPrice
        });

        // Check price alerts
        this.checkPriceAlerts(tokenAddr, info.price);
      }

    } catch (error) {
      console.error('Error updating prices:', error);
      this.emit('error', error);
    }
  }

  /**
   * **Checks and triggers any price alerts for a specific token.**
   * 
   * This private method evaluates the current price against all configured alerts for the token and triggers the callback if the alert condition is met.
   * 
   * @param tokenAddr - The token address (coin type) to check.
   * @param currentPrice - The current price of the token.
   */
  private checkPriceAlerts(tokenAddr: string, currentPrice: number): void {
    this.alerts.forEach(alert => {
      if (alert.coinType !== tokenAddr) return;

      if (alert.isUpperBound && currentPrice >= alert.threshold) {
        alert.callback(currentPrice);
      } else if (!alert.isUpperBound && currentPrice <= alert.threshold) {
        alert.callback(currentPrice);
      }
    });
  }
} 