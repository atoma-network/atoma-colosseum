import { SuiClient, SuiHTTPTransport } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { NETWORK_CONFIG } from "../common/config";
import { TokenBalance } from "../common/types";

/** --------------------------------------------------------------------------
 *                            Transaction Operations
 *
 * --------------------------------------------------------------------------
 */

/**
 * Creates and initializes a Sui client for transaction operations
 *
 * This function creates a new SuiClient instance configured for the specified network.
 * The client is used for interacting with the Sui blockchain, including querying data
 * and submitting transactions.
 *
 * @param network - The network to connect to ("MAINNET" | "TESTNET")
 * @returns An initialized SuiClient instance
 *
 * @example
 * const client = initSuiClient("MAINNET");
 * const coins = await client.getCoins({ owner: "0x123..." });
 */
export function initSuiClient(
  network: "MAINNET" | "TESTNET" = "MAINNET"
): SuiClient {
  return new SuiClient({
    transport: new SuiHTTPTransport({
      url: NETWORK_CONFIG[network].fullnode,
    }),
  });
}

/**
 * Creates a programmable transaction block with common options
 *
 * Initializes a new PTB with gas budget and other common settings.
 * Provides a foundation for building complex transactions.
 *
 * @param gasBudget - Maximum gas to spend (in MIST)
 * @returns Initialized TransactionBlock
 *
 * @example
 * const ptb = createPTB(2000000);
 * ptb.moveCall({...});
 * const result = await executeTransaction(client, ptb, signer);
 */
export function createPTB(gasBudget: number = 2000000): TransactionBlock {
  const tx = new TransactionBlock();
  tx.setGasBudget(gasBudget);
  return tx;
}

/** --------------------------------------------------------------------------
 *                            Transaction Operations
 *
 * --------------------------------------------------------------------------
 */

/**
 * Builds a transaction for transferring a single token
 *
 * This function creates a transaction block that transfers a specific amount
 * of tokens from one address to another. It automatically selects coins
 * owned by the sender to fulfill the transfer amount. The function handles
 * coin selection and transaction construction.
 *
 * @param client - An initialized SuiClient
 * @param fromAddress - The sender's address that owns the tokens
 * @param toAddress - The recipient's address to receive the tokens
 * @param tokenType - The type of token to transfer (e.g., "0x2::sui::SUI")
 * @param amount - The amount to transfer as a BigInt
 * @returns A prepared TransactionBlock ready for signing
 * @throws Error if sender has insufficient coins or if coin fetch fails
 *
 * @example
 * const tx = await buildTransferTx(
 *   client,
 *   "0x123...", // sender
 *   "0x456...", // recipient
 *   "0x2::sui::SUI",
 *   BigInt(1_000_000) // 0.001 SUI
 * );
 */
export async function buildTransferTx(
  client: SuiClient,
  fromAddress: string,
  toAddress: string,
  tokenType: string,
  amount: bigint
): Promise<TransactionBlock> {
  const tx = new TransactionBlock();

  // Get coins owned by sender
  const coins = await client.getCoins({
    owner: fromAddress,
    coinType: tokenType,
  });

  if (coins.data.length === 0) {
    throw new Error(`No ${tokenType} coins found for address ${fromAddress}`);
  }

  // Select coin for transfer
  const coin = tx.object(coins.data[0].coinObjectId);

  // Split and transfer
  const [splitCoin] = tx.splitCoins(coin, [tx.pure(amount)]);
  tx.transferObjects([splitCoin], tx.pure(toAddress));

  return tx;
}

/**
 * Builds a transaction for transferring multiple tokens in a single transaction
 *
 * This function creates a transaction block that can transfer different tokens
 * to the same recipient in one transaction. This is more gas efficient than
 * executing multiple single transfers. It uses the gas object for simplicity
 * in coin selection.
 *
 * @param client - An initialized SuiClient
 * @param from - The sender's address
 * @param to - The recipient's address
 * @param transfers - Array of token balances to transfer, each containing token type and amount
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
 *     amount: BigInt(1_000_000) // 0.001 SUI
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
 * cost before they sign. The estimate includes computation costs but
 * may not perfectly match the final gas cost.
 *
 * @param client - An initialized SuiClient
 * @param tx - The transaction block to estimate
 * @returns Estimated gas cost in native token units (MIST)
 * @throws Error if estimation fails or if the transaction is invalid
 *
 * @example
 * const gas = await estimateGas(client, tx);
 * console.log(`Estimated gas: ${gas} MIST`);
 */
