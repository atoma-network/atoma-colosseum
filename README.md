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
