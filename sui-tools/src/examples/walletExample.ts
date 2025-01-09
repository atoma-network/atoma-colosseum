import { initSuiClient } from '../transactions/TransactionTools';
import { 
  generateWallet, 
  createWalletFromPrivateKey,
  transfer,
  signMessage 
} from '../wallets/wallet';

async function main() {
  try {
    // Initialize client
    const client = initSuiClient("MAINNET");

    // Generate new wallet
    const wallet = generateWallet();
    console.log("Wallet address:", wallet.address);

    // Import from private key
    const importedWallet = createWalletFromPrivateKey("private-key");

    // Transfer tokens
    const result = await transfer(client, wallet, {
      to: "recipient-address",
      amount: BigInt(1_000_000), // 0.001 SUI
    });
    console.log("Transaction hash:", result.hash);

    // Sign a message
    const signature = signMessage(wallet, "Hello, Sui!");
    console.log("Signature:", signature);

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main(); 