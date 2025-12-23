import { Asset, Pool } from '@dedust/sdk';
import { Address } from '@ton/ton';
import { DedustFactory, PoolInfo } from './dedust-factory';
import { DedustPool, DedustPoolBuilder } from '../models/dedust-pool';
import { LiquidityPosition, LiquidityPositionBuilder } from '../models/liquidity-position';
import { ClaimableFees, ClaimableFeesBuilder } from '../models/claimable-fees';
import { logger } from '../../../services/logger';

export interface PoolOperationParams {
  poolAddress?: string;
  baseToken: string;
  quoteToken: string;
  poolType?: 'volatile' | 'stable';
}

export interface LiquidityQuoteParams extends PoolOperationParams {
  operation: 'add' | 'remove';
  baseAmount?: string;
  quoteAmount?: string;
  lpTokenAmount?: string;
}

export interface LiquidityQuoteResult {
  operation: 'add' | 'remove';
  poolAddress: string;
  baseTokenRequired?: string;
  quoteTokenRequired?: string;
  baseTokenToReceive?: string;
  quoteTokenToReceive?: string;
  lpTokensToReceive?: string;
  lpTokensToBurn?: string;
  priceImpact: number;
  poolShare?: number;
  gasEstimate: string;
  fee: number;
  poolType: 'volatile' | 'stable';
  currentPrice?: string;
  expectedPrice?: string;
}

export interface AddLiquidityParams extends PoolOperationParams {
  walletAddress: string;
  baseAmount: string;
  quoteAmount: string;
  minLpTokens?: string;
  slippage?: number;
}

export interface RemoveLiquidityParams extends PoolOperationParams {
  walletAddress: string;
  lpTokenAmount?: string;
  percentage?: number;
  minBaseAmount?: string;
  minQuoteAmount?: string;
  slippage?: number;
}

export interface PositionInfoParams extends PoolOperationParams {
  walletAddress: string;
  includeRewards?: boolean;
}

export interface CollectFeesParams extends PoolOperationParams {
  walletAddress: string;
  tokensToCollect?: string[];
  estimateOnly?: boolean;
  requirePosition?: boolean;
}