export async function estimateGas(
  client: SuiClient,
  tx: TransactionBlock
): Promise<bigint> {
  const estimate = await client.dryRunTransactionBlock({
    transactionBlock: tx.serialize(),
  });
  return BigInt(estimate.effects.gasUsed.computationCost);
}

/**
 * Executes a signed transaction on the network
 *
 * This function submits a transaction to the network and waits for its execution.
 * It provides detailed information about the transaction's effects and events.
 * The function includes options to show effects and events in the response.
 *
 * @param client - An initialized SuiClient
 * @param tx - The transaction block to execute
 * @param signer - The wallet or signer to sign the transaction
 * @returns The transaction execution result including effects and events
 * @throws Error if transaction fails, signing fails, or network error occurs
 *
 * @example
 * const result = await executeTransaction(client, tx, wallet);
 * console.log(`Transaction status: ${result.effects.status}`);
 * console.log(`Gas used: ${result.effects.gasUsed.computationCost}`);
 */

/** --------------------------------------------------------------------------
 *                            Transaction Operations
 *
 * --------------------------------------------------------------------------
 */

export async function executeTransaction(
  client: SuiClient,
  tx: TransactionBlock,
  signer: any // Todo: Replace with proper signer type
) {
  try {
    const result = await signer.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });
    return result;
  } catch (error) {
    console.error("Transaction failed:", error);
    throw error;
  }
}

/**
 * Move function target format: `package::module::function`
 */
type MoveTarget = `${string}::${string}::${string}`;

/**
 * Adds a move call to an existing transaction block
 *
 * Helper function to add a move call with proper typing and validation.
 *
 * @param tx - Existing transaction block
 * @param target - Move function to call (e.g., "0x2::sui::pay")
 * @param typeArguments - Type arguments for generic functions
 * @param args - Arguments for the function call
 * @returns The transaction block for chaining
 *
 * @example
 * const ptb = createPTB();
 * addMoveCall(ptb, "0x2::sui::pay", [], [recipient, amount]);
 */
export function addMoveCall(
  tx: TransactionBlock,
  target: MoveTarget,
  typeArguments: string[] = [],
  args: any[] = []
): TransactionBlock {
  tx.moveCall({
    target,
    typeArguments,
    arguments: args,
  });
  return tx;
}

/** --------------------------------------------------------------------------
 *                            Transaction Operations
 *
 * --------------------------------------------------------------------------
 */

/**
 * Creates a transaction to merge multiple coins of the same type
 * Combines multiple coin objects of the same type into a single coin.
 * Useful for consolidating fragmented coin balances.
 *
 * @param client - An initialized SuiClient
 * @param coinType - Type of coins to merge (e.g., "0x2::sui::SUI")
 * @param walletAddress - Address owning the coins
 * @param maxCoins - Maximum number of coins to merge in one tx (default: 10)
 * @returns TransactionBlock ready to be signed and executed
 * @throws Error if no coins found or invalid coin type
 *
 * @example
 * const tx = await createMergeCoinsTx(client, "0x2::sui::SUI", "0x123...");
 * const result = await executeTransaction(client, tx, signer);
 */
export async function createMergeCoinsTx(
  client: SuiClient,
  coinType: string,
  walletAddress: string,
  maxCoins: number = 10
): Promise<TransactionBlock> {
  const coins = await client.getCoins({
    owner: walletAddress,
    coinType,
  });

  if (coins.data.length <= 1) {
    throw new Error("Not enough coins to merge");
  }

  const tx = new TransactionBlock();
  const coinsToMerge = coins.data.slice(0, maxCoins);
  const primaryCoin = coinsToMerge[0].coinObjectId;
  const mergeCoins = coinsToMerge.slice(1).map((coin) => coin.coinObjectId);

  tx.mergeCoins(primaryCoin, mergeCoins);
  return tx;
}

/**
 * Creates a sponsored transaction block
 *
 * Builds a transaction that can be sponsored by another account.
 * Useful for gas abstraction where a different account pays for gas.
 *
 * @param tx - The transaction block to sponsor
 * @param sender - Address of the transaction sender
 * @param sponsor - Address of the gas sponsor
 * @param sponsorCoins - Coins owned by sponsor to use for gas
 * @returns Transaction block ready for sponsor signature
 *
 * @example
 * const tx = createPTB();
 * const sponsoredTx = await createSponsoredTx(tx, userAddr, sponsorAddr, sponsorCoins);
 */
