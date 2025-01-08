import { TransactionManager } from '../transactions/transactions';
import { TOKEN_ADDRESSES } from '../common/config';

async function main() {
  try {
    const txManager = new TransactionManager("MAINNET");

    //We will use a real wallet address that owns SUI tokens
    const fromAddress = "0x0f19fce2f6d3c2fb3779c22c6cc94d28c504f3839a87d6f192b2d79a9c4c49c9";
    const toAddress = "0x0f19fce2f6d3c2fb3779c22c6cc94d28c504f3839a87d6f192b2d79a9c4c49c9";

    console.log('Building transfer transaction...');
    const transferTx = await txManager.buildTransferTx(
      fromAddress,
      toAddress,
      TOKEN_ADDRESSES.SUI,
      BigInt(1_000_000) // 0.001 SUI
    );

    console.log('Estimating gas...');
    const gasEstimate = await txManager.estimateGas(transferTx);
    console.log(`Estimated gas: ${gasEstimate}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 