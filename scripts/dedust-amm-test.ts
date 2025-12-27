import { DeDustAMM } from '../src/connectors/dedust/dedust.amm';
import { Ton } from '../src/chains/ton/ton';
import { logger } from '../src/services/logger';

async function testDeDustAMM() {
  const network = 'mainnet';
  const ton = Ton.getInstance(network);
  await ton.init();

  const dedustAmm = DeDustAMM.getInstance(network);

  const POOL_TON_USDT = 'EQA-X_yo3fzzbDbJ_0bzFWKqtRuZFIRa1sJsveZJ1YpViO3r';

  logger.info('--- Testing DeDust AMM Pool Info ---');
  try {
    const poolInfo = await dedustAmm.poolInfo({
      poolAddress: POOL_TON_USDT,
    });
    logger.info(`Pool Info: ${JSON.stringify(poolInfo, null, 2)}`);
  } catch (e) {
    logger.error(`Pool Info Error: ${e}`);
  }

  logger.info('--- Testing DeDust AMM Liquidity Quote ---');
  try {
    const quote = await dedustAmm.quoteLiquidity({
      poolAddress: POOL_TON_USDT,
      baseTokenAmount: 1, // 1 TON
      quoteTokenAmount: 0,
    });
    logger.info(`Liquidity Quote (1 TON): ${JSON.stringify(quote, null, 2)}`);
  } catch (e) {
    logger.error(`Quote Error: ${e}`);
  }

  // Position info requires a wallet address.
  // Using a known burner/large wallet for read-only test if possible, or just log.
  const SAMPLE_WALLET = 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ'; 
  logger.info(`--- Testing DeDust AMM Position Info for ${SAMPLE_WALLET} ---`);
  try {
    const position = await dedustAmm.positionInfo({
      poolAddress: POOL_TON_USDT,
      walletAddress: SAMPLE_WALLET,
    });
    logger.info(`Position Info: ${JSON.stringify(position, null, 2)}`);
  } catch (e) {
    logger.error(`Position Info Error: ${e}`);
  }
}

testDeDustAMM().catch(console.error);
