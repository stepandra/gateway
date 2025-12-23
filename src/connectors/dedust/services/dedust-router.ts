import { Asset } from '@dedust/sdk';
import { Address } from '@ton/ton';
import { DedustFactory } from './dedust-factory';
import { SwapQuote, SwapQuoteBuilder } from '../models/swap-quote';
import { Route, RouteBuilder } from '../models/route';
import { logger } from '../../../services/logger';

export interface RouterConfig {
  maxHops: number;
  slippageTolerance: number;
  quoteTTL: number; // seconds
  gasEstimate: string;
}

export interface SwapParams {
  assetIn: string;
  assetOut: string;
  amountIn: string;
  side: 'SELL' | 'BUY';
  slippage?: number;
  maxHops?: number;
}

export interface QuoteResult {
  quote: SwapQuote;
  route: Route[];
}

export class DedustRouter {
  private factory: DedustFactory;
  private config: RouterConfig;
  private quoteCache: Map<string, { quote: SwapQuote; timestamp: number }> = new Map();

  constructor(factory: DedustFactory, config: RouterConfig) {
    this.factory = factory;
    this.config = config;

    // Clean expired quotes every minute
    setInterval(() => this.cleanExpiredQuotes(), 60000);
  }

  async getSwapQuote(params: SwapParams): Promise<QuoteResult> {
    try {
      const {
        assetIn,
        assetOut,
        amountIn,
        side,
        slippage = this.config.slippageTolerance,
        maxHops = this.config.maxHops,
      } = params;

      // Validate inputs
      if (slippage < 0 || slippage > 50) {
        throw new Error('Slippage must be between 0 and 50%');
      }

      if (parseFloat(amountIn) <= 0) {
        throw new Error('Amount must be positive');
      }

      // Create assets
      const assetInObj = this.factory.createAssetFromToken(assetIn);
      const assetOutObj = this.factory.createAssetFromToken(assetOut);

      // Find the best route
      const routes = await this.findBestRoute(assetInObj, assetOutObj, amountIn, side, maxHops);
      if (routes.length === 0) {
        throw new Error('No route found for this token pair');
      }

      // Calculate total amounts and price impact
      const { totalAmountIn, totalAmountOut } = RouteBuilder.calculateTotalAmounts(routes);
      const priceImpact = await this.calculateTotalPriceImpact(routes);

      // Calculate amount out min with slippage
      const amountOutMin = SwapQuoteBuilder.calculateAmountOutMin(totalAmountOut, slippage);

      // Generate quote
      const quote = SwapQuoteBuilder.create({
        route: routes,
        amountIn: side === 'SELL' ? amountIn : totalAmountIn,
        amountOut: side === 'BUY' ? amountIn : totalAmountOut,
        amountOutMin,
        priceImpact,
        gasEstimate: this.config.gasEstimate,
        ttl: Math.floor(Date.now() / 1000) + this.config.quoteTTL,
        slippage,
        quoteId: SwapQuoteBuilder.generateQuoteId(),
      });

      // Cache the quote
      if (quote.quoteId) {
        this.quoteCache.set(quote.quoteId, {
          quote,
          timestamp: Date.now(),
        });
      }

      logger.info('Swap quote generated', {
        assetIn,
        assetOut,
        amountIn: quote.amountIn,
        amountOut: quote.amountOut,
        priceImpact: quote.priceImpact,
        routeLength: routes.length,
        quoteId: quote.quoteId,
      });

      return { quote, route: routes };
    } catch (error) {
      logger.error('Failed to generate swap quote', {
        assetIn: params.assetIn,
        assetOut: params.assetOut,
        amountIn: params.amountIn,
        side: params.side,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async findBestRoute(
    assetIn: Asset,
    assetOut: Asset,
    amountIn: string,
    side: 'SELL' | 'BUY',
    maxHops: number
  ): Promise<Route[]> {
    try {
      // For MVP, implement single-hop routing
      // Multi-hop routing would require more complex graph algorithms

      const routes: Route[] = [];

      // Try direct route first
      const directRoute = await this.findDirectRoute(assetIn, assetOut, amountIn, side);
      if (directRoute) {
        routes.push(directRoute);
      }

      // If no direct route and maxHops > 1, try multi-hop through common tokens
      if (routes.length === 0 && maxHops > 1) {
        const multiHopRoutes = await this.findMultiHopRoutes(assetIn, assetOut, amountIn, side, maxHops);
        routes.push(...multiHopRoutes);
      }

      if (routes.length === 0) {
        logger.warn('No routes found', {
          assetIn: this.assetToString(assetIn),
          assetOut: this.assetToString(assetOut),
          amountIn,
          side,
        });
      }

      return routes;
    } catch (error) {
      logger.error('Failed to find route', {
        assetIn: this.assetToString(assetIn),
        assetOut: this.assetToString(assetOut),
        error: (error as Error).message,
      });
      return [];
    }
  }

  private async findDirectRoute(
    assetIn: Asset,
    assetOut: Asset,
    amountIn: string,
    side: 'SELL' | 'BUY'
  ): Promise<Route | null> {
    try {
      // Try volatile pool first
      let poolInfo = await this.factory.getPool(assetIn, assetOut, 'volatile');
      let poolType: 'volatile' | 'stable' = 'volatile';

      // If no volatile pool, try stable pool
      if (!poolInfo) {
        poolInfo = await this.factory.getPool(assetIn, assetOut, 'stable');
        poolType = 'stable';
      }

      if (!poolInfo) {
        return null;
      }

      // Estimate swap
      const amountInBigInt = BigInt(amountIn);
      const swapEstimate = await this.factory.estimateSwap(assetIn, assetOut, amountInBigInt, poolType);

      if (!swapEstimate) {
        return null;
      }

      const route = RouteBuilder.create({
        pool: poolInfo.address,
        tokenIn: this.assetToAddress(assetIn),
        tokenOut: this.assetToAddress(assetOut),
        amountIn: amountInBigInt.toString(),
        amountOut: swapEstimate.amountOut.toString(),
        poolType,
      });

      return route;
    } catch (error) {
      logger.error('Failed to find direct route', {
        assetIn: this.assetToString(assetIn),
        assetOut: this.assetToString(assetOut),
        error: (error as Error).message,
      });
      return null;
    }
  }

  private async findMultiHopRoutes(
    assetIn: Asset,
    assetOut: Asset,
    amountIn: string,
    side: 'SELL' | 'BUY',
    maxHops: number
  ): Promise<Route[]> {
    // Multi-hop routing through common intermediate tokens
    const commonTokens = this.getCommonIntermediateTokens();
    const routes: Route[] = [];

    for (const intermediateToken of commonTokens) {
      try {
        const intermediate = this.factory.createAssetFromToken(intermediateToken);

        // First hop: assetIn -> intermediate
        const firstHop = await this.findDirectRoute(assetIn, intermediate, amountIn, side);
        if (!firstHop) continue;

        // Second hop: intermediate -> assetOut
        const secondHop = await this.findDirectRoute(intermediate, assetOut, firstHop.amountOut, 'SELL');
        if (!secondHop) continue;

        routes.push(firstHop, secondHop);
        break; // Return first successful multi-hop route
      } catch (error) {
        logger.debug('Multi-hop attempt failed', {
          intermediate: intermediateToken,
          error: (error as Error).message,
        });
        continue;
      }
    }

    return routes;
  }

  private getCommonIntermediateTokens(): string[] {
    // Common tokens that might serve as intermediates
    return [
      'TON', // Native TON
      'USDT', // Tether
      'USDC', // USD Coin
      // Add more common tokens as needed
    ];
  }

  private async calculateTotalPriceImpact(routes: Route[]): Promise<number> {
    try {
      if (routes.length === 0) return 0;

      // For single hop, return the price impact from the pool
      if (routes.length === 1) {
        // This would be calculated during route finding
        // For now, return a simple estimate based on amount/reserve ratio
        return 0.1; // 0.1% default estimate
      }

      // For multi-hop, compound the price impacts
      let totalImpact = 0;
      for (const route of routes) {
        // Simple addition of impacts (in reality, this should be compounded)
        totalImpact += 0.1; // Placeholder
      }

      return Math.min(totalImpact, 10); // Cap at 10%
    } catch {
      return 0;
    }
  }

  getQuoteById(quoteId: string): SwapQuote | null {
    const cached = this.quoteCache.get(quoteId);
    if (!cached) {
      return null;
    }

    // Check if quote is expired
    if (SwapQuoteBuilder.isExpired(cached.quote)) {
      this.quoteCache.delete(quoteId);
      return null;
    }

    return cached.quote;
  }

  private cleanExpiredQuotes(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [quoteId, cached] of this.quoteCache) {
      if (SwapQuoteBuilder.isExpired(cached.quote)) {
        expired.push(quoteId);
      }
    }

    for (const quoteId of expired) {
      this.quoteCache.delete(quoteId);
    }

    if (expired.length > 0) {
      logger.debug('Cleaned expired quotes', { count: expired.length });
    }
  }

  private assetToString(asset: Asset): string {
    if (asset.type === 'native') {
      return 'TON';
    } else if (asset.type === 'jetton') {
      return asset.address.toString();
    }
    return 'unknown';
  }

  private assetToAddress(asset: Asset): string {
    if (asset.type === 'native') {
      return 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'; // TON native address
    } else if (asset.type === 'jetton') {
      return asset.address.toString();
    }
    throw new Error('Unknown asset type');
  }

  getConfig(): RouterConfig {
    return { ...this.config };
  }

  getCacheSize(): number {
    return this.quoteCache.size;
  }
}