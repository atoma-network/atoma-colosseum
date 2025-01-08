# Sui Tools

A TypeScript library for interacting with Sui blockchain and DeFi protocols.

## Features

- **Price Monitoring**: Real-time price tracking and alerts for Sui tokens
- **DeFi Integration**: Interact with Aftermath Finance and other DeFi protocols
- **Transaction Management**: Build and execute transactions on Sui
- **Rate Calculations**: APR/APY calculations and lending rate utilities

## Installation

```bash
npm install sui-tools
```

## Quick Start

### Price Monitoring

```typescript
import { PriceMonitor } from "sui-tools";

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
import { AftermathClient } from "sui-tools";

// Initialize Aftermath client
const client = new AftermathClient("MAINNET");
await client.init();

// Get pool information
const pool = await client.getPool("pool_id");
console.log("Pool TVL:", pool.tvl);
```

### Transaction Management

```typescript
import { TransactionManager } from "sui-tools";

const txManager = new TransactionManager("MAINNET");

// Build transfer transaction
const tx = await txManager.buildTransferTx(
  fromAddress,
  toAddress,
  "0x2::sui::SUI",
  BigInt(1_000_000) // 0.001 SUI
);

// Estimate gas
const gasEstimate = await txManager.estimateGas(tx);
``

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
```
