import { DedustPoolBuilder, DedustPool } from '../../src/connectors/dedust/models/dedust-pool';

describe('DeDust Pool Calculations', () => {
  const mockPool: DedustPool = {
    address: 'EQTestPoolAddress1234567890abcdef',
    baseSymbol: 'TON',
    quoteSymbol: 'USDT',
    baseReserve: '1000000000000', // 1,000 TON (9 decimals)
    quoteReserve: '2500000000', // 2,500 USDT (6 decimals)
    fee: 0.3,
    totalSupply: '1581138830084', // sqrt(1000 * 2500) with precision
    type: 'volatile',
    network: 'mainnet',
  };

  describe('DedustPoolBuilder.calculatePrice', () => {
    it('should calculate correct price for normal pool', () => {
      const price = DedustPoolBuilder.calculatePrice(mockPool);
      const priceNumber = parseFloat(price) / 1e18; // Convert from 18 decimal precision
      expect(priceNumber).toBeCloseTo(2.5, 6); // 1 TON = 2.5 USDT
    });

    it('should handle zero base reserve', () => {
      const emptyPool = { ...mockPool, baseReserve: '0' };
      const price = DedustPoolBuilder.calculatePrice(emptyPool);
      expect(price).toBe('0');
    });

    it('should handle zero quote reserve', () => {
      const emptyPool = { ...mockPool, quoteReserve: '0' };
      const price = DedustPoolBuilder.calculatePrice(emptyPool);
      expect(price).toBe('0');
    });

    it('should handle both reserves being zero', () => {
      const emptyPool = { ...mockPool, baseReserve: '0', quoteReserve: '0' };
      const price = DedustPoolBuilder.calculatePrice(emptyPool);
      expect(price).toBe('0');
    });

    it('should calculate price for large numbers', () => {
      const largePool = {
        ...mockPool,
        baseReserve: '1000000000000000000000', // 1 million TON
        quoteReserve: '3000000000000000', // 3 million USDT
      };
      const price = DedustPoolBuilder.calculatePrice(largePool);
      const priceNumber = parseFloat(price) / 1e18;
      expect(priceNumber).toBeCloseTo(3.0, 6);
    });

    it('should handle very small reserves', () => {
      const smallPool = {
        ...mockPool,
        baseReserve: '1000', // 0.000001 TON
        quoteReserve: '5000', // 0.005 USDT
      };
      const price = DedustPoolBuilder.calculatePrice(smallPool);
      const priceNumber = parseFloat(price) / 1e18;
      expect(priceNumber).toBeCloseTo(5.0, 6);
    });
  });

  describe('DedustPoolBuilder.calculateLPTokenValue', () => {
    it('should calculate correct LP token value', () => {
      const lpAmount = '100000000000'; // 100 LP tokens with 9 decimals
      const value = DedustPoolBuilder.calculateLPTokenValue(mockPool, lpAmount);

      // LP value should be proportional to pool reserves
      const totalSupply = BigInt(mockPool.totalSupply);
      const lpTokens = BigInt(lpAmount);
      const expectedBaseShare = (BigInt(mockPool.baseReserve) * lpTokens) / totalSupply;
      const expectedQuoteShare = (BigInt(mockPool.quoteReserve) * lpTokens) / totalSupply;

      expect(value.baseAmount).toBe(expectedBaseShare.toString());
      expect(value.quoteAmount).toBe(expectedQuoteShare.toString());
      expect(value.lpAmount).toBe(lpAmount);
    });

    it('should handle zero LP token amount', () => {
      const value = DedustPoolBuilder.calculateLPTokenValue(mockPool, '0');
      expect(value.baseAmount).toBe('0');
      expect(value.quoteAmount).toBe('0');
      expect(value.lpAmount).toBe('0');
    });

    it('should handle LP amount equal to total supply', () => {
      const value = DedustPoolBuilder.calculateLPTokenValue(mockPool, mockPool.totalSupply);
      expect(value.baseAmount).toBe(mockPool.baseReserve);
      expect(value.quoteAmount).toBe(mockPool.quoteReserve);
      expect(value.lpAmount).toBe(mockPool.totalSupply);
    });

    it('should handle zero total supply', () => {
      const emptyPool = { ...mockPool, totalSupply: '0' };
      const value = DedustPoolBuilder.calculateLPTokenValue(emptyPool, '100000000000');
      expect(value.baseAmount).toBe('0');
      expect(value.quoteAmount).toBe('0');
      expect(value.lpAmount).toBe('100000000000');
    });

    it('should calculate value for very large LP amounts', () => {
      const largeLPAmount = '1000000000000000000000'; // 1 trillion LP tokens
      // Should not throw error even with large numbers
      expect(() => {
        DedustPoolBuilder.calculateLPTokenValue(mockPool, largeLPAmount);
      }).not.toThrow();
    });
  });

  describe('DedustPoolBuilder.calculatePoolShare', () => {
    it('should calculate correct pool share percentage', () => {
      const lpAmount = '158113883008'; // ~10% of total supply
      const sharePercentage = DedustPoolBuilder.calculatePoolShare(mockPool, lpAmount);
      expect(sharePercentage).toBeCloseTo(10, 1); // ~10%
    });

    it('should return 0 for zero LP tokens', () => {
      const sharePercentage = DedustPoolBuilder.calculatePoolShare(mockPool, '0');
      expect(sharePercentage).toBe(0);
    });

    it('should return 100 for total supply', () => {
      const sharePercentage = DedustPoolBuilder.calculatePoolShare(mockPool, mockPool.totalSupply);
      expect(sharePercentage).toBeCloseTo(100, 6);
    });

    it('should handle zero total supply', () => {
      const emptyPool = { ...mockPool, totalSupply: '0' };
      const sharePercentage = DedustPoolBuilder.calculatePoolShare(emptyPool, '1000000000');
      expect(sharePercentage).toBe(0);
    });

    it('should calculate share for small amounts', () => {
      const smallAmount = '1581138830'; // 0.1% of total supply
      const sharePercentage = DedustPoolBuilder.calculatePoolShare(mockPool, smallAmount);
      expect(sharePercentage).toBeCloseTo(0.1, 2);
    });

    it('should handle LP amount larger than total supply', () => {
      const largeLPAmount = '10000000000000000'; // Much larger than total supply
      const sharePercentage = DedustPoolBuilder.calculatePoolShare(mockPool, largeLPAmount);
      expect(sharePercentage).toBeGreaterThan(100);
    });
  });

  describe('DedustPoolBuilder.getOptimalLiquidityAmounts', () => {
    it('should calculate optimal amounts for balanced addition', () => {
      const baseAmount = '100000000000'; // 100 TON
      const quoteAmount = '250000000'; // 250 USDT

      const optimal = DedustPoolBuilder.getOptimalLiquidityAmounts(
        mockPool,
        baseAmount,
        quoteAmount
      );

      // Should maintain pool ratio (1 TON = 2.5 USDT)
      const baseUsed = parseFloat(optimal.baseAmount);
      const quoteUsed = parseFloat(optimal.quoteAmount);
      const ratio = quoteUsed / baseUsed;

      // Current pool ratio is 2.5
      const currentRatio = parseFloat(mockPool.quoteReserve) / parseFloat(mockPool.baseReserve);
      expect(ratio).toBeCloseTo(currentRatio, 3);
    });

    it('should limit by base amount when quote is excessive', () => {
      const baseAmount = '100000000000'; // 100 TON
      const quoteAmount = '1000000000'; // 1000 USDT (too much)

      const optimal = DedustPoolBuilder.getOptimalLiquidityAmounts(
        mockPool,
        baseAmount,
        quoteAmount
      );

      expect(optimal.baseAmount).toBe(baseAmount);
      // Quote should be reduced to maintain ratio
      const expectedQuote = (BigInt(baseAmount) * BigInt(mockPool.quoteReserve)) / BigInt(mockPool.baseReserve);
      expect(optimal.quoteAmount).toBe(expectedQuote.toString());
    });

    it('should limit by quote amount when base is excessive', () => {
      const baseAmount = '1000000000000'; // 1000 TON (too much)
      const quoteAmount = '250000000'; // 250 USDT

      const optimal = DedustPoolBuilder.getOptimalLiquidityAmounts(
        mockPool,
        baseAmount,
        quoteAmount
      );

      expect(optimal.quoteAmount).toBe(quoteAmount);
      // Base should be reduced to maintain ratio
      const expectedBase = (BigInt(quoteAmount) * BigInt(mockPool.baseReserve)) / BigInt(mockPool.quoteReserve);
      expect(optimal.baseAmount).toBe(expectedBase.toString());
    });

    it('should handle zero amounts', () => {
      const optimal = DedustPoolBuilder.getOptimalLiquidityAmounts(mockPool, '0', '0');
      expect(optimal.baseAmount).toBe('0');
      expect(optimal.quoteAmount).toBe('0');
    });

    it('should handle first liquidity provision (empty pool)', () => {
      const emptyPool = { ...mockPool, baseReserve: '0', quoteReserve: '0', totalSupply: '0' };
      const baseAmount = '100000000000';
      const quoteAmount = '250000000';

      const optimal = DedustPoolBuilder.getOptimalLiquidityAmounts(
        emptyPool,
        baseAmount,
        quoteAmount
      );

      // For first provision, should use provided amounts as-is
      expect(optimal.baseAmount).toBe(baseAmount);
      expect(optimal.quoteAmount).toBe(quoteAmount);
    });
  });

  describe('DedustPoolBuilder.estimateLPTokensReceived', () => {
    it('should estimate LP tokens for proportional addition', () => {
      const baseAmount = '100000000000'; // 100 TON
      const quoteAmount = '250000000'; // 250 USDT (correct ratio)

      const lpTokens = DedustPoolBuilder.estimateLPTokensReceived(
        mockPool,
        baseAmount,
        quoteAmount
      );

      // Should receive proportional LP tokens
      const baseRatio = BigInt(baseAmount) * BigInt(mockPool.totalSupply) / BigInt(mockPool.baseReserve);
      expect(lpTokens).toBe(baseRatio.toString());
    });

    it('should handle first liquidity provision', () => {
      const emptyPool = { ...mockPool, baseReserve: '0', quoteReserve: '0', totalSupply: '0' };
      const baseAmount = '100000000000';
      const quoteAmount = '250000000';

      const lpTokens = DedustPoolBuilder.estimateLPTokensReceived(
        emptyPool,
        baseAmount,
        quoteAmount
      );

      // For first provision, LP tokens should be sqrt(base * quote)
      // This is a simplified calculation
      expect(BigInt(lpTokens)).toBeGreaterThan(0n);
    });

    it('should return 0 for zero amounts', () => {
      const lpTokens = DedustPoolBuilder.estimateLPTokensReceived(mockPool, '0', '0');
      expect(lpTokens).toBe('0');
    });

    it('should handle large amounts', () => {
      const largeBase = '1000000000000000000'; // 1 million TON
      const largeQuote = '2500000000000000'; // 2.5 million USDT

      expect(() => {
        DedustPoolBuilder.estimateLPTokensReceived(mockPool, largeBase, largeQuote);
      }).not.toThrow();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle invalid pool data gracefully', () => {
      const invalidPool = {
        ...mockPool,
        baseReserve: 'invalid',
        quoteReserve: 'invalid',
      };

      expect(() => {
        DedustPoolBuilder.calculatePrice(invalidPool);
      }).toThrow();
    });

    it('should handle negative amounts', () => {
      expect(() => {
        DedustPoolBuilder.calculateLPTokenValue(mockPool, '-1000000000');
      }).toThrow();
    });

    it('should handle very large numbers without overflow', () => {
      const largePool = {
        ...mockPool,
        baseReserve: '999999999999999999999999999999999999999',
        quoteReserve: '999999999999999999999999999999999999999',
        totalSupply: '999999999999999999999999999999999999999',
      };

      expect(() => {
        DedustPoolBuilder.calculatePrice(largePool);
      }).not.toThrow();
    });
  });

  describe('Pool creation and validation', () => {
    it('should create pool with valid parameters', () => {
      const poolData = {
        address: 'EQTestAddress',
        baseSymbol: 'TON',
        quoteSymbol: 'USDT',
        baseReserve: '1000000000000',
        quoteReserve: '2500000000',
        fee: 0.3,
        totalSupply: '1581138830084',
        type: 'volatile' as const,
        network: 'mainnet',
      };

      const pool = DedustPoolBuilder.create(poolData);
      expect(pool).toEqual(poolData);
    });

    it('should validate pool addresses', () => {
      expect(() => {
        DedustPoolBuilder.create({
          ...mockPool,
          address: 'invalid-address',
        });
      }).toThrow('Invalid pool address format');
    });

    it('should validate pool symbols', () => {
      expect(() => {
        DedustPoolBuilder.create({
          ...mockPool,
          baseSymbol: '',
        });
      }).toThrow('Invalid token symbol');
    });

    it('should validate numeric fields', () => {
      expect(() => {
        DedustPoolBuilder.create({
          ...mockPool,
          fee: -1,
        });
      }).toThrow('Invalid fee percentage');
    });
  });

  describe('Performance tests', () => {
    it('should calculate price quickly for many operations', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        DedustPoolBuilder.calculatePrice(mockPool);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete 1000 calculations in under 50ms
      expect(duration).toBeLessThan(50);
    });

    it('should calculate LP values quickly', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        DedustPoolBuilder.calculateLPTokenValue(mockPool, '100000000000');
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete 1000 calculations in under 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});