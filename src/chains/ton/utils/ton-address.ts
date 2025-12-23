import { Address } from '@ton/core';

export interface ParsedAddress {
  raw: string;
  bounceable: string;
  nonBounceable: string;
  testOnly: boolean;
  workchain: number;
}

export class TONAddressUtils {
  /**
   * Validates if a string is a valid TON address
   */
  static isValidAddress(address: string): boolean {
    try {
      Address.parse(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates if address is a wallet address (workchain 0)
   */
  static isValidWalletAddress(address: string): boolean {
    try {
      const parsed = Address.parse(address);
      return parsed.workChain === 0;
    } catch {
      return false;
    }
  }

  /**
   * Validates if address is a contract address (can be workchain 0 or -1)
   */
  static isValidContractAddress(address: string): boolean {
    try {
      const parsed = Address.parse(address);
      return parsed.workChain === 0 || parsed.workChain === -1;
    } catch {
      return false;
    }
  }

  /**
   * Parses a TON address and returns detailed information
   */
  static parseAddress(address: string): ParsedAddress {
    try {
      const parsed = Address.parse(address);

      return {
        raw: parsed.toString({ urlSafe: true, bounceable: false, testOnly: false }),
        bounceable: parsed.toString({ urlSafe: true, bounceable: true, testOnly: false }),
        nonBounceable: parsed.toString({ urlSafe: true, bounceable: false, testOnly: false }),
        testOnly: false, // This would need to be determined from context
        workchain: parsed.workChain,
      };
    } catch (error) {
      throw new Error(`Invalid TON address: ${address}`);
    }
  }

  /**
   * Normalizes address to bounceable format for consistency
   */
  static normalizeAddress(address: string): string {
    try {
      const parsed = Address.parse(address);
      return parsed.toString({ urlSafe: true, bounceable: true, testOnly: false });
    } catch (error) {
      throw new Error(`Invalid TON address for normalization: ${address}`);
    }
  }

  /**
   * Converts address to user-friendly format (non-bounceable for wallets)
   */
  static toUserFriendly(address: string, isWallet: boolean = true): string {
    try {
      const parsed = Address.parse(address);
      return parsed.toString({
        urlSafe: true,
        bounceable: !isWallet, // Wallets use non-bounceable, contracts use bounceable
        testOnly: false
      });
    } catch (error) {
      throw new Error(`Invalid TON address for user-friendly conversion: ${address}`);
    }
  }

  /**
   * Converts address to raw format (hex without prefix)
   */
  static toRaw(address: string): string {
    try {
      const parsed = Address.parse(address);
      return `${parsed.workChain}:${parsed.hash.toString('hex')}`;
    } catch (error) {
      throw new Error(`Invalid TON address for raw conversion: ${address}`);
    }
  }

  /**
   * Checks if two addresses are the same
   */
  static areEqual(address1: string, address2: string): boolean {
    try {
      const parsed1 = Address.parse(address1);
      const parsed2 = Address.parse(address2);
      return parsed1.equals(parsed2);
    } catch {
      return false;
    }
  }

  /**
   * Gets the workchain from an address
   */
  static getWorkchain(address: string): number {
    try {
      const parsed = Address.parse(address);
      return parsed.workChain;
    } catch (error) {
      throw new Error(`Invalid TON address for workchain extraction: ${address}`);
    }
  }

  /**
   * Gets the hash from an address
   */
  static getHash(address: string): Buffer {
    try {
      const parsed = Address.parse(address);
      return parsed.hash;
    } catch (error) {
      throw new Error(`Invalid TON address for hash extraction: ${address}`);
    }
  }

  /**
   * Validates and formats address for API requests
   */
  static formatForAPI(address: string): string {
    if (!this.isValidAddress(address)) {
      throw new Error(`Invalid TON address: ${address}`);
    }
    return this.normalizeAddress(address);
  }

  /**
   * Validates address for specific use cases
   */
  static validateForUseCase(address: string, useCase: 'wallet' | 'contract' | 'any'): boolean {
    switch (useCase) {
      case 'wallet':
        return this.isValidWalletAddress(address);
      case 'contract':
        return this.isValidContractAddress(address);
      case 'any':
        return this.isValidAddress(address);
      default:
        return false;
    }
  }

  /**
   * Creates a zero address for testing purposes
   */
  static createZeroAddress(): string {
    const zeroHash = Buffer.alloc(32, 0);
    const address = new Address(0, zeroHash);
    return address.toString({ urlSafe: true, bounceable: false, testOnly: false });
  }

  /**
   * Checks if address is a zero address
   */
  static isZeroAddress(address: string): boolean {
    try {
      const parsed = Address.parse(address);
      const zeroHash = new Uint8Array(32);
      return parsed.workChain === 0 &&
             parsed.hash.length === zeroHash.length &&
             parsed.hash.every((byte, index) => byte === zeroHash[index]);
    } catch {
      return false;
    }
  }

  /**
   * Generates a deterministic address for testing
   */
  static generateTestAddress(seed: string, workchain: number = 0): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(seed).digest();
    const address = new Address(workchain, hash);
    return address.toString({ urlSafe: true, bounceable: workchain !== 0, testOnly: false });
  }

  /**
   * Validates multiple addresses at once
   */
  static validateAddresses(addresses: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const address of addresses) {
      if (this.isValidAddress(address)) {
        valid.push(address);
      } else {
        invalid.push(address);
      }
    }

    return { valid, invalid };
  }

  /**
   * Formats address for display in UI
   */
  static formatForDisplay(address: string, maxLength: number = 12): string {
    try {
      const normalized = this.normalizeAddress(address);
      if (normalized.length <= maxLength) {
        return normalized;
      }
      const start = normalized.slice(0, Math.floor(maxLength / 2));
      const end = normalized.slice(-Math.floor(maxLength / 2));
      return `${start}...${end}`;
    } catch {
      return address.slice(0, maxLength);
    }
  }

  /**
   * Checks if address matches a specific pattern (for filtering)
   */
  static matchesPattern(address: string, pattern: string): boolean {
    try {
      const normalized = this.normalizeAddress(address);
      const regex = new RegExp(pattern, 'i');
      return regex.test(normalized);
    } catch {
      return false;
    }
  }
}

export const TON_NATIVE_ADDRESS = 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';
export const TON_ZERO_ADDRESS = TONAddressUtils.createZeroAddress();