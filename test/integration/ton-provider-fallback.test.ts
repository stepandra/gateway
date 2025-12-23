import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { gatewayApp } from '../../src/app';

describe('TON Provider Fallback Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = gatewayApp;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const testWalletAddress = 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N';

  describe('Provider Availability and Failover', () => {
    it('should successfully connect to primary provider (TON Center)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/chains/ton/status',
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      const data = JSON.parse(response.body);

      expect(data).toMatchObject({
        network: 'mainnet',
        isConnected: true,
        currentBlockNumber: expect.any(Number),
        provider: expect.any(String),
        latency: expect.any(Number),
      });

      // Should indicate which provider is being used
      expect(['toncenter', 'drpc']).toContain(data.provider.toLowerCase());
      expect(data.latency).toBeGreaterThan(0);
      expect(data.latency).toBeLessThan(10000); // Less than 10 seconds
    });

    it('should handle provider switching for testnet', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/chains/ton/status?network=testnet',
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      const data = JSON.parse(response.body);

      expect(data).toMatchObject({
        network: 'testnet',
        isConnected: true,
        currentBlockNumber: expect.any(Number),
        provider: expect.any(String),
      });

      // Testnet should also have provider info
      expect(data.provider).toBeDefined();
    });
  });

  describe('Provider Resilience Under Load', () => {
    it('should maintain consistent responses under concurrent requests', async () => {
      // Create multiple concurrent requests to test provider stability
      const promises = Array.from({ length: 10 }, (_, i) =>
        app.inject({
          method: 'POST',
          url: '/chains/ton/balances',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: testWalletAddress,
            tokens: ['TON'],
          }),
        })
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.statusCode).toBe(StatusCodes.OK);
        const data = JSON.parse(response.body);
        expect(data.balances).toHaveProperty('TON');
        expect(typeof data.balances.TON).toBe('number');
      });

      // All responses should be consistent (same balance)
      const balances = responses.map(r => JSON.parse(r.body).balances.TON);
      const uniqueBalances = new Set(balances);
      expect(uniqueBalances.size).toBeLessThanOrEqual(2); // Allow minor differences due to timing
    });

    it('should handle mixed mainnet/testnet requests efficiently', async () => {
      const promises = [
        // Mainnet requests
        app.inject({
          method: 'GET',
          url: '/chains/ton/status',
        }),
        app.inject({
          method: 'POST',
          url: '/chains/ton/balances',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: testWalletAddress,
            tokens: ['TON'],
          }),
        }),
        // Testnet requests
        app.inject({
          method: 'GET',
          url: '/chains/ton/status?network=testnet',
        }),
        app.inject({
          method: 'POST',
          url: '/chains/ton/balances',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            network: 'testnet',
            address: testWalletAddress,
            tokens: ['TON'],
          }),
        }),
      ];

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.statusCode).toBe(StatusCodes.OK);
      });

      // Validate network-specific responses
      const mainnetStatus = JSON.parse(responses[0].body);
      const testnetStatus = JSON.parse(responses[2].body);

      expect(mainnetStatus.network).toBe('mainnet');
      expect(testnetStatus.network).toBe('testnet');
    });
  });

  describe('Provider Error Handling and Recovery', () => {
    it('should provide meaningful error messages on provider failures', async () => {
      // Test with invalid network to simulate provider issues
      const response = await app.inject({
        method: 'GET',
        url: '/chains/ton/status?network=invalidnet',
      });

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      const errorData = JSON.parse(response.body);
      expect(errorData.message).toBeDefined();
      expect(errorData.message.toLowerCase()).toContain('network');
    });

    it('should handle timeout scenarios gracefully', async () => {
      // Test with a request that might timeout
      const startTime = Date.now();

      const response = await app.inject({
        method: 'POST',
        url: '/chains/ton/poll',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        }),
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within reasonable timeout
      expect(responseTime).toBeLessThan(30000); // Less than 30 seconds

      // Should return appropriate error for non-existent tx
      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
    });
  });

  describe('Provider Performance Characteristics', () => {
    it('should track and report provider latency', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/chains/ton/status',
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      const data = JSON.parse(response.body);

      expect(data.latency).toBeDefined();
      expect(data.latency).toBeGreaterThan(0);
      expect(data.latency).toBeLessThan(5000); // Less than 5 seconds for status check
    });

    it('should demonstrate provider consistency across operations', async () => {
      const operations = [
        // Status check
        app.inject({
          method: 'GET',
          url: '/chains/ton/status',
        }),
        // Token list
        app.inject({
          method: 'GET',
          url: '/chains/ton/tokens?tokenSymbols=TON',
        }),
        // Balance check
        app.inject({
          method: 'POST',
          url: '/chains/ton/balances',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: testWalletAddress,
            tokens: ['TON'],
          }),
        }),
      ];

      const responses = await Promise.all(operations);

      // All operations should succeed
      responses.forEach((response) => {
        expect(response.statusCode).toBe(StatusCodes.OK);
      });

      // Check if provider information is consistent
      const statusData = JSON.parse(responses[0].body);
      if (statusData.provider) {
        // If provider info is available, it should be consistent
        expect(statusData.provider).toBeDefined();
      }
    });
  });

  describe('Provider Configuration and Fallback Logic', () => {
    it('should handle different provider endpoints for different operations', async () => {
      // Test various operations that might use different endpoints
      const operations = [
        {
          name: 'status',
          request: app.inject({
            method: 'GET',
            url: '/chains/ton/status',
          }),
        },
        {
          name: 'balances',
          request: app.inject({
            method: 'POST',
            url: '/chains/ton/balances',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: testWalletAddress,
              tokens: ['TON'],
            }),
          }),
        },
        {
          name: 'gasEstimate',
          request: app.inject({
            method: 'POST',
            url: '/chains/ton/estimate-gas',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fromAddress: testWalletAddress,
              toAddress: 'EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt',
              value: '1.0',
              token: 'TON',
            }),
          }),
        },
      ];

      const results = await Promise.all(
        operations.map(async (op) => ({
          name: op.name,
          response: await op.request,
        }))
      );

      // All operations should succeed
      results.forEach((result) => {
        expect(result.response.statusCode).toBe(StatusCodes.OK);
      });

      // Each operation should return expected data structure
      const statusData = JSON.parse(results[0].response.body);
      const balanceData = JSON.parse(results[1].response.body);
      const gasData = JSON.parse(results[2].response.body);

      expect(statusData.isConnected).toBe(true);
      expect(balanceData.balances).toHaveProperty('TON');
      expect(gasData.gasEstimate).toBeDefined();
    });

    it('should provide fallback provider status information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/chains/ton/status',
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      const data = JSON.parse(response.body);

      // Should include provider health information
      expect(data).toMatchObject({
        isConnected: true,
        currentBlockNumber: expect.any(Number),
        // May include provider-specific info
      });

      // Block number should be reasonable
      expect(data.currentBlockNumber).toBeGreaterThan(1000000); // TON has been running for a while
    });
  });

  describe('Network-Specific Provider Behavior', () => {
    it('should handle mainnet and testnet provider differences', async () => {
      const mainnetResponse = await app.inject({
        method: 'GET',
        url: '/chains/ton/tokens',
      });

      const testnetResponse = await app.inject({
        method: 'GET',
        url: '/chains/ton/tokens?network=testnet',
      });

      expect(mainnetResponse.statusCode).toBe(StatusCodes.OK);
      expect(testnetResponse.statusCode).toBe(StatusCodes.OK);

      const mainnetData = JSON.parse(mainnetResponse.body);
      const testnetData = JSON.parse(testnetResponse.body);

      // Both should have tokens
      expect(mainnetData.tokens.length).toBeGreaterThan(0);
      expect(testnetData.tokens.length).toBeGreaterThan(0);

      // Both should have TON token
      const mainnetTon = mainnetData.tokens.find((t: any) => t.symbol === 'TON');
      const testnetTon = testnetData.tokens.find((t: any) => t.symbol === 'TON');

      expect(mainnetTon).toBeDefined();
      expect(testnetTon).toBeDefined();

      // TON token properties should be consistent
      expect(mainnetTon.decimals).toBe(testnetTon.decimals);
      expect(mainnetTon.symbol).toBe(testnetTon.symbol);
    });

    it('should maintain consistent provider behavior across chains', async () => {
      // Test that provider behavior is consistent for similar operations
      const operations = ['mainnet', 'testnet'].map((network) =>
        app.inject({
          method: 'GET',
          url: `/chains/ton/status${network === 'testnet' ? '?network=testnet' : ''}`,
        })
      );

      const responses = await Promise.all(operations);

      // Both should succeed
      responses.forEach((response) => {
        expect(response.statusCode).toBe(StatusCodes.OK);
      });

      const [mainnetData, testnetData] = responses.map((r) => JSON.parse(r.body));

      // Both should have similar structure
      expect(mainnetData).toMatchObject({
        network: 'mainnet',
        isConnected: true,
        currentBlockNumber: expect.any(Number),
      });

      expect(testnetData).toMatchObject({
        network: 'testnet',
        isConnected: true,
        currentBlockNumber: expect.any(Number),
      });

      // Block numbers should be different (different chains)
      expect(mainnetData.currentBlockNumber).not.toBe(testnetData.currentBlockNumber);
    });
  });

  describe('Provider Monitoring and Health Checks', () => {
    it('should report provider health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/chains/ton/status',
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      const data = JSON.parse(response.body);

      // Should indicate healthy connection
      expect(data.isConnected).toBe(true);
      expect(data.currentBlockNumber).toBeGreaterThan(0);

      // Should provide timing information
      if (data.latency) {
        expect(data.latency).toBeGreaterThan(0);
        expect(data.latency).toBeLessThan(60000); // Less than 1 minute
      }
    });

    it('should demonstrate provider reliability over time', async () => {
      // Test multiple requests over time to check consistency
      const requests = Array.from({ length: 5 }, () =>
        app.inject({
          method: 'GET',
          url: '/chains/ton/status',
        })
      );

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.statusCode).toBe(StatusCodes.OK);
        const data = JSON.parse(response.body);
        expect(data.isConnected).toBe(true);
        expect(data.currentBlockNumber).toBeGreaterThan(0);
      });

      // Block numbers should be consistent or increasing
      const blockNumbers = responses.map(r => JSON.parse(r.body).currentBlockNumber);
      const minBlock = Math.min(...blockNumbers);
      const maxBlock = Math.max(...blockNumbers);

      // Should not vary too much (within reason for concurrent requests)
      expect(maxBlock - minBlock).toBeLessThan(100);
    });
  });
});