import { Address } from '@ton/core';

import { DeDustAsset, DeDustAddressUtils } from '../../../src/connectors/dedust/dedust.utils';

describe('DeDustUtils', () => {
  const FACTORY_ADDRESS = Address.parse('EQBfBWT7X2BHg9tXAxzhz2aKiNTU1tpt5NsiK0uSDW_YAJ67');

  describe('DeDustAsset', () => {
    it('should create native asset', () => {
      const asset = DeDustAsset.native();
      expect(asset.isNative).toBe(true);
      expect(asset.address).toBeNull();
      expect(asset.toString()).toBe('native');
    });

    it('should create jetton asset', () => {
      const jettonAddress = Address.parse('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs');
      const asset = DeDustAsset.jetton(jettonAddress);
      expect(asset.isNative).toBe(false);
      expect(asset.address?.equals(jettonAddress)).toBe(true);
      expect(asset.toString()).toBe('jetton:EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs');
    });

    it('should compare assets correctly', () => {
      const native = DeDustAsset.native();
      const usdt = DeDustAsset.jetton(Address.parse('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs'));
      const scale = DeDustAsset.jetton(Address.parse('EQBlqsm144Dq6SjbPI4jjZvA1hqTIP3CvHovbIfW_t-SCALE'));

      expect(native.compare(usdt)).toBe(-1); // Native < Jetton
      expect(usdt.compare(native)).toBe(1); // Jetton > Native
      expect(usdt.compare(usdt)).toBe(0);

      // Jetton comparison depends on address bytes
      // USDT: EQCx...
      // SCALE: EQBl...
      // B comes before C
      expect(scale.compare(usdt)).toBe(-1);
      expect(usdt.compare(scale)).toBe(1);
    });
  });

  describe('DeDustAddressUtils', () => {
    it('should calculate correct vault address for USDT', () => {
      const usdt = DeDustAsset.jetton(Address.parse('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs'));
      const vaultAddress = DeDustAddressUtils.getVaultAddress(FACTORY_ADDRESS, usdt);

      const expected = Address.parse('EQAYqo4u7VF0fa4DPAebk4g9lBytj2VFny7pzXR0trjtXQaO');
      expect(vaultAddress.equals(expected)).toBe(true);
    });

    it('should calculate correct pool address for TON/USDT', () => {
      const ton = DeDustAsset.native();
      const usdt = DeDustAsset.jetton(Address.parse('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs'));

      const poolAddress = DeDustAddressUtils.getPoolAddress(FACTORY_ADDRESS, ton, usdt);
      const expected = Address.parse('EQA-X_yo3fzzbDbJ_0bzFWKqtRuZFIRa1sJsveZJ1YpViO3r');

      expect(poolAddress.equals(expected)).toBe(true);
    });

    it('should calculate correct pool address for SCALE/USDT (Jetton/Jetton)', () => {
      const scale = DeDustAsset.jetton(Address.parse('EQBlqsm144Dq6SjbPI4jjZvA1hqTIP3CvHovbIfW_t-SCALE'));
      const usdt = DeDustAsset.jetton(Address.parse('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs'));

      const poolAddress = DeDustAddressUtils.getPoolAddress(FACTORY_ADDRESS, scale, usdt);
      const expected = Address.parse('EQDyr9Q8SVYiBJnYupTk13ZMYB_iRY3QDFfpfCISCAWxUcWi');

      expect(poolAddress.equals(expected)).toBe(true);
    });

    it('should calculate same pool address regardless of asset order', () => {
      const ton = DeDustAsset.native();
      const usdt = DeDustAsset.jetton(Address.parse('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs'));

      const pool1 = DeDustAddressUtils.getPoolAddress(FACTORY_ADDRESS, ton, usdt);
      const pool2 = DeDustAddressUtils.getPoolAddress(FACTORY_ADDRESS, usdt, ton);

      expect(pool1.equals(pool2)).toBe(true);
    });
  });
});
