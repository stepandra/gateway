import { Address, beginCell, Cell, Contract, ContractProvider, Sender, toNano } from '@ton/core';

import { DeDustAsset } from '../dedust.utils';

// Opcodes
const OP_PAY_NATIVE = 0xa5a7cbf8;
const OP_PAY_JETTON = 0xcbc33949;
const OP_DEPOSIT = 0xc9a015da;
const OP_WITHDRAW = 0x20b5ef89;
const OP_CLAIM_FEES = 0x5652f1df;

export class DeDustPoolContract implements Contract {
  constructor(readonly address: Address) {}

  // --- Payload Builders ---

  createDepositLiquidityPayload(params: {
    amountA: bigint;
    amountB: bigint;
    minLiquidity?: bigint;
    queryId?: bigint;
  }): Cell {
    // Deposit Payload (Payment Payload)
    const depositBody = beginCell()
      .storeUint(OP_DEPOSIT, 32)
      .storeCoins(params.amountA)
      .storeCoins(params.amountB)
      .storeCoins(params.minLiquidity ?? 0n)
      .storeUint(0, 16) // locked_liquidity_share (0)
      .endCell();

    // For PayNative (assuming TON is one side, or just wrapping the deposit op)
    // Actually, PayNative is used when sending TON to the pool.
    // If we are just building the *body* for a transaction, we need to know if it's Native or Jetton transfer.
    // But this method likely returns the inner payload that goes into `payment_payload` of PayNative/Jetton.

    // Let's assume we are building the `PayNative` body for now, which wraps the `Deposit` payload.
    // NOTE: In DeDust v3, to deposit, you send `PayNative` (if TON) or `PayJetton` (transfer notification)
    // with `Deposit` as the `payment_payload`.

    // Default Payout Config (send everything back to sender)
    // PayoutOptions: dest(00-none/sender), extra_gas(0), payload(0), wrap(0)
    const payoutOptions = beginCell()
      .storeUint(0, 1) // dest: 0 (sender) / or specific address? 0 usually means "use sender" or "none" in some contexts, but TLB says MsgAddress.
      // TLB: destination:MsgAddress extra_gas:Coins payload:(Maybe ^Cell) wrap_payload:Bool = PayoutOptions;
      // If destination is addr_none (00), it might default to sender in contract logic?
      // Reference `Pool.ts`: `withdrawTo ?? null` -> `null` usually serializes to `addr_none` (b.storeUint(0, 2))
      .storeUint(0, 2) // addr_none
      .storeCoins(0n) // extra_gas
      .storeMaybeRef(null) // payload
      .storeBit(false) // wrap_payload
      .endCell();

    // ExtendedPayoutConfig: fulfill, reject, excesses
    const payoutConfig = beginCell()
      .storeSlice(payoutOptions.beginParse()) // fulfill
      .storeSlice(payoutOptions.beginParse()) // reject
      .storeUint(0, 2) // excesses_to (addr_none -> sender)
      .endCell();

    return (
      beginCell()
        .storeUint(OP_PAY_NATIVE, 32)
        .storeUint(params.queryId ?? 0n, 64)
        .storeCoins(params.amountA) // amount to credit? This should be the TON amount sent?
        // Wait, PayNative has `amount`. This is the amount of TON being paid/credited to the pool.
        // If we are depositing, we are paying `amountA`.
        .storeRef(depositBody)
        .storeRef(payoutConfig)
        .endCell()
    );
  }

  createWithdrawPayload(params: {
    amount: bigint; // LP tokens to burn
    targetAddress?: Address;
    minAmountA?: bigint;
    minAmountB?: bigint;
    queryId?: bigint;
  }): Cell {
    // BasicPayoutConfig: options, excesses_to
    const payoutOptions = beginCell()
      .storeAddress(params.targetAddress ?? null) // destination
      .storeCoins(0n) // extra_gas
      .storeMaybeRef(null) // payload
      .storeBit(false) // wrap_payload
      .endCell();

    const payoutConfig = beginCell()
      .storeSlice(payoutOptions.beginParse()) // options
      .storeAddress(null) // excesses_to
      .endCell();

    return beginCell()
      .storeUint(OP_WITHDRAW, 32)
      .storeUint(params.queryId ?? 0n, 64)
      .storeCoins(params.amount)
      .storeCoins(params.minAmountA ?? 0n)
      .storeCoins(params.minAmountB ?? 0n)
      .storeBit(true) // auto_claim_fees (Defaulting to true as it's usually desired)
      .storeRef(payoutConfig)
      .endCell();
  }

  createClaimFeesPayload(
    params: {
      queryId?: bigint;
      excessesTo?: Address;
    } = {},
  ): Cell {
    return beginCell()
      .storeUint(OP_CLAIM_FEES, 32)
      .storeUint(params.queryId ?? 0n, 64)
      .storeAddress(params.excessesTo ?? null)
      .endCell();
  }

  // --- Get Methods ---

  async getPoolData(provider: ContractProvider) {
    const { stack } = await provider.get('get_pool_data', []);

    // DeDust CPMM v3 pool_data structure (from ex/cpmm_v3_sdk/Pool.ts getData):
    // [0] status: int
    // [1] depositActive: bool
    // [2] swapActive: bool
    // [3] assetX: cell (Asset)
    // [4] assetY: cell (Asset)
    // [5] walletsByAsset: cell (dict)
    // [6] assetsByWallets: cell (dict)
    // [7] resolutions: cell (dict) - may come as list in API
    // [8] baseFeeBps: int
    // [9] reserveX: int
    // [10] reserveY: int
    // [11] liquidity: int
    // [12..] more fee fields

    const status = stack.readNumber();
    const depositActive = stack.readBoolean();
    const swapActive = stack.readBoolean();

    const assetX = DeDustAsset.fromCell(stack.readCell());
    const assetY = DeDustAsset.fromCell(stack.readCell());

    // Skip dictionaries: walletsByAsset, assetsByWallets, resolutions
    stack.readCellOpt(); // walletsByAsset
    stack.readCellOpt(); // assetsByWallets
    stack.readCellOpt(); // resolutions (may be null/list)

    const baseFeeBps = stack.readNumber();
    const reserveX = stack.readBigNumber();
    const reserveY = stack.readBigNumber();
    const liquidity = stack.readBigNumber();

    return {
      status,
      depositActive,
      swapActive,
      assetX,
      assetY,
      baseFeeBps,
      reserveX,
      reserveY,
      liquidity,
    };
  }
}
