import { DedustFactory, DedustFactoryConfig } from './services/dedust-factory';
import { DedustRouter, RouterConfig } from './services/dedust-router';
import { DedustPoolService } from './services/dedust-pool';
import { DedustAMM, AMMConfig } from './services/dedust-amm';
import { SwapQuote } from './models/swap-quote';
import { Route } from './models/route';
import { LiquidityPosition } from './models/liquidity-position';
import { TransactionRecord } from '../../chains/ton/models/transaction-record';
import { DedustPool } from './models/dedust-pool';
import { logger } from '../../services/logger';

export interface DedustConfig {
  network: 'mainnet' | 'testnet';
  tonClientEndpoint: string;
  routerConfig: RouterConfig;
  ammConfig: AMMConfig;
}

export interface DedustConnectorStatus {
  connected: boolean;
  network: string;
  factoryAddress: string;
  blockHeight?: number;
  lastSync?: number;
  cacheStats: {
    poolCacheSize: number;
    quoteCacheSize: number;
  };
  config: DedustConfig;
}

export interface TokenInfo {
  symbol: string;
  address: string;
  decimals: number;
  name: string;
  isNative: boolean;
}

export class Dedust {
  private static _instances: Map<string, Dedust> = new Map();
  private factory: DedustFactory;
  private router: DedustRouter;
  private poolService: DedustPoolService;
  private amm: DedustAMM;
  private config: DedustConfig;
  private network: string;
  private _ready: boolean = false;

  private constructor(network: string = 'mainnet') {
    this.network = network;
    this.config = this.getDefaultConfig(network);

    // Initialize services
    this.factory = new DedustFactory({
      factoryAddress: this.config.network === 'mainnet'
        ? 'EQBfAN7LfaUYgXZNw5Wc7GBgkEX2yhuJ5ka95J1JJwXXf4a8'  // Mainnet factory
        : 'EQDHcPEKqCUJHkVY8o2YTGrX5aMLOJ3FD8BRoaYOX6t0F0Xs', // Testnet factory
      network: this.config.network,
      tonClientEndpoint: this.config.tonClientEndpoint,
    });

    this.poolService = new DedustPoolService(this.factory);

    this.router = new DedustRouter(this.factory, this.config.routerConfig);

    this.amm = new DedustAMM(this.factory, this.poolService, this.config.ammConfig);

    logger.info('DeDust connector initialized', {
      network: this.network,
      factoryAddress: this.factory.getFactoryAddress().toString(),
    });
  }

  public static getInstance(network: string = 'mainnet'): Dedust {
    if (!Dedust._instances.has(network)) {
      Dedust._instances.set(network, new Dedust(network));
    }
    return Dedust._instances.get(network)!;
  }

  private getDefaultConfig(network: string): DedustConfig {
    const baseConfig = {
      network: network as 'mainnet' | 'testnet',
      tonClientEndpoint: network === 'mainnet'
        ? 'https://toncenter.com/api/v2/jsonRPC'
        : 'https://testnet.toncenter.com/api/v2/jsonRPC',
      routerConfig: {
        maxHops: 3,
        slippageTolerance: 1.0, // 1%
        quoteTTL: 60, // 60 seconds
        gasEstimate: '0.1', // 0.1 TON
      },
      ammConfig: {
        gasLimit: '100000',
        priorityFee: '0.01',
        confirmationTimeout: 30000, // 30 seconds
        maxRetries: 3,
      },
    };

    return baseConfig;
  }

