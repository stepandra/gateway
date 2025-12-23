import { PoolType } from './dedust-pool';

export interface Route {
  pool: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  poolType: PoolType;
}

export class RouteValidator {
  static validate(route: Partial<Route>): string[] {
    const errors: string[] = [];

    if (!route.pool) {
      errors.push('pool is required');
    } else if (!this.isValidTONAddress(route.pool)) {
      errors.push('pool must be a valid pool address');
    }

    if (!route.tokenIn) {
      errors.push('tokenIn is required');
    } else if (!this.isValidTONAddress(route.tokenIn)) {
      errors.push('tokenIn must be a valid token address');
    }

    if (!route.tokenOut) {
      errors.push('tokenOut is required');
    } else if (!this.isValidTONAddress(route.tokenOut)) {
      errors.push('tokenOut must be a valid token address');
    }

    if (!route.amountIn) {
      errors.push('amountIn is required');
    } else if (!this.isPositiveBigNumber(route.amountIn)) {
      errors.push('amountIn must be a positive BigNumber string');
    }

    if (!route.amountOut) {
      errors.push('amountOut is required');
    } else if (!this.isPositiveBigNumber(route.amountOut)) {
      errors.push('amountOut must be a positive BigNumber string');
    }

    if (!route.poolType) {
      errors.push('poolType is required');
    } else if (route.poolType !== 'volatile' && route.poolType !== 'stable') {
      errors.push('poolType must be "volatile" or "stable"');
    }

    // Validate tokens are different
    if (route.tokenIn && route.tokenOut && route.tokenIn === route.tokenOut) {
      errors.push('tokenIn and tokenOut must be different');
    }

    return errors;
  }

  private static isValidTONAddress(address: string): boolean {
    return /^[A-Za-z0-9_-]{48}$/.test(address) ||
           /^EQ[A-Za-z0-9_-]{46}$/.test(address) ||
           /^UQ[A-Za-z0-9_-]{46}$/.test(address);
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

export class RouteBuilder {
  static create(data: Partial<Route>): Route {
    const errors = RouteValidator.validate(data);
    if (errors.length > 0) {
      throw new Error(`Invalid route: ${errors.join(', ')}`);
    }

    return {
      pool: data.pool!,
      tokenIn: data.tokenIn!,
      tokenOut: data.tokenOut!,
      amountIn: data.amountIn!,
      amountOut: data.amountOut!,
      poolType: data.poolType!,
    };
  }

  static calculateRoutePrice(route: Route): string {
    const amountIn = BigInt(route.amountIn);
    const amountOut = BigInt(route.amountOut);

    if (amountIn === 0n) {
      return '0';
    }

    // Price = amountOut / amountIn with precision scaling
    const precision = 10n ** 18n;
    const price = (amountOut * precision) / amountIn;

    return price.toString();
  }

  static validateRouteChain(routes: Route[]): string[] {
    const errors: string[] = [];

    if (routes.length === 0) {
      errors.push('Route chain cannot be empty');
      return errors;
    }

    for (let i = 0; i < routes.length - 1; i++) {
      const currentRoute = routes[i];
      const nextRoute = routes[i + 1];

      if (currentRoute.tokenOut !== nextRoute.tokenIn) {
        errors.push(`Route ${i + 1} tokenIn must match route ${i} tokenOut`);
      }
    }

    return errors;
  }

  static calculateTotalAmounts(routes: Route[]): { totalAmountIn: string; totalAmountOut: string } {
    if (routes.length === 0) {
      return { totalAmountIn: '0', totalAmountOut: '0' };
    }

    const totalAmountIn = routes[0].amountIn;
    const totalAmountOut = routes[routes.length - 1].amountOut;

    return { totalAmountIn, totalAmountOut };
  }

  static optimizeRoute(routes: Route[]): Route[] {
    // Simple optimization: remove redundant routes where tokenIn === tokenOut
    return routes.filter(route => route.tokenIn !== route.tokenOut);
  }
}

export interface RouteStep {
  stepIndex: number;
  route: Route;
  cumulativeAmountIn: string;
  cumulativeAmountOut: string;
  stepPrice: string;
  priceImpact: number;
}

export class RouteAnalyzer {
  static analyzeRoute(routes: Route[]): RouteStep[] {
    const steps: RouteStep[] = [];
    let cumulativeAmountIn = '0';

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      const stepPrice = RouteBuilder.calculateRoutePrice(route);

      if (i === 0) {
        cumulativeAmountIn = route.amountIn;
      }

      const cumulativeAmountOut = route.amountOut;

      steps.push({
        stepIndex: i,
        route,
        cumulativeAmountIn,
        cumulativeAmountOut,
        stepPrice,
        priceImpact: 0, // Would be calculated based on pool reserves
      });
    }

    return steps;
  }

  static findBestRoute(possibleRoutes: Route[][]): Route[] {
    if (possibleRoutes.length === 0) {
      return [];
    }

    // Simple heuristic: choose route with highest output amount
    return possibleRoutes.reduce((best, current) => {
      const bestOutput = BigInt(best[best.length - 1]?.amountOut || '0');
      const currentOutput = BigInt(current[current.length - 1]?.amountOut || '0');

      return currentOutput > bestOutput ? current : best;
    });
  }
}