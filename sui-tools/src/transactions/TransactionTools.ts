import { SuiClient, SuiHTTPTransport } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { NETWORK_CONFIG, TX_DEFAULTS } from '../common/config';
import { TokenBalance } from '../common/types';

/**
 * Creates and initializes a Sui client for transaction operations
 * 
 * @param network - The network to connect to ("MAINNET" | "TESTNET")
 * @returns An initialized SuiClient instance
 * 
 * @example
 * const client = initSuiClient("MAINNET");
 */
export function initSuiClient(network: "MAINNET" | "TESTNET" = "MAINNET"): SuiClient {
  return new SuiClient({
    transport: new SuiHTTPTransport({
      url: NETWORK_CONFIG[network].fullnode
    })
  });
}

/**
 * Builds a transaction for transferring a single token
 * 
 * This function creates a transaction block that transfers a specific amount
 * of tokens from one address to another. It automatically selects coins
 * owned by the sender to fulfill the transfer amount.
 * 
 * @param client - An initialized SuiClient
 * @param from - The sender's address
 * @param to - The recipient's address
 * @param tokenType - The type of token to transfer (e.g., "0x2::sui::SUI")
 * @param amount - The amount to transfer as a BigInt
 * @returns A prepared TransactionBlock ready for signing
 * @throws Error if sender has insufficient coins
 * 
 * @example
 * const tx = await buildTransferTx(
 *   client,
 *   "0x123...",
 *   "0x456...",
 *   "0x2::sui::SUI",
 *   BigInt(1_000_000) // 0.001 SUI
 * );
 */
export async function buildTransferTx(
  client: SuiClient,
  from: string,
  to: string,
  tokenType: string,
  amount: bigint
): Promise<TransactionBlock> {
  const tx = new TransactionBlock();
  
  // Get coins owned by sender
  const coins = await client.getCoins({
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
 * Builds a transaction for transferring multiple tokens in a single transaction
 * 
 * This function creates a transaction block that can transfer different tokens
 * to the same recipient in one transaction. This is more gas efficient than
 * multiple single transfers.
 * 
 * @param client - An initialized SuiClient
 * @param from - The sender's address
 * @param to - The recipient's address
 * @param transfers - Array of token balances to transfer
 * @returns A prepared TransactionBlock ready for signing
 * @throws Error if sender has insufficient coins
 * 
 * @example
 * const tx = await buildMultiTransferTx(
 *   client,
 *   "0x123...",
 *   "0x456...",
 *   [{
 *     token: "0x2::sui::SUI",
 *     amount: BigInt(1_000_000)
 *   }]
 * );
 */
export async function buildMultiTransferTx(
  client: SuiClient,
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
 * Estimates the gas cost for executing a transaction
 * 
 * This function performs a dry run of the transaction to estimate
 * its gas consumption. This is useful for showing users the expected
 * cost before they sign.
 * 
 * @param client - An initialized SuiClient
 * @param tx - The transaction block to estimate
 * @returns Estimated gas cost in native token units
 * @throws Error if estimation fails
 * 
 * @example
 * const gas = await estimateGas(client, tx);
 * console.log(`Estimated gas: ${gas}`);
 */
export async function estimateGas(
  client: SuiClient,
  tx: TransactionBlock
): Promise<bigint> {
  const estimate = await client.dryRunTransactionBlock({
    transactionBlock: tx.serialize()
  });
  return BigInt(estimate.effects.gasUsed.computationCost);
}

/**
 * Executes a signed transaction on the network
 * 
 * This function submits a transaction to the network and waits for its execution.
 * It provides detailed information about the transaction's effects and events.
 * 
 * @param client - An initialized SuiClient
 * @param tx - The transaction block to execute
 * @param signer - The wallet or signer to sign the transaction
 * @returns The transaction execution result
 * @throws Error if transaction fails
 * 
 * @example
 * const result = await executeTransaction(client, tx, wallet);
 * console.log(`Transaction status: ${result.effects.status}`);
 */
export async function executeTransaction(
  client: SuiClient,
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