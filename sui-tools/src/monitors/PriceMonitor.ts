import { EventEmitter } from 'events';
import { getTokenPrice } from '../aftermath/AftermathClient';
import type { PriceAlert, PriceMonitor } from '../common/types';

class PriceMonitorImpl extends EventEmitter implements PriceMonitor {
  private alerts: PriceAlert[] = [];
  private interval?: NodeJS.Timeout;

  constructor(private tokenAddresses: string[]) {
    super();
  }

  addAlert(coinType: string, threshold: number, isUpperBound: boolean, callback: (price: number) => void): PriceAlert {
    const alert = { coinType, threshold, isUpperBound, callback };
    this.alerts.push(alert);
    return alert;
  }

  removeAlert(alert: PriceAlert): void {
    this.alerts = this.alerts.filter(a => a !== alert);
  }

  getAlerts(): PriceAlert[] {
    return [...this.alerts];
  }

  async checkAlerts(): Promise<void> {
    for (const alert of this.alerts) {
      try {
        const priceInfo = await getTokenPrice(alert.coinType);
        if (alert.isUpperBound && priceInfo.current > alert.threshold) {
          alert.callback(priceInfo.current);
        } else if (!alert.isUpperBound && priceInfo.current < alert.threshold) {
          alert.callback(priceInfo.current);
        }
      } catch (error) {
        console.error(`Error checking price for ${alert.coinType}:`, error);
      }
    }
  }

  startMonitoring(interval: number): void {
    this.interval = setInterval(() => this.checkAlerts(), interval);
  }

  stopMonitoring(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}

export function initPriceMonitor(tokenAddresses: string[]): PriceMonitor {
  return new PriceMonitorImpl(tokenAddresses);
} 