import { DedustRouter } from '../../src/connectors/dedust/services/dedust-router';
import { SwapQuote } from '../../src/connectors/dedust/models/swap-quote';
import { Route } from '../../src/connectors/dedust/models/route';
import { DedustPool } from '../../src/connectors/dedust/models/dedust-pool';
import { TONToken } from '../../src/chains/ton/models/ton-token';
import { SwapSide } from '../../src/connectors/dedust/types/dedust-types';

jest.mock('../../src/connectors/dedust/services/dedust-factory');

describe('DeDust Router Algorithms', () => {
  let router: DedustRouter;
  let mockPools: DedustPool[];
  let mockTokens: Record<string, TONToken>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock tokens
    mockTokens = {
      TON: {
        symbol: 'TON',
        address: 'native',
        decimals: 9,
        name: 'Toncoin',
        chainId: 101,
      },
      USDT: {
        symbol: 'USDT',
        address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
        decimals: 6,
        name: 'Tether USD',
        chainId: 101,
      },
      USDC: {
        symbol: 'USDC',
        address: 'EQB-MPwrd1G6WKNkLz_VnV6WqBDd142KMQv-g1O-8QUA3728',
        decimals: 6,
        name: 'USD Coin',
        chainId: 101,
      },
      WBTC: {
        symbol: 'WBTC',
        address: 'EQDGnpvGfExn8xw-xTFfYQWzWqlH6cSDjw9O7Sj_rq2vgx_M',
        decimals: 8,
        name: 'Wrapped Bitcoin',
        chainId: 101,
      },
    };

    // Mock pools
    mockPools = [
      {
        address: 'EQPool1TON_USDT',
        baseSymbol: 'TON',
        quoteSymbol: 'USDT',
        baseReserve: '10000000000000', // 10,000 TON
        quoteReserve: '25000000000', // 25,000 USDT
        fee: 0.3,
        totalSupply: '158113883008400', // sqrt(10000 * 25000) with precision
        type: 'volatile',
        network: 'mainnet',
      },
      {
        address: 'EQPool2USDT_USDC',
        baseSymbol: 'USDT',
        quoteSymbol: 'USDC',
        baseReserve: '5000000000', // 5,000 USDT
        quoteReserve: '5010000000', // 5,010 USDC (slight premium)
        fee: 0.05,
        totalSupply: '5004998750624',
        type: 'stable',
        network: 'mainnet',
      },
      {
        address: 'EQPool3TON_WBTC',
        baseSymbol: 'TON',
        quoteSymbol: 'WBTC',
        baseReserve: '2000000000000', // 2,000 TON
        quoteReserve: '12500000', // 0.125 WBTC (1 WBTC = 16,000 TON)
        fee: 0.3,
        totalSupply: '158113883008',
        type: 'volatile',
        network: 'mainnet',
      },
      {
        address: 'EQPool4USDC_WBTC',
        baseSymbol: 'USDC',
        quoteSymbol: 'WBTC',
        baseReserve: '40000000000', // 40,000 USDC
        quoteReserve: '100000000', // 1 WBTC
        fee: 0.3,
        totalSupply: '632455532033',
        type: 'volatile',
        network: 'mainnet',
      },
    ];

    router = new DedustRouter('mainnet');

    // Mock the pool fetching
    jest.spyOn(router, 'getAllPools').mockResolvedValue(mockPools);
  });

  describe('Route finding algorithms', () => {
    it('should find direct route for available pool', async () => {
      const routes = await router.findRoutes(
        mockTokens.TON,
        mockTokens.USDT,
        '1000000000000', // 1,000 TON
        SwapSide.SELL,
        3 // max hops
      );

      expect(routes).toHaveLength(1);
      expect(routes[0].pools).toHaveLength(1);
      expect(routes[0].pools[0].baseSymbol).toBe('TON');
      expect(routes[0].pools[0].quoteSymbol).toBe('USDT');
      expect(routes[0].hops).toBe(1);
      expect(routes[0].isValid).toBe(true);
    });

    it('should find multi-hop route when no direct pool exists', async () => {
      const routes = await router.findRoutes(
        mockTokens.TON,
        mockTokens.WBTC,
        '1000000000000', // 1,000 TON
        SwapSide.SELL,
        3
      );

      expect(routes.length).toBeGreaterThan(0);

      // Should find routes with 2 hops: TON -> USDT -> WBTC or TON -> WBTC direct
      const multiHopRoute = routes.find(route => route.hops === 2);
      expect(multiHopRoute).toBeDefined();

      if (multiHopRoute) {
        expect(multiHopRoute.pools).toHaveLength(2);
        expect(multiHopRoute.pools[0].baseSymbol).toBe('TON');
        expect(multiHopRoute.pools[1].quoteSymbol).toBe('WBTC');
      }
    });

    it('should prioritize routes with lower fees', async () => {
      const routes = await router.findRoutes(
        mockTokens.USDT,
        mockTokens.USDC,
        '1000000000', // 1,000 USDT
        SwapSide.SELL,
        3
      );

      expect(routes).toHaveLength(1);

      // Should prefer stable pool with 0.05% fee over volatile pools
      const directRoute = routes[0];
      expect(directRoute.pools[0].type).toBe('stable');
      expect(directRoute.pools[0].fee).toBe(0.05);
    });

    it('should limit routes by max hops', async () => {
      const routesWithMaxHops1 = await router.findRoutes(
        mockTokens.TON,
        mockTokens.WBTC,
        '1000000000000',
        SwapSide.SELL,
        1 // Only direct routes
      );

      const routesWithMaxHops3 = await router.findRoutes(
        mockTokens.TON,
        mockTokens.WBTC,
        '1000000000000',
        SwapSide.SELL,
        3 // Allow multi-hop
      );

      expect(routesWithMaxHops3.length).toBeGreaterThanOrEqual(routesWithMaxHops1.length);

      // All routes should respect max hops
      routesWithMaxHops3.forEach(route => {
        expect(route.hops).toBeLessThanOrEqual(3);
      });
    });

    it('should handle routes with insufficient liquidity', async () => {
      // Try to swap more than available liquidity
      const largeAmount = '100000000000000'; // 100,000 TON (more than pool reserves)

      const routes = await router.findRoutes(
        mockTokens.TON,
        mockTokens.USDT,
        largeAmount,
        SwapSide.SELL,
        3
      );

      // Should still find routes but mark them as potentially invalid due to slippage
      expect(routes.length).toBeGreaterThan(0);

      // Calculate expected output and verify high slippage
      const route = routes[0];
      const quote = await router.getQuote(
        mockTokens.TON,
        mockTokens.USDT,
        largeAmount,
        SwapSide.SELL,
        1.0 // 1% slippage tolerance
      );

      expect(quote.priceImpact).toBeGreaterThan(10); // High price impact
    });

    it('should find optimal route among multiple options', async () => {
      // For TON -> USDC, should compare:
      // 1. TON -> USDT -> USDC (via stable pool)
      // 2. TON -> WBTC -> USDC

      const routes = await router.findRoutes(
        mockTokens.TON,
        mockTokens.USDC,
        '1000000000000', // 1,000 TON
        SwapSide.SELL,
        3
      );

      expect(routes.length).toBeGreaterThan(1);

      // Routes should be sorted by estimated output (best first)
      for (let i = 1; i < routes.length; i++) {
        expect(parseFloat(routes[i-1].estimatedOutput)).toBeGreaterThanOrEqual(
          parseFloat(routes[i].estimatedOutput)
        );
      }
    });

    it('should handle BUY side swaps correctly', async () => {
      const routes = await router.findRoutes(
        mockTokens.TON,
        mockTokens.USDT,
        '2500000000', // Want to buy 2,500 USDT
        SwapSide.BUY,
        3
      );

      expect(routes).toHaveLength(1);
      expect(routes[0].side).toBe(SwapSide.BUY);

      // Estimated input should be approximately 1,000 TON
      const estimatedInput = parseFloat(routes[0].estimatedInput);
      expect(estimatedInput).toBeCloseTo(1000, 0); // Within 1 TON
    });
  });

  describe('Quote generation', () => {
    it('should generate accurate quotes for direct swaps', async () => {
      const quote = await router.getQuote(
        mockTokens.TON,
        mockTokens.USDT,
        '1000000000000', // 1,000 TON
        SwapSide.SELL,
        1.0 // 1% slippage
      );

      expect(quote).toBeInstanceOf(SwapQuote);
      expect(quote.baseToken).toBe('TON');
      expect(quote.quoteToken).toBe('USDT');
      expect(quote.side).toBe(SwapSide.SELL);
      expect(parseFloat(quote.baseAmount)).toBe(1000);

      // Expected output should be close to 2,500 USDT (minus fees and slippage)
      expect(parseFloat(quote.expectedAmountOut)).toBeLessThan(2500);
      expect(parseFloat(quote.expectedAmountOut)).toBeGreaterThan(2400);

      expect(quote.priceImpact).toBeGreaterThan(0);
      expect(quote.priceImpact).toBeLessThan(5); // Should be reasonable for this size
    });

    it('should generate quotes for multi-hop swaps', async () => {
      const quote = await router.getQuote(
        mockTokens.TON,
        mockTokens.USDC,
        '500000000000', // 500 TON
        SwapSide.SELL,
        2.0 // 2% slippage
      );

      expect(quote.route).toBeDefined();
      expect(quote.route!.hops).toBeGreaterThan(1);
      expect(parseFloat(quote.expectedAmountOut)).toBeGreaterThan(0);

      // Multi-hop should have higher price impact
      expect(quote.priceImpact).toBeGreaterThan(1);
    });

    it('should respect slippage tolerance', async () => {
      const quote1 = await router.getQuote(
        mockTokens.TON,
        mockTokens.USDT,
        '1000000000000',
        SwapSide.SELL,
        0.5 // 0.5% slippage
      );

      const quote2 = await router.getQuote(
        mockTokens.TON,
        mockTokens.USDT,
        '1000000000000',
        SwapSide.SELL,
        2.0 // 2% slippage
      );

      // Lower slippage should result in higher minimum amount out
      expect(parseFloat(quote1.minimumAmountOut)).toBeGreaterThan(
        parseFloat(quote2.minimumAmountOut)
      );
    });

    it('should calculate fees correctly', async () => {
      const quote = await router.getQuote(
        mockTokens.TON,
        mockTokens.USDT,
        '1000000000000',
        SwapSide.SELL,
        1.0
      );

      expect(quote.fees).toBeDefined();
      expect(quote.fees.length).toBeGreaterThan(0);

      // Should have trading fee
      const tradingFee = quote.fees.find(fee => fee.type === 'trading');
      expect(tradingFee).toBeDefined();
      expect(parseFloat(tradingFee!.amount)).toBeGreaterThan(0);
      expect(tradingFee!.percentage).toBe(0.3); // 0.3% for volatile pool
    });

    it('should handle insufficient liquidity gracefully', async () => {
      await expect(
        router.getQuote(
          mockTokens.TON,
          mockTokens.USDT,
          '1000000000000000', // Extremely large amount
          SwapSide.SELL,
          1.0
        )
      ).rejects.toThrow('Insufficient liquidity');
    });

    it('should cache quotes temporarily', async () => {
      const spy = jest.spyOn(router, 'findRoutes');

      // First quote
      await router.getQuote(
        mockTokens.TON,
        mockTokens.USDT,
        '1000000000000',
        SwapSide.SELL,
        1.0
      );

      // Second identical quote should use cache
      await router.getQuote(
        mockTokens.TON,
        mockTokens.USDT,
        '1000000000000',
        SwapSide.SELL,
        1.0
      );

      expect(spy).toHaveBeenCalledTimes(1);

      spy.mockRestore();
    });
  });

  describe('Price calculations', () => {
    it('should calculate constant product formula correctly', () => {
      const pool = mockPools[0]; // TON/USDT pool

      const amountIn = '1000000000000'; // 1,000 TON
      const baseReserve = BigInt(pool.baseReserve);
      const quoteReserve = BigInt(pool.quoteReserve);
      const fee = BigInt(Math.floor(pool.fee * 10000)); // 30 basis points

      // Calculate expected output using constant product formula
      const amountInBig = BigInt(amountIn);
      const amountInWithFee = amountInBig * (10000n - fee);
      const numerator = amountInWithFee * quoteReserve;
      const denominator = (baseReserve * 10000n) + amountInWithFee;
      const expectedOut = numerator / denominator;

      expect(expectedOut).toBeGreaterThan(0n);

      // Price impact should be reasonable for this size
      const priceImpact = Number(
        ((amountInBig * quoteReserve - expectedOut * baseReserve) * 10000n) /
        (amountInBig * quoteReserve)
      ) / 100;

      expect(priceImpact).toBeGreaterThan(0);
      expect(priceImpact).toBeLessThan(10); // Should be less than 10%
    });

    it('should handle edge cases in price calculations', () => {
      // Test with very small amounts
      const smallAmount = '1000'; // 0.000001 TON

      expect(() => {
        const amountInBig = BigInt(smallAmount);
        const baseReserve = BigInt(mockPools[0].baseReserve);
        const quoteReserve = BigInt(mockPools[0].quoteReserve);

        const expectedOut = (amountInBig * quoteReserve) / baseReserve;
        expect(expectedOut).toBeGreaterThanOrEqual(0n);
      }).not.toThrow();

      // Test with zero amount
      expect(() => {
        const amountInBig = BigInt('0');
        const baseReserve = BigInt(mockPools[0].baseReserve);
        const quoteReserve = BigInt(mockPools[0].quoteReserve);

        const expectedOut = (amountInBig * quoteReserve) / baseReserve;
        expect(expectedOut).toBe(0n);
      }).not.toThrow();
    });

    it('should calculate multi-hop prices correctly', async () => {
      // TON -> USDT -> USDC route
      const tonToUsdt = mockPools[0]; // TON/USDT
      const usdtToUsdc = mockPools[1]; // USDT/USDC (stable)

      const inputAmount = '1000000000000'; // 1,000 TON

      // First hop: TON -> USDT
      const tonAmount = BigInt(inputAmount);
      const tonReserve = BigInt(tonToUsdt.baseReserve);
      const usdtReserve = BigInt(tonToUsdt.quoteReserve);
      const tonFee = BigInt(Math.floor(tonToUsdt.fee * 10000));

      const tonAmountWithFee = tonAmount * (10000n - tonFee);
      const usdtOut = (tonAmountWithFee * usdtReserve) /
                      ((tonReserve * 10000n) + tonAmountWithFee);

      // Second hop: USDT -> USDC
      const usdtReserveStable = BigInt(usdtToUsdc.baseReserve);
      const usdcReserveStable = BigInt(usdtToUsdc.quoteReserve);
      const usdtFee = BigInt(Math.floor(usdtToUsdc.fee * 10000));

      const usdtAmountWithFee = usdtOut * (10000n - usdtFee);
      const usdcOut = (usdtAmountWithFee * usdcReserveStable) /
                      ((usdtReserveStable * 10000n) + usdtAmountWithFee);

      expect(usdcOut).toBeGreaterThan(0n);

      // Final output should be less than direct conversion due to fees
      const directRate = (usdtReserve * usdcReserveStable) / (tonReserve * usdtReserveStable);
      const directOut = tonAmount * directRate;

      expect(usdcOut).toBeLessThan(directOut);
    });
  });

  describe('Route validation', () => {
    it('should validate route feasibility', async () => {
      const validRoute = new Route([mockPools[0]], SwapSide.SELL);
      expect(validRoute.isValid).toBe(true);
      expect(validRoute.hops).toBe(1);
    });

    it('should detect invalid token sequences in routes', () => {
      // Create invalid route where tokens don't connect
      const invalidPools = [mockPools[0], mockPools[3]]; // TON/USDT and USDC/WBTC

      expect(() => {
        new Route(invalidPools, SwapSide.SELL);
      }).toThrow('Invalid route: tokens do not connect properly');
    });

    it('should validate route liquidity', async () => {
      const route = new Route([mockPools[0]], SwapSide.SELL);

      // Test with amount larger than pool
      const largeAmount = BigInt(mockPools[0].baseReserve) * 2n;
      const hasLiquidity = route.hasLiquidity(largeAmount.toString());

      expect(hasLiquidity).toBe(false);

      // Test with reasonable amount
      const reasonableAmount = BigInt(mockPools[0].baseReserve) / 10n;
      const hasReasonableLiquidity = route.hasLiquidity(reasonableAmount.toString());

      expect(hasReasonableLiquidity).toBe(true);
    });
  });

  describe('Performance optimizations', () => {
    it('should find routes quickly for common pairs', async () => {
      const startTime = Date.now();

      await router.findRoutes(
        mockTokens.TON,
        mockTokens.USDT,
        '1000000000000',
        SwapSide.SELL,
        3
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete route finding in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle multiple concurrent quote requests', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        router.getQuote(
          mockTokens.TON,
          mockTokens.USDT,
          `${(i + 1) * 100}000000000`, // Different amounts
          SwapSide.SELL,
          1.0
        )
      );

      const quotes = await Promise.all(promises);

      expect(quotes).toHaveLength(10);
      quotes.forEach(quote => {
        expect(quote).toBeInstanceOf(SwapQuote);
        expect(parseFloat(quote.expectedAmountOut)).toBeGreaterThan(0);
      });
    });

    it('should optimize route calculations for large amounts', async () => {
      // Test with progressively larger amounts
      const amounts = ['1000000000', '10000000000', '100000000000', '1000000000000'];

      for (const amount of amounts) {
        const startTime = Date.now();

        const routes = await router.findRoutes(
          mockTokens.TON,
          mockTokens.USDT,
          amount,
          SwapSide.SELL,
          2
        );

        const endTime = Date.now();

        expect(routes.length).toBeGreaterThan(0);
        expect(endTime - startTime).toBeLessThan(50); // Should be fast regardless of amount
      }
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle empty pool list gracefully', async () => {
      jest.spyOn(router, 'getAllPools').mockResolvedValueOnce([]);

      const routes = await router.findRoutes(
        mockTokens.TON,
        mockTokens.USDT,
        '1000000000000',
        SwapSide.SELL,
        3
      );

      expect(routes).toHaveLength(0);
    });

    it('should handle invalid token addresses', async () => {
      const invalidToken: TONToken = {
        symbol: 'INVALID',
        address: 'invalid-address',
        decimals: 18,
        name: 'Invalid Token',
        chainId: 101,
      };

      const routes = await router.findRoutes(
        invalidToken,
        mockTokens.USDT,
        '1000000000000',
        SwapSide.SELL,
        3
      );

      expect(routes).toHaveLength(0);
    });

    it('should handle network errors in pool fetching', async () => {
      jest.spyOn(router, 'getAllPools').mockRejectedValueOnce(new Error('Network error'));

      await expect(
        router.findRoutes(
          mockTokens.TON,
          mockTokens.USDT,
          '1000000000000',
          SwapSide.SELL,
          3
        )
      ).rejects.toThrow('Failed to fetch pool data');
    });

    it('should handle malformed pool data', async () => {
      const malformedPools = [
        {
          ...mockPools[0],
          baseReserve: 'invalid', // Invalid reserve amount
        }
      ];

      jest.spyOn(router, 'getAllPools').mockResolvedValueOnce(malformedPools as any);

      const routes = await router.findRoutes(
        mockTokens.TON,
        mockTokens.USDT,
        '1000000000000',
        SwapSide.SELL,
        3
      );

      // Should filter out invalid pools
      expect(routes).toHaveLength(0);
    });

    it('should handle extremely large amounts gracefully', async () => {
      const hugeAmount = '999999999999999999999999999999'; // 30 digits

      const routes = await router.findRoutes(
        mockTokens.TON,
        mockTokens.USDT,
        hugeAmount,
        SwapSide.SELL,
        3
      );

      // Should not crash, but may return empty routes due to insufficient liquidity
      expect(Array.isArray(routes)).toBe(true);
    });
  });
});