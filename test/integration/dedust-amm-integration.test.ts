import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { gatewayApp } from '../../src/app';

describe('DeDust AMM Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = gatewayApp;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const testWalletAddress = 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N';

  describe('Pool Discovery and Information Flow', () => {
    let poolAddress: string;

    it('should discover pool information and validate structure', async () => {
      const poolResponse = await app.inject({
        method: 'GET',
        url: '/connectors/dedust/amm/pool-info?baseToken=TON&quoteToken=USDT',
      });

      expect(poolResponse.statusCode).toBe(StatusCodes.OK);
      const poolData = JSON.parse(poolResponse.body);

      expect(poolData).toMatchObject({
        address: expect.any(String),
        baseToken: {
          symbol: 'TON',
          address: expect.any(String),
          decimals: 9,
          name: expect.any(String),
        },
        quoteToken: {
          symbol: 'USDT',
          address: expect.any(String),
          decimals: expect.any(Number),
          name: expect.any(String),
        },
        reserves: expect.arrayContaining([
          expect.any(String), // baseReserve
          expect.any(String), // quoteReserve
        ]),
        fee: expect.any(Number),
        totalSupply: expect.any(String),
        poolType: expect.stringMatching(/^(volatile|stable)$/),
        price: expect.any(String),
      });

      // Validate reserves are reasonable
      expect(poolData.reserves).toHaveLength(2);
      expect(parseFloat(poolData.reserves[0])).toBeGreaterThan(0);
      expect(parseFloat(poolData.reserves[1])).toBeGreaterThan(0);

      // Validate fee is in reasonable range
      expect(poolData.fee).toBeGreaterThanOrEqual(0);
      expect(poolData.fee).toBeLessThanOrEqual(10); // Max 10%

      poolAddress = poolData.address;
    });

    it('should get position info for discovered pool', async () => {
      const positionResponse = await app.inject({
        method: 'GET',
        url: `/connectors/dedust/amm/position-info?walletAddress=${testWalletAddress}&baseToken=TON&quoteToken=USDT`,
      });

      expect(positionResponse.statusCode).toBe(StatusCodes.OK);
      const positionData = JSON.parse(positionResponse.body);

      expect(positionData).toMatchObject({
        walletAddress: testWalletAddress,
        poolAddress: poolAddress,
        lpTokenBalance: expect.any(String),
        lpTokenValue: expect.any(String),
        poolShare: expect.any(Number),
        hasPosition: expect.any(Boolean),
      });

      expect(positionData.poolShare).toBeGreaterThanOrEqual(0);
      expect(positionData.poolShare).toBeLessThanOrEqual(100);
    });
  });

  describe('Liquidity Management Flow', () => {
    it('should quote, add, and verify liquidity addition', async () => {
      // Step 1: Get liquidity quote
      const quoteResponse = await app.inject({
        method: 'POST',
        url: '/connectors/dedust/amm/quote-liquidity',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'add',
          baseToken: 'TON',
          quoteToken: 'USDT',
          baseAmount: '10.0',
          quoteAmount: '50.0',
          poolType: 'volatile',
        }),
      });

      expect(quoteResponse.statusCode).toBe(StatusCodes.OK);
      const quoteData = JSON.parse(quoteResponse.body);

      expect(quoteData).toMatchObject({
        operation: 'add',
        poolAddress: expect.any(String),
        baseTokenRequired: expect.any(String),
        quoteTokenRequired: expect.any(String),
        lpTokensToReceive: expect.any(String),
        priceImpact: expect.any(Number),
        poolShare: expect.any(Number),
        gasEstimate: expect.any(String),
      });

      // Validate quote amounts are reasonable
      expect(parseFloat(quoteData.baseTokenRequired)).toBeCloseTo(10.0, 1);
      expect(parseFloat(quoteData.quoteTokenRequired)).toBeCloseTo(50.0, 1);
      expect(parseFloat(quoteData.lpTokensToReceive)).toBeGreaterThan(0);

      // Step 2: Execute liquidity addition
      const addResponse = await app.inject({
        method: 'POST',
        url: '/connectors/dedust/amm/add-liquidity',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: testWalletAddress,
          baseToken: 'TON',
          quoteToken: 'USDT',
          baseAmount: quoteData.baseTokenRequired,
          quoteAmount: quoteData.quoteTokenRequired,
          slippage: 1.0,
          poolType: 'volatile',
        }),
      });

      expect(addResponse.statusCode).toBe(StatusCodes.OK);
      const addData = JSON.parse(addResponse.body);

      expect(addData).toMatchObject({
        txHash: expect.any(String),
        poolAddress: expect.any(String),
        baseTokenDeposited: expect.any(String),
        quoteTokenDeposited: expect.any(String),
        lpTokensReceived: expect.any(String),
        priceImpact: expect.any(Number),
        poolShare: expect.any(Number),
      });

      // Validate execution matches quote reasonably
      expect(parseFloat(addData.baseTokenDeposited)).toBeCloseTo(parseFloat(quoteData.baseTokenRequired), 1);
      expect(parseFloat(addData.lpTokensReceived)).toBeCloseTo(parseFloat(quoteData.lpTokensToReceive), 1);
    });

    it('should quote and remove liquidity', async () => {
      // Step 1: Get removal quote
      const quoteResponse = await app.inject({
        method: 'POST',
        url: '/connectors/dedust/amm/quote-liquidity',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'remove',
          baseToken: 'TON',
          quoteToken: 'USDT',
          lpTokenAmount: '5.0',
          poolType: 'volatile',
        }),
      });

      expect(quoteResponse.statusCode).toBe(StatusCodes.OK);
      const quoteData = JSON.parse(quoteResponse.body);

      expect(quoteData).toMatchObject({
        operation: 'remove',
        poolAddress: expect.any(String),
        baseTokenToReceive: expect.any(String),
        quoteTokenToReceive: expect.any(String),
        lpTokensToBurn: expect.any(String),
        priceImpact: expect.any(Number),
      });

      // Step 2: Execute liquidity removal
      const removeResponse = await app.inject({
        method: 'POST',
        url: '/connectors/dedust/amm/remove-liquidity',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: testWalletAddress,
          baseToken: 'TON',
          quoteToken: 'USDT',
          lpTokenAmount: quoteData.lpTokensToBurn,
          slippage: 1.0,
          poolType: 'volatile',
        }),
      });

      expect(removeResponse.statusCode).toBe(StatusCodes.OK);
      const removeData = JSON.parse(removeResponse.body);

      expect(removeData).toMatchObject({
        txHash: expect.any(String),
        lpTokensBurned: expect.any(String),
        baseTokenReceived: expect.any(String),
        quoteTokenReceived: expect.any(String),
      });

      // Validate execution matches quote
      expect(parseFloat(removeData.lpTokensBurned)).toBeCloseTo(parseFloat(quoteData.lpTokensToBurn), 1);
    });
  });

  describe('Fee Collection Flow', () => {
    it('should check and collect fees from positions', async () => {
      // Step 1: Check fees available (estimate only)
      const estimateResponse = await app.inject({
        method: 'POST',
        url: '/connectors/dedust/amm/collect-fees',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: testWalletAddress,
          baseToken: 'TON',
          quoteToken: 'USDT',
          estimateOnly: true,
        }),
      });

      expect(estimateResponse.statusCode).toBe(StatusCodes.OK);
      const estimateData = JSON.parse(estimateResponse.body);

      expect(estimateData).toMatchObject({
        estimatedFees: expect.any(Array),
        estimatedTotalValue: expect.any(String),
        gasEstimate: expect.any(String),
        canCollect: expect.any(Boolean),
      });

      // Step 2: Collect fees if available
      const collectResponse = await app.inject({
        method: 'POST',
        url: '/connectors/dedust/amm/collect-fees',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: testWalletAddress,
          baseToken: 'TON',
          quoteToken: 'USDT',
          poolType: 'volatile',
        }),
      });

      expect(collectResponse.statusCode).toBe(StatusCodes.OK);
      const collectData = JSON.parse(collectResponse.body);

      expect(collectData).toMatchObject({
        txHash: expect.any(String),
        feesCollected: expect.any(Array),
        totalValueCollected: expect.any(String),
        gasUsed: expect.any(String),
        gasCost: expect.any(String),
        collectedAt: expect.any(Number),
      });

      // Validate fee structure
      collectData.feesCollected.forEach((fee: any) => {
        expect(fee).toMatchObject({
          token: expect.any(String),
          amount: expect.any(String),
          symbol: expect.any(String),
        });
        expect(parseFloat(fee.amount)).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Pool Type Handling', () => {
    it('should handle volatile and stable pools consistently', async () => {
      // Test volatile pool
      const volatileResponse = await app.inject({
        method: 'GET',
        url: '/connectors/dedust/amm/pool-info?baseToken=TON&quoteToken=USDT&poolType=volatile',
      });

      expect(volatileResponse.statusCode).toBe(StatusCodes.OK);
      const volatileData = JSON.parse(volatileResponse.body);
      expect(volatileData.poolType).toBe('volatile');

      // Test stable pool
      const stableResponse = await app.inject({
        method: 'GET',
        url: '/connectors/dedust/amm/pool-info?baseToken=USDT&quoteToken=USDC&poolType=stable',
      });

      expect(stableResponse.statusCode).toBe(StatusCodes.OK);
      const stableData = JSON.parse(stableResponse.body);
      expect(stableData.poolType).toBe('stable');

      // Both should have similar structure but different characteristics
      expect(volatileData.fee).toBeGreaterThanOrEqual(0);
      expect(stableData.fee).toBeGreaterThanOrEqual(0);
      // Stable pools typically have lower fees
      expect(stableData.fee).toBeLessThanOrEqual(volatileData.fee);
    });
  });

  describe('Cross-Network AMM Operations', () => {
    it('should provide consistent pool info across networks', async () => {
      // Mainnet pool info
      const mainnetResponse = await app.inject({
        method: 'GET',
        url: '/connectors/dedust/amm/pool-info?baseToken=TON&quoteToken=USDT',
      });

      // Testnet pool info
      const testnetResponse = await app.inject({
        method: 'GET',
        url: '/connectors/dedust/amm/pool-info?network=testnet&baseToken=TON&quoteToken=USDT',
      });

      expect(mainnetResponse.statusCode).toBe(StatusCodes.OK);
      expect(testnetResponse.statusCode).toBe(StatusCodes.OK);

      const mainnetData = JSON.parse(mainnetResponse.body);
      const testnetData = JSON.parse(testnetResponse.body);

      // Both should have same structure
      expect(mainnetData).toMatchObject({
        address: expect.any(String),
        baseToken: expect.objectContaining({ symbol: 'TON' }),
        quoteToken: expect.objectContaining({ symbol: 'USDT' }),
        reserves: expect.any(Array),
        fee: expect.any(Number),
        poolType: expect.any(String),
      });

      expect(testnetData).toMatchObject({
        address: expect.any(String),
        baseToken: expect.objectContaining({ symbol: 'TON' }),
        quoteToken: expect.objectContaining({ symbol: 'USDT' }),
        reserves: expect.any(Array),
        fee: expect.any(Number),
        poolType: expect.any(String),
      });

      // Addresses should be different (different networks)
      expect(mainnetData.address).not.toBe(testnetData.address);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent pools gracefully', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/connectors/dedust/amm/pool-info?baseToken=NONEXISTENT&quoteToken=ALSONONEXISTENT',
      });

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
      const errorData = JSON.parse(response.body);
      expect(errorData.message).toContain('pool');
    });

    it('should handle insufficient balance scenarios', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/connectors/dedust/amm/add-liquidity',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: testWalletAddress,
          baseToken: 'TON',
          quoteToken: 'USDT',
          baseAmount: '999999999.0',
          quoteAmount: '999999999.0',
        }),
      });

      expect(response.statusCode).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      const errorData = JSON.parse(response.body);
      expect(errorData.message).toContain('balance');
    });

    it('should validate slippage parameters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/connectors/dedust/amm/add-liquidity',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: testWalletAddress,
          baseToken: 'TON',
          quoteToken: 'USDT',
          baseAmount: '1.0',
          quoteAmount: '5.0',
          slippage: 51, // Over 50% limit
        }),
      });

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
    });
  });

  describe('Performance and Efficiency', () => {
    it('should respond to pool queries within reasonable time', async () => {
      const startTime = Date.now();

      const response = await app.inject({
        method: 'GET',
        url: '/connectors/dedust/amm/pool-info?baseToken=TON&quoteToken=USDT',
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(responseTime).toBeLessThan(2000); // Less than 2 seconds
    });

    it('should handle concurrent position queries', async () => {
      const promises = Array.from({ length: 3 }, () =>
        app.inject({
          method: 'GET',
          url: `/connectors/dedust/amm/position-info?walletAddress=${testWalletAddress}&baseToken=TON&quoteToken=USDT`,
        })
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.statusCode).toBe(StatusCodes.OK);
        const data = JSON.parse(response.body);
        expect(data.walletAddress).toBe(testWalletAddress);
      });
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should maintain consistent price calculations', async () => {
      const poolResponse = await app.inject({
        method: 'GET',
        url: '/connectors/dedust/amm/pool-info?baseToken=TON&quoteToken=USDT',
      });

      expect(poolResponse.statusCode).toBe(StatusCodes.OK);
      const poolData = JSON.parse(poolResponse.body);

      // Calculate implied price from reserves
      const baseReserve = parseFloat(poolData.reserves[0]);
      const quoteReserve = parseFloat(poolData.reserves[1]);
      const impliedPrice = quoteReserve / baseReserve;
      const reportedPrice = parseFloat(poolData.price);

      // Prices should be reasonably close
      expect(Math.abs(impliedPrice - reportedPrice) / reportedPrice).toBeLessThan(0.01); // Within 1%
    });

    it('should validate reserve and supply relationships', async () => {
      const poolResponse = await app.inject({
        method: 'GET',
        url: '/connectors/dedust/amm/pool-info?baseToken=TON&quoteToken=USDT',
      });

      expect(poolResponse.statusCode).toBe(StatusCodes.OK);
      const poolData = JSON.parse(poolResponse.body);

      // Reserves should be positive
      expect(parseFloat(poolData.reserves[0])).toBeGreaterThan(0);
      expect(parseFloat(poolData.reserves[1])).toBeGreaterThan(0);

      // Total supply should be positive
      expect(parseFloat(poolData.totalSupply)).toBeGreaterThan(0);

      // Price should be positive
      expect(parseFloat(poolData.price)).toBeGreaterThan(0);
    });
  });
});