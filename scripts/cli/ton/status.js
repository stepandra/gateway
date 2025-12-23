#!/usr/bin/env node

/**
 * TON Chain Status CLI Tool
 *
 * Usage: node scripts/cli/ton/status.js [network]
 * Example: node scripts/cli/ton/status.js mainnet
 */

const axios = require('axios');

const DEFAULT_NETWORK = 'mainnet';
const GATEWAY_BASE_URL = 'http://localhost:15888';

async function getTONStatus(network = DEFAULT_NETWORK) {
  try {
    console.log(`🔍 Getting TON ${network} status...`);

    const response = await axios.get(
      `${GATEWAY_BASE_URL}/chains/ton/status`,
      {
        params: { network },
        timeout: 10000
      }
    );

    const status = response.data;

    console.log('📊 TON Chain Status:');
    console.log('═'.repeat(50));
    console.log(`Network: ${status.network}`);
    console.log(`Chain ID: ${status.chainId}`);
    console.log(`Current Block: ${status.currentBlockNumber}`);
    console.log(`Connection: ${status.connection ? '🟢 Connected' : '🔴 Disconnected'}`);

    if (status.providers && Array.isArray(status.providers)) {
      console.log('\n🔗 Providers:');
      status.providers.forEach((provider, index) => {
        const statusIcon = provider.status === 'healthy' ? '🟢' :
                          provider.status === 'degraded' ? '🟡' : '🔴';
        console.log(`  ${index + 1}. ${provider.name}: ${statusIcon} ${provider.status}`);
        if (provider.latency) {
          console.log(`     Latency: ${provider.latency}ms`);
        }
        if (provider.lastCheck) {
          console.log(`     Last Check: ${new Date(provider.lastCheck).toISOString()}`);
        }
      });
    }

    if (status.version) {
      console.log(`\nNode Version: ${status.version}`);
    }

    if (status.syncInfo) {
      console.log(`Sync Status: ${status.syncInfo.syncing ? '🔄 Syncing' : '✅ Synced'}`);
      if (status.syncInfo.syncingToBlock) {
        console.log(`Syncing to Block: ${status.syncInfo.syncingToBlock}`);
      }
    }

    if (status.timestamp) {
      console.log(`\nLast Updated: ${new Date(status.timestamp).toISOString()}`);
    }

    console.log('═'.repeat(50));
    console.log('✅ Status check completed');

  } catch (error) {
    console.error('❌ Error getting TON status:');

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

// Validate network
if (!['mainnet', 'testnet'].includes(network)) {
  console.error('❌ Invalid network. Use "mainnet" or "testnet"');
  process.exit(1);
}

// Run the status check
getTONStatus(network);