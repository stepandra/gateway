#!/usr/bin/env node

/**
 * DeDust AMM Add Liquidity CLI Tool
 *
 * Usage: node scripts/cli/dedust/add-liquidity.js <walletAddress> <baseToken> <quoteToken> <baseAmount> <quoteAmount> [poolType] [network] [slippage]
 * Example: node scripts/cli/dedust/add-liquidity.js EQA... TON USDT 100 250 volatile mainnet 1.0
 */

const axios = require('axios');

const DEFAULT_NETWORK = 'mainnet';
const DEFAULT_POOL_TYPE = 'volatile';
const DEFAULT_SLIPPAGE = 1.0;
const GATEWAY_BASE_URL = 'http://localhost:15888';

async function addLiquidity(walletAddress, baseToken, quoteToken, baseAmount, quoteAmount, poolType = DEFAULT_POOL_TYPE, network = DEFAULT_NETWORK, slippage = DEFAULT_SLIPPAGE) {
  try {
    console.log(`💧 Adding liquidity to ${baseToken}/${quoteToken} pool`);
    console.log(`   Wallet: ${walletAddress.slice(0, 8)}...`);
    console.log(`   Amounts: ${baseAmount} ${baseToken} + ${quoteAmount} ${quoteToken}`);

    // First, get a liquidity quote
    console.log('\n📊 Getting liquidity quote...');

    const quoteBody = {
      network,
      baseToken,
      quoteToken,
      operation: 'add',
      baseAmount: baseAmount.toString(),
      quoteAmount: quoteAmount.toString(),
      poolType
    };

    const quoteResponse = await axios.post(
      `${GATEWAY_BASE_URL}/connectors/dedust/amm/liquidityQuote`,
      quoteBody,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    const quote = quoteResponse.data;

    console.log('\n💱 Liquidity Quote:');
    console.log('─'.repeat(50));
    console.log(`Pool: ${quote.poolAddress.slice(0, 10)}...`);
    console.log(`Base Required:  ${parseFloat(quote.baseTokenRequired).toLocaleString()} ${baseToken}`);
    console.log(`Quote Required: ${parseFloat(quote.quoteTokenRequired).toLocaleString()} ${quoteToken}`);
    console.log(`LP Tokens:      ${parseFloat(quote.lpTokensToReceive).toLocaleString()}`);
    console.log(`Pool Share:     ${quote.poolShare ? quote.poolShare.toFixed(4) : 'N/A'}%`);
    console.log(`Price Impact:   ${quote.priceImpact.toFixed(3)}%`);
    console.log(`Gas Estimate:   ${quote.gasEstimate} TON`);

    // Check if amounts need adjustment
    const requiredBase = parseFloat(quote.baseTokenRequired);
    const requiredQuote = parseFloat(quote.quoteTokenRequired);
    const providedBase = parseFloat(baseAmount);
    const providedQuote = parseFloat(quoteAmount);

    if (Math.abs(requiredBase - providedBase) > 0.01 || Math.abs(requiredQuote - providedQuote) > 0.01) {
      console.log('\n⚠️  Note: Pool ratio requires different amounts than provided');
      console.log('   The transaction will use the optimal amounts shown above');
    }

    // Warning for high price impact
    if (quote.priceImpact > 5) {
      console.log('\n⚠️  WARNING: High price impact (>5%)');
      console.log('   Consider adding liquidity in smaller amounts');
    }

    // Execute the liquidity addition
    console.log('\n🚀 Executing liquidity addition...');

    const executeBody = {
      network,
      walletAddress,
      baseToken,
      quoteToken,
      baseAmount: baseAmount.toString(),
      quoteAmount: quoteAmount.toString(),
      slippage,
      poolType
    };

    const executeResponse = await axios.post(
      `${GATEWAY_BASE_URL}/connectors/dedust/amm/addLiquidity`,
      executeBody,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000 // Longer timeout for transaction execution
      }
    );

    const result = executeResponse.data;

    console.log('\n🎉 Liquidity Added Successfully!');
    console.log('═'.repeat(70));
    console.log(`Transaction Hash: ${result.txHash}`);
    console.log(`Nonce: ${result.nonce}`);
    console.log();

    // Liquidity details
    console.log('💧 Liquidity Details:');
    console.log(`   ${baseToken} Added:     ${parseFloat(result.baseAmountAdded).toLocaleString()}`);
    console.log(`   ${quoteToken} Added:    ${parseFloat(result.quoteAmountAdded).toLocaleString()}`);
    console.log(`   LP Tokens Received: ${parseFloat(result.lpTokensReceived).toLocaleString()}`);
    console.log(`   Price Impact:       ${result.actualPriceImpact.toFixed(3)}%`);
    console.log();

    // Transaction costs
    console.log('⛽ Transaction Costs:');
    console.log(`   Gas Used: ${result.gasUsed}`);
    console.log(`   Gas Cost: ${result.gasCost} TON`);
    console.log();

    // Pool information
    console.log('🏊 Pool Information:');
    console.log(`   Pool Address: ${result.poolAddress}`);
    console.log(`   Pool Type: ${result.poolType}`);
    console.log(`   Added At: ${new Date(result.addedAt * 1000).toISOString()}`);
    console.log();

    // Position value estimation
    const lpTokens = parseFloat(result.lpTokensReceived);
    if (lpTokens > 0) {
      console.log('📈 Position Value:');
      console.log(`   LP Tokens: ${lpTokens.toLocaleString()}`);

      // Estimate position value (simplified)
      const baseValue = parseFloat(result.baseAmountAdded);
      const quoteValue = parseFloat(result.quoteAmountAdded);

      if (baseToken === 'TON') {
        const estimatedUSD = baseValue * 2.5; // Placeholder TON price
        console.log(`   Est. Value: ~$${estimatedUSD.toFixed(2)} USD`);
      } else if (quoteToken === 'TON') {
        const estimatedUSD = quoteValue * 2.5; // Placeholder TON price
        console.log(`   Est. Value: ~$${estimatedUSD.toFixed(2)} USD`);
      }
    }

    // Transaction explorer link
    const explorerUrl = network === 'mainnet' ?
      `https://tonapi.io/transaction/${result.txHash}` :
      `https://testnet.tonapi.io/transaction/${result.txHash}`;

    console.log('🔍 Transaction Details:');
    console.log(`   Explorer: ${explorerUrl}`);
    console.log();

    // Next steps
    console.log('✅ Next Steps:');
    console.log('   1. Wait for transaction confirmation (~30 seconds)');
    console.log('   2. Check your LP token balance');
    console.log('   3. Monitor your position for fee earnings');
    console.log('   4. Consider setting up position tracking');

    console.log('═'.repeat(70));
    console.log('🎊 Liquidity added successfully!');

  } catch (error) {
    console.error('❌ Error adding liquidity:');

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
        console.error('   Pool not found for this token pair');
      } else if (error.response.status === 422) {
        console.error('   Transaction failed - check your balance and parameters');
      }
    } else {
      console.error(`   ${error.message}`);
    }

    console.error('\n💡 Troubleshooting:');
    console.error('   - Ensure you have sufficient token balances');
    console.error('   - Check that the pool exists for this token pair');
    console.error('   - Verify wallet address format');
    console.error('   - Try with higher slippage tolerance');
    console.error('   - Make sure amounts are reasonable for the pool size');

    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 5) {
  console.error('❌ Usage: node add-liquidity.js <walletAddress> <baseToken> <quoteToken> <baseAmount> <quoteAmount> [poolType] [network] [slippage]');
  console.error('   Example: node add-liquidity.js EQA... TON USDT 100 250 volatile mainnet 1.0');
  console.error('');
  console.error('   poolType: volatile (default) or stable');
  process.exit(1);
}

