import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { 
  initSuiClient,
  createMergeCoinsTx,
  createPTB,
  addMoveCall,
  estimateGas,
  executeTransaction,
  buildTransferTx,
  createMoveVec
} from '../../src/transactions/TransactionTools';

// Mock SuiClient and its methods
jest.mock('@mysten/sui.js/client', () => {
  class MockSuiClient {
    getCoins = jest.fn().mockResolvedValue({
      data: [
        { coinObjectId: 'coin1', balance: '1000' },
        { coinObjectId: 'coin2', balance: '2000' },
        { coinObjectId: 'coin3', balance: '3000' }
      ]
    });

    dryRunTransactionBlock = jest.fn().mockResolvedValue({
      effects: {
        gasUsed: {
          computationCost: '1000',
          storageCost: '100',
          storageRebate: '50'
        }
      }
    });
  }

  return {
    SuiClient: MockSuiClient,
    SuiHTTPTransport: jest.fn()
  };
});

describe('Transaction Tools', () => {
  let client: SuiClient;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    client = initSuiClient('TESTNET');
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('initSuiClient', () => {
    it('should create a SuiClient instance', () => {
      const client = initSuiClient('TESTNET');
      expect(client).toBeInstanceOf(SuiClient);
    });
  });

  describe('createMergeCoinsTx', () => {
    it('should create merge coins transaction when multiple coins exist', async () => {
      const tx = await createMergeCoinsTx(
        client,
        '0x2::sui::SUI',
        '0xwallet123'
      );
      
      expect(tx).toBeInstanceOf(TransactionBlock);
      expect(client.getCoins).toHaveBeenCalledWith({
        owner: '0xwallet123',
        coinType: '0x2::sui::SUI'
      });
    });

    it('should throw error when not enough coins to merge', async () => {
      (client.getCoins as jest.Mock).mockResolvedValueOnce({
        data: [{ coinObjectId: 'coin1', balance: '1000' }]
      });

      await expect(
        createMergeCoinsTx(client, '0x2::sui::SUI', '0xwallet123')
      ).rejects.toThrow('Not enough coins to merge');
    });
  });

  describe('createPTB', () => {
    it('should create PTB with default gas budget', () => {
      const tx = createPTB();
      expect(tx).toBeInstanceOf(TransactionBlock);
    });

    it('should create PTB with custom gas budget', () => {
      const tx = createPTB(5000000);
      expect(tx).toBeInstanceOf(TransactionBlock);
    });
  });

  describe('addMoveCall', () => {
    it('should add move call to transaction block', () => {
      const tx = createPTB();
      const recipient = tx.pure('0xrecipient');
      const amount = tx.pure(1000);
      
      const result = addMoveCall(
        tx,
        '0x2::sui::pay',
        ['0x2::sui::SUI'],
        [recipient, amount]
      );
      expect(result).toBe(tx);
    });
  });

  describe('estimateGas', () => {
    it('should estimate gas cost for transaction', async () => {
      const tx = createPTB();
      const gas = await estimateGas(client, tx);
      
      expect(gas).toBe(BigInt(1000)); // computationCost from mock
      expect(client.dryRunTransactionBlock).toHaveBeenCalled();
    });
  });

  describe('executeTransaction', () => {
    it('should execute transaction successfully', async () => {
      const tx = createPTB();
      const mockSigner = {
        signAndExecuteTransactionBlock: jest.fn().mockResolvedValue({
          digest: 'tx123',
          effects: { status: 'success' },
          events: []
        })
      };

      const result = await executeTransaction(client, tx, mockSigner);
      
      expect(result).toHaveProperty('digest', 'tx123');
      expect(mockSigner.signAndExecuteTransactionBlock).toHaveBeenCalledWith({
        transactionBlock: tx,
        options: {
          showEffects: true,
          showEvents: true
        }
      });
    });

    it('should handle transaction failure', async () => {
      const tx = createPTB();
      const mockSigner = {
        signAndExecuteTransactionBlock: jest.fn().mockRejectedValue(
          new Error('Transaction failed')
        )
      };

      await expect(
        executeTransaction(client, tx, mockSigner)
      ).rejects.toThrow('Transaction failed');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Transaction failed:',
        expect.any(Error)
      );
    });
  });

  describe('buildTransferTx', () => {
    it('should build transfer transaction with correct parameters', async () => {
      const tx = await buildTransferTx(
        client,
        '0xsender',
        '0xrecipient',
        '0x2::sui::SUI',
        BigInt(1000000)
      );
      
      expect(tx).toBeInstanceOf(TransactionBlock);
      expect(client.getCoins).toHaveBeenCalledWith({
        owner: '0xsender',
        coinType: '0x2::sui::SUI'
      });
    });

    it('should throw error if insufficient coins available', async () => {
      (client.getCoins as jest.Mock).mockResolvedValueOnce({
        data: []  // No coins available
      });

      await expect(
        buildTransferTx(
          client,
          '0xsender',
          '0xrecipient',
          '0x2::sui::SUI',
          BigInt(1000000)
        )
      ).rejects.toThrow();
    });
  });

  describe('createMoveVec', () => {
    it('should create move vector with elements', () => {
      const tx = createPTB();
      const elements = ['element1', 'element2'];
      const type = '0x2::sui::SUI';
      
      const vec = createMoveVec(tx, elements, type);
      expect(vec).toBeDefined();
    });

    it('should create move vector without type', () => {
      const tx = createPTB();
      const elements = ['element1', 'element2'];
      
      const vec = createMoveVec(tx, elements);
      expect(vec).toBeDefined();
    });
  });
}); 