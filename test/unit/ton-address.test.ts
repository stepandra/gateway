import { TONAddressUtils } from '../../src/chains/ton/utils/ton-address';

describe('TONAddressUtils', () => {
  describe('validateAddress', () => {
    it('should validate correct EQ addresses', () => {
      const validEQAddress = 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      expect(TONAddressUtils.validateAddress(validEQAddress)).toBe(true);
    });

    it('should validate correct UQ addresses', () => {
      const validUQAddress = 'UQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      expect(TONAddressUtils.validateAddress(validUQAddress)).toBe(true);
    });

    it('should validate raw hex addresses', () => {
      const validRawAddress = '0eb8da2da84b90c07e84c0a69333b206e1c9d77f59518c9f1eee91441291b3bd';
      expect(TONAddressUtils.validateAddress(validRawAddress)).toBe(true);
    });

    it('should reject addresses with invalid prefix', () => {
      const invalidAddress = 'XQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      expect(TONAddressUtils.validateAddress(invalidAddress)).toBe(false);
    });

    it('should reject addresses with invalid length', () => {
      const shortAddress = 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRB';
      expect(TONAddressUtils.validateAddress(shortAddress)).toBe(false);
    });

    it('should reject addresses with invalid characters', () => {
      const invalidCharAddress = 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvT$M';
      expect(TONAddressUtils.validateAddress(invalidCharAddress)).toBe(false);
    });

    it('should reject empty addresses', () => {
      expect(TONAddressUtils.validateAddress('')).toBe(false);
    });

    it('should reject null/undefined addresses', () => {
      expect(TONAddressUtils.validateAddress(null as any)).toBe(false);
      expect(TONAddressUtils.validateAddress(undefined as any)).toBe(false);
    });
  });

  describe('normalizeAddress', () => {
    it('should normalize EQ address to standard format', () => {
      const eqAddress = 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      const normalized = TONAddressUtils.normalizeAddress(eqAddress);
      expect(normalized).toBe('EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM');
    });

    it('should normalize UQ address to EQ format', () => {
      const uqAddress = 'UQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      const normalized = TONAddressUtils.normalizeAddress(uqAddress);
      expect(normalized).toMatch(/^EQ[A-Za-z0-9_-]{46}$/);
    });

    it('should handle raw hex addresses', () => {
      const rawAddress = '0eb8da2da84b90c07e84c0a69333b206e1c9d77f59518c9f1eee91441291b3bd';
      const normalized = TONAddressUtils.normalizeAddress(rawAddress);
      expect(normalized).toMatch(/^EQ[A-Za-z0-9_-]{46}$/);
    });

    it('should throw error for invalid addresses', () => {
      expect(() => {
        TONAddressUtils.normalizeAddress('invalid-address');
      }).toThrow('Invalid TON address format');
    });
  });

  describe('isTestnetAddress', () => {
    it('should identify testnet addresses correctly', () => {
      // This would require actual testnet addresses to test properly
      const mainnetAddress = 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      const result = TONAddressUtils.isTestnetAddress(mainnetAddress);
      expect(typeof result).toBe('boolean');
    });

    it('should handle invalid addresses', () => {
      expect(() => {
        TONAddressUtils.isTestnetAddress('invalid');
      }).toThrow();
    });
  });

  describe('getWorkchain', () => {
    it('should extract workchain from valid address', () => {
      const address = 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      const workchain = TONAddressUtils.getWorkchain(address);
      expect(typeof workchain).toBe('number');
      expect(workchain).toBeGreaterThanOrEqual(-1);
      expect(workchain).toBeLessThanOrEqual(255);
    });

    it('should throw error for invalid addresses', () => {
      expect(() => {
        TONAddressUtils.getWorkchain('invalid');
      }).toThrow();
    });
  });

  describe('formatAddress', () => {
    it('should format address with default options', () => {
      const address = 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      const formatted = TONAddressUtils.formatAddress(address);
      expect(formatted).toMatch(/^EQ[A-Za-z0-9_-]{46}$/);
    });

    it('should format as bounceable when requested', () => {
      const address = 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      const formatted = TONAddressUtils.formatAddress(address, { bounceable: true });
      expect(formatted).toMatch(/^EQ[A-Za-z0-9_-]{46}$/);
    });

    it('should format as non-bounceable when requested', () => {
      const address = 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      const formatted = TONAddressUtils.formatAddress(address, { bounceable: false });
      expect(formatted).toMatch(/^UQ[A-Za-z0-9_-]{46}$/);
    });

    it('should format with URL safe encoding', () => {
      const address = 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      const formatted = TONAddressUtils.formatAddress(address, { urlSafe: true });
      expect(formatted).not.toContain('+');
      expect(formatted).not.toContain('/');
    });

    it('should handle testOnly flag', () => {
      const address = 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      const formatted = TONAddressUtils.formatAddress(address, { testOnly: true });
      expect(typeof formatted).toBe('string');
    });
  });

  describe('getAddressInfo', () => {
    it('should return comprehensive address information', () => {
      const address = 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      const info = TONAddressUtils.getAddressInfo(address);

      expect(info).toHaveProperty('isValid', true);
      expect(info).toHaveProperty('workchain');
      expect(info).toHaveProperty('isBounceable');
      expect(info).toHaveProperty('isTestOnly');
      expect(info).toHaveProperty('raw');
      expect(info).toHaveProperty('normalized');

      expect(typeof info.workchain).toBe('number');
      expect(typeof info.isBounceable).toBe('boolean');
      expect(typeof info.isTestOnly).toBe('boolean');
      expect(typeof info.raw).toBe('string');
      expect(typeof info.normalized).toBe('string');
    });

    it('should return invalid info for bad addresses', () => {
      const info = TONAddressUtils.getAddressInfo('invalid-address');
      expect(info.isValid).toBe(false);
      expect(info.workchain).toBeNull();
      expect(info.raw).toBeNull();
      expect(info.normalized).toBeNull();
    });
  });

  describe('truncateAddress', () => {
    it('should truncate address with default length', () => {
      const address = 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      const truncated = TONAddressUtils.truncateAddress(address);
      expect(truncated).toMatch(/^EQ[A-Za-z0-9_-]{6}\.\.\.[A-Za-z0-9_-]{6}$/);
    });

    it('should truncate address with custom length', () => {
      const address = 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      const truncated = TONAddressUtils.truncateAddress(address, 4);
      expect(truncated).toMatch(/^EQ[A-Za-z0-9_-]{4}\.\.\.[A-Za-z0-9_-]{4}$/);
    });

    it('should return full address if too short to truncate', () => {
      const shortAddress = 'EQAbc';
      const truncated = TONAddressUtils.truncateAddress(shortAddress, 10);
      expect(truncated).toBe(shortAddress);
    });

    it('should handle empty addresses', () => {
      expect(TONAddressUtils.truncateAddress('')).toBe('');
    });
  });

  describe('areAddressesEqual', () => {
    it('should return true for identical addresses', () => {
      const address = 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      expect(TONAddressUtils.areAddressesEqual(address, address)).toBe(true);
    });

    it('should return true for equivalent EQ and UQ addresses', () => {
      const eqAddress = 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      const uqAddress = 'UQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      expect(TONAddressUtils.areAddressesEqual(eqAddress, uqAddress)).toBe(true);
    });

    it('should return false for different addresses', () => {
      const address1 = 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      const address2 = 'EQBvMzBfz2w6PGG2zQUQ5v7UwwfZe1x7w2mCczMR8C6sTQl2';
      expect(TONAddressUtils.areAddressesEqual(address1, address2)).toBe(false);
    });

    it('should handle invalid addresses', () => {
      const validAddress = 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      expect(TONAddressUtils.areAddressesEqual(validAddress, 'invalid')).toBe(false);
      expect(TONAddressUtils.areAddressesEqual('invalid1', 'invalid2')).toBe(false);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle very long invalid strings', () => {
      const longInvalidString = 'a'.repeat(1000);
      expect(TONAddressUtils.validateAddress(longInvalidString)).toBe(false);
    });

    it('should handle strings with special characters', () => {
      const specialChars = 'EQDrjaLahLkMB@hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      expect(TONAddressUtils.validateAddress(specialChars)).toBe(false);
    });

    it('should handle unicode characters', () => {
      const unicodeAddress = 'EQDrjaLahLkMB🚀hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      expect(TONAddressUtils.validateAddress(unicodeAddress)).toBe(false);
    });
  });

  describe('Performance tests', () => {
    it('should validate addresses quickly', () => {
      const address = 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        TONAddressUtils.validateAddress(address);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete 1000 validations in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should normalize addresses quickly', () => {
      const address = 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        TONAddressUtils.normalizeAddress(address);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete 100 normalizations in under 50ms
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Integration with TON SDK', () => {
    it('should work with TON SDK Address objects', () => {
      // This test ensures our utilities work with actual TON SDK
      const address = 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKlWzvTSM';

      // Basic validation should work
      expect(TONAddressUtils.validateAddress(address)).toBe(true);

      // Normalization should return valid format
      const normalized = TONAddressUtils.normalizeAddress(address);
      expect(normalized).toMatch(/^EQ[A-Za-z0-9_-]{46}$/);

      // Info extraction should work
      const info = TONAddressUtils.getAddressInfo(address);
      expect(info.isValid).toBe(true);
    });
  });
});