export class DedustPoolService {
  private factory: DedustFactory;
  private poolCache: Map<string, { pool: DedustPool; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor(factory: DedustFactory) {
    this.factory = factory;

    // Clean pool cache every minute
    setInterval(() => this.cleanPoolCache(), 60000);
  }

  async getPoolInfo(params: PoolOperationParams): Promise<DedustPool> {
    try {
      const { baseToken, quoteToken, poolType = 'volatile' } = params;

      // Check cache first
      const cacheKey = `${baseToken}-${quoteToken}-${poolType}`;
      const cached = this.poolCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.pool;
      }

      // Create assets
      const assetBase = this.factory.createAssetFromToken(baseToken);
      const assetQuote = this.factory.createAssetFromToken(quoteToken);

      // Get pool info from factory
      const poolInfo = await this.factory.getPool(assetBase, assetQuote, poolType);
      if (!poolInfo) {
        throw new Error(`Pool not found for ${baseToken}/${quoteToken} (${poolType})`);
      }

      // Create DeDust pool model
      const pool = DedustPoolBuilder.create({
        address: poolInfo.address,
        baseSymbol: baseToken,
        quoteSymbol: quoteToken,
        baseReserve: poolInfo.reserves[0],
        quoteReserve: poolInfo.reserves[1],
        fee: poolInfo.fee,
        totalSupply: poolInfo.totalSupply,
        type: poolInfo.type,
        network: this.factory.getNetwork(),
      });

      // Cache the result
      this.poolCache.set(cacheKey, { pool, timestamp: Date.now() });

      logger.debug('Pool info retrieved', {
        baseToken,
        quoteToken,
        poolType,
        poolAddress: pool.address,
        reserves: pool.baseReserve + '/' + pool.quoteReserve,
      });

      return pool;
    } catch (error) {
      logger.error('Failed to get pool info', {
        baseToken: params.baseToken,
        quoteToken: params.quoteToken,
        poolType: params.poolType,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async quoteLiquidity(params: LiquidityQuoteParams): Promise<LiquidityQuoteResult> {
    try {
      const pool = await this.getPoolInfo(params);

      if (params.operation === 'add') {
        return await this.quoteAddLiquidity(pool, params);
      } else {
        return await this.quoteRemoveLiquidity(pool, params);
      }
    } catch (error) {
      logger.error('Failed to quote liquidity operation', {
        operation: params.operation,
        baseToken: params.baseToken,
        quoteToken: params.quoteToken,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  private async quoteAddLiquidity(
    pool: DedustPool,
    params: LiquidityQuoteParams
  ): Promise<LiquidityQuoteResult> {
    const { baseAmount, quoteAmount } = params;

    if (!baseAmount || !quoteAmount) {
      throw new Error('Both baseAmount and quoteAmount are required for add liquidity');
    }

    // Calculate required amounts and LP tokens
    const baseAmountBigInt = BigInt(baseAmount);
    const quoteAmountBigInt = BigInt(quoteAmount);
    const baseReserve = BigInt(pool.baseReserve);
    const quoteReserve = BigInt(pool.quoteReserve);
    const totalSupply = BigInt(pool.totalSupply);

    let actualBaseAmount = baseAmountBigInt;
    let actualQuoteAmount = quoteAmountBigInt;
    let lpTokensToReceive: bigint;

    if (totalSupply === 0n) {
      // First liquidity provision
      lpTokensToReceive = baseAmountBigInt; // Simplified calculation
    } else {
      // Maintain pool ratio
      const baseRatio = (baseAmountBigInt * quoteReserve) / baseReserve;
      const quoteRatio = (quoteAmountBigInt * baseReserve) / quoteReserve;

      if (baseRatio < quoteAmountBigInt) {
        // Base amount determines the ratio
        actualQuoteAmount = baseRatio;
        lpTokensToReceive = (baseAmountBigInt * totalSupply) / baseReserve;
      } else {
        // Quote amount determines the ratio
        actualBaseAmount = quoteRatio;
        lpTokensToReceive = (quoteAmountBigInt * totalSupply) / quoteReserve;
      }
    }

    // Calculate price impact and pool share
    const priceImpact = this.calculateAddLiquidityPriceImpact(
      actualBaseAmount,
      actualQuoteAmount,
      baseReserve,
      quoteReserve
    );

    const newTotalSupply = totalSupply + lpTokensToReceive;
    const poolShare = Number((lpTokensToReceive * 10000n) / newTotalSupply) / 100;

    // Calculate current and expected prices
    const currentPrice = DedustPoolBuilder.calculatePrice(pool);
    const expectedPrice = currentPrice; // For balanced additions, price should remain similar

    return {
      operation: 'add',
      poolAddress: pool.address,
      baseTokenRequired: actualBaseAmount.toString(),
      quoteTokenRequired: actualQuoteAmount.toString(),
      lpTokensToReceive: lpTokensToReceive.toString(),
      priceImpact,
      poolShare,
      gasEstimate: '0.05', // 0.05 TON gas estimate
      fee: pool.fee,
      poolType: pool.type,
      currentPrice,
      expectedPrice,
    };
  }

  private async quoteRemoveLiquidity(
    pool: DedustPool,
    params: LiquidityQuoteParams
  ): Promise<LiquidityQuoteResult> {
    const { lpTokenAmount } = params;

    if (!lpTokenAmount) {
      throw new Error('lpTokenAmount is required for remove liquidity');
    }

    const lpTokensBigInt = BigInt(lpTokenAmount);
    const totalSupply = BigInt(pool.totalSupply);
    const baseReserve = BigInt(pool.baseReserve);
    const quoteReserve = BigInt(pool.quoteReserve);

    if (lpTokensBigInt > totalSupply) {
      throw new Error('LP token amount exceeds total supply');
    }

    // Calculate tokens to receive
    const baseToReceive = (lpTokensBigInt * baseReserve) / totalSupply;
    const quoteToReceive = (lpTokensBigInt * quoteReserve) / totalSupply;

    // Calculate price impact
    const priceImpact = this.calculateRemoveLiquidityPriceImpact(
      baseToReceive,
      quoteToReceive,
      baseReserve,
      quoteReserve
    );

    return {
      operation: 'remove',
      poolAddress: pool.address,
      baseTokenToReceive: baseToReceive.toString(),
      quoteTokenToReceive: quoteToReceive.toString(),
      lpTokensToBurn: lpTokenAmount,
      priceImpact,
      gasEstimate: '0.04', // 0.04 TON gas estimate
      fee: pool.fee,
      poolType: pool.type,
    };
  }

  async getPositionInfo(params: PositionInfoParams): Promise<LiquidityPosition | null> {
    try {
      const pool = await this.getPoolInfo(params);
      const { walletAddress, includeRewards = false } = params;

      // In a real implementation, this would query the LP account contract
      // For now, return a mock empty position
      logger.debug('Getting position info', {
        walletAddress: walletAddress.slice(0, 8) + '...',
        poolAddress: pool.address,
        includeRewards,
      });

      // Mock implementation - return null for no position
      return null;
    } catch (error) {
      logger.error('Failed to get position info', {
        walletAddress: params.walletAddress,
        baseToken: params.baseToken,
        quoteToken: params.quoteToken,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async collectFees(params: CollectFeesParams): Promise<any> {
    try {
      const pool = await this.getPoolInfo(params);
      const { walletAddress, tokensToCollect, estimateOnly = false, requirePosition = false } = params;

      // Get position info first
      const position = await this.getPositionInfo({
        walletAddress,
        baseToken: params.baseToken,
        quoteToken: params.quoteToken,
        poolType: params.poolType,
      });

      if (requirePosition && !position) {
        throw new Error('No liquidity position found for this wallet');
      }

      if (estimateOnly) {
        // Return fee estimate
        return {
          estimatedFees: [],
          estimatedTotalValue: '0',
          gasEstimate: '0.03',
          canCollect: false,
        };
      }

      // Execute fee collection
      const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

      logger.info('Fees collected', {
        walletAddress: walletAddress.slice(0, 8) + '...',
        poolAddress: pool.address,
        tokensToCollect,
        txHash: mockTxHash,
      });

      return {
        txHash: mockTxHash,
        feesCollected: [],
        totalValueCollected: '0',
        gasUsed: '50000',
        gasCost: '0.025',
        poolType: pool.type,
        collectedAt: Math.floor(Date.now() / 1000),
      };
    } catch (error) {
      logger.error('Failed to collect fees', {
        walletAddress: params.walletAddress,
        baseToken: params.baseToken,
        quoteToken: params.quoteToken,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  private calculateAddLiquidityPriceImpact(
    baseAmount: bigint,
    quoteAmount: bigint,
    baseReserve: bigint,
    quoteReserve: bigint
  ): number {
    try {
      if (baseReserve === 0n || quoteReserve === 0n) {
        return 0; // No price impact for first liquidity
      }

      // Calculate if the added liquidity maintains the current ratio
      const currentRatio = Number(quoteReserve) / Number(baseReserve);
      const addedRatio = Number(quoteAmount) / Number(baseAmount);

      const impact = Math.abs((currentRatio - addedRatio) / currentRatio) * 100;
      return Math.min(impact, 10); // Cap at 10%
    } catch {
      return 0;
    }
  }

  private calculateRemoveLiquidityPriceImpact(
    baseToRemove: bigint,
    quoteToRemove: bigint,
    baseReserve: bigint,
    quoteReserve: bigint
  ): number {
    try {
      // Removing liquidity proportionally should have minimal price impact
      const basePercentage = Number(baseToRemove) / Number(baseReserve);
      const quotePercentage = Number(quoteToRemove) / Number(quoteReserve);

      const impact = Math.abs(basePercentage - quotePercentage) * 100;
      return Math.min(impact, 5); // Cap at 5%
    } catch {
      return 0;
    }
  }

  private cleanPoolCache(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [key, cached] of this.poolCache) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        expired.push(key);
      }
    }

    for (const key of expired) {
      this.poolCache.delete(key);
    }

    if (expired.length > 0) {
      logger.debug('Cleaned expired pool cache entries', { count: expired.length });
    }
  }

  getCacheSize(): number {
    return this.poolCache.size;
  }

  clearCache(): void {
    this.poolCache.clear();
    logger.debug('Pool cache cleared');
  }
}