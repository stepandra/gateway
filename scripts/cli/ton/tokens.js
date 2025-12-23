#!/usr/bin/env node

/**
 * TON Chain Tokens CLI Tool
 *
 * Usage: node scripts/cli/ton/tokens.js [network] [search]
 * Example: node scripts/cli/ton/tokens.js mainnet
 * Example: node scripts/cli/ton/tokens.js mainnet USD
 */

const axios = require('axios');

const DEFAULT_NETWORK = 'mainnet';
const GATEWAY_BASE_URL = 'http://localhost:15888';

async function getTONTokens(network = DEFAULT_NETWORK, search = '') {
  try {
    console.log(`🪙 Getting available tokens on TON ${network}...`);

    const params = { network };
    if (search) {
      params.search = search;
    }

    const response = await axios.get(
      `${GATEWAY_BASE_URL}/chains/ton/tokens`,
      {
        params,
        timeout: 10000
      }
    );

    const data = response.data;

    console.log('\n🪙 Available TON Tokens:');
    console.log('═'.repeat(80));
    console.log(`Network: ${data.network}`);

    if (search) {
      console.log(`Search: "${search}"`);
    }

    console.log(`Total Tokens: ${data.tokens ? data.tokens.length : 0}`);
    console.log();

    if (data.tokens && Array.isArray(data.tokens)) {
      // Header
      console.log('Symbol'.padEnd(12) + '│ ' + 'Name'.padEnd(25) + '│ ' + 'Address'.padEnd(35) + '│ ' + 'Decimals');
      console.log('─'.repeat(80));

      data.tokens.forEach(token => {
        const symbol = (token.symbol || 'Unknown').padEnd(12);
        const name = (token.name || 'Unknown').padEnd(25);
        let address = token.address || '';

        // Truncate long addresses for display
        if (address.length > 35) {
          address = address.slice(0, 16) + '...' + address.slice(-16);
        }
        address = address.padEnd(35);

        const decimals = token.decimals !== undefined ? token.decimals.toString() : 'N/A';

        console.log(`${symbol}│ ${name}│ ${address}│ ${decimals}`);

        // Show additional info if available
        if (token.isNative) {
          console.log(`${''.padEnd(12)}│ ${''.padEnd(25)}│ ${'🟡 Native Token'.padEnd(35)}│`);
        }

        if (token.verified !== undefined) {
          const verification = token.verified ? '✅ Verified' : '⚠️  Unverified';
          console.log(`${''.padEnd(12)}│ ${''.padEnd(25)}│ ${verification.padEnd(35)}│`);
        }

        if (token.description) {
          const desc = token.description.length > 70 ?
            token.description.slice(0, 67) + '...' :
            token.description;
          console.log(`${''.padEnd(12)}│ ${desc.padEnd(74)}│`);
        }

        console.log('─'.repeat(80));
      });

      // Summary by type
      const nativeTokens = data.tokens.filter(t => t.isNative).length;
      const jettonTokens = data.tokens.filter(t => !t.isNative).length;

      console.log();
      console.log('📊 Summary:');
      console.log(`   Native Tokens: ${nativeTokens}`);
      console.log(`   Jetton Tokens: ${jettonTokens}`);

      if (data.tokens.some(t => t.verified !== undefined)) {
        const verified = data.tokens.filter(t => t.verified).length;
        const unverified = data.tokens.filter(t => t.verified === false).length;
        console.log(`   Verified: ${verified}, Unverified: ${unverified}`);
      }

    } else {
      console.log('No tokens found');
      if (search) {
        console.log(`Try a different search term or check the spelling of "${search}"`);
      }
    }

    if (data.timestamp) {
      console.log(`\nLast Updated: ${new Date(data.timestamp).toISOString()}`);
    }

    console.log('═'.repeat(80));
    console.log('✅ Token list completed');

  } catch (error) {
    console.error('❌ Error getting TON tokens:');

    if (error.code === 'ECONNREFUSED') {
      console.error('   Gateway server is not running on localhost:15888');
      console.error('   Please start the gateway server first');
    } else if (error.response) {
      console.error(`   HTTP ${error.response.status}: ${error.response.statusText}`);
      if (error.response.data && error.response.data.message) {
        console.error(`   ${error.response.data.message}`);
      }
    } else {
      console.error(`   ${error.message}`);
    }

    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const network = args[0] || DEFAULT_NETWORK;
const search = args[1] || '';

// Validate network
if (!['mainnet', 'testnet'].includes(network)) {
  console.error('❌ Invalid network. Use "mainnet" or "testnet"');
  process.exit(1);
}

// Run the token list
getTONTokens(network, search);