import { Address, beginCell, toNano, TonClient, WalletContractV4, internal } from '@ton/core';
import {
  Asset,
  DexFactory,
  PoolType,
  ReadinessStatus,
  VaultJetton,
  VaultNative,
  JettonRoot,
  JettonWallet,
} from '@dedust/sdk';
import { mnemonicToPrivateKey } from '@ton/crypto';

// Configuration
const MAINNET_ENDPOINT = 'https://toncenter.com/api/v2/jsonRPC';
const FACTORY_ADDRESS = Address.parse('EQBfBWT7X2BHg9tXAxzhz2aKiNTU1tpt5NsiK0uSDW_YAJ67'); // Replace with actual DeDust Factory address from docs or config
const SCALE_JETTON_ADDRESS = Address.parse('EQBlqsm144Dq6SjbPI4jjZvA1hqTIP3CvHovbIfW_t-SCALE'); // Example Jetton (SCALE)

// Example mnemonic for demo wallet (REPLACE WITH REAL SECURE WALLET)
const MNEMONIC = 'your wallet mnemonic words here'; // DANGER: Use env var in production!

/**
 * Initializes TonClient and sender wallet.
 * @returns {TonClient, WalletContractV4} Client and sender wallet
 */
async function initializeClientAndSender(): Promise<{ client: TonClient; sender: WalletContractV4 }> {
  const client = new TonClient({
    endpoint: MAINNET_ENDPOINT,
    apiKey: process.env.TONCENTER_API_KEY || '', // From .env
  });

  const keyPair = await mnemonicToPrivateKey(MNEMONIC.split(' '));
  const sender = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  sender.address = await sender.getAddress();

  console.log(`Sender address: ${sender.address.toString()}`);
  return { client, sender };
}

/**
 * Gets pool information (state, reserves, fees, etc.)
 * @param client - TonClient
 * @param factory - DexFactory
 * @param assets - Array of two Assets (e.g., [TON, SCALE])
 * @param poolType - PoolType.VOLATILE or STABLE
 * @returns Pool state info
 */
async function getPoolInformation(
  client: TonClient,
  factory: DexFactory,
  assets: [Asset, Asset],
  poolType: PoolType = PoolType.VOLATILE,
) {
  const pool = client.open(await factory.getPool(poolType, assets));

  // Check if pool is ready
  const readiness = await pool.getReadinessStatus();
  if (readiness !== ReadinessStatus.READY) {
    throw new Error(`Pool is not ready: ${readiness}`);
  }

  // Get pool state (includes reserves, LP supply, fees, etc.)
  const state = await pool.getState();
  console.log('Pool Information:');
  console.log('- Address:', pool.address.toString());
  console.log('- LP Supply:', state.lpSupply.toString());
  console.log('- Asset 0 Reserve:', state.reserves[0].toString());
  console.log('- Asset 1 Reserve:', state.reserves[1].toString());
  console.log('- Fee:', state.fee.toString());
  console.log('- Admin Fee:', state.adminFee.toString());
  console.log('- Reinvest Fee:', state.reinvestFee.toString());

  return state;
}

/**
 * Gets LP position details for a user in a pool.
 * @param client - TonClient
 * @param factory - DexFactory
 * @param userAddress - Address of the user
 * @param assets - Array of two Assets
 * @param poolType - PoolType.VOLATILE or STABLE
 * @returns LP balance and share of pool
 */
async function getLPPositionDetails(
  client: TonClient,
  factory: DexFactory,
  userAddress: Address,
  assets: [Asset, Asset],
  poolType: PoolType = PoolType.VOLATILE,
) {
  const pool = client.open(await factory.getPool(poolType, assets));
  const lpWallet = client.open(await pool.getWallet(userAddress));

  const lpBalance = await lpWallet.getBalance();
  const poolState = await pool.getState();

  const lpShare = poolState.lpSupply > 0n ? (lpBalance * 100n) / poolState.lpSupply : 0n; // Percentage share

  console.log('LP Position Details:');
  console.log('- User Address:', userAddress.toString());
  console.log('- LP Balance:', lpBalance.toString());
  console.log('- Pool LP Supply:', poolState.lpSupply.toString());
  console.log('- User LP Share (%):', lpShare.toString() + '%');

  // Optional: Calculate approximate value in assets (simplified)
  if (poolState.lpSupply > 0n) {
    const share0 = (poolState.reserves[0] * lpBalance) / poolState.lpSupply;
    const share1 = (poolState.reserves[1] * lpBalance) / poolState.lpSupply;
    console.log('- Approximate Share Asset 0:', share0.toString());
    console.log('- Approximate Share Asset 1:', share1.toString());
  }

  return { lpBalance, poolState, lpShare };
}

