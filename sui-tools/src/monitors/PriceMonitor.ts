import { Aftermath } from "aftermath-ts-sdk";
import { EventEmitter } from "events";

interface PriceAlert {
  coinType: string;
  threshold: number;
  isUpperBound: boolean;
  callback: (price: number) => void;
}

interface TokenPrice {
  current: number;
  previous: number;
  lastUpdated: number;
  priceChange24h?: number;
}

export class PriceMonitor extends EventEmitter {
  private aftermath: Aftermath;
  private prices: Map<string, TokenPrice>;
  private alerts: PriceAlert[];
  private updateInterval: NodeJS.Timeout | null;
  private trackedTokens: Set<string>;

  constructor(network: "MAINNET" | "TESTNET" = "MAINNET") {
    super();
    this.aftermath = new Aftermath(network);
    this.prices = new Map();
    this.alerts = [];
    this.updateInterval = null;
    this.trackedTokens = new Set();
  }

  /**
   * Initialize the price monitor and start tracking specified tokens
   */
  public async init(tokenAddresses: string[]) {
    await this.aftermath.init();
    tokenAddresses.forEach(addr => this.trackedTokens.add(addr));
    await this.updatePrices();
    
    // Update prices every 30 seconds
    this.updateInterval = setInterval(() => {
      this.updatePrices();
    }, 30_000);
  }

  /**
   * Add new token to track
   */
  public async addToken(tokenAddress: string) {
    this.trackedTokens.add(tokenAddress);
    await this.updatePrices();
  }

  /**
   * Set price alert for a specific token
   */
  public setPriceAlert(
    coinType: string, 
    threshold: number, 
    isUpperBound: boolean,
    callback: (price: number) => void
  ) {
    this.alerts.push({
      coinType,
      threshold,
      isUpperBound,
      callback
    });
  }

  /**
   * Get current price for a token
   */
  public getPrice(tokenAddress: string): TokenPrice | undefined {
    return this.prices.get(tokenAddress);
  }

  /**
   * Calculate volatility (price change percentage)
   */
  public getVolatility(tokenAddress: string): number | undefined {
    const price = this.prices.get(tokenAddress);
    if (!price || !price.previous) return undefined;
    
    return ((price.current - price.previous) / price.previous) * 100;
  }

  /**
   * Get all tracked prices
   */
  public getAllPrices(): Map<string, TokenPrice> {
    return new Map(this.prices);
  }

  /**
   * Stop monitoring
   */
  public stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private async updatePrices() {
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
        
        // Check price alerts
        this.checkAlerts(tokenAddr, info.price);

        // Emit price update event
        this.emit('priceUpdate', {
          token: tokenAddr,
          price: newPrice
        });
      }

    } catch (error) {
      console.error('Error updating prices:', error);
      this.emit('error', error);
    }
  }

  private checkAlerts(tokenAddr: string, currentPrice: number) {
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