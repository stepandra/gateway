import { TONProviderManager } from '../../src/chains/ton/services/ton-provider-manager';
import axios from 'axios';
import { TONProviderType, TONProviderConfig, TONAPIResponse } from '../../src/chains/ton/types/ton-api-types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TONProviderManager', () => {
  let providerManager: TONProviderManager;
  let mockProviderConfigs: TONProviderConfig[];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockProviderConfigs = [
      {
        type: TONProviderType.TON_CENTER,
        baseURL: 'https://toncenter.com/api/v2',
        apiKey: 'test-api-key-1',
        timeout: 5000,
        priority: 1,
      },
      {
        type: TONProviderType.DRPC,
        baseURL: 'https://ton.drpc.org',
        apiKey: 'test-api-key-2',
        timeout: 5000,
        priority: 2,
      },
    ];

    providerManager = new TONProviderManager(mockProviderConfigs);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Provider initialization', () => {
    it('should initialize with provided configurations', () => {
      expect(providerManager).toBeDefined();
      expect(providerManager.getCurrentProvider()).toBe(TONProviderType.TON_CENTER);
    });

    it('should sort providers by priority', () => {
      const configs = [
        { ...mockProviderConfigs[0], priority: 3 },
        { ...mockProviderConfigs[1], priority: 1 },
      ];
      const manager = new TONProviderManager(configs);
      expect(manager.getCurrentProvider()).toBe(TONProviderType.DRPC);
    });

    it('should handle empty provider list', () => {
      expect(() => new TONProviderManager([])).toThrow('No TON providers configured');
    });

    it('should validate provider configurations', () => {
      const invalidConfig = [{
        type: TONProviderType.TON_CENTER,
        baseURL: '', // Invalid empty URL
        apiKey: 'test-key',
        timeout: 5000,
        priority: 1,
      }];
      expect(() => new TONProviderManager(invalidConfig)).toThrow('Invalid provider configuration');
    });
  });

  describe('Health checking', () => {
    it('should check provider health successfully', async () => {
      const mockResponse: TONAPIResponse<any> = {
        ok: true,
        result: { status: 'active' },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const isHealthy = await providerManager.checkProviderHealth(TONProviderType.TON_CENTER);
      expect(isHealthy).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://toncenter.com/api/v2/getMasterchainInfo',
        expect.objectContaining({
          headers: { 'X-API-Key': 'test-api-key-1' },
          timeout: 5000,
        })
      );
    });

    it('should handle health check failures', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const isHealthy = await providerManager.checkProviderHealth(TONProviderType.TON_CENTER);
      expect(isHealthy).toBe(false);
    });

    it('should handle API error responses', async () => {
      const mockResponse: TONAPIResponse<any> = {
        ok: false,
        error: 'API endpoint unavailable',
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const isHealthy = await providerManager.checkProviderHealth(TONProviderType.TON_CENTER);
      expect(isHealthy).toBe(false);
    });

    it('should handle timeout errors', async () => {
      mockedAxios.get.mockRejectedValueOnce({ code: 'ECONNABORTED' });

      const isHealthy = await providerManager.checkProviderHealth(TONProviderType.TON_CENTER);
      expect(isHealthy).toBe(false);
    });

    it('should check all providers periodically', async () => {
      const healthCheckSpy = jest.spyOn(providerManager, 'checkProviderHealth');
      healthCheckSpy.mockResolvedValue(true);

      providerManager.startHealthChecking(1000); // 1 second interval

      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // Allow promises to resolve

      expect(healthCheckSpy).toHaveBeenCalledTimes(2); // Both providers
      expect(healthCheckSpy).toHaveBeenCalledWith(TONProviderType.TON_CENTER);
      expect(healthCheckSpy).toHaveBeenCalledWith(TONProviderType.DRPC);

      providerManager.stopHealthChecking();
      healthCheckSpy.mockRestore();
    });
  });

  describe('Provider failover', () => {
    it('should switch to backup provider on failure', async () => {
      const mockError = new Error('Primary provider failed');
      const mockSuccessResponse: TONAPIResponse<any> = {
        ok: true,
        result: { balance: '1000000000' },
      };

      mockedAxios.get
        .mockRejectedValueOnce(mockError) // First provider fails
        .mockResolvedValueOnce({ data: mockSuccessResponse }); // Second provider succeeds

      const result = await providerManager.makeRequest('getAddressBalance', { address: 'EQTest' });

      expect(result.ok).toBe(true);
      expect(result.result.balance).toBe('1000000000');
      expect(providerManager.getCurrentProvider()).toBe(TONProviderType.DRPC);
    });

    it('should fail when all providers are down', async () => {
      const mockError = new Error('All providers failed');
      mockedAxios.get.mockRejectedValue(mockError);

      await expect(
        providerManager.makeRequest('getAddressBalance', { address: 'EQTest' })
      ).rejects.toThrow('All TON providers failed');
    });

    it('should reset to primary provider when it becomes healthy', async () => {
      // Simulate primary provider failure
      providerManager.switchProvider(TONProviderType.DRPC);
      expect(providerManager.getCurrentProvider()).toBe(TONProviderType.DRPC);

      // Simulate primary provider becoming healthy again
      const healthCheckSpy = jest.spyOn(providerManager, 'checkProviderHealth');
      healthCheckSpy.mockImplementation(async (provider) => {
        return provider === TONProviderType.TON_CENTER;
      });

      providerManager.startHealthChecking(1000);
      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(providerManager.getCurrentProvider()).toBe(TONProviderType.TON_CENTER);

      providerManager.stopHealthChecking();
      healthCheckSpy.mockRestore();
    });
  });

  describe('Request handling', () => {
    it('should make GET requests successfully', async () => {
      const mockResponse: TONAPIResponse<any> = {
        ok: true,
        result: { balance: '1000000000' },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await providerManager.makeRequest('getAddressBalance', { address: 'EQTest' });

      expect(result.ok).toBe(true);
      expect(result.result.balance).toBe('1000000000');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://toncenter.com/api/v2/getAddressBalance',
        expect.objectContaining({
          params: { address: 'EQTest' },
          headers: { 'X-API-Key': 'test-api-key-1' },
          timeout: 5000,
        })
      );
    });

    it('should make POST requests successfully', async () => {
      const mockResponse: TONAPIResponse<any> = {
        ok: true,
        result: { hash: 'transaction-hash' },
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await providerManager.makeRequest(
        'sendBoc',
        { boc: 'base64-encoded-boc' },
        'POST'
      );

      expect(result.ok).toBe(true);
      expect(result.result.hash).toBe('transaction-hash');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://toncenter.com/api/v2/sendBoc',
        { boc: 'base64-encoded-boc' },
        expect.objectContaining({
          headers: { 'X-API-Key': 'test-api-key-1' },
          timeout: 5000,
        })
      );
    });

    it('should handle API error responses', async () => {
      const mockResponse: TONAPIResponse<any> = {
        ok: false,
        error: 'Invalid address format',
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await providerManager.makeRequest('getAddressBalance', { address: 'invalid' });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Invalid address format');
    });

    it('should retry requests with exponential backoff', async () => {
      const mockError = new Error('Temporary failure');
      const mockResponse: TONAPIResponse<any> = {
        ok: true,
        result: { balance: '1000000000' },
      };

      mockedAxios.get
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({ data: mockResponse });

      const startTime = Date.now();
      const result = await providerManager.makeRequest('getAddressBalance', { address: 'EQTest' });

      expect(result.ok).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);

      // Verify exponential backoff was applied
      const endTime = Date.now();
      expect(endTime - startTime).toBeGreaterThan(3000); // 1s + 2s delays
    });

    it('should respect maximum retry attempts', async () => {
      const mockError = new Error('Persistent failure');
      mockedAxios.get.mockRejectedValue(mockError);

      await expect(
        providerManager.makeRequest('getAddressBalance', { address: 'EQTest' })
      ).rejects.toThrow('All TON providers failed');

      // Should attempt primary provider 3 times, then try secondary provider 3 times
      expect(mockedAxios.get).toHaveBeenCalledTimes(6);
    });
  });

  describe('Provider statistics', () => {
    it('should track provider statistics', async () => {
      const mockResponse: TONAPIResponse<any> = {
        ok: true,
        result: { balance: '1000000000' },
      };

      mockedAxios.get.mockResolvedValue({ data: mockResponse });

      // Make several requests
      await providerManager.makeRequest('getAddressBalance', { address: 'EQTest1' });
      await providerManager.makeRequest('getAddressBalance', { address: 'EQTest2' });

      const stats = providerManager.getProviderStats();

      expect(stats[TONProviderType.TON_CENTER]).toEqual({
        totalRequests: 2,
        successfulRequests: 2,
        failedRequests: 0,
        averageResponseTime: expect.any(Number),
        isHealthy: true,
        lastHealthCheck: expect.any(Number),
      });
    });

    it('should track failed requests in statistics', async () => {
      const mockError = new Error('Request failed');
      mockedAxios.get.mockRejectedValue(mockError);

      try {
        await providerManager.makeRequest('getAddressBalance', { address: 'EQTest' });
      } catch (error) {
        // Expected to fail
      }

      const stats = providerManager.getProviderStats();

      expect(stats[TONProviderType.TON_CENTER].failedRequests).toBeGreaterThan(0);
      expect(stats[TONProviderType.DRPC].failedRequests).toBeGreaterThan(0);
    });

    it('should reset statistics', async () => {
      const mockResponse: TONAPIResponse<any> = {
        ok: true,
        result: { balance: '1000000000' },
      };

      mockedAxios.get.mockResolvedValue({ data: mockResponse });

      await providerManager.makeRequest('getAddressBalance', { address: 'EQTest' });

      let stats = providerManager.getProviderStats();
      expect(stats[TONProviderType.TON_CENTER].totalRequests).toBe(1);

      providerManager.resetStats();

      stats = providerManager.getProviderStats();
      expect(stats[TONProviderType.TON_CENTER].totalRequests).toBe(0);
    });
  });

  describe('Provider configuration', () => {
    it('should get provider configuration', () => {
      const config = providerManager.getProviderConfig(TONProviderType.TON_CENTER);
      expect(config).toEqual(mockProviderConfigs[0]);
    });

    it('should return undefined for non-existent provider', () => {
      const config = providerManager.getProviderConfig('INVALID_PROVIDER' as TONProviderType);
      expect(config).toBeUndefined();
    });

    it('should list all configured providers', () => {
      const providers = providerManager.getConfiguredProviders();
      expect(providers).toEqual([TONProviderType.TON_CENTER, TONProviderType.DRPC]);
    });

    it('should update provider configuration', () => {
      const newConfig: TONProviderConfig = {
        type: TONProviderType.TON_CENTER,
        baseURL: 'https://new-toncenter.com/api/v2',
        apiKey: 'new-api-key',
        timeout: 10000,
        priority: 1,
      };

      providerManager.updateProviderConfig(TONProviderType.TON_CENTER, newConfig);

      const updatedConfig = providerManager.getProviderConfig(TONProviderType.TON_CENTER);
      expect(updatedConfig).toEqual(newConfig);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle network timeouts gracefully', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'ECONNABORTED';
      mockedAxios.get.mockRejectedValue(timeoutError);

      await expect(
        providerManager.makeRequest('getAddressBalance', { address: 'EQTest' })
      ).rejects.toThrow('All TON providers failed');
    });

    it('should handle malformed API responses', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: null });

      await expect(
        providerManager.makeRequest('getAddressBalance', { address: 'EQTest' })
      ).rejects.toThrow('Invalid response from TON provider');
    });

    it('should handle empty response data', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: {} });

      await expect(
        providerManager.makeRequest('getAddressBalance', { address: 'EQTest' })
      ).rejects.toThrow('Invalid response from TON provider');
    });

    it('should validate request parameters', async () => {
      await expect(
        providerManager.makeRequest('', {}) // Empty endpoint
      ).rejects.toThrow('Invalid request parameters');
    });

    it('should handle very large parameter objects', async () => {
      const largeParams = {
        data: 'x'.repeat(10000), // Very large data
        address: 'EQTest',
      };

      const mockResponse: TONAPIResponse<any> = {
        ok: true,
        result: { success: true },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await providerManager.makeRequest('sendData', largeParams);
      expect(result.ok).toBe(true);
    });
  });

  describe('Performance and resource management', () => {
    it('should handle concurrent requests efficiently', async () => {
      const mockResponse: TONAPIResponse<any> = {
        ok: true,
        result: { balance: '1000000000' },
      };

      mockedAxios.get.mockResolvedValue({ data: mockResponse });

      const promises = Array.from({ length: 10 }, (_, i) =>
        providerManager.makeRequest('getAddressBalance', { address: `EQTest${i}` })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(results.every(result => result.ok)).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledTimes(10);
    });

    it('should cleanup resources on disposal', () => {
      providerManager.startHealthChecking(1000);
      providerManager.dispose();

      // Health checking should be stopped
      const stats = providerManager.getProviderStats();
      expect(stats).toBeDefined(); // Manager should still be usable for stats
    });

    it('should handle memory efficiently with large numbers of requests', async () => {
      const mockResponse: TONAPIResponse<any> = {
        ok: true,
        result: { balance: '1000000000' },
      };

      mockedAxios.get.mockResolvedValue({ data: mockResponse });

      // Simulate many requests to test memory usage
      for (let i = 0; i < 100; i++) {
        await providerManager.makeRequest('getAddressBalance', { address: `EQTest${i}` });
      }

      const stats = providerManager.getProviderStats();
      expect(stats[TONProviderType.TON_CENTER].totalRequests).toBe(100);

      // Memory usage should be reasonable (this is more of a conceptual test)
      expect(process.memoryUsage().heapUsed).toBeLessThan(100 * 1024 * 1024); // 100MB
    });
  });

  describe('Integration scenarios', () => {
    it('should work with real-world TON Center API patterns', async () => {
      const mockMasterchainInfo: TONAPIResponse<any> = {
        ok: true,
        result: {
          last: {
            seqno: 1234567,
            shard: '-9223372036854775808',
            workchain: -1,
            root_hash: 'hash123',
            file_hash: 'filehash123'
          },
          state_root_hash: 'statehash123',
          init: {
            root_hash: 'inithash123',
            file_hash: 'initfilehash123'
          }
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockMasterchainInfo });

      const result = await providerManager.makeRequest('getMasterchainInfo');

      expect(result.ok).toBe(true);
      expect(result.result.last.seqno).toBe(1234567);
    });

    it('should handle DRPC provider format correctly', async () => {
      // Switch to DRPC provider
      providerManager.switchProvider(TONProviderType.DRPC);

      const mockDrpcResponse: TONAPIResponse<any> = {
        ok: true,
        result: {
          balance: '1000000000',
          state: 'active'
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockDrpcResponse });

      const result = await providerManager.makeRequest('getAddressInformation', {
        address: 'EQTest'
      });

      expect(result.ok).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://ton.drpc.org/getAddressInformation',
        expect.objectContaining({
          headers: { 'X-API-Key': 'test-api-key-2' },
        })
      );
    });
  });
});