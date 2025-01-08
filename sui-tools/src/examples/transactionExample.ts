import { 
  initSuiClient, 
  buildTransferTx, 
  estimateGas 
} from '../transactions/TransactionTools';
import { TOKEN_ADDRESSES } from '../common/config';

/**
 * Example demonstrating how to build and estimate a token transfer transaction
 */
async function main() {
  try {
    // Initialize Sui client
    const client = initSuiClient("MAINNET");

    // Example addresses (replace with real addresses)
    const fromAddress = "0x0f19fce2f6d3c2fb3779c22c6cc94d28c504f3839a87d6f192b2d79a9c4c49c9";
    const toAddress = "0x0f19fce2f6d3c2fb3779c22c6cc94d28c504f3839a87d6f192b2d79a9c4c49c9";

    console.log('Building transfer transaction...');
    const transferTx = await buildTransferTx(
      client,
      fromAddress,
      toAddress,
      TOKEN_ADDRESSES.SUI,
      BigInt(1_000_000) // 0.001 SUI
    );

    console.log('Estimating gas...');
    const gasEstimate = await estimateGas(client, transferTx);
    console.log(`Estimated gas: ${gasEstimate}`);

    // Example of executing the transaction (commented out since we need a signer)
    /*
    const wallet = ...; // Initialize wallet/signer
    const result = await executeTransaction(client, transferTx, wallet);
    console.log('Transaction executed:', result);
    */

  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 