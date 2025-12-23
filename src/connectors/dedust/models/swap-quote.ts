import { Route } from './route';

export interface SwapQuote {
  route: Route[];
  amountIn: string;
  amountOut: string;
  amountOutMin: string;
  priceImpact: number;
  gasEstimate: string;
  ttl: number;
  slippage: number;
  quoteId?: string;
}

export class SwapQuoteValidator {
  static validate(quote: Partial<SwapQuote>): string[] {
    const errors: string[] = [];

    if (!quote.route || !Array.isArray(quote.route)) {
      errors.push('route is required and must be an array');
    } else if (quote.route.length === 0) {
      errors.push('route must contain at least one routing step');
    }

    if (!quote.amountIn) {
      errors.push('amountIn is required');
    } else if (!this.isPositiveBigNumber(quote.amountIn)) {
      errors.push('amountIn must be a positive BigNumber string');
    }

    if (!quote.amountOut) {
      errors.push('amountOut is required');
    } else if (!this.isPositiveBigNumber(quote.amountOut)) {
      errors.push('amountOut must be a positive BigNumber string');
    }

    if (!quote.amountOutMin) {
      errors.push('amountOutMin is required');
    } else if (!this.isPositiveBigNumber(quote.amountOutMin)) {
      errors.push('amountOutMin must be a positive BigNumber string');
    }

    if (quote.priceImpact === undefined) {
      errors.push('priceImpact is required');
    } else if (typeof quote.priceImpact !== 'number' || quote.priceImpact < 0 || quote.priceImpact > 100) {
      errors.push('priceImpact must be a number between 0 and 100');
    }

    if (!quote.gasEstimate) {
      errors.push('gasEstimate is required');
    } else if (!this.isPositiveBigNumber(quote.gasEstimate)) {
      errors.push('gasEstimate must be a positive BigNumber string');
    }

    if (!quote.ttl) {
      errors.push('ttl is required');
    } else if (!Number.isInteger(quote.ttl) || quote.ttl <= Date.now() / 1000) {
      errors.push('ttl must be a future timestamp');
    }

    if (quote.slippage === undefined) {
      errors.push('slippage is required');
    } else if (typeof quote.slippage !== 'number' || quote.slippage < 0 || quote.slippage > 50) {
      errors.push('slippage must be a number between 0 and 50');
    }

    // Validate amount consistency
    if (quote.amountOut && quote.amountOutMin) {
      const amountOut = BigInt(quote.amountOut);
      const amountOutMin = BigInt(quote.amountOutMin);
      if (amountOutMin > amountOut) {
        errors.push('amountOutMin cannot be greater than amountOut');
      }
    }

    return errors;
  }

  private static isPositiveBigNumber(value: string): boolean {
    try {
      const num = BigInt(value);
      return num > 0n;
    } catch {
      return false;
    }
  }
}

export class SwapQuoteBuilder {
  static create(data: Partial<SwapQuote>): SwapQuote {
    const errors = SwapQuoteValidator.validate(data);
    if (errors.length > 0) {
      throw new Error(`Invalid swap quote: ${errors.join(', ')}`);
    }

    return {
      route: data.route!,
      amountIn: data.amountIn!,
      amountOut: data.amountOut!,
      amountOutMin: data.amountOutMin!,
      priceImpact: data.priceImpact!,
      gasEstimate: data.gasEstimate!,
      ttl: data.ttl!,
      slippage: data.slippage!,
      quoteId: data.quoteId,
    };
  }

  static calculateAmountOutMin(amountOut: string, slippage: number): string {
    const amountOutBigInt = BigInt(amountOut);
    const slippageFactor = BigInt(Math.floor((100 - slippage) * 1000)); // Use 3 decimal precision
    const divisor = BigInt(100000); // 100 * 1000

    const amountOutMin = (amountOutBigInt * slippageFactor) / divisor;
    return amountOutMin.toString();
  }

  static calculatePriceImpact(
    inputAmount: string,
    outputAmount: string,
    currentPrice: string
  ): number {
    try {
      const inputBigInt = BigInt(inputAmount);
      const outputBigInt = BigInt(outputAmount);
      const priceBigInt = BigInt(currentPrice);

      if (inputBigInt === 0n || priceBigInt === 0n) {
        return 0;
      }

      // Expected output at current price
      const expectedOutput = (inputBigInt * priceBigInt) / (10n ** 18n);

      if (expectedOutput === 0n) {
        return 0;
      }

      // Price impact = (expectedOutput - actualOutput) / expectedOutput * 100
      const impact = ((expectedOutput - outputBigInt) * 10000n) / expectedOutput;

      return Number(impact) / 100; // Convert to percentage with 2 decimal precision
    } catch {
      return 0;
    }
  }

  static generateQuoteId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `quote_${timestamp}_${random}`;
  }

  static isExpired(quote: SwapQuote): boolean {
    return Date.now() / 1000 > quote.ttl;
  }

  static calculateExecutionPrice(quote: SwapQuote): string {
    const amountIn = BigInt(quote.amountIn);
    const amountOut = BigInt(quote.amountOut);

    if (amountIn === 0n) {
      return '0';
    }

    // Price = amountOut / amountIn with precision scaling
    const precision = 10n ** 18n;
    const price = (amountOut * precision) / amountIn;

    return price.toString();
  }
}