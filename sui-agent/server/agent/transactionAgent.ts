import { SuiClient } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { NETWORK_CONFIG } from "../common/config";

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
