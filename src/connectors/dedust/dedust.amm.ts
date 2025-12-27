import { Ton } from '../../chains/ton/ton';
import { DeDustConfig, getDeDustConfig } from './dedust.config';
import { AddLiquidityRequestType, AddLiquidityResponseType, GetPoolInfoRequestType, GetPositionInfoRequestType, PoolInfo, PositionInfo, QuoteLiquidityRequestType, QuoteLiquidityResponseType, RemoveLiquidityRequestType, RemoveLiquidityResponseType } from '../../schemas/amm-schema';
import { DeDustPoolContract } from './contracts/pool';
import { Address, Cell, beginCell, internal, toNano } from '@ton/core';
import { formatUnits, parseUnits } from '../../chains/ton/ton.utils';
import { httpErrors } from '../../services/error-handler';

export class DeDustAMM {
  private static _instances: { [name: string]: DeDustAMM } = {};
  public chain: Ton;
  public config: DeDustConfig;

  private constructor(network: string) {
    this.chain = Ton.getInstance(network);
    this.config = getDeDustConfig(network);
  }

  public static getInstance(network: string): DeDustAMM {
    if (DeDustAMM._instances[network] === undefined) {
      DeDustAMM._instances[network] = new DeDustAMM(network);
    }
    return DeDustAMM._instances[network];
  }

  async poolInfo(request: GetPoolInfoRequestType): Promise<PoolInfo> {
    const poolAddress = Address.parse(request.poolAddress);
    const contract = new DeDustPoolContract(poolAddress);
    const poolData = await contract.getPoolData(
      this.chain.rpcProvider.getProvider(poolAddress),
    );

    const assetX = poolData.assetX;
    const assetY = poolData.assetY;

    const decimalsX = this.getTokenDecimals(assetX.toAddressString());
    const decimalsY = this.getTokenDecimals(assetY.toAddressString());

    const reserveX = Number(formatUnits(poolData.reserveX, decimalsX));
    const reserveY = Number(formatUnits(poolData.reserveY, decimalsY));

    return {
      address: request.poolAddress,
      baseTokenAddress: assetX.toAddressString(),
      quoteTokenAddress: assetY.toAddressString(),
      feePct: poolData.baseFeeBps / 100,
      price: reserveX > 0 ? reserveY / reserveX : 0,
      baseTokenAmount: reserveX,
      quoteTokenAmount: reserveY,
    };
  }

  async positionInfo(request: GetPositionInfoRequestType): Promise<PositionInfo> {
    if (!request.walletAddress) {
      throw httpErrors.badRequest('walletAddress is required for positionInfo');
    }

    const poolAddress = Address.parse(request.poolAddress);
    const ownerAddress = Address.parse(request.walletAddress);
    const poolProvider = this.chain.rpcProvider.getProvider(poolAddress);
    
    const poolContract = new DeDustPoolContract(poolAddress);
    const poolData = await poolContract.getPoolData(poolProvider);

    const assetX = poolData.assetX;
    const assetY = poolData.assetY;

    const decimalsX = this.getTokenDecimals(assetX.toAddressString());
    const decimalsY = this.getTokenDecimals(assetY.toAddressString());

    // CPMM v3: Get position address via pool.get_position_address
    let userLiquidity = 0n;
    try {
      const { stack: posAddrStack } = await poolProvider.get('get_position_address', [
        { type: 'slice', cell: beginCell().storeAddress(ownerAddress).endCell() },
      ]);
      const positionAddress = posAddrStack.readAddress();
      
      // Get position data
      const posProvider = this.chain.rpcProvider.getProvider(positionAddress);
      const { stack: posDataStack } = await posProvider.get('get_position_data', []);
      
      posDataStack.readAddress(); // poolAddress
      posDataStack.readAddress(); // ownerAddress
      userLiquidity = posDataStack.readBigNumber(); // liquidity
    } catch (e: any) {
      // Position doesn't exist or contract not deployed - user has no LP
      userLiquidity = 0n;
    }

    const lpAmount = Number(formatUnits(userLiquidity, 9));
    const totalLiquidity = Number(formatUnits(poolData.liquidity, 9));

    const share = totalLiquidity > 0 ? lpAmount / totalLiquidity : 0;

    const reserveX = Number(formatUnits(poolData.reserveX, decimalsX));
    const reserveY = Number(formatUnits(poolData.reserveY, decimalsY));

    return {
      poolAddress: request.poolAddress,
      walletAddress: request.walletAddress,
      baseTokenAddress: assetX.toAddressString(),
      quoteTokenAddress: assetY.toAddressString(),
      lpTokenAmount: lpAmount,
      baseTokenAmount: reserveX * share,
      quoteTokenAmount: reserveY * share,
      price: reserveX > 0 ? reserveY / reserveX : 0,
    };
  }

