import axios from 'axios';
import { DeDust } from '../../../src/connectors/dedust/dedust';
import { Ton } from '../../../src/chains/ton/ton';
import { ConfigManagerV2 } from '../../../src/services/config-manager-v2';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../../../src/chains/ton/ton');
jest.mock('../../../src/services/config-manager-v2', () => ({
  ConfigManagerV2: {
    getInstance: jest.fn().mockReturnValue({
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'dedust.router.baseUrl') return 'https://api-mainnet.dedust.io/v1';
        if (key === 'dedust.router.slippage') return 0.5;
        return undefined;
      }),
    }),
  },
}));

describe('DeDust', () => {
  let dedust: DeDust;
  let mockTon: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTon = {
      nativeTokenSymbol: 'TON',
      tokenList: [
        { symbol: 'TON', address: 'native', decimals: 9 },
        { symbol: 'USDT', address: '0:usdtaddress', decimals: 6 },
      ],
      getTokenBySymbol: jest.fn(),
      getWallet: jest.fn(),
      sendTransfer: jest.fn(),
      waitForTransactionConfirmation: jest.fn().mockResolvedValue({ confirmed: true, success: true }),
      getBalances: jest.fn().mockResolvedValue({ TON: 100, USDT: 1000 }), // Default sufficient balance
      config: { commissionBuffer: 0.3 },
    };
    (Ton.getInstance as jest.Mock).mockReturnValue(mockTon);

    // Reset DeDust singleton
    (DeDust as any)._instances = {};
    dedust = DeDust.getInstance('mainnet');
  });

  it('should be a singleton', () => {
    const dedust2 = DeDust.getInstance('mainnet');
    expect(dedust).toBe(dedust2);
  });

  describe('getTokenAddress', () => {
    it('should return "native" for TON symbol', () => {
      expect(dedust.getTokenAddress('TON')).toBe('native');
    });

    it('should return "native" for native address', () => {
      expect(dedust.getTokenAddress('native')).toBe('native');
    });

    it('should return address for known symbol', () => {
      expect(dedust.getTokenAddress('USDT')).toBe('0:usdtaddress');
    });

    it('should return raw address for raw address input', () => {
      const raw = '0:ee6f7a03da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da';
      expect(dedust.getTokenAddress(raw)).toBe(raw);
    });

    it('should throw error for unknown token', () => {
      expect(() => dedust.getTokenAddress('UNKNOWN')).toThrow();
    });
  });

  describe('getQuote', () => {
    it('should fetch a quote', async () => {
      const tokenIn = 'TON';
      const tokenOut = 'USDT';
      const amountIn = 1.5;

      const expectedResponse = {
        out_amount: '7500000', // 7.5 USDT
        tradeFee: '0',
        route: [], // Simplified
        swap_data: { some: 'data' },
      };

      mockedAxios.post.mockResolvedValue({ data: expectedResponse });

      const result = await dedust.getQuote(tokenIn, tokenOut, amountIn);

      expect(mockedAxios.post).toHaveBeenCalledWith('https://api-mainnet.dedust.io/v1/router/quote', {
        in_minter: 'native',
        out_minter: '0:usdtaddress',
        amount: '1500000000', // 1.5 * 10^9
        swap_mode: 'exact_in',
        slippage_bps: 50,
        max_splits: 4,
        max_length: 3,
      });

      expect(result.amountOut).toBe(7.5);
      expect(result.swapData).toEqual(expectedResponse.swap_data);
    });
  });

  describe('executeSwap', () => {
    it('should execute a swap', async () => {
      const walletAddress = '0:ee6f7a03da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da';
      const swapData = { some: 'data' };
      const tokenIn = 'TON';
      const amountIn = 1.0;

      // Mock getWallet
      const mockWallet = { address: walletAddress };
      mockTon.getWallet = jest.fn().mockResolvedValue(mockWallet);
      mockTon.sendTransfer = jest.fn().mockResolvedValue({ message_hash: 'tx-hash' });

      // Mock DeDust swap API response
      const apiResponse = [
        {
          address: '0:recipient',
          amount: '1000',
          payload: 'te6cckEBAQEAAgAAAEysuc0=', // Empty cell base64
        },
      ];
      mockedAxios.post.mockResolvedValue({ data: { transactions: apiResponse } });

      const result = await dedust.executeSwap(walletAddress, swapData, tokenIn, amountIn);

      expect(mockTon.getWallet).toHaveBeenCalledWith(walletAddress);
      expect(mockTon.getBalances).toHaveBeenCalledWith(walletAddress, [tokenIn]);

      expect(mockedAxios.post).toHaveBeenCalledWith('https://api-mainnet.dedust.io/v1/router/swap', {
        sender_address: walletAddress,
        swap_data: swapData,
      });

      // Verify internal messages construction
      expect(mockTon.sendTransfer).toHaveBeenCalledWith(
        mockWallet,
        expect.arrayContaining([
          expect.objectContaining({
            address: '0:recipient',
            amount: BigInt(1000),
            // We can't easily check the Cell object equality, but we can check if it exists
          }),
        ]),
      );

      expect(result.signature).toBe('tx-hash');
      expect(result.status).toBe(1);
    });

    it('should throw if insufficient TON balance', async () => {
      const walletAddress = '0:ee6f7a03da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da';
      const swapData = { some: 'data' };
      const amountIn = 100; // Large amount
      const tokenIn = 'TON';

      const mockWallet = { address: walletAddress };
      mockTon.getWallet = jest.fn().mockResolvedValue(mockWallet);

      // Mock balances: 10 TON
      mockTon.getBalances = jest.fn().mockResolvedValue({ TON: 10 });
      mockTon.config = { commissionBuffer: 0.3 };

      // DeDust API response - transaction requires sending 100 TON (native swap)
      const apiResponse = [
        { address: '0:recipient', amount: '100000000000' }, // 100 TON
      ];
      mockedAxios.post.mockResolvedValue({ data: { transactions: apiResponse } });

      await expect(dedust.executeSwap(walletAddress, swapData, tokenIn, amountIn)).rejects.toThrow(
        'Insufficient TON balance',
      );
    });

    it('should throw if insufficient Jetton balance', async () => {
      const walletAddress = '0:ee6f7a03da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da';
      const swapData = { some: 'data' };
      const tokenIn = 'USDT';
      const amountIn = 2000; // Required

      const mockWallet = { address: walletAddress };
      mockTon.getWallet = jest.fn().mockResolvedValue(mockWallet);

      // Mock balances: 1000 USDT
      mockTon.getBalances = jest.fn().mockResolvedValue({ TON: 10, USDT: 1000 });

      await expect(dedust.executeSwap(walletAddress, swapData, tokenIn, amountIn)).rejects.toThrow(
        'Insufficient USDT balance',
      );
    });
  });
});