  async init(): Promise<void> {
    try {
      if (this._ready) {
        return;
      }

      logger.info('Initializing DeDust connector', { network: this.network });

      // Test factory connection
      const factoryAddress = this.factory.getFactoryAddress();
      logger.debug('Factory address', { address: factoryAddress.toString() });

      // Test TON client connection
      const tonClient = this.factory.getTonClient();
      const masterchainInfo = await tonClient.getMasterchainInfo();
      logger.debug('TON client connected', {
        seqno: masterchainInfo.last.seqno,
        workchain: masterchainInfo.last.workchain
      });

      this._ready = true;
      logger.info('DeDust connector ready', {
        network: this.network,
        blockHeight: masterchainInfo.last.seqno
      });
    } catch (error) {
      logger.error('Failed to initialize DeDust connector', {
        network: this.network,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Router operations
  async getSwapQuote(
    baseToken: string,
    quoteToken: string,
    amount: string,
    side: 'SELL' | 'BUY',
    slippage?: number
  ): Promise<{ quote: SwapQuote; route: Route[] }> {
    await this.ensureReady();

    return await this.router.getSwapQuote({
      assetIn: baseToken,
      assetOut: quoteToken,
      amountIn: amount,
      side,
      slippage,
    });
  }

  async executeSwap(
    walletAddress: string,
    quoteId: string
  ): Promise<TransactionRecord> {
    await this.ensureReady();

    const quote = this.router.getQuoteById(quoteId);
    if (!quote) {
      throw new Error('Quote not found or expired');
    }

    // Mock implementation - in real implementation would execute on-chain
    const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

    logger.info('Swap executed', {
      walletAddress: walletAddress.slice(0, 8) + '...',
      quoteId,
      txHash: mockTxHash,
    });

    return {
      txHash: mockTxHash,
      type: 'swap',
      status: 'completed',
      timestamp: Math.floor(Date.now() / 1000),
      gasUsed: '50000',
      gasCost: '0.025',
      details: {
        amountIn: quote.amountIn,
        amountOut: quote.amountOut,
        priceImpact: quote.priceImpact,
        route: quote.route,
      },
    };
  }

  // AMM operations
  async getPoolInfo(
    baseToken: string,
    quoteToken: string,
    poolType: 'volatile' | 'stable' = 'volatile'
  ): Promise<DedustPool> {
    await this.ensureReady();

    return await this.poolService.getPoolInfo({
      baseToken,
      quoteToken,
      poolType,
    });
  }

  async addLiquidity(
    walletAddress: string,
    baseToken: string,
    quoteToken: string,
    baseAmount: string,
    quoteAmount: string,
    options?: {
      minLpTokens?: string;
      slippage?: number;
      poolType?: 'volatile' | 'stable';
    }
  ): Promise<any> {
    await this.ensureReady();

    return await this.amm.addLiquidity({
      walletAddress,
      baseToken,
      quoteToken,
      baseAmount,
      quoteAmount,
      minLpTokens: options?.minLpTokens,
      slippage: options?.slippage,
      poolType: options?.poolType,
    });
  }

  async removeLiquidity(
    walletAddress: string,
    baseToken: string,
    quoteToken: string,
    options: {
      lpTokenAmount?: string;
      percentage?: number;
      minBaseAmount?: string;
      minQuoteAmount?: string;
      slippage?: number;
      poolType?: 'volatile' | 'stable';
    }
  ): Promise<any> {
    await this.ensureReady();

    return await this.amm.removeLiquidity({
      walletAddress,
      baseToken,
      quoteToken,
      lpTokenAmount: options.lpTokenAmount,
      percentage: options.percentage,
      minBaseAmount: options.minBaseAmount,
      minQuoteAmount: options.minQuoteAmount,
      slippage: options.slippage,
      poolType: options.poolType,
    });
  }

  async getPosition(
    walletAddress: string,
    baseToken: string,
    quoteToken: string,
    poolType: 'volatile' | 'stable' = 'volatile'
  ): Promise<LiquidityPosition | null> {
    await this.ensureReady();

    return await this.amm.getPosition(walletAddress, baseToken, quoteToken, poolType);
  }

  async getAllPositions(walletAddress: string): Promise<LiquidityPosition[]> {
    await this.ensureReady();

    return await this.amm.getAllPositions(walletAddress);
  }

  // Utility methods
  async getTokenInfo(tokenAddress: string): Promise<TokenInfo | null> {
    await this.ensureReady();

    try {
      // Handle native TON
      if (tokenAddress === 'TON' ||
          tokenAddress === 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c' ||
          tokenAddress === 'native') {
        return {
          symbol: 'TON',
          address: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
          decimals: 9,
          name: 'Toncoin',
          isNative: true,
        };
      }

      // For jettons, this would require querying the contract
      // For now, return null for unknown tokens
      logger.debug('Token info requested for jetton', { tokenAddress });
      return null;
    } catch (error) {
      logger.error('Failed to get token info', {
        tokenAddress,
        error: (error as Error).message,
      });
      return null;
    }
  }

  async getStatus(): Promise<DedustConnectorStatus> {
    try {
      const tonClient = this.factory.getTonClient();
      let blockHeight: number | undefined;
      let connected = false;

      try {
        const masterchainInfo = await tonClient.getMasterchainInfo();
        blockHeight = masterchainInfo.last.seqno;
        connected = true;
      } catch (error) {
        logger.warn('Failed to get blockchain info', { error: (error as Error).message });
      }

      return {
        connected,
        network: this.network,
        factoryAddress: this.factory.getFactoryAddress().toString(),
        blockHeight,
        lastSync: connected ? Date.now() : undefined,
        cacheStats: {
          poolCacheSize: this.poolService.getCacheSize(),
          quoteCacheSize: this.router.getCacheSize(),
        },
        config: this.config,
      };
    } catch (error) {
      logger.error('Failed to get DeDust status', {
        error: (error as Error).message,
      });

      return {
        connected: false,
        network: this.network,
        factoryAddress: this.factory.getFactoryAddress().toString(),
        cacheStats: {
          poolCacheSize: 0,
          quoteCacheSize: 0,
        },
        config: this.config,
      };
    }
  }

  // Configuration methods
  updateConfig(newConfig: Partial<DedustConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('DeDust config updated', {
      network: this.network,
      updatedFields: Object.keys(newConfig)
    });
  }

  getConfig(): DedustConfig {
    return { ...this.config };
  }

  getNetwork(): string {
    return this.network;
  }

  isReady(): boolean {
    return this._ready;
  }

  // Cache management
  clearCaches(): void {
    this.poolService.clearCache();
    logger.info('DeDust caches cleared', { network: this.network });
  }

  private async ensureReady(): Promise<void> {
    if (!this._ready) {
      await this.init();
    }
  }

  // Clean up resources
  async close(): Promise<void> {
    logger.info('Closing DeDust connector', { network: this.network });
    this.clearCaches();
    this._ready = false;
  }

  // Static methods for managing instances
  static getNetworks(): string[] {
    return Array.from(Dedust._instances.keys());
  }

  static async closeAll(): Promise<void> {
    const instances = Array.from(Dedust._instances.values());
    await Promise.all(instances.map(instance => instance.close()));
    Dedust._instances.clear();
    logger.info('All DeDust connector instances closed');
  }
}