  async quoteLiquidity(request: QuoteLiquidityRequestType): Promise<QuoteLiquidityResponseType> {
    const poolAddress = Address.parse(request.poolAddress);
    const contract = new DeDustPoolContract(poolAddress);
    const poolData = await contract.getPoolData(
      this.chain.rpcProvider.getProvider(poolAddress),
    );

    const assetX = poolData.assetX;
    const assetY = poolData.assetY;

    const decimalsX = this.getTokenDecimals(assetX.toAddressString());
    const decimalsY = this.getTokenDecimals(assetY.toAddressString());

    const reserveX = Number(formatUnits(poolData.reserveX, decimalsX));
    const reserveY = Number(formatUnits(poolData.reserveY, decimalsY));

    let baseTokenAmount = request.baseTokenAmount;
    let quoteTokenAmount = request.quoteTokenAmount;
    let baseLimited = true;

    if (baseTokenAmount > 0 && reserveX > 0) {
      quoteTokenAmount = (baseTokenAmount * reserveY) / reserveX;
      baseLimited = true;
    } else if (quoteTokenAmount > 0 && reserveY > 0) {
      baseTokenAmount = (quoteTokenAmount * reserveX) / reserveY;
      baseLimited = false;
    }

    return {
      baseLimited,
      baseTokenAmount,
      quoteTokenAmount,
      baseTokenAmountMax: baseTokenAmount * (1 + (request.slippagePct || 0) / 100),
      quoteTokenAmountMax: quoteTokenAmount * (1 + (request.slippagePct || 0) / 100),
    };
  }

  async addLiquidity(request: AddLiquidityRequestType): Promise<AddLiquidityResponseType> {
    if (!request.walletAddress) {
      throw httpErrors.badRequest('walletAddress is required');
    }

    const poolAddress = Address.parse(request.poolAddress);
    const contract = new DeDustPoolContract(poolAddress);
    const poolData = await contract.getPoolData(
      this.chain.rpcProvider.getProvider(poolAddress),
    );

    const assetX = poolData.assetX;
    const assetY = poolData.assetY;

    const decimalsX = this.getTokenDecimals(assetX.toAddressString());
    const decimalsY = this.getTokenDecimals(assetY.toAddressString());

    const amountX = parseUnits(request.baseTokenAmount, decimalsX);
    const amountY = parseUnits(request.quoteTokenAmount, decimalsY);

    const poolContract = new DeDustPoolContract(poolAddress);
    const depositPayload = beginCell()
      .storeUint(0xc9a015da, 32) // op::deposit
      .storeCoins(amountX)
      .storeCoins(amountY)
      .storeCoins(0n) // minimal_liquidity
      .storeUint(0, 16) // locked_liquidity_share
      .endCell();

    // In DeDust v3, you can deposit by sending one of the assets.
    // For simplicity, we'll implement sending Asset X.
    // If it's Native TON, we use pay_native. If Jetton, we use transfer with pay_jetton payload.

    const wallet = await this.chain.getWallet(request.walletAddress);
    const messages: any[] = [];

    // Payout Config
    const payoutOptions = beginCell()
      .storeUint(0, 2) // addr_none
      .storeCoins(0n)
      .storeMaybeRef(null)
      .storeBit(false)
      .endCell();

    const payoutConfig = beginCell()
      .storeSlice(payoutOptions.beginParse()) // fulfill
      .storeSlice(payoutOptions.beginParse()) // reject
      .storeUint(0, 2) // excesses
      .endCell();

    if (assetX.isNative) {
      const body = beginCell()
        .storeUint(0xa5a7cbf8, 32) // op::pay_native
        .storeUint(0, 64) // query_id
        .storeCoins(amountX)
        .storeRef(depositPayload)
        .storeRef(payoutConfig)
        .endCell();

      messages.push({
        address: poolAddress,
        amount: amountX + toNano('0.2'), // TON + Gas
        payload: body,
      });
    } else {
      // Jetton transfer
      const userJettonWallet = await this.chain.rpcProvider.getJettonWalletAddress(
        assetX.address!.toString(),
        request.walletAddress,
      );

      const forwardPayload = beginCell()
        .storeUint(0xcbc33949, 32) // op::pay_jetton
        .storeRef(depositPayload)
        .storeRef(payoutConfig)
        .endCell();

      const transferBody = beginCell()
        .storeUint(0x0f8a7ea5, 32) // op::transfer
        .storeUint(0, 64)
        .storeCoins(amountX)
        .storeAddress(poolAddress)
        .storeAddress(Address.parse(request.walletAddress)) // response_destination
        .storeMaybeRef(null) // custom_payload
        .storeCoins(toNano('0.2')) // forward_amount
        .storeMaybeRef(forwardPayload)
        .endCell();

      messages.push({
        address: Address.parse(userJettonWallet),
        amount: toNano('0.25'), // Gas for transfer
        payload: transferBody,
      });
    }

    // NOTE: In a real scenario, you'd also need to send Asset Y if it's not already in the pool's deposit account for you.
    // For now, we'll assume the first asset triggers the deposit logic.
    // If Asset Y is also a Jetton, we'd add another message here to send it.

    const result = await this.chain.sendTransfer(wallet, messages);
    const confirmation = await this.chain.waitForTransactionConfirmation(result.message_hash);
    const status = confirmation.confirmed ? (confirmation.success ? 1 : -1) : 0;

    return {
      signature: result.message_hash,
      status,
    };
  }

