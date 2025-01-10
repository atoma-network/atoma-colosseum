import { initPriceMonitor } from '../../src/monitors/PriceMonitor';
import { getTokenPrice } from '../../src/aftermath/AftermathClient';
import type { PriceMonitor } from '../../src/common/types';

// Mock the AftermathClient
jest.mock('../../src/aftermath/AftermathClient', () => ({
  getTokenPrice: jest.fn().mockResolvedValue({
    current: 1.5,
    previous: 1.4,
    lastUpdated: Date.now(),
    priceChange24h: 7.14
  })
}));

jest.mock('timers');

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
});

describe('PriceMonitor', () => {
  let monitor: PriceMonitor;
  let mockCallback: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCallback = jest.fn();
    monitor = initPriceMonitor(['0x2::sui::SUI']);
  });

  describe('addAlert', () => {
    it('should add price alert', () => {
      monitor.addAlert('0x2::sui::SUI', 2.0, true, mockCallback);
      expect(monitor.getAlerts()).toHaveLength(1);
    });

    it('should add multiple alerts for same token', () => {
      monitor.addAlert('0x2::sui::SUI', 2.0, true, mockCallback);
      monitor.addAlert('0x2::sui::SUI', 1.0, false, mockCallback);
      expect(monitor.getAlerts()).toHaveLength(2);
    });
  });

  describe('removeAlert', () => {
    it('should remove specific alert', () => {
      const alert1 = monitor.addAlert('0x2::sui::SUI', 2.0, true, mockCallback);
      monitor.addAlert('0x2::sui::SUI', 1.0, false, mockCallback);
      
      monitor.removeAlert(alert1);
      expect(monitor.getAlerts()).toHaveLength(1);
    });

    it('should handle removing non-existent alert', () => {
      monitor.removeAlert({ coinType: 'invalid', threshold: 1.0, isUpperBound: true, callback: jest.fn() });
      expect(monitor.getAlerts()).toHaveLength(0);
    });
  });

  describe('checkAlerts', () => {
    it('should trigger upper bound alert', async () => {
      (getTokenPrice as jest.Mock).mockResolvedValueOnce({
        current: 2.5,
        previous: 2.4,
        lastUpdated: Date.now()
      });

      monitor.addAlert('0x2::sui::SUI', 2.0, true, mockCallback);
      await monitor.checkAlerts();
      
      expect(mockCallback).toHaveBeenCalledWith(2.5);
    });

    it('should trigger lower bound alert', async () => {
      (getTokenPrice as jest.Mock).mockResolvedValueOnce({
        current: 0.5,
        previous: 0.6,
        lastUpdated: Date.now()
      });

      monitor.addAlert('0x2::sui::SUI', 1.0, false, mockCallback);
      await monitor.checkAlerts();
      
      expect(mockCallback).toHaveBeenCalledWith(0.5);
    });

    it('should not trigger when price is within bounds', async () => {
      (getTokenPrice as jest.Mock).mockResolvedValueOnce({
        current: 1.5,
        previous: 1.4,
        lastUpdated: Date.now()
      });

      monitor.addAlert('0x2::sui::SUI', 2.0, true, mockCallback);
      monitor.addAlert('0x2::sui::SUI', 1.0, false, mockCallback);
      
      await monitor.checkAlerts();
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      (getTokenPrice as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
      
      monitor.addAlert('0x2::sui::SUI', 2.0, true, mockCallback);
      await monitor.checkAlerts();
      
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('startMonitoring and stopMonitoring', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(global, 'setInterval');
      jest.spyOn(global, 'clearInterval');
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start and stop monitoring', () => {
      monitor.startMonitoring(1000);
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 1000);

      monitor.stopMonitoring();
      expect(clearInterval).toHaveBeenCalled();
    });
  });
}); 