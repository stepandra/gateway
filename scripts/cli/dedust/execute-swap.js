#!/usr/bin/env node

/**
 * DeDust Router Execute Swap CLI Tool
 *
 * Usage: node scripts/cli/dedust/execute-swap.js <walletAddress> <quoteId> <baseToken> <quoteToken> <amount> <side> [network] [slippage]
 * Example: node scripts/cli/dedust/execute-swap.js EQA... quote123 TON USDT 100 SELL mainnet 1.0
 */

const axios = require('axios');

const DEFAULT_NETWORK = 'mainnet';
const DEFAULT_SLIPPAGE = 1.0;
const GATEWAY_BASE_URL = 'http://localhost:15888';

async function executeSwap(walletAddress, quoteId, baseToken, quoteToken, amount, side, network = DEFAULT_NETWORK, slippage = DEFAULT_SLIPPAGE) {
  try {
    console.log(`🚀 Executing DeDust swap for ${amount} ${baseToken} → ${quoteToken}`);
    console.log(`   Wallet: ${walletAddress.slice(0, 8)}...`);
    console.log(`   Quote ID: ${quoteId}`);

    const requestBody = {
      network,
      walletAddress,
      quoteId,
      baseToken,
      quoteToken,
      amount: amount.toString(),
      side,
      slippage
    };

    console.log('\n🔄 Submitting transaction...');

    const response = await axios.post(
      `${GATEWAY_BASE_URL}/connectors/dedust/router/execute-swap`,
      requestBody,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000 // Longer timeout for transaction execution
      }
    );

    const result = response.data;

    console.log('\n🎉 Swap Executed Successfully!');
    console.log('═'.repeat(70));
    console.log(`Transaction Hash: ${result.txHash}`);
    console.log(`Nonce: ${result.nonce}`);
    console.log();

    // Swap details
    console.log('💱 Swap Details:');
    console.log(`   Expected Out: ${parseFloat(result.expectedAmountOut).toLocaleString()} ${quoteToken}`);
    console.log(`   Actual Out:   ${parseFloat(result.actualAmountOut).toLocaleString()} ${quoteToken}`);
    console.log(`   Price Impact: ${result.priceImpact.toFixed(3)}%`);
    console.log();

    // Transaction costs
    console.log('⛽ Transaction Costs:');
    console.log(`   Gas Used: ${result.gasUsed}`);
    console.log(`   Fee Paid: ${result.fee} TON`);
    console.log();

    // Route taken
    console.log('🛣️  Executed Route:');
    if (result.route && Array.isArray(result.route)) {
      result.route.forEach((step, index) => {
        console.log(`   ${index + 1}. Pool: ${step.pool.slice(0, 10)}...`);
        console.log(`      ${step.tokenIn.slice(0, 8)}... → ${step.tokenOut.slice(0, 8)}...`);
        console.log(`      Amount: ${parseFloat(step.amountIn).toLocaleString()} → ${parseFloat(step.amountOut).toLocaleString()}`);
        console.log(`      Type: ${step.poolType}`);
        if (index < result.route.length - 1) {
          console.log('      ↓');
        }
      });
    } else {
      console.log('   Direct swap (single pool)');
    }
    console.log();

    // Performance comparison
    const expectedAmount = parseFloat(result.expectedAmountOut);
    const actualAmount = parseFloat(result.actualAmountOut);
    if (expectedAmount > 0) {
      const difference = ((actualAmount - expectedAmount) / expectedAmount) * 100;
      console.log('📊 Performance:');
      if (difference >= 0) {
        console.log(`   Output: +${difference.toFixed(3)}% vs quote (better than expected!)`);
      } else {
        console.log(`   Output: ${difference.toFixed(3)}% vs quote`);
      }
      console.log();
    }

    // Transaction explorer link
    const explorerUrl = network === 'mainnet' ?
      `https://tonapi.io/transaction/${result.txHash}` :
      `https://testnet.tonapi.io/transaction/${result.txHash}`;

    console.log('🔍 Transaction Details:');
    console.log(`   Explorer: ${explorerUrl}`);
    console.log(`   Block Time: ${new Date().toISOString()}`);
    console.log();

    // Next steps
    console.log('✅ Next Steps:');
    console.log('   1. Wait for transaction confirmation (~30 seconds)');
    console.log('   2. Check your wallet balance');
    console.log('   3. View transaction on TON explorer');

    console.log('═'.repeat(70));
    console.log('🎊 Swap completed successfully!');

  } catch (error) {
    console.error('❌ Error executing swap:');

    if (error.code === 'ECONNREFUSED') {
      console.error('   Gateway server is not running on localhost:15888');
      console.error('   Please start the gateway server first');
    } else if (error.response) {
      console.error(`   HTTP ${error.response.status}: ${error.response.statusText}`);
      if (error.response.data && error.response.data.message) {
        console.error(`   ${error.response.data.message}`);
      }

      // Specific error handling
      if (error.response.status === 404) {
        console.error('   Quote not found or expired. Please generate a new quote.');
      } else if (error.response.status === 422) {
        console.error('   Transaction failed - check your balance and quote validity');
      }
    } else {
      console.error(`   ${error.message}`);
    }

    console.error('\n💡 Troubleshooting:');
    console.error('   - Ensure you have sufficient balance');
    console.error('   - Check that the quote is still valid');
    console.error('   - Verify wallet address format');
    console.error('   - Try with lower slippage tolerance');

    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 6) {
  console.error('❌ Usage: node execute-swap.js <walletAddress> <quoteId> <baseToken> <quoteToken> <amount> <side> [network] [slippage]');
  console.error('   Example: node execute-swap.js EQA... quote123 TON USDT 100 SELL mainnet 1.0');
  console.error('');
  console.error('   Get quoteId from quote-swap.js first');
  process.exit(1);
}

const walletAddress = args[0];
const quoteId = args[1];
const baseToken = args[2];
const quoteToken = args[3];
const amount = parseFloat(args[4]);
const side = args[5].toUpperCase();
const network = args[6] || DEFAULT_NETWORK;
const slippage = args[7] ? parseFloat(args[7]) : DEFAULT_SLIPPAGE;

// Validation
if (!walletAddress.match(/^(EQ|UQ)[A-Za-z0-9_-]{46}$|^[A-Za-z0-9_-]{48}$/)) {
  console.error('❌ Invalid TON address format');
  process.exit(1);
}

if (!quoteId || quoteId.length < 5) {
  console.error('❌ Invalid quote ID');
  process.exit(1);
}

if (isNaN(amount) || amount <= 0) {
  console.error('❌ Amount must be a positive number');
  process.exit(1);
}

if (!['SELL', 'BUY'].includes(side)) {
  console.error('❌ Side must be "SELL" or "BUY"');
  process.exit(1);
}

if (!['mainnet', 'testnet'].includes(network)) {
  console.error('❌ Invalid network. Use "mainnet" or "testnet"');
  process.exit(1);
}

if (isNaN(slippage) || slippage < 0 || slippage > 50) {
  console.error('❌ Slippage must be between 0 and 50%');
  process.exit(1);
}

// Warning for mainnet
if (network === 'mainnet') {
  console.log('⚠️  WARNING: You are about to execute a swap on MAINNET');
  console.log('   This will spend real TON/tokens from your wallet');
  console.log('   Double-check all parameters before proceeding');
  console.log();
}

// Run the swap execution
executeSwap(walletAddress, quoteId, baseToken, quoteToken, amount, side, network, slippage);