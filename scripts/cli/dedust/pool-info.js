#!/usr/bin/env node

/**
 * DeDust AMM Pool Info CLI Tool
 *
 * Usage: node scripts/cli/dedust/pool-info.js <baseToken> <quoteToken> [poolType] [network]
 * Example: node scripts/cli/dedust/pool-info.js TON USDT volatile mainnet
 * Example: node scripts/cli/dedust/pool-info.js USDC USDT stable testnet
 */

const axios = require('axios');

const DEFAULT_NETWORK = 'mainnet';
const DEFAULT_POOL_TYPE = 'volatile';
const GATEWAY_BASE_URL = 'http://localhost:15888';

async function getPoolInfo(baseToken, quoteToken, poolType = DEFAULT_POOL_TYPE, network = DEFAULT_NETWORK) {
  try {
    console.log(`🏊 Getting DeDust pool info for ${baseToken}/${quoteToken} (${poolType})`);

    const params = {
      network,
      baseToken,
      quoteToken,
      poolType
    };

    const response = await axios.get(
      `${GATEWAY_BASE_URL}/connectors/dedust/amm/poolInfo`,
      {
        params,
        timeout: 10000
      }
    );

    const pool = response.data;

    console.log('\n🏊 DeDust Pool Information:');
    console.log('═'.repeat(70));
    console.log(`Pool Address: ${pool.address}`);
    console.log(`Network: ${pool.network}`);
    console.log(`Type: ${pool.type} (${pool.fee}% fee)`);
    console.log();

    // Token information
    console.log('🪙 Pool Tokens:');
    console.log(`   Base:  ${pool.baseSymbol}`);
    console.log(`   Quote: ${pool.quoteSymbol}`);
    console.log();

    // Liquidity information
    console.log('💧 Liquidity:');
    const baseReserve = parseFloat(pool.baseReserve);
    const quoteReserve = parseFloat(pool.quoteReserve);
    const totalSupply = parseFloat(pool.totalSupply);

    console.log(`   ${pool.baseSymbol} Reserve:  ${baseReserve.toLocaleString()}`);
    console.log(`   ${pool.quoteSymbol} Reserve: ${quoteReserve.toLocaleString()}`);
    console.log(`   LP Token Supply: ${totalSupply.toLocaleString()}`);
    console.log();

    // Price calculations
    if (baseReserve > 0 && quoteReserve > 0) {
      const basePrice = quoteReserve / baseReserve;
      const quotePrice = baseReserve / quoteReserve;

      console.log('💰 Current Prices:');
      console.log(`   1 ${pool.baseSymbol} = ${basePrice.toFixed(6)} ${pool.quoteSymbol}`);
      console.log(`   1 ${pool.quoteSymbol} = ${quotePrice.toFixed(6)} ${pool.baseSymbol}`);
      console.log();

      // Additional price info if available from response
      if (pool.currentPrice) {
        console.log(`   Pool Price: ${parseFloat(pool.currentPrice).toFixed(6)}`);
      }

      if (pool.priceChange24h !== undefined) {
        const change = pool.priceChange24h;
        const changeIcon = change >= 0 ? '📈' : '📉';
        console.log(`   24h Change: ${changeIcon} ${change.toFixed(2)}%`);
      }
    }

    // Volume and TVL
    if (pool.volume24h) {
      console.log('📊 Trading Stats:');
      console.log(`   24h Volume: $${parseFloat(pool.volume24h).toLocaleString()}`);
    }

    if (pool.tvl) {
      console.log(`   TVL: $${parseFloat(pool.tvl).toLocaleString()}`);
    }

    // Pool utilization
    if (baseReserve > 0 && quoteReserve > 0) {
      console.log('\n🔄 Pool Ratios:');
      const total = baseReserve + quoteReserve;
      const basePercent = (baseReserve / total) * 100;
      const quotePercent = (quoteReserve / total) * 100;

      console.log(`   ${pool.baseSymbol}: ${basePercent.toFixed(1)}%`);
      console.log(`   ${pool.quoteSymbol}: ${quotePercent.toFixed(1)}%`);
    }

    console.log();

    // Pool health indicators
    console.log('🏥 Pool Health:');
    if (totalSupply > 0) {
      console.log('   ✅ Active pool with liquidity');
    } else {
      console.log('   ⚠️  Empty pool');
    }

    if (baseReserve > 1000 && quoteReserve > 1000) {
      console.log('   ✅ Good liquidity depth');
    } else if (baseReserve > 100 && quoteReserve > 100) {
      console.log('   ⚠️  Moderate liquidity');
    } else {
      console.log('   🔴 Low liquidity - high slippage risk');
    }

    // Fee information
    console.log('\n💸 Fee Structure:');
    console.log(`   Trading Fee: ${pool.fee}%`);
    if (pool.type === 'stable') {
      console.log('   💡 Stable pools have lower fees for correlated assets');
    } else {
      console.log('   💡 Volatile pools for uncorrelated asset pairs');
    }

    // Pool contract link
    const explorerUrl = network === 'mainnet' ?
      `https://tonapi.io/account/${pool.address}` :
      `https://testnet.tonapi.io/account/${pool.address}`;

    console.log('\n🔍 Pool Contract:');
    console.log(`   Explorer: ${explorerUrl}`);

    console.log('═'.repeat(70));
    console.log('✅ Pool info retrieved successfully');

  } catch (error) {
    console.error('❌ Error getting pool info:');

    if (error.code === 'ECONNREFUSED') {
      console.error('   Gateway server is not running on localhost:15888');
      console.error('   Please start the gateway server first');
    } else if (error.response) {
      console.error(`   HTTP ${error.response.status}: ${error.response.statusText}`);
      if (error.response.data && error.response.data.message) {
        console.error(`   ${error.response.data.message}`);
      }

      if (error.response.status === 404) {
        console.error(`   Pool not found for ${baseToken}/${quoteToken} (${poolType})`);
        console.error('   Try a different pool type or check token symbols');
      }
    } else {
      console.error(`   ${error.message}`);
    }

    console.error('\n💡 Tips:');
    console.error('   - Check token symbols are correct');
    console.error('   - Try different pool type (volatile/stable)');
    console.error('   - Verify tokens exist on this network');

    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('❌ Usage: node pool-info.js <baseToken> <quoteToken> [poolType] [network]');
  console.error('   Example: node pool-info.js TON USDT volatile mainnet');
  console.error('   Example: node pool-info.js USDC USDT stable testnet');
  console.error('');
  console.error('   poolType: volatile (default) or stable');
  process.exit(1);
}

const baseToken = args[0];
const quoteToken = args[1];
const poolType = args[2] || DEFAULT_POOL_TYPE;
const network = args[3] || DEFAULT_NETWORK;

// Validation
if (!['volatile', 'stable'].includes(poolType)) {
  console.error('❌ Pool type must be "volatile" or "stable"');
  process.exit(1);
}

if (!['mainnet', 'testnet'].includes(network)) {
  console.error('❌ Invalid network. Use "mainnet" or "testnet"');
  process.exit(1);
}

// Run the pool info query
getPoolInfo(baseToken, quoteToken, poolType, network);