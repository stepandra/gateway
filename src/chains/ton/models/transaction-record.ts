export type TransactionStatus = -1 | 0 | 1; // failed | pending | confirmed
export type TransactionType = 'swap' | 'addLiquidity' | 'removeLiquidity' | 'collectFees';

export interface TransactionDetails {
  // Swap details
  tokenIn?: string;
  tokenOut?: string;
  amountIn?: string;
  amountOut?: string;
  route?: string[];

  // Liquidity details
  poolAddress?: string;
  baseAmount?: string;
  quoteAmount?: string;
  lpTokensReceived?: string;
  lpTokensBurned?: string;
  baseReceived?: string;
  quoteReceived?: string;

  // Fee collection details
  positionId?: string;
  baseFeesCollected?: string;
  quoteFeesCollected?: string;
}

export interface TransactionRecord {
  hash: string;
  status: TransactionStatus;
  type: TransactionType;
  from: string;
  gasUsed: string;
  fee: string;
  blockNumber?: number;
  timestamp: number;
  details: TransactionDetails;
}

export class TransactionRecordValidator {
  static validate(record: Partial<TransactionRecord>): string[] {
    const errors: string[] = [];

    if (!record.hash) {
      errors.push('hash is required');
    } else if (!this.isValidTransactionHash(record.hash)) {
      errors.push('hash must be a valid transaction hash format');
    }

    if (record.status === undefined) {
      errors.push('status is required');
    } else if (![- 1, 0, 1].includes(record.status)) {
      errors.push('status must be -1 (failed), 0 (pending), or 1 (confirmed)');
    }

    if (!record.type) {
      errors.push('type is required');
    } else if (!['swap', 'addLiquidity', 'removeLiquidity', 'collectFees'].includes(record.type)) {
      errors.push('type must be swap, addLiquidity, removeLiquidity, or collectFees');
    }

    if (!record.from) {
      errors.push('from is required');
    } else if (!this.isValidTONAddress(record.from)) {
      errors.push('from must be a valid wallet address');
    }

    if (!record.gasUsed) {
      errors.push('gasUsed is required');
    } else if (!this.isNonNegativeBigNumber(record.gasUsed)) {
      errors.push('gasUsed must be a non-negative BigNumber string');
    }

    if (!record.fee) {
      errors.push('fee is required');
    } else if (!this.isNonNegativeBigNumber(record.fee)) {
      errors.push('fee must be a non-negative BigNumber string');
    }

    if (record.status === 1 && !record.blockNumber) {
      errors.push('blockNumber is required for confirmed transactions');
    } else if (record.blockNumber !== undefined && !Number.isInteger(record.blockNumber)) {
      errors.push('blockNumber must be an integer');
    }

    if (!record.timestamp) {
      errors.push('timestamp is required');
    } else if (!Number.isInteger(record.timestamp) || record.timestamp <= 0) {
      errors.push('timestamp must be a valid timestamp');
    }

    if (!record.details) {
      errors.push('details is required');
    } else if (record.type) {
      const detailErrors = this.validateDetails(record.type, record.details);
      errors.push(...detailErrors);
    }

    return errors;
  }

  private static validateDetails(type: TransactionType, details: TransactionDetails): string[] {
    const errors: string[] = [];

    switch (type) {
      case 'swap':
        if (!details.tokenIn) errors.push('tokenIn is required for swap transactions');
        if (!details.tokenOut) errors.push('tokenOut is required for swap transactions');
        if (!details.amountIn) errors.push('amountIn is required for swap transactions');
        if (!details.amountOut) errors.push('amountOut is required for swap transactions');
        break;

      case 'addLiquidity':
        if (!details.poolAddress) errors.push('poolAddress is required for addLiquidity transactions');
        if (!details.baseAmount) errors.push('baseAmount is required for addLiquidity transactions');
        if (!details.quoteAmount) errors.push('quoteAmount is required for addLiquidity transactions');
        if (!details.lpTokensReceived) errors.push('lpTokensReceived is required for addLiquidity transactions');
        break;

      case 'removeLiquidity':
        if (!details.poolAddress) errors.push('poolAddress is required for removeLiquidity transactions');
        if (!details.lpTokensBurned) errors.push('lpTokensBurned is required for removeLiquidity transactions');
        if (!details.baseReceived) errors.push('baseReceived is required for removeLiquidity transactions');
        if (!details.quoteReceived) errors.push('quoteReceived is required for removeLiquidity transactions');
        break;

      case 'collectFees':
        if (!details.positionId) errors.push('positionId is required for collectFees transactions');
        if (!details.baseFeesCollected) errors.push('baseFeesCollected is required for collectFees transactions');
        if (!details.quoteFeesCollected) errors.push('quoteFeesCollected is required for collectFees transactions');
        break;
    }

    return errors;
  }

