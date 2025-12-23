export interface ClaimableFees {
  baseToken: string;
  quoteToken: string;
  lastCollected: number;
}

export class ClaimableFeesValidator {
  static validate(fees: Partial<ClaimableFees>): string[] {
    const errors: string[] = [];

    if (!fees.baseToken) {
      errors.push('baseToken is required');
    } else if (!this.isNonNegativeBigNumber(fees.baseToken)) {
      errors.push('baseToken must be a non-negative BigNumber string');
    }

    if (!fees.quoteToken) {
      errors.push('quoteToken is required');
    } else if (!this.isNonNegativeBigNumber(fees.quoteToken)) {
      errors.push('quoteToken must be a non-negative BigNumber string');
    }

    if (!fees.lastCollected) {
      errors.push('lastCollected is required');
    } else if (!Number.isInteger(fees.lastCollected) || fees.lastCollected <= 0) {
      errors.push('lastCollected must be a valid timestamp');
    }

    return errors;
  }

  private static isNonNegativeBigNumber(value: string): boolean {
    try {
      const num = BigInt(value);
      return num >= 0n;
    } catch {
      return false;
    }
  }
}

export class ClaimableFeesBuilder {
  static create(data: Partial<ClaimableFees>): ClaimableFees {
    const errors = ClaimableFeesValidator.validate(data);
    if (errors.length > 0) {
      throw new Error(`Invalid claimable fees: ${errors.join(', ')}`);
    }

    return {
      baseToken: data.baseToken!,
      quoteToken: data.quoteToken!,
      lastCollected: data.lastCollected!,
    };
  }

  static empty(): ClaimableFees {
    return this.create({
      baseToken: '0',
      quoteToken: '0',
      lastCollected: Math.floor(Date.now() / 1000),
    });
  }

  static add(fees1: ClaimableFees, fees2: ClaimableFees): ClaimableFees {
    const baseToken = (BigInt(fees1.baseToken) + BigInt(fees2.baseToken)).toString();
    const quoteToken = (BigInt(fees1.quoteToken) + BigInt(fees2.quoteToken)).toString();
    const lastCollected = Math.max(fees1.lastCollected, fees2.lastCollected);

    return this.create({
      baseToken,
      quoteToken,
      lastCollected,
    });
  }

  static subtract(fees: ClaimableFees, toSubtract: ClaimableFees): ClaimableFees {
    const baseTokenResult = BigInt(fees.baseToken) - BigInt(toSubtract.baseToken);
    const quoteTokenResult = BigInt(fees.quoteToken) - BigInt(toSubtract.quoteToken);

    // Ensure non-negative results
    const baseToken = baseTokenResult < 0n ? '0' : baseTokenResult.toString();
    const quoteToken = quoteTokenResult < 0n ? '0' : quoteTokenResult.toString();

    return this.create({
      baseToken,
      quoteToken,
      lastCollected: Math.floor(Date.now() / 1000),
    });
  }

  static calculateTotalValue(
    fees: ClaimableFees,
    baseTokenPrice: string,
    quoteTokenPrice: string
  ): string {
    try {
      const baseAmount = BigInt(fees.baseToken);
      const quoteAmount = BigInt(fees.quoteToken);
      const basePriceBigInt = BigInt(baseTokenPrice);
      const quotePriceBigInt = BigInt(quoteTokenPrice);

      const precision = 10n ** 18n;

      const baseValue = (baseAmount * basePriceBigInt) / precision;
      const quoteValue = (quoteAmount * quotePriceBigInt) / precision;

      const totalValue = baseValue + quoteValue;
      return totalValue.toString();
    } catch {
      return '0';
    }
  }

  static isCollectable(fees: ClaimableFees, minimumValue: string = '0'): boolean {
    const baseAmount = BigInt(fees.baseToken);
    const quoteAmount = BigInt(fees.quoteToken);
    const minimum = BigInt(minimumValue);

    const totalFees = baseAmount + quoteAmount;
    return totalFees > minimum;
  }

  static daysSinceLastCollection(fees: ClaimableFees): number {
    const now = Math.floor(Date.now() / 1000);
    const dayInSeconds = 24 * 60 * 60;
    return Math.floor((now - fees.lastCollected) / dayInSeconds);
  }

  static formatFees(fees: ClaimableFees, decimals: number = 9): {
    baseToken: string;
    quoteToken: string;
  } {
    const divisor = BigInt(10 ** decimals);

    const formatAmount = (amount: string): string => {
      const amountBigInt = BigInt(amount);
      const wholePart = amountBigInt / divisor;
      const fractionalPart = amountBigInt % divisor;

      if (fractionalPart === 0n) {
        return wholePart.toString();
      }

      const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
      const trimmedFractional = fractionalStr.replace(/0+$/, '');

      return `${wholePart}.${trimmedFractional}`;
    };

    return {
      baseToken: formatAmount(fees.baseToken),
      quoteToken: formatAmount(fees.quoteToken),
    };
  }

  static updateLastCollected(fees: ClaimableFees): ClaimableFees {
    return {
      ...fees,
      lastCollected: Math.floor(Date.now() / 1000),
    };
  }
}