const walletAddress = args[0];
const baseToken = args[1];
const quoteToken = args[2];
const baseAmount = parseFloat(args[3]);
const quoteAmount = parseFloat(args[4]);
const poolType = args[5] || DEFAULT_POOL_TYPE;
const network = args[6] || DEFAULT_NETWORK;
const slippage = args[7] ? parseFloat(args[7]) : DEFAULT_SLIPPAGE;

// Validation
if (!walletAddress.match(/^(EQ|UQ)[A-Za-z0-9_-]{46}$|^[A-Za-z0-9_-]{48}$/)) {
  console.error('❌ Invalid TON address format');
  process.exit(1);
}

if (isNaN(baseAmount) || baseAmount <= 0) {
  console.error('❌ Base amount must be a positive number');
  process.exit(1);
}

if (isNaN(quoteAmount) || quoteAmount <= 0) {
  console.error('❌ Quote amount must be a positive number');
  process.exit(1);
}

if (!['volatile', 'stable'].includes(poolType)) {
  console.error('❌ Pool type must be "volatile" or "stable"');
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
  console.log('⚠️  WARNING: You are about to add liquidity on MAINNET');
  console.log('   This will spend real TON/tokens from your wallet');
  console.log('   Double-check all parameters before proceeding');
  console.log();
}

// Run the liquidity addition
addLiquidity(walletAddress, baseToken, quoteToken, baseAmount, quoteAmount, poolType, network, slippage);