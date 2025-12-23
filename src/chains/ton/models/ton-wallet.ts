export type WalletType = 'v3r1' | 'v3r2' | 'v4' | 'v5';

export interface TONWallet {
  address: string;
  type: WalletType;
  seqno: number;
  balance: string;
  isActive: boolean;
  publicKey?: string;
}

export class TONWalletValidator {
  static validate(wallet: Partial<TONWallet>): string[] {
    const errors: string[] = [];

    if (!wallet.address) {
      errors.push('address is required');
    } else if (!this.isValidTONAddress(wallet.address)) {
      errors.push('address must be a valid TON wallet address');
    }

    if (!wallet.type) {
      errors.push('type is required');
    } else if (!['v3r1', 'v3r2', 'v4', 'v5'].includes(wallet.type)) {
      errors.push('type must be a supported wallet version (v3r1, v3r2, v4, v5)');
    }

    if (wallet.seqno === undefined) {
      errors.push('seqno is required');
    } else if (!Number.isInteger(wallet.seqno) || wallet.seqno < 0) {
      errors.push('seqno must be a non-negative integer');
    }

    if (!wallet.balance) {
      errors.push('balance is required');
    } else if (!this.isNonNegativeBigNumber(wallet.balance)) {
      errors.push('balance must be a non-negative BigNumber string');
    }

    if (wallet.isActive === undefined) {
      errors.push('isActive is required');
    } else if (typeof wallet.isActive !== 'boolean') {
      errors.push('isActive must be a boolean');
    }

    if (wallet.publicKey !== undefined) {
      if (!this.isValidHexString(wallet.publicKey)) {
        errors.push('publicKey must be a valid hex string');
      }
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

  private static isValidHexString(value: string): boolean {
    return /^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0;
  }
}

export class TONWalletBuilder {
  static create(data: Partial<TONWallet>): TONWallet {
    const errors = TONWalletValidator.validate(data);
    if (errors.length > 0) {
      throw new Error(`Invalid TON wallet: ${errors.join(', ')}`);
    }

    return {
      address: data.address!,
      type: data.type!,
      seqno: data.seqno!,
      balance: data.balance!,
      isActive: data.isActive!,
      publicKey: data.publicKey,
    };
  }

  static fromAddress(address: string, type: WalletType = 'v4'): TONWallet {
    return this.create({
      address,
      type,
      seqno: 0,
      balance: '0',
      isActive: false,
    });
  }

  static formatBalance(balance: string, decimals: number = 9): string {
    const balanceBigInt = BigInt(balance);
    const divisor = BigInt(10 ** decimals);
    const wholePart = balanceBigInt / divisor;
    const fractionalPart = balanceBigInt % divisor;

    if (fractionalPart === 0n) {
      return wholePart.toString();
    }

    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.replace(/0+$/, '');

    return `${wholePart}.${trimmedFractional}`;
  }

  static parseAmount(amount: string, decimals: number = 9): string {
    const parts = amount.split('.');
    const wholePart = parts[0] || '0';
    const fractionalPart = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);

    const wholePartBigInt = BigInt(wholePart);
    const fractionalPartBigInt = BigInt(fractionalPart);
    const multiplier = BigInt(10 ** decimals);

    return (wholePartBigInt * multiplier + fractionalPartBigInt).toString();
  }
}