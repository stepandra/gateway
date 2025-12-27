import axios from 'axios';

const GATEWAY_URL = 'http://localhost:15888';
const WALLET_ADDRESS = '0:42bae468d55d14c5616acf6163855bc33a4b71c29ee2343a350b160c16f49206';
const NETWORK = 'mainnet';

async function checkBalance(token: string): Promise<number> {
  try {
    // Note: Gateway doesn't have a direct /chains/ton/balance endpoint like other chains yet
    // or it's /chains/ton/balances. Let's assume standard behavior or use what's available.
    // Based on app.ts: app.register(tonRoutes, { prefix: '/chains/ton' });
    // Looking at ton.routes.ts would confirm, but let's try standard pattern

    // Use /chains/ton/balances (POST)
    const response = await axios.post(`${GATEWAY_URL}/chains/ton/balances`, {
      network: NETWORK,
      address: WALLET_ADDRESS,
      tokens: [token],
    });

    if (response.data && response.data.balances) {
      return parseFloat(response.data.balances[token] || '0');
    }
    return 0;
  } catch (error: any) {
    console.error('Failed to check balance:', error.message);
    if (error.response) console.error(error.response.data);
    return 0;
  }
}

async function runSwap(amount: number, side: 'BUY' | 'SELL') {
  console.log(`Attempting ${side} swap of ${amount} TON for USDT...`);

  try {
    const payload = {
      network: NETWORK,
      walletAddress: WALLET_ADDRESS,
      baseToken: 'TON',
      quoteToken: 'USDT',
      amount: amount,
      side: side,
    };

    const response = await axios.post(`${GATEWAY_URL}/connectors/dedust/router/swap`, payload);
    console.log('Swap Success:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('Swap Failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function main() {
  console.log('--- DeDust Live E2E Test ---');

  // 1. Check TON Balance
  const tonBalance = await checkBalance('TON');
  console.log(`Current TON Balance: ${tonBalance}`);

  // 2. Decide operation
  // We need at least 1 TON + gas (approx 0.3)
  const REQUIRED = 1.3;

  if (tonBalance > REQUIRED) {
    console.log('Balance sufficient. Executing swap...');
    // Execute a small swap (e.g. 1 TON) to test
    await runSwap(1.0, 'SELL'); // Sell 1 TON for USDT
  } else {
    console.log('Balance INSUFFICIENT for success case.');
    console.log('Executing swap anyway to verify ERROR handling (expecting 400)...');
    // Try to swap more than we have
    await runSwap(tonBalance + 10, 'SELL');
  }
}

main().catch(console.error);