export async function createSponsoredTx(
  tx: TransactionBlock,
  sender: string,
  sponsor: string,
  sponsorCoins: { objectId: string; version: string; digest: string }[]
): Promise<TransactionBlock> {
  const kindBytes = await tx.build({ onlyTransactionKind: true });
  const sponsoredTx = TransactionBlock.fromKind(kindBytes);

  sponsoredTx.setSender(sender);
  sponsoredTx.setGasOwner(sponsor);
  sponsoredTx.setGasPayment(sponsorCoins);

  return sponsoredTx;
}

/**
 * Creates a vector of objects for move calls
 *
 * Helper function to construct a vector of objects that can be
 * passed into Move calls.
 *
 * @param tx - Transaction block to add vector to
 * @param elements - Array of objects/values to include
 * @param type - Optional type annotation for the vector
 * @returns The move vector input
 *
 * @example
 * const vec = createMoveVec(tx, [coin1, coin2]);
 * tx.moveCall({ target: "0x2::coin::join_vec", arguments: [vec] });
 */
export function createMoveVec(
  tx: TransactionBlock,
  elements: any[],
  type?: string
) {
  return tx.makeMoveVec({
    objects: elements,
    type,
  });
}

export class TransactionAgent {
  private client: SuiClient;

  constructor(network: "MAINNET" | "TESTNET" = "MAINNET") {
    this.client = new SuiClient({ url: NETWORK_CONFIG[network].fullnode });
  }

  /**
   * Creates a transaction block for transferring SUI
   */
  buildTransferTx(amount: bigint, recipient: string): TransactionBlock {
    const tx = new TransactionBlock();
    const [coin] = tx.splitCoins(tx.gas, [tx.pure(amount)]);
    tx.transferObjects([coin], tx.pure(recipient));
    return tx;
  }

  /**
   * Creates a transaction block for merging coins
   */
  buildMergeCoinsTx(
    destinationCoin: string,
    sourceCoins: string[]
  ): TransactionBlock {
    const tx = new TransactionBlock();
    tx.mergeCoins(
      tx.object(destinationCoin),
      sourceCoins.map((coin) => tx.object(coin))
    );
    return tx;
  }

  /**
   * Creates a transaction block for a Move call
   */
  buildMoveCallTx(
    target: `${string}::${string}::${string}`,
    typeArguments: string[],
    args: (string | number | boolean | bigint)[]
  ): TransactionBlock {
    const tx = new TransactionBlock();
    tx.moveCall({
      target,
      typeArguments,
      arguments: args.map((arg) => {
        if (typeof arg === "string" && arg.startsWith("0x")) {
          return tx.object(arg);
        }
        return tx.pure(arg);
      }),
    });
    return tx;
  }

  /**
   * Creates a sponsored transaction
   */
  async createSponsoredTx(
    tx: TransactionBlock,
    sender: string,
    sponsor: string,
    sponsorCoins: { objectId: string; version: string; digest: string }[]
  ): Promise<TransactionBlock> {
    const kindBytes = await tx.build({ onlyTransactionKind: true });
    const sponsoredTx = TransactionBlock.fromKind(kindBytes);

    sponsoredTx.setSender(sender);
    sponsoredTx.setGasOwner(sponsor);
    sponsoredTx.setGasPayment(sponsorCoins);

    return sponsoredTx;
  }

  /**
   * Creates a vector of objects for move calls
   */
  createMoveVec(tx: TransactionBlock, elements: any[], type?: string) {
    return tx.makeMoveVec({
      objects: elements,
      type,
    });
  }

  /**
   * Estimates gas for a transaction
   */
  async estimateGas(tx: TransactionBlock): Promise<bigint> {
    try {
      const dryRunResult = await this.client.dryRunTransactionBlock({
        transactionBlock: tx.serialize(),
      });
      return BigInt(dryRunResult.effects.gasUsed.computationCost);
    } catch (error) {
      console.error("Error estimating gas:", error);
      // Return a default gas estimate if dry run fails
      return BigInt(2000000);
    }
  }

  /**
   * Waits for a transaction to be confirmed
   */
  async waitForTransaction(digest: string) {
    return this.client.waitForTransactionBlock({
      digest,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });
  }

  /**
   * Gets all coins owned by an address
   */
  async getCoins(owner: string) {
    const { data } = await this.client.getCoins({
      owner,
    });
    return data;
  }

  /**
   * Gets coin balances for an address
   */
  async getBalance(address: string): Promise<{ totalBalance: bigint }> {
    const balance = await this.client.getBalance({
      owner: address,
      coinType: "0x2::sui::SUI",
    });

    return {
      totalBalance: BigInt(balance.totalBalance),
    };
  }
}
