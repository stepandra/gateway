#!/usr/bin/env node

/**
 * DeDust Router Quote Swap CLI Tool
 *
 * Usage: node scripts/cli/dedust/quote-swap.js <baseToken> <quoteToken> <amount> <side> [network] [slippage]
 * Example: node scripts/cli/dedust/quote-swap.js TON USDT 100 SELL mainnet 1.0
 * Example: node scripts/cli/dedust/quote-swap.js USDT TON 50 BUY mainnet 2.0
 */

const axios = require('axios');

const DEFAULT_NETWORK = 'mainnet';
const DEFAULT_SLIPPAGE = 1.0;
const GATEWAY_BASE_URL = 'http://localhost:15888';

async function getSwapQuote(baseToken, quoteToken, amount, side, network = DEFAULT_NETWORK, slippage = DEFAULT_SLIPPAGE) {
  try {
    console.log(`🔄 Getting DeDust swap quote for ${amount} ${baseToken} → ${quoteToken} (${side})`);

    const requestBody = {
      network,
      baseToken,
      quoteToken,
      amount: amount.toString(),
      side,
      slippage
    };

    const response = await axios.post(
      `${GATEWAY_BASE_URL}/connectors/dedust/router/quote-swap`,
      requestBody,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      }
    );

    const quote = response.data;

    console.log('\n💱 DeDust Swap Quote:');
    console.log('═'.repeat(70));
    console.log(`Quote ID: ${quote.quoteId}`);
    console.log(`Network: ${network}`);
    console.log(`Direction: ${baseToken} → ${quoteToken} (${side})`);
    console.log();

    // Amounts
    console.log('💰 Amounts:');
    console.log(`   Input:  ${parseFloat(quote.amountIn).toLocaleString()} ${baseToken}`);
    console.log(`   Output: ${parseFloat(quote.amountOut).toLocaleString()} ${quoteToken}`);
    console.log(`   Min Out: ${parseFloat(quote.amountOutMin).toLocaleString()} ${quoteToken}`);
    console.log();

    // Price information
    if (quote.amountIn && quote.amountOut) {
      const rate = parseFloat(quote.amountOut) / parseFloat(quote.amountIn);
      console.log('📊 Price:');
      console.log(`   Rate: 1 ${baseToken} = ${rate.toFixed(6)} ${quoteToken}`);
      console.log(`   Price Impact: ${quote.priceImpact.toFixed(3)}%`);
      console.log(`   Slippage: ${quote.slippage}%`);
      console.log();
    }

    // Route information
    console.log('🛣️  Route:');
    if (quote.route && Array.isArray(quote.route)) {
      quote.route.forEach((step, index) => {
        console.log(`   ${index + 1}. Pool: ${step.pool.slice(0, 10)}...`);
        console.log(`      ${step.tokenIn.slice(0, 8)}... → ${step.tokenOut.slice(0, 8)}...`);
        console.log(`      Amount: ${parseFloat(step.amountIn).toLocaleString()} → ${parseFloat(step.amountOut).toLocaleString()}`);
        console.log(`      Type: ${step.poolType}`);
        if (index < quote.route.length - 1) {
          console.log('      ↓');
        }
      });
    } else {
      console.log('   Direct swap (single pool)');
    }
    console.log();

    // Fee and gas information
    console.log('⛽ Costs:');
    console.log(`   Gas Estimate: ${quote.gasEstimate} TON`);

    // Calculate estimated USD costs if amounts are reasonable
    if (baseToken === 'TON' || quoteToken === 'TON') {
      const tonAmount = baseToken === 'TON' ? parseFloat(quote.amountIn) : parseFloat(quote.amountOut);
      if (tonAmount > 0) {
        // Rough USD estimate (would need real price feed)
        const estimatedUSD = tonAmount * 2.5; // Placeholder rate
        console.log(`   Est. Value: ~$${estimatedUSD.toFixed(2)} USD`);
      }
    }
    console.log();

    // Quote validity
    const expiryTime = new Date(quote.ttl * 1000);
    const timeLeft = Math.max(0, quote.ttl - Math.floor(Date.now() / 1000));

    console.log('⏰ Quote Validity:');
    console.log(`   Expires: ${expiryTime.toISOString()}`);
    console.log(`   Time Left: ${timeLeft}s`);

    if (timeLeft < 30) {
      console.log('   ⚠️  Quote expires soon!');
    }
    console.log();

    // Warnings based on price impact
    if (quote.priceImpact > 5) {
      console.log('⚠️  WARNING: High price impact (>5%)');
    } else if (quote.priceImpact > 1) {
      console.log('💡 Notice: Moderate price impact (>1%)');
    }

    console.log('═'.repeat(70));
    console.log('✅ Quote generated successfully');
    console.log(`💡 Use quote ID "${quote.quoteId}" to execute this swap`);

  } catch (error) {
    console.error('❌ Error getting swap quote:');

    if (error.code === 'ECONNREFUSED') {
      console.error('   Gateway server is not running on localhost:15888');
      console.error('   Please start the gateway server first');
    } else if (error.response) {
      console.error(`   HTTP ${error.response.status}: ${error.response.statusText}`);
      if (error.response.data && error.response.data.message) {
        console.error(`   ${error.response.data.message}`);
      }
      if (error.response.status === 422) {
        console.error('   This usually means no route was found for this token pair');
      }
    } else {
      console.error(`   ${error.message}`);
    }

    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 4) {
  console.error('❌ Usage: node quote-swap.js <baseToken> <quoteToken> <amount> <side> [network] [slippage]');
  console.error('   Example: node quote-swap.js TON USDT 100 SELL mainnet 1.0');
  console.error('   Example: node quote-swap.js USDT TON 50 BUY mainnet 2.0');
  console.error('');
  console.error('   side: SELL (exact input) or BUY (exact output)');
  process.exit(1);
}

const baseToken = args[0];
const quoteToken = args[1];
const amount = parseFloat(args[2]);
const side = args[3].toUpperCase();
const network = args[4] || DEFAULT_NETWORK;
const slippage = args[5] ? parseFloat(args[5]) : DEFAULT_SLIPPAGE;

// Validation
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

// Run the quote
getSwapQuote(baseToken, quoteToken, amount, side, network, slippage);