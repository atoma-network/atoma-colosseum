import { initPriceMonitor } from '../monitors/PriceMonitor';

async function main() {
  // Initialize price monitor with token addresses
  const monitor = initPriceMonitor(['0x2::sui::SUI']);

  // Set up price alerts
  monitor.addAlert(
    '0x2::sui::SUI',
    2.0,  // Price threshold
    true, // Upper bound
    (price) => console.log(`SUI price exceeded $2.00! Current price: $${price}`)
  );

  monitor.addAlert(
    '0x2::sui::SUI',
    1.0,   // Price threshold
    false, // Lower bound
    (price) => console.log(`SUI price dropped below $1.00! Current price: $${price}`)
  );

  // Start monitoring prices every 60 seconds
  monitor.startMonitoring(60 * 1000);

  // Example cleanup after 5 minutes
  setTimeout(() => {
    monitor.stopMonitoring();
    console.log('Stopped price monitoring');
  }, 5 * 60 * 1000);
}

main().catch(console.error); 