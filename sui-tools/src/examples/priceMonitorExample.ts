import { 
  initPriceMonitor, 
  createPriceEmitter, 
  updatePrices,
  calculateVolatility 
} from '../monitors/PriceTools';
import { TOKEN_ADDRESSES } from '../common/config';
import { PriceAlert } from '../common/types';

async function main() {
  try {
    // Initialize price monitoring infrastructure
    const aftermath = await initPriceMonitor("MAINNET");
    const emitter = createPriceEmitter();
    
    // Common tokens to monitor
    const tokens = [
      TOKEN_ADDRESSES.SUI,  // SUI
      TOKEN_ADDRESSES.USDC, // USDC
      TOKEN_ADDRESSES.USDT, // USDT
      TOKEN_ADDRESSES.WETH  // WETH
    ];

    // Set up price alerts
    const alerts: PriceAlert[] = [{
      coinType: TOKEN_ADDRESSES.SUI,
      threshold: 2.0, // Alert when SUI price goes above $2
      isUpperBound: true,
      callback: (price) => console.log(`🚨 Alert: SUI price reached $${price.toFixed(2)}`)
    }];

    // Listen for price updates
    emitter.on('priceUpdate', ({ token, price }) => {
      const tokenSymbol = token === TOKEN_ADDRESSES.SUI ? "SUI" :
                         token === TOKEN_ADDRESSES.USDC ? "USDC" :
                         token === TOKEN_ADDRESSES.USDT ? "USDT" :
                         token === TOKEN_ADDRESSES.WETH ? "WETH" :
                         token.substring(0, 10) + "...";
      
      console.log(`\n${tokenSymbol}:`);
      console.log(`  Price: $${price.current.toFixed(4)}`);
      console.log(`  24h Change: ${price.priceChange24h?.toFixed(2)}%`);
      
      if (price.previous) {
        const volatility = calculateVolatility(price.current, price.previous);
        console.log(`  Current Volatility: ${volatility.toFixed(2)}%`);
      }
    });

    emitter.on('error', (error) => {
      console.error('❌ Price monitoring error:', error);
    });

    console.log('\nStarting price monitoring...');
    
    // Initial price update
    await updatePrices(aftermath, emitter, tokens, alerts);

    // Update prices every 30 seconds
    setInterval(async () => {
      await updatePrices(aftermath, emitter, tokens, alerts);
    }, 30_000);

    console.log('Press Ctrl+C to stop');

  } catch (error) {
    console.error('Failed to start price monitor:', error);
  }
}

main().catch(console.error); 