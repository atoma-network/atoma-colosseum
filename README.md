# Sui Tools

A TypeScript library for interacting with Sui blockchain and DeFi protocols.

## Features

- **Wallet Management**: Create, import, and manage Sui wallets
- **Price Monitoring**: Real-time price tracking and alerts for Sui tokens
- **DeFi Integration**: Interact with Aftermath Finance and other DeFi protocols
- **Transaction Management**: Build and execute transactions on Sui
- **Rate Calculations**: APR/APY calculations and lending rate utilities

## Installation

```bash
npm install sui-tools
```

## Quick Start

### Wallet Operations

```typescript
import { SuiWallet } from "sui-tools/wallets";
import { initSuiClient } from "sui-tools/transactions";

// Initialize client
const client = initSuiClient("MAINNET");

// Generate new wallet
const wallet = SuiWallet.generate(client);
console.log("Wallet address:", wallet.address);

// Import from private key
const importedWallet = SuiWallet.fromPrivateKey(client, "your-private-key");

// Transfer tokens
await wallet.transfer({
  to: "recipient-address",
  amount: BigInt(1_000_000), // 0.001 SUI
  tokenType: "0x2::sui::SUI", // optional, defaults to SUI
});

// Sign and send custom transaction
const txb = new TransactionBlock();
// ...
const result = await wallet.sendTransaction(txb);
console.log("Transaction hash:", result.hash);
```

### Price Monitoring

```typescript
import { PriceMonitor } from "sui-tools/monitors";

// Initialize price monitor
const monitor = new PriceMonitor("MAINNET");

// Track SUI token price
await monitor.init(["0x2::sui::SUI"]);

// Set price alert
monitor.setPriceAlert(
  "0x2::sui::SUI",
  2.0, // Alert when price > $2
  true,
  (price) => console.log(`Alert: SUI price reached $${price}`)
);
```

### DeFi Operations

```typescript
import { AftermathClient } from "sui-tools/aftermath";

// Initialize Aftermath client
const client = new AftermathClient("MAINNET");
await client.init();

// Get pool information
const pool = await client.getPool("pool_id");
console.log("Pool TVL:", pool.tvl);
console.log("Pool APY:", pool.apy);
```

### Rate Calculations

```typescript
import { RatesManager } from "sui-tools/rates";

const ratesManager = new RatesManager("MAINNET");

// Convert APR to APY
const apy = ratesManager.aprToApy(0.05); // 5% APR
console.log(`APY: ${apy}%`);

// Calculate impermanent loss
const il = ratesManager.calculateImpermanentLoss(1000, 1200, 0.1);
console.log(`Impermanent Loss: ${il}%`);
```

## API Documentation

### SuiWallet

```typescript
class SuiWallet {
  // Create/import wallets
  static generate(client: SuiClient): SuiWallet;
  static fromPrivateKey(client: SuiClient, privateKey: string): SuiWallet;
  static fromMnemonic(client: SuiClient, mnemonic: string): SuiWallet;

  // Properties
  get address(): string;

  // Methods
  async transfer(params: {
    to: string;
    amount: bigint;
    tokenType?: string;
  }): Promise<TransactionResult>;

  async sendTransaction(txb: TransactionBlock): Promise<{
    hash: string;
    result: any;
    wait: () => Promise<any>;
    getTransaction: () => Promise<any>;
  }>;

  signMessage(message: string): string;
}
```

For more detailed examples and API documentation, check the `examples` directory in the source code.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```

```


I'll help implement transaction tools in the registry and provide sample queries. Let's add these to the `ToolRegistry.ts`:

