import { getTokenPrice, getPool, getAllPools } from '../aftermath/AftermathClient';
import { TOKEN_ADDRESSES } from '../common/config';
import { PoolInfo } from '../common/types';

async function main() {
  try {
    console.log('\nFetching token prices...');
    
    // SUI Token
    const suiPrice = await getTokenPrice(TOKEN_ADDRESSES.SUI);
    console.log('SUI Price:', {
      current: `$${suiPrice.current.toFixed(4)}`,
      change24h: `${suiPrice.priceChange24h?.toFixed(2)}%`
    });

    // USDC Token
    const usdcPrice = await getTokenPrice(TOKEN_ADDRESSES.USDC);
    console.log('USDC Price:', {
      current: `$${usdcPrice.current.toFixed(4)}`,
      change24h: `${usdcPrice.priceChange24h?.toFixed(2)}%`
    });

    // USDT Token
    const usdtPrice = await getTokenPrice(TOKEN_ADDRESSES.USDT);
    console.log('USDT Price:', {
      current: `$${usdtPrice.current.toFixed(4)}`,
      change24h: `${usdtPrice.priceChange24h?.toFixed(2)}%`
    });

    // Fetch a specific pool (SUI-USDC pool)
    console.log('\nFetching pool data...');
    const poolId = '0x52ac89ee8c446638930f53129803f026a04028d2c0deef314321f71c69ab7f78'; // SUI-USDC pool
    const pool = await getPool(poolId);
    console.log('Pool Data:', JSON.stringify(pool, null, 2));

    // Fetch all pools
    console.log('\nFetching all pools...');
    const allPools = await getAllPools();
    console.log(`Total Pools: ${allPools.length}`);
    
    // Show first 3 pools
    console.log('\nFirst 3 pools:');
    allPools.slice(0, 3).forEach((pool: PoolInfo) => {
      console.log(`- Pool ${pool.id}:`);
      console.log(`  TVL: $${pool.tvl}`);
      console.log(`  APY: ${pool.apy}%`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 