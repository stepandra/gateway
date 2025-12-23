export type PoolType = 'volatile' | 'stable';

export interface DedustPool {
  address: string;
  baseSymbol: string;
  quoteSymbol: string;
  baseReserve: string;
  quoteReserve: string;
  fee: number;
  totalSupply: string;
  type: PoolType;
  network: string;
}

export class DedustPoolValidator {
  static validate(pool: Partial<DedustPool>): string[] {
    const errors: string[] = [];

    if (!pool.address) {
      errors.push('address is required');
    } else if (!this.isValidTONAddress(pool.address)) {
      errors.push('address must be a valid TON address');
    }

    if (!pool.baseSymbol) {
      errors.push('baseSymbol is required');
    } else if (!/^[A-Za-z0-9_]{1,20}$/.test(pool.baseSymbol)) {
      errors.push('baseSymbol must be 1-20 alphanumeric characters or underscore');
    }

    if (!pool.quoteSymbol) {
      errors.push('quoteSymbol is required');
    } else if (!/^[A-Za-z0-9_]{1,20}$/.test(pool.quoteSymbol)) {
      errors.push('quoteSymbol must be 1-20 alphanumeric characters or underscore');
    }

    if (!pool.baseReserve) {
      errors.push('baseReserve is required');
    } else if (!this.isPositiveBigNumber(pool.baseReserve)) {
      errors.push('baseReserve must be a positive BigNumber string');
    }

    if (!pool.quoteReserve) {
      errors.push('quoteReserve is required');
    } else if (!this.isPositiveBigNumber(pool.quoteReserve)) {
      errors.push('quoteReserve must be a positive BigNumber string');
    }

    if (pool.fee === undefined) {
      errors.push('fee is required');
    } else if (typeof pool.fee !== 'number' || pool.fee < 0 || pool.fee > 10) {
      errors.push('fee must be a number between 0 and 10');
    }

    if (!pool.totalSupply) {
      errors.push('totalSupply is required');
    } else if (!this.isPositiveBigNumber(pool.totalSupply)) {
      errors.push('totalSupply must be a positive BigNumber string');
    }

    if (!pool.type) {
      errors.push('type is required');
    } else if (pool.type !== 'volatile' && pool.type !== 'stable') {
      errors.push('type must be "volatile" or "stable"');
    }

    if (!pool.network) {
      errors.push('network is required');
    } else if (!['mainnet', 'testnet'].includes(pool.network)) {
      errors.push('network must be "mainnet" or "testnet"');
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

export class DedustPoolBuilder {
  static create(data: Partial<DedustPool>): DedustPool {
    const errors = DedustPoolValidator.validate(data);
    if (errors.length > 0) {
      throw new Error(`Invalid DeDust pool: ${errors.join(', ')}`);
    }

    return {
      address: data.address!,
      baseSymbol: data.baseSymbol!,
      quoteSymbol: data.quoteSymbol!,
      baseReserve: data.baseReserve!,
      quoteReserve: data.quoteReserve!,
      fee: data.fee!,
      totalSupply: data.totalSupply!,
      type: data.type!,
      network: data.network!,
    };
  }

  static calculatePrice(pool: DedustPool): string {
    const baseReserve = BigInt(pool.baseReserve);
    const quoteReserve = BigInt(pool.quoteReserve);

    if (baseReserve === 0n) {
      return '0';
    }

    // Price = quoteReserve / baseReserve
    // Use precision scaling to maintain accuracy
    const precision = 10n ** 18n;
    const price = (quoteReserve * precision) / baseReserve;

    return price.toString();
  }

  static calculateLPTokenValue(pool: DedustPool, lpTokenAmount: string): { base: string; quote: string } {
    const lpAmount = BigInt(lpTokenAmount);
    const totalSupply = BigInt(pool.totalSupply);
    const baseReserve = BigInt(pool.baseReserve);
    const quoteReserve = BigInt(pool.quoteReserve);

    if (totalSupply === 0n) {
      return { base: '0', quote: '0' };
    }

    const baseValue = (lpAmount * baseReserve) / totalSupply;
    const quoteValue = (lpAmount * quoteReserve) / totalSupply;

    return {
      base: baseValue.toString(),
      quote: quoteValue.toString(),
    };
  }
}