  private static isValidTransactionHash(hash: string): boolean {
    return /^[a-fA-F0-9]{64}$/.test(hash);
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

export class TransactionRecordBuilder {
  static create(data: Partial<TransactionRecord>): TransactionRecord {
    const errors = TransactionRecordValidator.validate(data);
    if (errors.length > 0) {
      throw new Error(`Invalid transaction record: ${errors.join(', ')}`);
    }

    return {
      hash: data.hash!,
      status: data.status!,
      type: data.type!,
      from: data.from!,
      gasUsed: data.gasUsed!,
      fee: data.fee!,
      blockNumber: data.blockNumber,
      timestamp: data.timestamp!,
      details: data.details!,
    };
  }

  static createPending(
    hash: string,
    type: TransactionType,
    from: string,
    details: TransactionDetails
  ): TransactionRecord {
    return this.create({
      hash,
      status: 0,
      type,
      from,
      gasUsed: '0',
      fee: '0',
      timestamp: Math.floor(Date.now() / 1000),
      details,
    });
  }

  static confirm(
    record: TransactionRecord,
    blockNumber: number,
    gasUsed: string,
    fee: string
  ): TransactionRecord {
    return {
      ...record,
      status: 1,
      blockNumber,
      gasUsed,
      fee,
    };
  }

  static fail(record: TransactionRecord): TransactionRecord {
    return {
      ...record,
      status: -1,
    };
  }

  static createSwapRecord(
    hash: string,
    from: string,
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    amountOut: string,
    route?: string[]
  ): TransactionRecord {
    return this.createPending(hash, 'swap', from, {
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      route,
    });
  }

  static createAddLiquidityRecord(
    hash: string,
    from: string,
    poolAddress: string,
    baseAmount: string,
    quoteAmount: string,
    lpTokensReceived: string
  ): TransactionRecord {
    return this.createPending(hash, 'addLiquidity', from, {
      poolAddress,
      baseAmount,
      quoteAmount,
      lpTokensReceived,
    });
  }

  static createRemoveLiquidityRecord(
    hash: string,
    from: string,
    poolAddress: string,
    lpTokensBurned: string,
    baseReceived: string,
    quoteReceived: string
  ): TransactionRecord {
    return this.createPending(hash, 'removeLiquidity', from, {
      poolAddress,
      lpTokensBurned,
      baseReceived,
      quoteReceived,
    });
  }

  static createCollectFeesRecord(
    hash: string,
    from: string,
    positionId: string,
    baseFeesCollected: string,
    quoteFeesCollected: string
  ): TransactionRecord {
    return this.createPending(hash, 'collectFees', from, {
      positionId,
      baseFeesCollected,
      quoteFeesCollected,
    });
  }

  static getStatusText(status: TransactionStatus): string {
    switch (status) {
      case -1: return 'failed';
      case 0: return 'pending';
      case 1: return 'confirmed';
      default: return 'unknown';
    }
  }

  static isConfirmed(record: TransactionRecord): boolean {
    return record.status === 1;
  }

  static isPending(record: TransactionRecord): boolean {
    return record.status === 0;
  }

  static isFailed(record: TransactionRecord): boolean {
    return record.status === -1;
  }
}