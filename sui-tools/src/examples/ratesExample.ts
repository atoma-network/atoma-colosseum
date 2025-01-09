import { RatesManager } from '../rates/rates';

async function main() {
  try {
    // Initialize RatesManager
    const ratesManager = new RatesManager("MAINNET");

    // Example pool ID 
    const poolId = "0x52ac89ee8c446638930f53129803f026a04028d2c0deef314321f71c69ab7f78";

    // Fetch pool APY
    console.log('Fetching pool APY...');
    const apy = await ratesManager.getPoolApy(poolId);
    console.log(`Pool APY: ${apy}%`);

    // Calculate lending rate
    console.log('Calculating lending rate...');
    const lendingRate = await ratesManager.getLendingRate(poolId);
    console.log(`Lending Rate: ${lendingRate}%`);

    // Get best lending opportunities
    console.log('Fetching best lending opportunities...');
    const bestOpportunities = await ratesManager.getBestLendingOpportunities(5); // Minimum APY of 5%
    bestOpportunities.forEach(pool => {
      console.log(`Pool ID: ${pool.id}, APY: ${pool.apy}%`);
    });

    // Calculate impermanent loss
    console.log('Calculating impermanent loss...');
    const initialPrice = 1000;    // Initial price when liquidity was added
    const currentPrice = 1200;    // Current price
    const poolShare = 0.1;        // 10% share of the pool
    const impermanentLoss = ratesManager.calculateImpermanentLossForPool(initialPrice, currentPrice, poolShare);
    console.log(`Impermanent Loss: ${impermanentLoss}%`);

  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 