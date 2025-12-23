export interface TONToken {
  symbol: string;
  address: string;
  decimals: number;
  name: string;
  chainId: number;
}

export class TONTokenValidator {
  static validate(token: Partial<TONToken>): string[] {
    const errors: string[] = [];

    if (!token.symbol) {
      errors.push('symbol is required');
    } else if (!/^[A-Za-z0-9_]{1,20}$/.test(token.symbol)) {
      errors.push('symbol must be 1-20 alphanumeric characters or underscore');
    }

    if (!token.address) {
      errors.push('address is required');
    } else if (!this.isValidTONAddress(token.address)) {
      errors.push('address must be a valid TON address format');
    }

    if (token.decimals === undefined) {
      errors.push('decimals is required');
    } else if (!Number.isInteger(token.decimals) || token.decimals < 0 || token.decimals > 18) {
      errors.push('decimals must be an integer between 0 and 18');
    }

    if (!token.name) {
      errors.push('name is required');
    } else if (token.name.length < 1 || token.name.length > 100) {
      errors.push('name must be 1-100 characters');
    }

    if (!token.chainId) {
      errors.push('chainId is required');
    } else if (!Number.isInteger(token.chainId)) {
      errors.push('chainId must be an integer');
    }

    return errors;
  }

  private static isValidTONAddress(address: string): boolean {
    return /^[A-Za-z0-9_-]{48}$/.test(address) ||
           /^EQ[A-Za-z0-9_-]{46}$/.test(address) ||
           /^UQ[A-Za-z0-9_-]{46}$/.test(address);
  }
}

export class TONTokenBuilder {
  static create(data: Partial<TONToken>): TONToken {
    const errors = TONTokenValidator.validate(data);
    if (errors.length > 0) {
      throw new Error(`Invalid TON token: ${errors.join(', ')}`);
    }

    return {
      symbol: data.symbol!,
      address: data.address!,
      decimals: data.decimals!,
      name: data.name!,
      chainId: data.chainId!,
    };
  }

  static createTONNative(chainId: number = 101): TONToken {
    return this.create({
      symbol: 'TON',
      address: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
      decimals: 9,
      name: 'Toncoin',
      chainId,
    });
  }
}

export const TON_MAINNET_CHAIN_ID = 101;
export const TON_TESTNET_CHAIN_ID = 102;