/**
 * Adds liquidity to a pool (deposit to both vaults).
 * WARNING: This sends real transactions! Use testnet or small amounts.
 * @param client - TonClient
 * @param factory - DexFactory
 * @param sender - WalletContractV4
 * @param assets - Array of two Assets (e.g., [TON, SCALE])
 * @param amounts - [Amount for asset 0, Amount for asset 1] in nano/atomic units
 * @param poolType - PoolType.VOLATILE or STABLE
 */
async function addLiquidity(
  client: TonClient,
  factory: DexFactory,
  sender: WalletContractV4,
  assets: [Asset, Asset],
  amounts: [bigint, bigint],
  poolType: PoolType = PoolType.VOLATILE,
) {
  const tonVault = client.open<VaultNative>(await factory.getNativeVault());
  const jettonVault = client.open(await factory.getJettonVault(assets[1].address!)); // Assuming asset 1 is Jetton

  // Check readiness
  if ((await tonVault.getReadinessStatus()) !== ReadinessStatus.READY) {
    throw new Error('TON Vault not ready');
  }
  if ((await jettonVault.getReadinessStatus()) !== ReadinessStatus.READY) {
    throw new Error('Jetton Vault not ready');
  }

  // Step 1: Deposit native (TON) to Vault
  await tonVault.sendDepositLiquidity(sender, {
    poolType,
    assets,
    targetBalances: amounts,
    amount: amounts[0], // TON amount
  });

  // Step 2: Deposit Jetton to Vault (transfer from user's Jetton wallet)
  const jettonRoot = client.open(JettonRoot.createFromAddress(assets[1].address!));
  const userJettonWallet = client.open(await jettonRoot.getWallet(sender.address));

  const transferPayload = beginCell()
    .storeUint(0xf8a7ea5, 32) // transfer op
    .storeCoins(amounts[1])
    .storeAddress(jettonVault.address)
    .storeAddress(sender.address) // response destination
    .storeRef(VaultJetton.createDepositLiquidityPayload({ poolType, assets, targetBalances: amounts }))
    .endCell();

  await userJettonWallet.sendTransfer(sender, toNano('0.05'), {
    // Small fee for transfer
    amount: amounts[1],
    destination: jettonVault.address,
    responseDestination: sender.address,
    forwardTonAmount: toNano('0.04'),
    forwardPayload: transferPayload,
  });

  console.log('Liquidity added successfully. LP tokens will be minted after both deposits are processed.');
}

/**
 * Removes liquidity from a pool (burn LP tokens).
 * WARNING: This sends real transactions! Use testnet or small amounts.
 * @param client - TonClient
 * @param factory - DexFactory
 * @param sender - WalletContractV4
 * @param assets - Array of two Assets
 * @param lpAmount - Amount of LP tokens to burn
 * @param poolType - PoolType.VOLATILE or STABLE
 */
async function removeLiquidity(
  client: TonClient,
  factory: DexFactory,
  sender: WalletContractV4,
  assets: [Asset, Asset],
  lpAmount: bigint,
  poolType: PoolType = PoolType.VOLATILE,
) {
  const pool = client.open(await factory.getPool(poolType, assets));
  const lpWallet = client.open(await pool.getWallet(sender.address));

  // Check LP balance
  const currentBalance = await lpWallet.getBalance();
  if (currentBalance < lpAmount) {
    throw new Error(`Insufficient LP balance: ${currentBalance} < ${lpAmount}`);
  }

  // Burn LP tokens to remove liquidity
  await lpWallet.sendBurn(sender, toNano('0.05'), {
    amount: lpAmount,
    responseDestination: sender.address,
  });

  console.log(`Liquidity removal initiated: Burning ${lpAmount} LP tokens. Assets will be returned after processing.`);
}

// Demo/Main function
async function main() {
  const { client, sender } = await initializeClientAndSender();

  try {
    // Initialize Factory
    const factory = client.open(DexFactory.createFromAddress(FACTORY_ADDRESS));

    // Define assets: TON (native) and SCALE (Jetton)
    const TON = Asset.native();
    const SCALE = Asset.jetton(SCALE_JETTON_ADDRESS);
    const assets: [Asset, Asset] = [TON, SCALE];

    // Example amounts (in nano/atomic units) - ADJUST FOR REAL USE
    const exampleAmounts: [bigint, bigint] = [toNano('1'), toNano('100')]; // 1 TON and 100 SCALE (example)
    const exampleLpAmount = toNano('10'); // Example LP to remove

    // 1. Get Pool Information
    await getPoolInformation(client, factory, assets);

    // 2. Get LP Position Details (for sender)
    await getLPPositionDetails(client, factory, sender.address, assets);

    // 3. Add Liquidity (COMMENT OUT FOR SAFETY - SENDS TX!)
    // await addLiquidity(client, factory, sender, assets, exampleAmounts);

    // 4. Remove Liquidity (COMMENT OUT FOR SAFETY - SENDS TX!)
    // await removeLiquidity(client, factory, sender, assets, exampleLpAmount);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { initializeClientAndSender, getPoolInformation, getLPPositionDetails, addLiquidity, removeLiquidity };