```typescript:src/tools/ToolRegistry.ts
import {
  buildTransferTx,
  buildMultiTransferTx,
  estimateGas,
  createMergeCoinsTx,
  TransactionAgent
} from "./TransactionTool";

// ... existing imports and code ...

export function registerAllTools(tools: Tools) {
    // ... existing tool registrations ...

    // Transaction Tools
    tools.registerTool(
        "transfer_coin",
        "Tool to transfer a single type of coin to another address",
        [{
            name: "fromAddress",
            type: "string",
            description: "Sender's wallet address",
            required: true
        },
        {
            name: "toAddress",
            type: "string",
            description: "Recipient's wallet address",
            required: true
        },
        {
            name: "tokenType",
            type: "string",
            description: "Type of token to transfer (e.g., '0x2::sui::SUI')",
            required: true
        },
        {
            name: "amount",
            type: "string",
            description: "Amount to transfer in base units",
            required: true
        }],
        buildTransferTx
    );

    tools.registerTool(
        "multi_transfer",
        "Tool to transfer multiple coins in a single transaction",
        [{
            name: "fromAddress",
            type: "string",
            description: "Sender's wallet address",
            required: true
        },
        {
            name: "toAddress",
            type: "string",
            description: "Recipient's wallet address",
            required: true
        },
        {
            name: "transfers",
            type: "array",
            description: "Array of token transfers with token type and amount",
            required: true
        }],
        buildMultiTransferTx
    );

    tools.registerTool(
        "merge_coins",
        "Tool to merge multiple coins of the same type",
        [{
            name: "coinType",
            type: "string",
            description: "Type of coins to merge",
            required: true
        },
        {
            name: "walletAddress",
            type: "string",
            description: "Address owning the coins",
            required: true
        },
        {
            name: "maxCoins",
            type: "number",
            description: "Maximum number of coins to merge",
            required: false
        }],
        createMergeCoinsTx
    );

    tools.registerTool(
        "estimate_gas",
        "Tool to estimate gas cost for a transaction",
        [{
            name: "transaction",
            type: "object",
            description: "Transaction block to estimate gas for",
            required: true
        }],
        estimateGas
    );

    // ... rest of the existing code ...
```


Let me fix the linter errors by wrapping the transaction functions to return strings:

```typescript:src/tools/ToolRegistry.ts
// ... existing imports ...

// Transaction wrapper functions
async function transferCoinWrapper(
    fromAddress: string,
    toAddress: string,
    tokenType: string,
    amount: string
): Promise<string> {
    const client = initSuiClient();
    const tx = await buildTransferTx(
        client,
        fromAddress,
        toAddress,
        tokenType,
        BigInt(amount)
    );
    return JSON.stringify([{
        reasoning: "Transfer transaction created successfully",
        response: tx.serialize(),
        status: "success",
        query: `Transfer ${amount} of ${tokenType} from ${fromAddress} to ${toAddress}`,
        errors: []
    }]);
}

async function multiTransferWrapper(
    fromAddress: string,
    toAddress: string,
    transfers: TokenBalance[]
): Promise<string> {
    const client = initSuiClient();
    const tx = await buildMultiTransferTx(client, fromAddress, toAddress, transfers);
    return JSON.stringify([{
        reasoning: "Multi-transfer transaction created successfully",
        response: tx.serialize(),
        status: "success",
        query: `Multi-transfer from ${fromAddress} to ${toAddress}`,
        errors: []
    }]);
}

async function mergeCoinsWrapper(
    coinType: string,
    walletAddress: string,
    maxCoins?: number
): Promise<string> {
    const client = initSuiClient();
    const tx = await createMergeCoinsTx(client, coinType, walletAddress, maxCoins);
    return JSON.stringify([{
        reasoning: "Merge coins transaction created successfully",
        response: tx.serialize(),
        status: "success",
        query: `Merge ${maxCoins || 'all'} coins of type ${coinType} for wallet ${walletAddress}`,
        errors: []
    }]);
}

async function estimateGasWrapper(transaction: TransactionBlock): Promise<string> {
    const client = initSuiClient();
    const gasEstimate = await estimateGas(client, transaction);
    return JSON.stringify([{
        reasoning: "Gas estimation completed successfully",
        response: gasEstimate.toString(),
        status: "success",
        query: "Estimate gas for transaction",
        errors: []
    }]);
}

export function registerAllTools(tools: Tools) {
    // ... existing registrations ...

    // Transaction Tools
    tools.registerTool(
        "transfer_coin",
        "Tool to transfer a single type of coin to another address",
        [{
            name: "fromAddress",
            type: "string",
            description: "Sender's wallet address",
            required: true
        },
        {
            name: "toAddress",
            type: "string",
            description: "Recipient's wallet address",
            required: true
        },
        {
            name: "tokenType",
            type: "string",
            description: "Type of token to transfer (e.g., '0x2::sui::SUI')",
            required: true
        },
        {
            name: "amount",
            type: "string",
            description: "Amount to transfer in base units",
            required: true
        }],
        transferCoinWrapper
    );

    tools.registerTool(
        "multi_transfer",
        "Tool to transfer multiple coins in a single transaction",
        [{
            name: "fromAddress",
            type: "string",
            description: "Sender's wallet address",
            required: true
        },
        {
            name: "toAddress",
            type: "string",
            description: "Recipient's wallet address",
            required: true
        },
        {
            name: "transfers",
            type: "array",
            description: "Array of token transfers with token type and amount",
            required: true
        }],
        multiTransferWrapper
    );

    tools.registerTool(
        "merge_coins",
        "Tool to merge multiple coins of the same type",
        [{
            name: "coinType",
            type: "string",
            description: "Type of coins to merge",
            required: true
        },
        {
            name: "walletAddress",
            type: "string",
            description: "Address owning the coins",
            required: true
        },
        {
            name: "maxCoins",
            type: "number",
            description: "Maximum number of coins to merge",
            required: false
        }],
        mergeCoinsWrapper
    );

    tools.registerTool(
        "estimate_gas",
        "Tool to estimate gas cost for a transaction",
        [{
            name: "transaction",
            type: "object",
            description: "Transaction block to estimate gas for",
            required: true
        }],
        estimateGasWrapper
    );

    // ... rest of existing code ...
```


