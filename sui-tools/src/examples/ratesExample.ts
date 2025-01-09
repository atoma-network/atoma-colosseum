import { RatesManager } from '../rates/rates';
import { AFTERMATH_ADDRESSES } from '../common/config';

async function main() {
  try {
    // Initialize RatesManager
    console.log('Initializing RatesManager...');
    const ratesManager = new RatesManager("MAINNET");

    // Use a known valid pool ID from our config
    const poolId = AFTERMATH_ADDRESSES.POOLS.SUI_USDC;
    console.log(`Using pool: ${poolId} (SUI-USDC)`);

    // Fetch pool APY
    console.log('\nFetching pool APY...');
    try {
      const apy = await ratesManager.getPoolApy(poolId);
      if (apy === 0) {
        console.log('Note: Pool APY is currently 0%, calculating based on utilization...');
        const lendingRate = await ratesManager.getLendingRate(poolId);
        console.log(`Calculated Lending Rate: ${lendingRate.toFixed(2)}%`);
      } else {
        console.log(`Pool APY: ${apy.toFixed(2)}%`);
      }
    } catch (error) {
      console.log('Could not get pool APY, calculating based on utilization...');
      const lendingRate = await ratesManager.getLendingRate(poolId);
      console.log(`Calculated Lending Rate: ${lendingRate.toFixed(2)}%`);
    }

    // APR to APY conversion example
    console.log('\nAPR to APY conversion example:');
    const sampleApr = 5; // 5% APR
    const calculatedApy = ratesManager.aprToApy(sampleApr / 100);
    console.log(`APR: ${sampleApr}% → APY: ${calculatedApy.toFixed(2)}%`);

    // Get best lending opportunities
    console.log('\nFetching best lending opportunities...');
    const bestOpportunities = await ratesManager.getBestLendingOpportunities(0); // Set minimum APY to 0 to see all pools
    if (bestOpportunities.length === 0) {
      console.log('No lending opportunities found. This might be due to:');
      console.log('- Network connectivity issues');
      console.log('- API rate limiting');
      console.log('- No active pools available');
    } else {
      console.log(`Found ${bestOpportunities.length} opportunities:`);
      bestOpportunities.forEach(pool => {
        console.log(`Pool ID: ${pool.id}`);
        console.log(`  APY: ${pool.apy?.toFixed(2) || 'N/A'}%`);
        console.log(`  TVL: $${pool.tvl?.toFixed(2) || 'N/A'}`);
      });
    }

    // Calculate impermanent loss example
    console.log('\nImpermanent Loss Examples:');
    const examples = [
      { price_change: 20, initial: 1000, current: 1200 },
      { price_change: 50, initial: 1000, current: 1500 },
      { price_change: -20, initial: 1000, current: 800 }
    ];

    examples.forEach(({ price_change, initial, current }) => {
      const poolShare = 0.1; // 10% share of the pool
      const impermanentLoss = ratesManager.calculateImpermanentLossForPool(
        initial,
        current,
        poolShare
      );
      console.log(`${price_change}% price change: ${impermanentLoss.toFixed(2)}% IL`);
    });

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main(); 