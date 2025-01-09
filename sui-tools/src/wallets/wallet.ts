import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64, toB64 } from '@mysten/sui.js/utils';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SuiClient, SuiTransactionBlockResponseOptions } from '@mysten/sui.js/client';
import { SerializedSignature } from '@mysten/sui.js/cryptography';

/**
 * **Wallet**
 * 
 * Represents a Sui wallet with its address and keypair.
 * Used for signing transactions and messages.
 */
export type Wallet = {
  address: string;
  keypair: Ed25519Keypair;
};

/**
 * **TransactionResult**
 * 
 * The result of a transaction execution, including:
 * - Transaction hash
 * - Full result object
 * - Methods to wait for confirmation and fetch transaction details
 */
export type TransactionResult = {
  hash: string;
  result: any;
  wait: () => Promise<any>;
  getTransaction: () => Promise<any>;
};

/**
 * **createWalletFromPrivateKey**
 * 
 * Creates a new wallet instance from a base64-encoded private key.
 * 
 * @param privateKeyB64 - Base64 encoded private key
 * @returns A new Wallet instance
 * 
 * @example
 * const wallet = createWalletFromPrivateKey("your-private-key-base64");
 * console.log("Wallet address:", wallet.address);
 */
export function createWalletFromPrivateKey(privateKeyB64: string): Wallet {
  const privateKeyBytes = fromB64(privateKeyB64);
  const keypair = Ed25519Keypair.fromSecretKey(new Uint8Array(privateKeyBytes));
  return {
    address: keypair.getPublicKey().toSuiAddress(),
    keypair
  };
}

/**
 * **createWalletFromMnemonic**
 * 
 * Creates a new wallet instance from a mnemonic phrase (seed words).
 * 
 * @param mnemonic - The mnemonic phrase (usually 12 or 24 words)
 * @returns A new Wallet instance
 * 
 * @example
 * const wallet = createWalletFromMnemonic("word1 word2 ... word12");
 * console.log("Wallet address:", wallet.address);
 */
export function createWalletFromMnemonic(mnemonic: string): Wallet {
  const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
  return {
    address: keypair.getPublicKey().toSuiAddress(),
    keypair
  };
}

/**
 * **generateWallet**
 * 
 * Generates a new random wallet instance.
 * This creates a completely new keypair and should be used for new wallets only.
 * 
 * @returns A new Wallet instance with random keypair
 * 
 * @example
 * const wallet = generateWallet();
 * console.log("New wallet address:", wallet.address);
 */
export function generateWallet(): Wallet {
  const keypair = new Ed25519Keypair();
  return {
    address: keypair.getPublicKey().toSuiAddress(),
    keypair
  };
}

/**
 * **transfer**
 * 
 * Transfers tokens from one address to another.
 * This is a convenience function that creates and executes a transfer transaction.
 * 
 * @param client - The Sui client instance
 * @param wallet - The sender's wallet
 * @param params - Transfer parameters (to address, amount, optional token type)
 * @param options - Optional transaction execution options
 * @returns Transaction result with hash and status
 * 
 * @example
 * const result = await transfer(client, wallet, {
 *   to: "recipient-address",
 *   amount: BigInt(1_000_000), // 0.001 SUI
 *   tokenType: "0x2::sui::SUI" // optional
 * });
 * console.log("Transfer hash:", result.hash);
 */
export async function transfer(
  client: SuiClient,
  wallet: Wallet,
  { to, amount, tokenType = '0x2::sui::SUI' }: {
    to: string;
    amount: bigint;
    tokenType?: string;
  },
  options?: SuiTransactionBlockResponseOptions
): Promise<TransactionResult> {
  const txb = new TransactionBlock();
  const [coin] = txb.splitCoins(txb.gas, [txb.pure(amount)]);
  txb.transferObjects([coin], txb.pure(to));

  return sendTransaction(client, wallet, txb, options);
}

/**
 * **sendTransaction**
 * 
 * Signs and executes a transaction block.
 * This is the main function for executing any type of transaction.
 * 
 * @param client - The Sui client instance
 * @param wallet - The signer's wallet
 * @param txb - The transaction block to execute
 * @param options - Optional transaction execution options
 * @returns Transaction result with hash and status
 * 
 * @example
 * const txb = new TransactionBlock();
 * // Add transaction operations...
 * const result = await sendTransaction(client, wallet, txb);
 * console.log("Transaction hash:", result.hash);
 */
export async function sendTransaction(
  client: SuiClient,
  wallet: Wallet,
  txb: TransactionBlock,
  options?: SuiTransactionBlockResponseOptions
): Promise<TransactionResult> {
  const result = await client.signAndExecuteTransactionBlock({
    transactionBlock: txb,
    signer: wallet.keypair,
    options: {
      showEffects: true,
      showEvents: true,
      showInput: true,
      showObjectChanges: true,
      ...options
    }
  });

  return {
    hash: result.digest,
    result,
    wait: async () => result,
    getTransaction: async () => client.getTransactionBlock({ digest: result.digest })
  };
}

/**
 * **signMessage**
 * 
 * Signs a message with the wallet's private key.
 * This can be used for authentication or signing arbitrary data.
 * 
 * @param wallet - The signer's wallet
 * @param message - The message to sign
 * @returns Base64 encoded signature
 * 
 * @example
 * const signature = signMessage(wallet, "Hello, Sui!");
 * console.log("Message signature:", signature);
 */
export function signMessage(wallet: Wallet, message: string): string {
  const messageBytes = new TextEncoder().encode(message);
  const signature = wallet.keypair.signData(messageBytes);
  return toB64(signature);
} 