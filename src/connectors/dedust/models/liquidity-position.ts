import { ClaimableFees } from './claimable-fees';

export interface LiquidityPosition {
  positionId: string;
  poolAddress: string;
  owner: string;
  lpTokens: string;
  baseAmount: string;
  quoteAmount: string;
  claimableFees: ClaimableFees;
  createdAt: number;
  lastUpdated: number;
}

export class LiquidityPositionValidator {
  static validate(position: Partial<LiquidityPosition>): string[] {
    const errors: string[] = [];

    if (!position.positionId) {
      errors.push('positionId is required');
    } else if (typeof position.positionId !== 'string' || position.positionId.length === 0) {
      errors.push('positionId must be a non-empty string');
    }

    if (!position.poolAddress) {
      errors.push('poolAddress is required');
    } else if (!this.isValidTONAddress(position.poolAddress)) {
      errors.push('poolAddress must be a valid pool address');
    }

    if (!position.owner) {
      errors.push('owner is required');
    } else if (!this.isValidTONAddress(position.owner)) {
      errors.push('owner must be a valid wallet address');
    }

    if (!position.lpTokens) {
      errors.push('lpTokens is required');
    } else if (!this.isNonNegativeBigNumber(position.lpTokens)) {
      errors.push('lpTokens must be a non-negative BigNumber string');
    }

    if (!position.baseAmount) {
      errors.push('baseAmount is required');
    } else if (!this.isNonNegativeBigNumber(position.baseAmount)) {
      errors.push('baseAmount must be a non-negative BigNumber string');
    }

    if (!position.quoteAmount) {
      errors.push('quoteAmount is required');
    } else if (!this.isNonNegativeBigNumber(position.quoteAmount)) {
      errors.push('quoteAmount must be a non-negative BigNumber string');
    }

    if (!position.claimableFees) {
      errors.push('claimableFees is required');
    }

    if (!position.createdAt) {
      errors.push('createdAt is required');
    } else if (!Number.isInteger(position.createdAt) || position.createdAt <= 0) {
      errors.push('createdAt must be a valid timestamp');
    }

    if (!position.lastUpdated) {
      errors.push('lastUpdated is required');
    } else if (!Number.isInteger(position.lastUpdated) || position.lastUpdated <= 0) {
      errors.push('lastUpdated must be a valid timestamp');
    }

    if (position.createdAt && position.lastUpdated && position.lastUpdated < position.createdAt) {
      errors.push('lastUpdated cannot be before createdAt');
    }

    return errors;
  }

  private static isValidTONAddress(address: string): boolean {
    return /^[A-Za-z0-9_-]{48}$/.test(address) ||
           /^EQ[A-Za-z0-9_-]{46}$/.test(address) ||
           /^UQ[A-Za-z0-9_-]{46}$/.test(address);
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

export class LiquidityPositionBuilder {
  static create(data: Partial<LiquidityPosition>): LiquidityPosition {
    const errors = LiquidityPositionValidator.validate(data);
    if (errors.length > 0) {
      throw new Error(`Invalid liquidity position: ${errors.join(', ')}`);
    }

    return {
      positionId: data.positionId!,
      poolAddress: data.poolAddress!,
      owner: data.owner!,
      lpTokens: data.lpTokens!,
      baseAmount: data.baseAmount!,
      quoteAmount: data.quoteAmount!,
      claimableFees: data.claimableFees!,
      createdAt: data.createdAt!,
      lastUpdated: data.lastUpdated!,
    };
  }

  static generatePositionId(poolAddress: string, owner: string): string {
    const timestamp = Date.now().toString(36);
    const poolHash = poolAddress.slice(-8);
    const ownerHash = owner.slice(-8);
    return `lp_${poolHash}_${ownerHash}_${timestamp}`;
  }

  static fromInitialDeposit(
    poolAddress: string,
    owner: string,
    baseAmount: string,
    quoteAmount: string,
    lpTokens: string
  ): LiquidityPosition {
    const now = Math.floor(Date.now() / 1000);
    const positionId = this.generatePositionId(poolAddress, owner);

    return this.create({
      positionId,
      poolAddress,
      owner,
      lpTokens,
      baseAmount,
      quoteAmount,
      claimableFees: {
        baseToken: '0',
        quoteToken: '0',
        lastCollected: now,
      },
      createdAt: now,
      lastUpdated: now,
    });
  }

  static calculatePoolShare(position: LiquidityPosition, totalPoolSupply: string): number {
    try {
      const lpTokens = BigInt(position.lpTokens);
      const totalSupply = BigInt(totalPoolSupply);

      if (totalSupply === 0n) {
        return 0;
      }

      // Calculate percentage with 2 decimal precision
      const share = (lpTokens * 10000n) / totalSupply;
      return Number(share) / 100;
    } catch {
      return 0;
    }
  }

  static updatePosition(
    position: LiquidityPosition,
    updates: {
      lpTokens?: string;
      baseAmount?: string;
      quoteAmount?: string;
      claimableFees?: ClaimableFees;
    }
  ): LiquidityPosition {
    return {
      ...position,
      lpTokens: updates.lpTokens || position.lpTokens,
      baseAmount: updates.baseAmount || position.baseAmount,
      quoteAmount: updates.quoteAmount || position.quoteAmount,
      claimableFees: updates.claimableFees || position.claimableFees,
      lastUpdated: Math.floor(Date.now() / 1000),
    };
  }

  static calculateValue(
    position: LiquidityPosition,
    baseTokenPrice: string,
    quoteTokenPrice: string
  ): string {
    try {
      const baseAmount = BigInt(position.baseAmount);
      const quoteAmount = BigInt(position.quoteAmount);
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

  static isActive(position: LiquidityPosition): boolean {
    const lpTokens = BigInt(position.lpTokens);
    return lpTokens > 0n;
  }
}