Let me fix the remaining linter errors by adding the missing imports:

```typescript:src/tools/ToolRegistry.ts
import Tools from "./index";
import { getCoinPrice, coinsToPrice } from "./PriceTool";
import { getTokenAPR } from "./APRTool";
import {
  getPool,
  getAllPools,
  getPoolEvents,
  getRankedPools,
  getFilteredPools,
} from "./PoolTool";
import {
  getPoolSpotPrice,
  getTradeAmountOut,
  getTradeRoute,
  getDepositTransaction,
  getWithdrawTransaction,
} from "./TradeTool";
import {
  buildTransferTx,
  buildMultiTransferTx,
  estimateGas,
  createMergeCoinsTx,
  TransactionAgent,
  initSuiClient,
} from "./TransactionTool";
import { TokenBalance } from "../../@types/interface";
import { TransactionBlock } from "@mysten/sui.js/transactions";

// ... rest of the existing code ...
```


Now that we have implemented the transaction tools, here are sample queries for each transaction tool:

1. **Transfer Single Coin**:
```json
POST http://localhost:2512/query
{
    "prompt": "Transfer 1 SUI from 0x123...abc to 0x456...def"
}
```

2. **Multi-Token Transfer**:
```json
POST http://localhost:2512/query
{
    "prompt": "Transfer 1 SUI and 10 USDC from 0x123...abc to 0x456...def"
}
```

3. **Merge Coins**:
```json
POST http://localhost:2512/query
{
    "prompt": "Merge all SUI coins in wallet 0x123...abc"
}
```

4. **Estimate Gas**:
```json
POST http://localhost:2512/query
{
    "prompt": "Estimate gas cost for transferring 1 SUI from 0x123...abc to 0x456...def"
}
```


1. **Simple Transfer**:
```json
POST http://localhost:2512/query
{
    "prompt": "Send 0.5 SUI to wallet 0x456...def"
}
```

2. **Multi-coin Transfer**:
```json
POST http://localhost:2512/query
{
    "prompt": "Send 100 USDC and 1 SUI to 0x456...def"
}
```

3. **Merge Request**:
```json
POST http://localhost:2512/query
{
    "prompt": "Consolidate all my SUI coins into one"
}
```

4. **Gas Estimation**:
```json
POST http://localhost:2512/query
{
    "prompt": "How much gas will it cost to send 5 SUI to 0x456...def?"
}
```


