import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { gatewayApp } from '../../src/app';

describe('DeDust Router Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = gatewayApp;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const testWalletAddress = 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N';

  describe('Quote to Execution Flow', () => {
    let quoteId: string;

    it('should generate quote and validate quote data', async () => {
      const quoteResponse = await app.inject({
        method: 'POST',
        url: '/connectors/dedust/router/quote-swap',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseToken: 'TON',
          quoteToken: 'USDT',
          amount: '1.0',
          side: 'SELL',
          slippage: 0.5,
        }),
      });

      expect(quoteResponse.statusCode).toBe(StatusCodes.OK);
      const quoteData = JSON.parse(quoteResponse.body);

      // Validate quote structure
      expect(quoteData).toMatchObject({
        route: expect.any(Array),
        amountIn: expect.any(String),
        amountOut: expect.any(String),
        amountOutMin: expect.any(String),
        priceImpact: expect.any(Number),
        gasEstimate: expect.any(String),
        ttl: expect.any(Number),
        slippage: 0.5,
        quoteId: expect.any(String),
      });

      // Validate route details
      expect(quoteData.route.length).toBeGreaterThan(0);
      quoteData.route.forEach((hop: any) => {
        expect(hop).toMatchObject({
          pool: expect.any(String),
          tokenIn: expect.any(String),
          tokenOut: expect.any(String),
          amountIn: expect.any(String),
          amountOut: expect.any(String),
          poolType: expect.stringMatching(/^(volatile|stable)$/),
        });
      });

      // Validate amounts are reasonable
      expect(parseFloat(quoteData.amountIn)).toBe(1.0);
      expect(parseFloat(quoteData.amountOut)).toBeGreaterThan(0);
      expect(parseFloat(quoteData.amountOutMin)).toBeLessThanOrEqual(parseFloat(quoteData.amountOut));

      // Validate price impact is reasonable
      expect(quoteData.priceImpact).toBeGreaterThanOrEqual(0);
      expect(quoteData.priceImpact).toBeLessThan(10); // Less than 10% for this amount

      // Validate TTL is in the future
      expect(quoteData.ttl).toBeGreaterThan(Date.now() / 1000);

      quoteId = quoteData.quoteId;
    });

    it('should execute swap using generated quote ID', async () => {
      const executeResponse = await app.inject({
        method: 'POST',
        url: '/connectors/dedust/router/execute-swap',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: testWalletAddress,
          quoteId: quoteId,
          baseToken: 'TON',
          quoteToken: 'USDT',
          amount: '1.0',
          side: 'SELL',
          slippage: 0.5,
        }),
      });

      expect(executeResponse.statusCode).toBe(StatusCodes.OK);
      const executeData = JSON.parse(executeResponse.body);

      expect(executeData).toMatchObject({
        txHash: expect.any(String),
        nonce: expect.any(Number),
        expectedAmountOut: expect.any(String),
        actualAmountOut: expect.any(String),
        priceImpact: expect.any(Number),
        gasUsed: expect.any(String),
        fee: expect.any(String),
        route: expect.any(Array),
      });

      expect(executeData.txHash).toMatch(/^[a-fA-F0-9]{64}$/);
    });
  });

  describe('Quote Execution Alternative Flow', () => {
    let quoteId: string;

    it('should generate quote for alternative execution method', async () => {
      const quoteResponse = await app.inject({
        method: 'POST',
        url: '/connectors/dedust/router/quote-swap',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseToken: 'TON',
          quoteToken: 'USDT',
          amount: '50.0',
          side: 'BUY',
          slippage: 1.0,
        }),
      });

      expect(quoteResponse.statusCode).toBe(StatusCodes.OK);
      const quoteData = JSON.parse(quoteResponse.body);
      quoteId = quoteData.quoteId;

      // Validate BUY side quote
      expect(parseFloat(quoteData.amountOut)).toBe(50.0);
      expect(parseFloat(quoteData.amountIn)).toBeGreaterThan(0);
    });

    it('should execute quote using execute-quote endpoint', async () => {
      const executeResponse = await app.inject({
        method: 'POST',
        url: '/connectors/dedust/router/execute-quote',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: testWalletAddress,
          quoteId: quoteId,
          maxSlippage: 1.0,
        }),
      });

      expect(executeResponse.statusCode).toBe(StatusCodes.OK);
      const executeData = JSON.parse(executeResponse.body);

      expect(executeData).toMatchObject({
        txHash: expect.any(String),
        nonce: expect.any(Number),
        executedAmountIn: expect.any(String),
        executedAmountOut: expect.any(String),
        executionPrice: expect.any(String),
        priceImpact: expect.any(Number),
        gasUsed: expect.any(String),
        gasCost: expect.any(String),
        fee: expect.any(String),
        route: expect.any(Array),
        quoteId: quoteId,
        executedAt: expect.any(Number),
      });
    });
  });

  describe('Multi-Hop Route Validation', () => {
    it('should handle complex multi-hop routes', async () => {
      // Test a route that might require multiple hops
      const quoteResponse = await app.inject({
        method: 'POST',
        url: '/connectors/dedust/router/quote-swap',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseToken: 'TON',
          quoteToken: 'USDC', // Might require TON -> USDT -> USDC
          amount: '5.0',
          side: 'SELL',
          slippage: 1.0,
        }),
      });

      expect(quoteResponse.statusCode).toBe(StatusCodes.OK);
      const quoteData = JSON.parse(quoteResponse.body);

      // Validate route consistency
      let totalAmountIn = 0;
      let totalAmountOut = 0;

      for (let i = 0; i < quoteData.route.length; i++) {
        const hop = quoteData.route[i];

        if (i === 0) {
          // First hop should start with base token
          totalAmountIn += parseFloat(hop.amountIn);
        }

        if (i === quoteData.route.length - 1) {
          // Last hop should end with quote token
          totalAmountOut += parseFloat(hop.amountOut);
        }

        // Validate each hop has valid pool type
        expect(['volatile', 'stable']).toContain(hop.poolType);
      }

      // For complex routes, validate amounts make sense
      expect(totalAmountIn).toBeCloseTo(5.0, 2);
      expect(totalAmountOut).toBeGreaterThan(0);
    });
  });

  describe('Cross-Network Consistency', () => {
    it('should provide consistent quotes across mainnet and testnet', async () => {
      // Mainnet quote
      const mainnetQuote = await app.inject({
        method: 'POST',
        url: '/connectors/dedust/router/quote-swap',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseToken: 'TON',
          quoteToken: 'USDT',
          amount: '1.0',
          side: 'SELL',
        }),
      });

      // Testnet quote
      const testnetQuote = await app.inject({
        method: 'POST',
        url: '/connectors/dedust/router/quote-swap',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          network: 'testnet',
          baseToken: 'TON',
          quoteToken: 'USDT',
          amount: '1.0',
          side: 'SELL',
        }),
      });

      expect(mainnetQuote.statusCode).toBe(StatusCodes.OK);
      expect(testnetQuote.statusCode).toBe(StatusCodes.OK);

      const mainnetData = JSON.parse(mainnetQuote.body);
      const testnetData = JSON.parse(testnetQuote.body);

      // Both should have similar structure
      expect(mainnetData).toMatchObject({
        route: expect.any(Array),
        amountIn: expect.any(String),
        amountOut: expect.any(String),
        priceImpact: expect.any(Number),
        quoteId: expect.any(String),
      });

      expect(testnetData).toMatchObject({
        route: expect.any(Array),
        amountIn: expect.any(String),
        amountOut: expect.any(String),
        priceImpact: expect.any(Number),
        quoteId: expect.any(String),
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle quote expiration gracefully', async () => {
      // Try to execute with an expired/invalid quote ID
      const executeResponse = await app.inject({
        method: 'POST',
        url: '/connectors/dedust/router/execute-quote',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: testWalletAddress,
          quoteId: 'expired_quote_12345',
          maxSlippage: 1.0,
        }),
      });

      expect([StatusCodes.NOT_FOUND, StatusCodes.GONE]).toContain(executeResponse.statusCode);
    });

    it('should handle insufficient liquidity scenarios', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/connectors/dedust/router/quote-swap',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseToken: 'NONEXISTENT',
          quoteToken: 'ALSONONEXISTENT',
          amount: '1000000.0',
          side: 'SELL',
        }),
      });

      expect(response.statusCode).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      const errorData = JSON.parse(response.body);
      expect(errorData.message).toContain('route');
    });

    it('should validate slippage parameters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/connectors/dedust/router/quote-swap',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseToken: 'TON',
          quoteToken: 'USDT',
          amount: '1.0',
          side: 'SELL',
          slippage: 51, // Over 50% limit
        }),
      });

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
    });
  });

  describe('Performance and Efficiency', () => {
    it('should generate quotes within reasonable time', async () => {
      const startTime = Date.now();

      const response = await app.inject({
        method: 'POST',
        url: '/connectors/dedust/router/quote-swap',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseToken: 'TON',
          quoteToken: 'USDT',
          amount: '1.0',
          side: 'SELL',
        }),
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(responseTime).toBeLessThan(3000); // Less than 3 seconds
    });

    it('should handle concurrent quote requests', async () => {
      const promises = Array.from({ length: 5 }, () =>
        app.inject({
          method: 'POST',
          url: '/connectors/dedust/router/quote-swap',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baseToken: 'TON',
            quoteToken: 'USDT',
            amount: '1.0',
            side: 'SELL',
          }),
        })
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.statusCode).toBe(StatusCodes.OK);
        const data = JSON.parse(response.body);
        expect(data.quoteId).toBeDefined();
      });

      // All quote IDs should be unique
      const quoteIds = responses.map((r) => JSON.parse(r.body).quoteId);
      const uniqueQuoteIds = new Set(quoteIds);
      expect(uniqueQuoteIds.size).toBe(quoteIds.length);
    });
  });

  describe('Price Impact and Risk Management', () => {
    it('should calculate reasonable price impact for small trades', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/connectors/dedust/router/quote-swap',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseToken: 'TON',
          quoteToken: 'USDT',
          amount: '0.1', // Small amount
          side: 'SELL',
        }),
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      const data = JSON.parse(response.body);

      // Small trades should have minimal price impact
      expect(data.priceImpact).toBeLessThan(1); // Less than 1%
    });

    it('should show higher price impact for large trades', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/connectors/dedust/router/quote-swap',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseToken: 'TON',
          quoteToken: 'USDT',
          amount: '1000.0', // Large amount
          side: 'SELL',
        }),
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      const data = JSON.parse(response.body);

      // Large trades should have higher price impact
      expect(data.priceImpact).toBeGreaterThan(0.1); // More than 0.1%
    });
  });
});