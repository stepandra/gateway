import axios from 'axios';
import { performance } from 'perf_hooks';

// Performance test configuration
const GATEWAY_BASE_URL = 'http://localhost:15888';
const CONCURRENT_REQUESTS = 100;
const LOAD_TEST_DURATION = 30000; // 30 seconds
const ACCEPTABLE_RESPONSE_TIME = 500; // 500ms
const ACCEPTABLE_ERROR_RATE = 0.05; // 5%

interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  throughput: number;
}

interface RequestResult {
  success: boolean;
  responseTime: number;
  error?: string;
  statusCode?: number;
}

describe('DeDust Performance Tests', () => {
  const testTimeout = 60000; // 60 seconds for performance tests

  beforeAll(() => {
    // Skip performance tests in CI unless explicitly enabled
    if (process.env.CI && !process.env.RUN_PERFORMANCE_TESTS) {
      console.log('Skipping performance tests in CI environment');
      return;
    }
  });

  describe('Quote-Swap Performance', () => {
    const quotesRequestBody = {
      network: 'mainnet',
      baseToken: 'TON',
      quoteToken: 'USDT',
      amount: '1000000000000', // 1,000 TON
      side: 'SELL',
      slippage: 1.0,
    };

    it('should handle concurrent quote requests efficiently', async () => {
      const startTime = performance.now();
      const promises: Promise<RequestResult>[] = [];

      // Create concurrent requests
      for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
        const promise = makeQuoteRequest({
          ...quotesRequestBody,
          amount: String(BigInt(quotesRequestBody.amount) + BigInt(i * 1000000000)), // Vary amounts slightly
        });
        promises.push(promise);
      }

      const results = await Promise.allSettled(promises);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      const metrics = calculateMetrics(
        results.map(result =>
          result.status === 'fulfilled' ? result.value : { success: false, responseTime: 0, error: 'Promise rejected' }
        ),
        totalDuration
      );

      console.log('Quote Request Concurrent Performance:', metrics);

      // Assertions
      expect(metrics.errorRate).toBeLessThan(ACCEPTABLE_ERROR_RATE);
      expect(metrics.averageResponseTime).toBeLessThan(ACCEPTABLE_RESPONSE_TIME);
      expect(metrics.requestsPerSecond).toBeGreaterThan(10); // At least 10 RPS
      expect(metrics.successfulRequests).toBeGreaterThan(CONCURRENT_REQUESTS * 0.95); // 95% success rate
    }, testTimeout);

    it('should maintain performance under sustained load', async () => {
      const results: RequestResult[] = [];
      const startTime = performance.now();
      let requestCount = 0;

      // Run load test for specified duration
      while (performance.now() - startTime < LOAD_TEST_DURATION) {
        const batchPromises: Promise<RequestResult>[] = [];

        // Send batch of 10 concurrent requests
        for (let i = 0; i < 10; i++) {
          batchPromises.push(makeQuoteRequest({
            ...quotesRequestBody,
            amount: String(BigInt(quotesRequestBody.amount) + BigInt(requestCount * 1000000000)),
          }));
          requestCount++;
        }

        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults.map(result =>
          result.status === 'fulfilled' ? result.value : { success: false, responseTime: 0, error: 'Promise rejected' }
        ));

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const totalDuration = performance.now() - startTime;
      const metrics = calculateMetrics(results, totalDuration);

      console.log('Quote Request Sustained Load Performance:', metrics);

      // Assertions for sustained load
      expect(metrics.errorRate).toBeLessThan(ACCEPTABLE_ERROR_RATE);
      expect(metrics.p95ResponseTime).toBeLessThan(ACCEPTABLE_RESPONSE_TIME * 2); // P95 within 2x acceptable
      expect(metrics.requestsPerSecond).toBeGreaterThan(5); // At least 5 RPS sustained
    }, testTimeout);

    it('should handle varying request sizes efficiently', async () => {
      const amounts = [
        '1000000000', // 1 TON
        '10000000000', // 10 TON
        '100000000000', // 100 TON
        '1000000000000', // 1,000 TON
        '10000000000000', // 10,000 TON
      ];

      const results: RequestResult[] = [];

      for (const amount of amounts) {
        const promises = Array.from({ length: 20 }, () =>
          makeQuoteRequest({ ...quotesRequestBody, amount })
        );

        const batchResults = await Promise.allSettled(promises);
        results.push(...batchResults.map(result =>
          result.status === 'fulfilled' ? result.value : { success: false, responseTime: 0, error: 'Promise rejected' }
        ));
      }

      const metrics = calculateMetrics(results, 0);

      console.log('Quote Request Variable Size Performance:', metrics);

      expect(metrics.errorRate).toBeLessThan(ACCEPTABLE_ERROR_RATE);
      expect(metrics.averageResponseTime).toBeLessThan(ACCEPTABLE_RESPONSE_TIME);
    }, testTimeout);
  });

  describe('Pool-Info Performance', () => {
    const poolInfoParams = {
      network: 'mainnet',
      baseToken: 'TON',
      quoteToken: 'USDT',
      poolType: 'volatile',
    };

    it('should handle concurrent pool info requests efficiently', async () => {
      const startTime = performance.now();
      const promises: Promise<RequestResult>[] = [];

      // Test different token pairs
      const tokenPairs = [
        { baseToken: 'TON', quoteToken: 'USDT' },
        { baseToken: 'TON', quoteToken: 'USDC' },
        { baseToken: 'USDT', quoteToken: 'USDC' },
        { baseToken: 'TON', quoteToken: 'WBTC' },
      ];

      // Create concurrent requests for different pools
      for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
        const pair = tokenPairs[i % tokenPairs.length];
        const promise = makePoolInfoRequest({
          ...poolInfoParams,
          ...pair,
        });
        promises.push(promise);
      }

      const results = await Promise.allSettled(promises);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      const metrics = calculateMetrics(
        results.map(result =>
          result.status === 'fulfilled' ? result.value : { success: false, responseTime: 0, error: 'Promise rejected' }
        ),
        totalDuration
      );

      console.log('Pool Info Concurrent Performance:', metrics);

      // Pool info should be even faster than quotes since it's mostly cached data
      expect(metrics.errorRate).toBeLessThan(ACCEPTABLE_ERROR_RATE);
      expect(metrics.averageResponseTime).toBeLessThan(ACCEPTABLE_RESPONSE_TIME / 2); // Should be faster
      expect(metrics.requestsPerSecond).toBeGreaterThan(20); // Higher RPS for cached data
    }, testTimeout);

    it('should leverage caching effectively', async () => {
      // First batch - should populate cache
      const firstBatchPromises = Array.from({ length: 10 }, () =>
        makePoolInfoRequest(poolInfoParams)
      );

      const firstBatchStart = performance.now();
      const firstBatchResults = await Promise.allSettled(firstBatchPromises);
      const firstBatchDuration = performance.now() - firstBatchStart;

      // Second batch - should use cache
      const secondBatchPromises = Array.from({ length: 50 }, () =>
        makePoolInfoRequest(poolInfoParams)
      );

      const secondBatchStart = performance.now();
      const secondBatchResults = await Promise.allSettled(secondBatchPromises);
      const secondBatchDuration = performance.now() - secondBatchStart;

      const firstBatchMetrics = calculateMetrics(
        firstBatchResults.map(result =>
          result.status === 'fulfilled' ? result.value : { success: false, responseTime: 0, error: 'Promise rejected' }
        ),
        firstBatchDuration
      );

      const secondBatchMetrics = calculateMetrics(
        secondBatchResults.map(result =>
          result.status === 'fulfilled' ? result.value : { success: false, responseTime: 0, error: 'Promise rejected' }
        ),
        secondBatchDuration
      );

      console.log('Pool Info First Batch (Cache Miss):', firstBatchMetrics);
      console.log('Pool Info Second Batch (Cache Hit):', secondBatchMetrics);

      // Second batch should be significantly faster due to caching
      expect(secondBatchMetrics.averageResponseTime).toBeLessThan(firstBatchMetrics.averageResponseTime);
      expect(secondBatchMetrics.requestsPerSecond).toBeGreaterThan(firstBatchMetrics.requestsPerSecond);
    }, testTimeout);
  });

  describe('Mixed Workload Performance', () => {
    it('should handle mixed quote and pool info requests', async () => {
      const results: RequestResult[] = [];
      const startTime = performance.now();

      const promises: Promise<RequestResult>[] = [];

      // Mix of quote and pool info requests
      for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
        if (i % 3 === 0) {
          // Pool info request
          promises.push(makePoolInfoRequest({
            network: 'mainnet',
            baseToken: 'TON',
            quoteToken: 'USDT',
            poolType: 'volatile',
          }));
        } else {
          // Quote request
          promises.push(makeQuoteRequest({
            network: 'mainnet',
            baseToken: 'TON',
            quoteToken: 'USDT',
            amount: String(BigInt('1000000000000') + BigInt(i * 1000000000)),
            side: 'SELL',
            slippage: 1.0,
          }));
        }
      }

      const mixedResults = await Promise.allSettled(promises);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      const metrics = calculateMetrics(
        mixedResults.map(result =>
          result.status === 'fulfilled' ? result.value : { success: false, responseTime: 0, error: 'Promise rejected' }
        ),
        totalDuration
      );

      console.log('Mixed Workload Performance:', metrics);

      expect(metrics.errorRate).toBeLessThan(ACCEPTABLE_ERROR_RATE);
      expect(metrics.averageResponseTime).toBeLessThan(ACCEPTABLE_RESPONSE_TIME);
      expect(metrics.requestsPerSecond).toBeGreaterThan(8);
    }, testTimeout);
  });

  describe('Memory and Resource Usage', () => {
    it('should not leak memory during sustained operations', async () => {
      const initialMemory = process.memoryUsage();

      // Perform many operations
      for (let batch = 0; batch < 10; batch++) {
        const promises = Array.from({ length: 20 }, (_, i) => {
          if (i % 2 === 0) {
            return makeQuoteRequest({
              network: 'mainnet',
              baseToken: 'TON',
              quoteToken: 'USDT',
              amount: String(BigInt('1000000000000') + BigInt(i * 1000000000)),
              side: 'SELL',
              slippage: 1.0,
            });
          } else {
            return makePoolInfoRequest({
              network: 'mainnet',
              baseToken: 'TON',
              quoteToken: 'USDT',
              poolType: 'volatile',
            });
          }
        });

        await Promise.allSettled(promises);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log('Memory Usage:');
      console.log('Initial:', Math.round(initialMemory.heapUsed / 1024 / 1024), 'MB');
      console.log('Final:', Math.round(finalMemory.heapUsed / 1024 / 1024), 'MB');
      console.log('Increase:', Math.round(memoryIncrease / 1024 / 1024), 'MB');

      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }, testTimeout);
  });

  // Helper functions
  async function makeQuoteRequest(params: any): Promise<RequestResult> {
    const startTime = performance.now();

    try {
      const response = await axios.post(
        `${GATEWAY_BASE_URL}/connectors/dedust/router/quote-swap`,
        params,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      const endTime = performance.now();
      return {
        success: response.status === 200,
        responseTime: endTime - startTime,
        statusCode: response.status,
      };
    } catch (error: any) {
      const endTime = performance.now();
      return {
        success: false,
        responseTime: endTime - startTime,
        error: error.message,
        statusCode: error.response?.status,
      };
    }
  }

  async function makePoolInfoRequest(params: any): Promise<RequestResult> {
    const startTime = performance.now();

    try {
      const response = await axios.get(
        `${GATEWAY_BASE_URL}/connectors/dedust/amm/poolInfo`,
        {
          params,
          timeout: 10000,
        }
      );

      const endTime = performance.now();
      return {
        success: response.status === 200,
        responseTime: endTime - startTime,
        statusCode: response.status,
      };
    } catch (error: any) {
      const endTime = performance.now();
      return {
        success: false,
        responseTime: endTime - startTime,
        error: error.message,
        statusCode: error.response?.status,
      };
    }
  }

  function calculateMetrics(results: RequestResult[], totalDuration: number): PerformanceMetrics {
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    const responseTimes = results.map(r => r.responseTime).sort((a, b) => a - b);

    const totalRequests = results.length;
    const successfulRequests = successfulResults.length;
    const failedRequests = failedResults.length;

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);

    const requestsPerSecond = totalDuration > 0 ? (totalRequests / totalDuration) * 1000 : 0;
    const errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      minResponseTime: responseTimes[0] || 0,
      maxResponseTime: responseTimes[responseTimes.length - 1] || 0,
      p95ResponseTime: responseTimes[p95Index] || 0,
      p99ResponseTime: responseTimes[p99Index] || 0,
      requestsPerSecond,
      errorRate,
      throughput: requestsPerSecond,
    };
  }
});