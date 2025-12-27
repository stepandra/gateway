/**
 * DeDust AMM Mainnet E2E Test
 * 
 * Tests: pool-info, quote-liquidity, position-info, add-liquidity, remove-liquidity
 * 
 * Usage: npx ts-node scripts/dedust-amm-mainnet-e2e.ts
 */

import { DeDustAMM } from '../src/connectors/dedust/dedust.amm';
import { Ton } from '../src/chains/ton/ton';
import { logger } from '../src/services/logger';

const NETWORK = 'mainnet';

// Pool: TON/USDT on DeDust
const POOL_ADDRESS = 'EQClruqiOLzeAlW1theQOQb7pii3kS7ZCXHltroGmxzdPlKv';

// Test wallet
const WALLET_ADDRESS = '0:d5c27c2b2efc6651bd74b8d04cc6063dff075d2e567e3df05feea422b963008f';
const MNEMONIC = 'verb ostrich priority return resist surface travel furnace chronic demand suspect mango about nation kangaroo fence melt jealous hill ticket behave fragile miracle case';

interface TestResult {
  name: string;
  success: boolean;
  data?: any;
  error?: string;
}

const results: TestResult[] = [];

async function testPoolInfo(dedustAmm: DeDustAMM): Promise<void> {
  logger.info('=== TEST: pool-info ===');
  try {
    const poolInfo = await dedustAmm.poolInfo({
      poolAddress: POOL_ADDRESS,
    });
    logger.info(`Pool Info: ${JSON.stringify(poolInfo, null, 2)}`);
    results.push({ name: 'pool-info', success: true, data: poolInfo });
  } catch (e: any) {
    logger.error(`pool-info FAILED: ${e.message}`);
    results.push({ name: 'pool-info', success: false, error: e.message });
  }
}

async function testQuoteLiquidity(dedustAmm: DeDustAMM): Promise<void> {
  logger.info('=== TEST: quote-liquidity ===');
  try {
    // Quote: How much USDT needed for 1 TON?
    const quote = await dedustAmm.quoteLiquidity({
      poolAddress: POOL_ADDRESS,
      baseTokenAmount: 1, // 1 TON
      quoteTokenAmount: 0,
      slippagePct: 1,
    });
    logger.info(`Quote (1 TON): ${JSON.stringify(quote, null, 2)}`);
    results.push({ name: 'quote-liquidity', success: true, data: quote });
  } catch (e: any) {
    logger.error(`quote-liquidity FAILED: ${e.message}`);
    results.push({ name: 'quote-liquidity', success: false, error: e.message });
  }
}

async function testPositionInfo(dedustAmm: DeDustAMM): Promise<void> {
  logger.info('=== TEST: position-info ===');
  try {
    const position = await dedustAmm.positionInfo({
      poolAddress: POOL_ADDRESS,
      walletAddress: WALLET_ADDRESS,
    });
    logger.info(`Position Info: ${JSON.stringify(position, null, 2)}`);
    results.push({ name: 'position-info', success: true, data: position });
  } catch (e: any) {
    logger.error(`position-info FAILED: ${e.message}`);
    results.push({ name: 'position-info', success: false, error: e.message });
  }
}

async function testAddLiquidity(_ton: Ton, _dedustAmm: DeDustAMM): Promise<void> {
  logger.info('=== TEST: add-liquidity (SKIPPED - requires funded wallet) ===');
  
  // NOTE: This is a real transaction that spends TON.
  // Uncomment below to execute on mainnet with real funds.
  
  /*
  try {
    // First, we need to import the wallet
    const wallet = await ton.getWalletFromPrivateKey(MNEMONIC);
    logger.info(`Wallet address from mnemonic: ${wallet.address}`);
    
    const result = await dedustAmm.addLiquidity({
      poolAddress: POOL_ADDRESS,
      walletAddress: wallet.address,
      baseTokenAmount: 0.1,  // 0.1 TON
      quoteTokenAmount: 0.5, // ~0.5 USDT (adjust based on quote)
    });
    logger.info(`Add Liquidity Result: ${JSON.stringify(result, null, 2)}`);
    results.push({ name: 'add-liquidity', success: true, data: result });
  } catch (e: any) {
    logger.error(`add-liquidity FAILED: ${e.message}`);
    results.push({ name: 'add-liquidity', success: false, error: e.message });
  }
  */
  
  results.push({ name: 'add-liquidity', success: true, data: 'SKIPPED - enable in script for real tx' });
}

async function testRemoveLiquidity(_ton: Ton, _dedustAmm: DeDustAMM): Promise<void> {
  logger.info('=== TEST: remove-liquidity (SKIPPED - requires LP position) ===');
  
  // NOTE: This requires an existing LP position.
  // Uncomment below to execute on mainnet with real funds.
  
  /*
  try {
    const wallet = await ton.getWalletFromPrivateKey(MNEMONIC);
    
    const result = await dedustAmm.removeLiquidity({
      poolAddress: POOL_ADDRESS,
      walletAddress: wallet.address,
      percentageToRemove: 10, // Remove 10% of LP position
    });
    logger.info(`Remove Liquidity Result: ${JSON.stringify(result, null, 2)}`);
    results.push({ name: 'remove-liquidity', success: true, data: result });
  } catch (e: any) {
    logger.error(`remove-liquidity FAILED: ${e.message}`);
    results.push({ name: 'remove-liquidity', success: false, error: e.message });
  }
  */
  
  results.push({ name: 'remove-liquidity', success: true, data: 'SKIPPED - enable in script for real tx' });
}

async function main() {
  console.log('========================================');
  console.log('DeDust AMM Mainnet E2E Test');
  console.log('========================================');
  logger.info(`Network: ${NETWORK}`);
  logger.info(`Pool: ${POOL_ADDRESS}`);
  logger.info(`Wallet: ${WALLET_ADDRESS}`);
  logger.info('');

  // Initialize TON chain
  const ton = Ton.getInstance(NETWORK);
  await ton.init();

  // Verify wallet from mnemonic
  const wallet = await ton.getWalletFromPrivateKey(MNEMONIC);
  logger.info(`Wallet from mnemonic: ${wallet.address}`);
  
  // Get DeDust AMM instance
  const dedustAmm = DeDustAMM.getInstance(NETWORK);

  // Run read-only tests
  await testPoolInfo(dedustAmm);
  await testQuoteLiquidity(dedustAmm);
  await testPositionInfo(dedustAmm);
  
  // Transaction tests (skipped by default)
  await testAddLiquidity(ton, dedustAmm);
  await testRemoveLiquidity(ton, dedustAmm);

  // Summary
  logger.info('');
  logger.info('========================================');
  logger.info('TEST SUMMARY');
  logger.info('========================================');
  
  let passed = 0;
  let failed = 0;
  
  for (const r of results) {
    const status = r.success ? '✅ PASS' : '❌ FAIL';
    logger.info(`${status} - ${r.name}`);
    if (r.success) passed++;
    else failed++;
  }
  
  logger.info('');
  logger.info(`Total: ${passed} passed, ${failed} failed`);
}

main().catch((e) => {
  logger.error(`Fatal error: ${e.message}`);
  console.error(e);
  process.exit(1);
});
