import { logger } from '../../../services/logger';

export interface TONProvider {
  name: string;
  baseURL: string;
  isHealthy: boolean;
  lastHealthCheck: number;
  latency: number;
}

export interface TONProviderConfig {
  tonCenterURL: string;
  drpcURL: string;
  healthCheckInterval: number;
  requestTimeout: number;
  maxRetries: number;
  retryDelay: number;
}

export interface TONAPIResponse<T = any> {
  ok: boolean;
  result?: T;
  error?: string;
  code?: number;
}

export class TONProviderManager {
  private providers: TONProvider[];
  private config: TONProviderConfig;
  private currentProviderIndex: number = 0;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(config: TONProviderConfig) {
    this.config = config;
    this.providers = [
      {
        name: 'toncenter',
        baseURL: config.tonCenterURL,
        isHealthy: true,
        lastHealthCheck: 0,
        latency: 0,
      },
      {
        name: 'drpc',
        baseURL: config.drpcURL,
        isHealthy: true,
        lastHealthCheck: 0,
        latency: 0,
      },
    ];

    this.startHealthCheck();
  }

  async makeRequest<T>(
    endpoint: string,
    params: Record<string, any> = {},
    method: 'GET' | 'POST' = 'GET'
  ): Promise<TONAPIResponse<T>> {
    let lastError: Error | null = null;

    // Try each provider
    for (let attempt = 0; attempt < this.providers.length; attempt++) {
      const provider = this.getCurrentProvider();

      if (!provider.isHealthy) {
        this.switchToNextProvider();
        continue;
      }

      try {
        const startTime = Date.now();
        const response = await this.executeRequest<T>(provider, endpoint, params, method);
        const latency = Date.now() - startTime;

        // Update provider latency
        provider.latency = latency;

        logger.info('TON API request successful', {
          provider: provider.name,
          endpoint,
          latency,
          statusCode: 200,
        });

        return response;
      } catch (error) {
        lastError = error as Error;

        logger.error('TON API request failed', {
          provider: provider.name,
          endpoint,
          error: lastError.message,
        });

        // Mark provider as unhealthy if it fails
        provider.isHealthy = false;
        provider.lastHealthCheck = Date.now();

        this.switchToNextProvider();
      }
    }

    throw new Error(`All TON providers failed. Last error: ${lastError?.message}`);
  }

  private async executeRequest<T>(
    provider: TONProvider,
    endpoint: string,
    params: Record<string, any>,
    method: 'GET' | 'POST'
  ): Promise<TONAPIResponse<T>> {
    let url = `${provider.baseURL}${endpoint}`;

    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HummingbotGateway/2.8.0',
      },
      signal: AbortSignal.timeout(this.config.requestTimeout),
    };

    if (method === 'POST') {
      requestOptions.body = JSON.stringify(params);
    } else if (Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url += `?${searchParams.toString()}`;
    }

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Handle TON Center API response format
    if (provider.name === 'toncenter') {
      return {
        ok: data.ok || false,
        result: data.result,
        error: data.error,
        code: data.code,
      };
    }

    // Handle DRPC API response format
    if (provider.name === 'drpc') {
      return {
        ok: !data.error,
        result: data.result || data,
        error: data.error?.message || data.error,
        code: data.error?.code,
      };
    }

    // Default format
    return {
      ok: true,
      result: data,
    };
  }

  private getCurrentProvider(): TONProvider {
    return this.providers[this.currentProviderIndex];
  }

  private switchToNextProvider(): void {
    this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = this.providers.map(async (provider) => {
      try {
        const startTime = Date.now();
        const response = await this.executeRequest(
          provider,
          '/getMasterchainInfo',
          {},
          'GET'
        );
        const latency = Date.now() - startTime;

        if (response.ok && response.result) {
          provider.isHealthy = true;
          provider.latency = latency;
          provider.lastHealthCheck = Date.now();

          logger.debug('Provider health check passed', {
            provider: provider.name,
            latency,
          });
        } else {
          provider.isHealthy = false;
          provider.lastHealthCheck = Date.now();

          logger.warn('Provider health check failed', {
            provider: provider.name,
            error: response.error,
          });
        }
      } catch (error) {
        provider.isHealthy = false;
        provider.lastHealthCheck = Date.now();

        logger.warn('Provider health check error', {
          provider: provider.name,
          error: (error as Error).message,
        });
      }
    });

    await Promise.allSettled(healthCheckPromises);

    // Ensure at least one provider is marked as healthy
    const healthyProviders = this.providers.filter(p => p.isHealthy);
    if (healthyProviders.length === 0) {
      logger.warn('No healthy TON providers found, marking primary as healthy');
      this.providers[0].isHealthy = true;
    }
  }

  getProviderStatus(): {
    current: string;
    providers: Array<{
      name: string;
      isHealthy: boolean;
      latency: number;
      lastHealthCheck: number;
    }>;
  } {
    return {
      current: this.getCurrentProvider().name,
      providers: this.providers.map(p => ({
        name: p.name,
        isHealthy: p.isHealthy,
        latency: p.latency,
        lastHealthCheck: p.lastHealthCheck,
      })),
    };
  }

  async getMasterchainInfo(): Promise<any> {
    const response = await this.makeRequest('/getMasterchainInfo');
    if (!response.ok) {
      throw new Error(response.error || 'Failed to get masterchain info');
    }
    return response.result;
  }

  async getAddressInformation(address: string): Promise<any> {
    const response = await this.makeRequest('/getAddressInformation', { address });
    if (!response.ok) {
      throw new Error(response.error || 'Failed to get address information');
    }
    return response.result;
  }

  async getTokenData(address: string): Promise<any> {
    const response = await this.makeRequest('/jetton/masters', { address });
    if (!response.ok) {
      throw new Error(response.error || 'Failed to get token data');
    }
    return response.result;
  }

  async getWalletInformation(address: string): Promise<any> {
    const response = await this.makeRequest('/getWalletInformation', { address });
    if (!response.ok) {
      throw new Error(response.error || 'Failed to get wallet information');
    }
    return response.result;
  }

  async estimateFee(
    address: string,
    body: string,
    initCode?: string,
    initData?: string
  ): Promise<any> {
    const params: Record<string, any> = {
      address,
      body,
    };

    if (initCode) params.init_code = initCode;
    if (initData) params.init_data = initData;

    const response = await this.makeRequest('/estimateFee', params, 'POST');
    if (!response.ok) {
      throw new Error(response.error || 'Failed to estimate fee');
    }
    return response.result;
  }

  async sendBoc(boc: string): Promise<any> {
    const response = await this.makeRequest('/sendBoc', { boc }, 'POST');
    if (!response.ok) {
      throw new Error(response.error || 'Failed to send BOC');
    }
    return response.result;
  }

  async getTransactions(
    address: string,
    limit: number = 10,
    hash?: string,
    lt?: string
  ): Promise<any> {
    const params: Record<string, any> = {
      address,
      limit,
    };

    if (hash) params.hash = hash;
    if (lt) params.lt = lt;

    const response = await this.makeRequest('/getTransactions', params);
    if (!response.ok) {
      throw new Error(response.error || 'Failed to get transactions');
    }
    return response.result;
  }

  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }
}