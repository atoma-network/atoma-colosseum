import { Aftermath } from 'aftermath-ts-sdk';
import {
  initAftermath,
  getTokenPrice,
  getPool,
  getAllPools,
  getPricesApi,
  getPoolsApi,
} from '../../src/aftermath/AftermathClient';

// Mock the Aftermath SDK
jest.mock('aftermath-ts-sdk', () => {
  class MockAftermath {
    init = jest.fn().mockResolvedValue(undefined);
    Pools = jest.fn().mockReturnValue({
      getPool: jest.fn().mockResolvedValue({
        coinTypes: ['0x2::sui::SUI', '0x2::usdc::USDC'],
        reserves: ['1000000', '2000000'],
        fee: 0.003,
        tvl: 1000000,
        apy: 0.15
      }),
      getAllPools: jest.fn().mockResolvedValue([
        {
          coinTypes: ['0x2::sui::SUI', '0x2::usdc::USDC'],
          reserves: ['1000000', '2000000'],
          fee: 0.003,
          tvl: 1000000,
          apy: 0.15
        }
      ])
    });
    Prices = jest.fn().mockReturnValue({
      getCoinPriceInfo: jest.fn().mockResolvedValue({
        price: 1.5,
        priceChange24HoursPercentage: 5.5
      })
    });
  }
  return { Aftermath: MockAftermath };
});

describe('AftermathClient Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initAftermath initializes the Aftermath client', async () => {
    const client = await initAftermath('TESTNET');
    expect(client).toBeInstanceOf(Aftermath);
  });

  test('getTokenPrice retrieves valid token price', async () => {
    const tokenType = '0x2::sui::SUI';
    const priceInfo = await getTokenPrice(tokenType, 'TESTNET');
    expect(priceInfo).toHaveProperty('current');
    expect(priceInfo).toHaveProperty('priceChange24h');
    expect(priceInfo.current).toBeGreaterThan(0);
  });

  test('getPool retrieves pool information', async () => {
    const poolId = 'test-pool-id';
    const poolInfo = await getPool(poolId, 'TESTNET');
    expect(poolInfo).toBeDefined();
    expect(poolInfo!).toHaveProperty('id', poolId);
    expect(poolInfo!.tokens).toBeInstanceOf(Array);
    expect(poolInfo!.tokens.length).toBe(2);
  });

  test('getAllPools retrieves all pools', async () => {
    const pools = await getAllPools('TESTNET');
    expect(pools).toBeInstanceOf(Array);
    expect(pools.length).toBeGreaterThan(0);
    expect(pools[0]).toHaveProperty('tokens');
    expect(pools[0]).toHaveProperty('reserves');
  });

  test('getPricesApi returns the Prices API instance', async () => {
    const pricesApi = await getPricesApi('TESTNET');
    expect(pricesApi).toBeDefined();
    expect(typeof pricesApi.getCoinPriceInfo).toBe('function');
  });

  test('getPoolsApi returns the Pools API instance', async () => {
    const poolsApi = await getPoolsApi('TESTNET');
    expect(poolsApi).toBeDefined();
    expect(typeof poolsApi.getPool).toBe('function');
  });
});
