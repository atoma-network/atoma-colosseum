import { AftermathClient } from '../aftermath/AftermathClient';
import { TOKEN_ADDRESSES } from '../common/config';

async function main() {
  try {
    // Initialize AftermathClient
    const aftermathClient = new AftermathClient("MAINNET");
    await aftermathClient.init();

    // Get token prices
    console.log('\nFetching token prices...');
    
    // SUI Token
    const suiPrice = await aftermathClient.getTokenPrice(
      "0x2::sui::SUI"
    );
    console.log('SUI Price:', {
      current: `$${suiPrice.current.toFixed(4)}`,
      change24h: `${suiPrice.priceChange24h?.toFixed(2)}%`
    });

    // USDC Token
    const usdcPrice = await aftermathClient.getTokenPrice(
      "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::USDC"
    );
    console.log('USDC Price:', {
      current: `$${usdcPrice.current.toFixed(4)}`,
      change24h: `${usdcPrice.priceChange24h?.toFixed(2)}%`
    });

    // USDT Token
    const usdtPrice = await aftermathClient.getTokenPrice(
      "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::USDT"
    );
    console.log('USDT Price:', {
      current: `$${usdtPrice.current.toFixed(4)}`,
      change24h: `${usdtPrice.priceChange24h?.toFixed(2)}%`
    });

    // Fetch a specific pool (SUI-USDC pool)
    console.log('\nFetching pool data...');
    const poolId = '0x52ac89ee8c446638930f53129803f026a04028d2c0deef314321f71c69ab7f78'; // SUI-USDC pool
    const pool = await aftermathClient.getPool(poolId);
    console.log('Pool Data:', JSON.stringify(pool, null, 2));

    // Fetch all pools
    console.log('\nFetching all pools...');
    const allPools = await aftermathClient.getAllPools();
    console.log(`Total Pools: ${allPools.length}`);
    
    // Show first 3 pools
    console.log('\nFirst 3 pools:');
    allPools.slice(0, 3).forEach(pool => {
      console.log(`- Pool ${pool.id}:`);
      console.log(`  TVL: $${pool.tvl}`);
      console.log(`  APY: ${pool.apy}%`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 