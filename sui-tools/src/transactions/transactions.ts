import { SuiClient, SuiHTTPTransport } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { NETWORK_CONFIG, TX_DEFAULTS } from '../common/config';
import { TokenBalance } from '../common/types';

export class TransactionManager {
  private provider: SuiClient;

  constructor(network: "MAINNET" | "TESTNET" = "MAINNET") {
    this.provider = new SuiClient({
      transport: new SuiHTTPTransport({
        url: NETWORK_CONFIG[network].fullnode
      })
    });
  }

  /**
   * Build token transfer transaction
   */
  async buildTransferTx(
    from: string,
    to: string,
    tokenType: string,
    amount: bigint
  ): Promise<TransactionBlock> {
    const tx = new TransactionBlock();
    
    // Get coins owned by sender
    const coins = await this.provider.getCoins({
      owner: from,
      coinType: tokenType
    });

    if (coins.data.length === 0) {
      throw new Error(`No ${tokenType} coins found for address ${from}`);
    }

    // Select coin for transfer
    const coin = tx.object(coins.data[0].coinObjectId);
    
    // Split and transfer
    const [splitCoin] = tx.splitCoins(coin, [tx.pure(amount)]);
    tx.transferObjects([splitCoin], tx.pure(to));
    
    return tx;
  }

  /**
   * Build multi-token transfer transaction
   */
  async buildMultiTransferTx(
    from: string,
    to: string,
    transfers: TokenBalance[]
  ): Promise<TransactionBlock> {
    const tx = new TransactionBlock();
    
    for (const transfer of transfers) {
      const [coin] = tx.splitCoins(tx.gas, [tx.pure(transfer.amount)]);
      tx.transferObjects([coin], tx.pure(to));
    }

    return tx;
  }

  /**
   * Get gas estimate for transaction
   */
  async estimateGas(tx: TransactionBlock): Promise<bigint> {
    const estimate = await this.provider.dryRunTransactionBlock({
      transactionBlock: tx.serialize()
    });
    return BigInt(estimate.effects.gasUsed.computationCost);
  }

  /**
   * Execute transaction
   */
  async executeTransaction(
    tx: TransactionBlock,
    signer: any // Replace with proper signer type
  ) {
    try {
      const result = await signer.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        options: {
          showEffects: true,
          showEvents: true
        }
      });
      return result;
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }
}
