#!/usr/bin/env node

/**
 * TON Chain Balances CLI Tool
 *
 * Usage: node scripts/cli/ton/balances.js <wallet_address> [network] [tokens]
 * Example: node scripts/cli/ton/balances.js EQA... mainnet
 * Example: node scripts/cli/ton/balances.js EQA... mainnet "TON,USDT"
 */

const axios = require('axios');

const DEFAULT_NETWORK = 'mainnet';
const GATEWAY_BASE_URL = 'http://localhost:15888';

async function getTONBalances(walletAddress, network = DEFAULT_NETWORK, tokenSymbols = 'TON') {
  try {
    console.log(`💰 Getting balances for ${walletAddress.slice(0, 8)}... on TON ${network}`);

    const tokens = tokenSymbols.split(',').map(t => t.trim());

    const response = await axios.post(
      `${GATEWAY_BASE_URL}/chains/ton/balances`,
      {
        walletAddress,
        network,
        tokenSymbols: tokens
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      }
    );

    const data = response.data;

    console.log('\n💰 TON Wallet Balances:');
    console.log('═'.repeat(60));
    console.log(`Address: ${data.address}`);
    console.log(`Network: ${data.network}`);
    console.log(`Status: ${data.isActive ? '🟢 Active' : '🔴 Inactive'}`);

    if (data.seqno !== undefined) {
      console.log(`Sequence Number: ${data.seqno}`);
    }

    console.log('\n📋 Token Balances:');
    console.log('-'.repeat(60));

    if (data.balances && Array.isArray(data.balances)) {
      data.balances.forEach(balance => {
        const symbol = balance.symbol || 'Unknown';
        const amount = parseFloat(balance.balance);
        const formatted = amount.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 6
        });

        console.log(`${symbol.padEnd(8)} │ ${formatted.padStart(20)} ${symbol}`);

        if (balance.decimals) {
          console.log(`${''.padEnd(8)} │ ${''.padStart(20)} (${balance.decimals} decimals)`);
        }

        if (balance.usdValue) {
          const usdFormatted = parseFloat(balance.usdValue).toLocaleString(undefined, {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
          console.log(`${''.padEnd(8)} │ ${'≈ '.padStart(20)}${usdFormatted}`);
        }

        console.log('-'.repeat(60));
      });

      // Calculate total USD value
      const totalUSD = data.balances
        .filter(b => b.usdValue)
        .reduce((sum, b) => sum + parseFloat(b.usdValue), 0);

      if (totalUSD > 0) {
        const totalFormatted = totalUSD.toLocaleString(undefined, {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        console.log(`${'TOTAL'.padEnd(8)} │ ${''.padStart(20)}${totalFormatted}`);
        console.log('═'.repeat(60));
      }
    } else {
      console.log('No balances found');
    }

    if (data.timestamp) {
      console.log(`\nLast Updated: ${new Date(data.timestamp).toISOString()}`);
    }

    console.log('✅ Balance check completed');

  } catch (error) {
    console.error('❌ Error getting TON balances:');

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

if (args.length < 1) {
  console.error('❌ Usage: node balances.js <wallet_address> [network] [tokens]');
  console.error('   Example: node balances.js EQA... mainnet');
  console.error('   Example: node balances.js EQA... mainnet "TON,USDT"');
  process.exit(1);
}

const walletAddress = args[0];
const network = args[1] || DEFAULT_NETWORK;
const tokens = args[2] || 'TON';

// Validate network
if (!['mainnet', 'testnet'].includes(network)) {
  console.error('❌ Invalid network. Use "mainnet" or "testnet"');
  process.exit(1);
}

// Basic TON address validation
if (!walletAddress.match(/^(EQ|UQ)[A-Za-z0-9_-]{46}$|^[A-Za-z0-9_-]{48}$/)) {
  console.error('❌ Invalid TON address format');
  process.exit(1);
}

// Run the balance check
getTONBalances(walletAddress, network, tokens);