import { PriceMonitor } from '../monitors/PriceMonitor';
import { TOKEN_ADDRESSES } from '../common/config';

async function main() {
  try {
    // Initialize the PriceMonitor
    const priceMonitor = new PriceMonitor("MAINNET");
    await priceMonitor.init([
      TOKEN_ADDRESSES.SUI,  // SUI
      TOKEN_ADDRESSES.USDC, // USDC
      TOKEN_ADDRESSES.USDT, // USDT
      TOKEN_ADDRESSES.WETH  // WETH
    ]);

    console.log('\nStarting price monitoring...');

    // Set up price alerts
    priceMonitor.setPriceAlert(
      TOKEN_ADDRESSES.SUI,
      2.0, // Alert when SUI price goes above $2
      true,
      (price) => console.log(`🚨 Alert: SUI price reached $${price.toFixed(2)}`)
    );

    // Listen for price updates
    priceMonitor.on('priceUpdate', ({ token, price }) => {
      const tokenSymbol = token === TOKEN_ADDRESSES.SUI ? "SUI" :
                          token === TOKEN_ADDRESSES.USDC ? "USDC" :
                          token === TOKEN_ADDRESSES.USDT ? "USDT" :
                          token === TOKEN_ADDRESSES.WETH ? "WETH" :
                          token.substring(0, 10) + "...";

      console.log(`\n${tokenSymbol}:`);
      console.log(`  Price: $${price.current.toFixed(4)}`);
      console.log(`  24h Change: ${price.priceChange24h?.toFixed(2)}%`);

      const volatility = priceMonitor.getVolatility(token);
      if (volatility !== undefined) {
        console.log(`  Current Volatility: ${volatility.toFixed(2)}%`);
      }
    });

    priceMonitor.on('error', (error) => {
      console.error('❌ Price monitoring error:', error);
    });

    console.log('Press Ctrl+C to stop');

  } catch (error) {
    console.error('Failed to start price monitor:', error);
  }
}

main().catch(console.error); 