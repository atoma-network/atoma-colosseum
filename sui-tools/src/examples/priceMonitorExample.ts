import { PriceMonitor } from '../monitors/PriceMonitor';

async function main() {
  try {
    // Initialize price monitor with MAINNET
    const monitor = new PriceMonitor("MAINNET");
    
    // Common tokens on Aftermath Finance
    const tokens = [
      "0x2::sui::SUI", // SUI
      "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::USDC", // USDC
      "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::USDT", // USDT
      "0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::WETH", // WETH
    ];

    console.log('Initializing price monitor...');
    await monitor.init(tokens);
    console.log('Price monitor initialized successfully');

    // Set up price alerts
    monitor.setPriceAlert(
      tokens[0], // SUI
      2.0, // Alert when SUI price goes above $2
      true, 
      (price) => console.log(`🚨 Alert: SUI price reached $${price.toFixed(2)}`)
    );

    // Listen for price updates
    monitor.on('priceUpdate', ({ token, price }) => {
      const tokenSymbol = token.includes("sui::SUI") ? "SUI" : 
                         token.includes("USDC") ? "USDC" :
                         token.includes("USDT") ? "USDT" :
                         token.includes("WETH") ? "WETH" : 
                         token.substring(0, 10) + "...";
      
      console.log(`\n${tokenSymbol}:`);
      console.log(`  Price: $${price.current.toFixed(4)}`);
      console.log(`  24h Change: ${price.priceChange24h?.toFixed(2)}%`);
      
      const volatility = monitor.getVolatility(token);
      if (volatility) {
        console.log(`  Current Volatility: ${volatility.toFixed(2)}%`);
      }
    });

    monitor.on('error', (error) => {
      console.error('❌ Price monitoring error:', error);
    });

    console.log('\nMonitoring prices... (Press Ctrl+C to stop)');

  } catch (error) {
    console.error('Failed to start price monitor:', error);
  }
}

main().catch(console.error); 