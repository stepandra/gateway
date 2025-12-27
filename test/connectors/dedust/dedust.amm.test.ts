import { Address, toNano, beginCell } from '@ton/core';

import { Ton } from '../../../src/chains/ton/ton';
import { parseUnits } from '../../../src/chains/ton/ton.utils';
import { DeDustAMM } from '../../../src/connectors/dedust/dedust.amm';

jest.mock('../../../src/chains/ton/ton');

describe('DeDustAMM', () => {
  let dedustAmm: DeDustAMM;
  let mockTon: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore
    DeDustAMM._instances = {};
    mockTon = {
      rpcProvider: {
        getProvider: jest.fn(),
      },
      tokenList: [{ symbol: 'USDT', address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs', decimals: 6 }],
      nativeTokenSymbol: 'TON',
    };
    (Ton.getInstance as jest.Mock).mockReturnValue(mockTon);
    dedustAmm = DeDustAMM.getInstance('mainnet');
  });

  it('should be a singleton', () => {
    const instance2 = DeDustAMM.getInstance('mainnet');
    expect(dedustAmm).toBe(instance2);
  });

  it('should initialize with Ton chain', () => {
    expect(dedustAmm.chain).toBeDefined();
    expect(Ton.getInstance).toHaveBeenCalledWith('mainnet');
  });

  describe('poolInfo', () => {
    it('should return pool info for TON/USDT', async () => {
      const tonAsset = beginCell().storeUint(0, 4).endCell(); // Native
      const usdtAddress = Address.parse('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs');
      const usdtAsset = beginCell()
        .storeUint(1, 4)
        .storeInt(usdtAddress.workChain, 8)
        .storeBuffer(usdtAddress.hash)
        .endCell();

      // Mock get_pool_data response
      const reader = {
        readNumber: jest
          .fn()
          .mockReturnValueOnce(2) // status
          .mockReturnValueOnce(30), // baseFeeBps
        readBoolean: jest
          .fn()
          .mockReturnValueOnce(true) // depositActive
          .mockReturnValueOnce(true), // swapActive
        readBigNumber: jest
          .fn()
          .mockReturnValueOnce(toNano('100')) // reserveX (TON, 9)
          .mockReturnValueOnce(parseUnits('500', 6)) // reserveY (USDT, 6)
          .mockReturnValueOnce(toNano('1000')), // liquidity
        readCell: jest.fn().mockReturnValueOnce(tonAsset).mockReturnValueOnce(usdtAsset),
        readCellOpt: jest.fn(),
      };

      mockTon.rpcProvider.getProvider.mockReturnValue({
        get: jest.fn().mockResolvedValue({ stack: reader }),
      });

      const result = await dedustAmm.poolInfo({
        poolAddress: 'EQA-X_yo3fzzbDbJ_0bzFWKqtRuZFIRa1sJsveZJ1YpViO3r',
      });

      expect(result.address).toBe('EQA-X_yo3fzzbDbJ_0bzFWKqtRuZFIRa1sJsveZJ1YpViO3r');
      expect(result.baseTokenAmount).toBe(100); // 100 TON
      expect(result.quoteTokenAmount).toBe(500); // 500 USDT (mocked decimals 6?)
      // Wait, if USDT decimals are 6, toNano('500') is 500 * 10^9.
      // Mapping should use proper decimals.
      expect(result.feePct).toBe(0.3);
    });
  });

  describe('positionInfo', () => {
    it('should return position info for a wallet', async () => {
      const poolAddress = 'EQA-X_yo3fzzbDbJ_0bzFWKqtRuZFIRa1sJsveZJ1YpViO3r';
      const walletAddress = 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ';

      const tonAsset = beginCell().storeUint(0, 4).endCell();
      const usdtAddress = Address.parse('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs');
      const usdtAsset = beginCell()
        .storeUint(1, 4)
        .storeInt(usdtAddress.workChain, 8)
        .storeBuffer(usdtAddress.hash)
        .endCell();

      // Mock pool data
      const poolReader = {
        readNumber: jest.fn().mockReturnValueOnce(2).mockReturnValueOnce(30),
        readBoolean: jest.fn().mockReturnValue(true),
        readBigNumber: jest
          .fn()
          .mockReturnValueOnce(toNano('100')) // reserveX
          .mockReturnValueOnce(parseUnits('500', 6)) // reserveY
          .mockReturnValueOnce(toNano('1000')), // totalLiquidity (LP supply)
        readCell: jest.fn().mockReturnValueOnce(tonAsset).mockReturnValueOnce(usdtAsset),
        readCellOpt: jest.fn(),
      };

      mockTon.rpcProvider.getProvider.mockReturnValue({
        get: jest.fn().mockResolvedValue({ stack: poolReader }),
      });

      // Mock user LP balance
      const userLPWallet = 'EQ...user_lp_wallet';
      mockTon.rpcProvider.getJettonWalletAddress = jest.fn().mockResolvedValue(userLPWallet);
      mockTon.rpcProvider.getJettonBalance = jest.fn().mockResolvedValue(toNano('100')); // User has 10% of pool

      const result = await dedustAmm.positionInfo({
        poolAddress,
        walletAddress,
      });

      expect(result.lpTokenAmount).toBe(100);
      expect(result.baseTokenAmount).toBe(10); // 10% of 100 TON
      expect(result.quoteTokenAmount).toBe(50); // 10% of 500 USDT
    });
  });

  describe('quoteLiquidity', () => {
    it('should return quote for adding liquidity', async () => {
      const poolAddress = 'EQA-X_yo3fzzbDbJ_0bzFWKqtRuZFIRa1sJsveZJ1YpViO3r';

      const tonAsset = beginCell().storeUint(0, 4).endCell();
      const usdtAddress = Address.parse('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs');
      const usdtAsset = beginCell()
        .storeUint(1, 4)
        .storeInt(usdtAddress.workChain, 8)
        .storeBuffer(usdtAddress.hash)
        .endCell();

      // Mock pool data: 100 TON / 500 USDT
      const poolReader = {
        readNumber: jest.fn().mockReturnValueOnce(2).mockReturnValueOnce(30),
        readBoolean: jest.fn().mockReturnValue(true),
        readBigNumber: jest
          .fn()
          .mockReturnValueOnce(toNano('100')) // reserveX
          .mockReturnValueOnce(parseUnits('500', 6)) // reserveY
          .mockReturnValueOnce(toNano('1000')), // totalLiquidity
        readCell: jest.fn().mockReturnValueOnce(tonAsset).mockReturnValueOnce(usdtAsset),
        readCellOpt: jest.fn(),
      };

      mockTon.rpcProvider.getProvider.mockReturnValue({
        get: jest.fn().mockResolvedValue({ stack: poolReader }),
      });

      // Request: Add 10 TON
      const result = await dedustAmm.quoteLiquidity({
        poolAddress,
        baseTokenAmount: 10,
        quoteTokenAmount: 0, // Quote based on base
      });

      expect(result.baseTokenAmount).toBe(10);
      expect(result.quoteTokenAmount).toBe(50); // Ratio 1:5
    });
  });

  describe('addLiquidity', () => {
    it('should add liquidity for TON/USDT', async () => {
      const poolAddress = 'EQA-X_yo3fzzbDbJ_0bzFWKqtRuZFIRa1sJsveZJ1YpViO3r';
      const walletAddress = 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ';

      const tonAsset = beginCell().storeUint(0, 4).endCell();
      const usdtAddress = Address.parse('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs');
      const usdtAsset = beginCell()
        .storeUint(1, 4)
        .storeInt(usdtAddress.workChain, 8)
        .storeBuffer(usdtAddress.hash)
        .endCell();

      // Mock pool data
      const poolReader = {
        readNumber: jest.fn().mockReturnValueOnce(2).mockReturnValueOnce(30),
        readBoolean: jest.fn().mockReturnValue(true),
        readBigNumber: jest
          .fn()
          .mockReturnValueOnce(toNano('100'))
          .mockReturnValueOnce(parseUnits('500', 6))
          .mockReturnValueOnce(toNano('1000')),
        readCell: jest.fn().mockReturnValueOnce(tonAsset).mockReturnValueOnce(usdtAsset),
        readCellOpt: jest.fn(),
      };

      mockTon.rpcProvider.getProvider.mockReturnValue({
        get: jest.fn().mockResolvedValue({ stack: poolReader }),
      });

      // Mock wallet and transfer
      mockTon.getWallet = jest.fn().mockResolvedValue({ address: walletAddress });
      mockTon.sendTransfer = jest.fn().mockResolvedValue({ message_hash: 'tx_hash' });
      mockTon.waitForTransactionConfirmation = jest.fn().mockResolvedValue({
        confirmed: true,
        success: true,
      });

      const result = await dedustAmm.addLiquidity({
        poolAddress,
        walletAddress,
        baseTokenAmount: 10,
        quoteTokenAmount: 50,
      });

      expect(result.signature).toBe('tx_hash');
      expect(result.status).toBe(1); // CONFIRMED
      expect(mockTon.sendTransfer).toHaveBeenCalled();
    });
  });

  describe('removeLiquidity', () => {
    it('should remove liquidity from a pool', async () => {
      const poolAddress = 'EQA-X_yo3fzzbDbJ_0bzFWKqtRuZFIRa1sJsveZJ1YpViO3r';
      const walletAddress = 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ';

      // Mock user LP balance
      const userLPWallet = 'EQ...user_lp_wallet';
      mockTon.rpcProvider.getJettonWalletAddress = jest.fn().mockResolvedValue(userLPWallet);
      mockTon.rpcProvider.getJettonBalance = jest.fn().mockResolvedValue(toNano('100'));

      // Mock wallet and transfer
      mockTon.getWallet = jest.fn().mockResolvedValue({ address: walletAddress });
      mockTon.sendTransfer = jest.fn().mockResolvedValue({ message_hash: 'tx_hash' });
      mockTon.waitForTransactionConfirmation = jest.fn().mockResolvedValue({
        confirmed: true,
        success: true,
      });

      const result = await dedustAmm.removeLiquidity({
        poolAddress,
        walletAddress,
        percentageToRemove: 50, // Remove 50% (50 LP)
      });

      expect(result.signature).toBe('tx_hash');
      expect(result.status).toBe(1);
      expect(mockTon.sendTransfer).toHaveBeenCalled();
    });
  });

  describe('claimFees', () => {
    it('should claim fees from a pool', async () => {
      const poolAddress = 'EQA-X_yo3fzzbDbJ_0bzFWKqtRuZFIRa1sJsveZJ1YpViO3r';
      const walletAddress = 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ';

      // Mock wallet and transfer
      mockTon.getWallet = jest.fn().mockResolvedValue({ address: walletAddress });
      mockTon.sendTransfer = jest.fn().mockResolvedValue({ message_hash: 'tx_hash' });
      mockTon.waitForTransactionConfirmation = jest.fn().mockResolvedValue({
        confirmed: true,
        success: true,
      });

      const result = await dedustAmm.claimFees({
        poolAddress,
        walletAddress,
      });

      expect(result.signature).toBe('tx_hash');
      expect(result.status).toBe(1);
      expect(mockTon.sendTransfer).toHaveBeenCalled();
    });
  });
});