  async removeLiquidity(request: RemoveLiquidityRequestType): Promise<RemoveLiquidityResponseType> {
    if (!request.walletAddress) {
      throw httpErrors.badRequest('walletAddress is required');
    }

    const poolAddress = Address.parse(request.poolAddress);
    const userLPWalletAddress = await this.chain.rpcProvider.getJettonWalletAddress(
      request.poolAddress,
      request.walletAddress,
    );
    const userLPBalance = await this.chain.rpcProvider.getJettonBalance(userLPWalletAddress);

    const amountToBurn = (userLPBalance * BigInt(Math.floor(request.percentageToRemove * 100))) / 10000n;

    if (amountToBurn === 0n) {
      throw httpErrors.badRequest('lpAmount to remove is 0');
    }

    const wallet = await this.chain.getWallet(request.walletAddress);
    const poolContract = new DeDustPoolContract(poolAddress);
    const payload = poolContract.createWithdrawPayload({
      amount: amountToBurn,
      targetAddress: Address.parse(request.walletAddress),
    });

    const messages = [{
      address: poolAddress,
      amount: toNano('0.3'), // Gas
      payload: payload,
    }];

    const result = await this.chain.sendTransfer(wallet, messages);
    const confirmation = await this.chain.waitForTransactionConfirmation(result.message_hash);
    const status = confirmation.confirmed ? (confirmation.success ? 1 : -1) : 0;

    return {
      signature: result.message_hash,
      status,
    };
  }

  async claimFees(request: { poolAddress: string; walletAddress: string }): Promise<any> {
    const poolAddress = Address.parse(request.poolAddress);
    const wallet = await this.chain.getWallet(request.walletAddress);
    
    const poolContract = new DeDustPoolContract(poolAddress);
    const payload = poolContract.createClaimFeesPayload({
      excessesTo: Address.parse(request.walletAddress),
    });

    const messages = [{
      address: poolAddress,
      amount: toNano('0.2'), // Gas
      payload: payload,
    }];

    const result = await this.chain.sendTransfer(wallet, messages);
    const confirmation = await this.chain.waitForTransactionConfirmation(result.message_hash);
    const status = confirmation.confirmed ? (confirmation.success ? 1 : -1) : 0;

    return {
      signature: result.message_hash,
      status,
    };
  }

  private getTokenDecimals(address: string): number {
    if (address === 'native') return 9;
    const token = this.chain.tokenList.find(
      (t) => t.address.toLowerCase() === address.toLowerCase(),
    );
    return token ? token.decimals : 9;
  }
}
