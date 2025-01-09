import { AftermathClient } from '../aftermath/AftermathClient';

async function main() {
  try {
    // Initialize AftermathClient
    const aftermathClient = new AftermathClient("MAINNET");

    // Fetch a specific pool
    console.log('Fetching pool data...');
    const poolId = 'pool123'; // Replace with an actual pool ID
    const pool = await aftermathClient.getPool(poolId);
    console.log(`Pool Data for ${poolId}:`, pool);

    // Fetch all pools
    console.log('Fetching all pools...');
    const allPools = await aftermathClient.getAllPools();
    console.log(`Total Pools: ${allPools.length}`);

    // Additional operations can be added here

  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 