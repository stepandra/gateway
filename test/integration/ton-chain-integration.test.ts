import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { gatewayApp } from '../../src/app';

describe('TON Chain Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = gatewayApp;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const testWalletAddress = 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N';
  const testToAddress = 'EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt';

  describe('Chain Status and Health Check', () => {
    it('should check chain status before operations', async () => {
      const statusResponse = await app.inject({
        method: 'GET',
        url: '/chains/ton/status',
      });

      expect(statusResponse.statusCode).toBe(StatusCodes.OK);
      const status = JSON.parse(statusResponse.body);
      expect(status.isConnected).toBe(true);
      expect(status.currentBlockNumber).toBeGreaterThan(0);
    });
  });

  describe('Token Management Flow', () => {
    it('should retrieve available tokens and validate balance queries', async () => {
      // Get available tokens
      const tokensResponse = await app.inject({
        method: 'GET',
        url: '/chains/ton/tokens?tokenSymbols=TON,USDT',
      });

      expect(tokensResponse.statusCode).toBe(StatusCodes.OK);
      const tokensData = JSON.parse(tokensResponse.body);
      expect(tokensData.tokens).toHaveLength(2);

      const tonToken = tokensData.tokens.find((t: any) => t.symbol === 'TON');
      const usdtToken = tokensData.tokens.find((t: any) => t.symbol === 'USDT');

      expect(tonToken).toBeDefined();
      expect(usdtToken).toBeDefined();

      // Check balances for retrieved tokens
      const balancesResponse = await app.inject({
        method: 'POST',
        url: '/chains/ton/balances',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: testWalletAddress,
          tokens: ['TON', 'USDT'],
        }),
      });

      expect(balancesResponse.statusCode).toBe(StatusCodes.OK);
      const balances = JSON.parse(balancesResponse.body);
      expect(balances.balances).toHaveProperty('TON');
      expect(balances.balances).toHaveProperty('USDT');
    });
  });

  describe('Gas Estimation and Transaction Flow', () => {
    it('should estimate gas for TON transfer and validate estimation', async () => {
      const gasResponse = await app.inject({
        method: 'POST',
        url: '/chains/ton/estimate-gas',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAddress: testWalletAddress,
          toAddress: testToAddress,
          value: '1.0',
          token: 'TON',
        }),
      });

      expect(gasResponse.statusCode).toBe(StatusCodes.OK);
      const gasData = JSON.parse(gasResponse.body);

      expect(parseFloat(gasData.gasEstimate)).toBeGreaterThan(0);
      expect(parseFloat(gasData.gasCost)).toBeGreaterThan(0);
      expect(parseFloat(gasData.maxFee)).toBeGreaterThan(0);

      // Validate gas estimate is reasonable (not too high/low)
      expect(parseFloat(gasData.gasEstimate)).toBeLessThan(1000000); // Less than 1M gas
      expect(parseFloat(gasData.gasCost)).toBeLessThan(1); // Less than 1 TON
    });

    it('should estimate gas for jetton transfer', async () => {
      const gasResponse = await app.inject({
        method: 'POST',
        url: '/chains/ton/estimate-gas',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAddress: testWalletAddress,
          toAddress: testToAddress,
          value: '100.0',
          token: 'USDT',
        }),
      });

      expect(gasResponse.statusCode).toBe(StatusCodes.OK);
      const gasData = JSON.parse(gasResponse.body);

      // Jetton transfers should cost more gas than native TON
      expect(parseFloat(gasData.gasEstimate)).toBeGreaterThan(50000);
    });
  });

  describe('Cross-Network Compatibility', () => {
    it('should work consistently across mainnet and testnet', async () => {
      // Test mainnet status
      const mainnetStatus = await app.inject({
        method: 'GET',
        url: '/chains/ton/status',
      });
      expect(mainnetStatus.statusCode).toBe(StatusCodes.OK);

      // Test testnet status
      const testnetStatus = await app.inject({
        method: 'GET',
        url: '/chains/ton/status?network=testnet',
      });
      expect(testnetStatus.statusCode).toBe(StatusCodes.OK);

      // Both should have similar structure
      const mainnetData = JSON.parse(mainnetStatus.body);
      const testnetData = JSON.parse(testnetStatus.body);

      expect(mainnetData).toMatchObject({
        network: 'mainnet',
        isConnected: expect.any(Boolean),
        currentBlockNumber: expect.any(Number),
      });

      expect(testnetData).toMatchObject({
        network: 'testnet',
        isConnected: expect.any(Boolean),
        currentBlockNumber: expect.any(Number),
      });
    });

    it('should retrieve tokens consistently across networks', async () => {
      // Get mainnet tokens
      const mainnetTokens = await app.inject({
        method: 'GET',
        url: '/chains/ton/tokens',
      });

      // Get testnet tokens
      const testnetTokens = await app.inject({
        method: 'GET',
        url: '/chains/ton/tokens?network=testnet',
      });

      expect(mainnetTokens.statusCode).toBe(StatusCodes.OK);
      expect(testnetTokens.statusCode).toBe(StatusCodes.OK);

      const mainnetData = JSON.parse(mainnetTokens.body);
      const testnetData = JSON.parse(testnetTokens.body);

      // Both should have TON token
      const mainnetTon = mainnetData.tokens.find((t: any) => t.symbol === 'TON');
      const testnetTon = testnetData.tokens.find((t: any) => t.symbol === 'TON');

      expect(mainnetTon).toBeDefined();
      expect(testnetTon).toBeDefined();
      expect(mainnetTon.decimals).toBe(testnetTon.decimals);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle invalid addresses gracefully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/chains/ton/balances',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: 'invalid-address',
          tokens: ['TON'],
        }),
      });

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      const errorData = JSON.parse(response.body);
      expect(errorData.message).toContain('address');
    });

    it('should handle network connectivity issues', async () => {
      // Test with invalid network
      const response = await app.inject({
        method: 'GET',
        url: '/chains/ton/status?network=invalidnet',
      });

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
    });

    it('should validate transaction hash format in poll', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/chains/ton/poll',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: 'invalid-hash-format',
        }),
      });

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
    });
  });

  describe('Performance and Timeout Handling', () => {
    it('should respond within reasonable time limits', async () => {
      const startTime = Date.now();

      const response = await app.inject({
        method: 'GET',
        url: '/chains/ton/status',
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(responseTime).toBeLessThan(5000); // Less than 5 seconds
    });

    it('should handle balance queries efficiently', async () => {
      const startTime = Date.now();

      const response = await app.inject({
        method: 'POST',
        url: '/chains/ton/balances',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: testWalletAddress,
          tokens: ['TON', 'USDT'],
        }),
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(responseTime).toBeLessThan(3000); // Less than 3 seconds
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should return consistent token data format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/chains/ton/tokens?tokenSymbols=TON',
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      const data = JSON.parse(response.body);

      expect(data.tokens[0]).toMatchObject({
        symbol: 'TON',
        address: expect.any(String),
        decimals: expect.any(Number),
        name: expect.any(String),
      });

      // Validate TON specific properties
      expect(data.tokens[0].symbol).toBe('TON');
      expect(data.tokens[0].decimals).toBe(9);
    });

    it('should maintain consistent address format validation', async () => {
      // Valid address should work
      const validResponse = await app.inject({
        method: 'POST',
        url: '/chains/ton/balances',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: testWalletAddress,
          tokens: ['TON'],
        }),
      });
      expect(validResponse.statusCode).toBe(StatusCodes.OK);

      // Invalid address should fail consistently
      const invalidResponse = await app.inject({
        method: 'POST',
        url: '/chains/ton/estimate-gas',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAddress: 'invalid',
          toAddress: testToAddress,
          value: '1.0',
          token: 'TON',
        }),
      });
      expect(invalidResponse.statusCode).toBe(StatusCodes.BAD_REQUEST);
    });
  });
});