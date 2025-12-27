import { Address, beginCell, toNano, Cell, TupleBuilder } from '@ton/core';
import { DeDustPoolContract } from '../../../../src/connectors/dedust/contracts/pool';

// Mock ContractProvider
const mockProvider = (stackItems: any[]) => {
  // Simple mock of TupleReader interface
  const reader = {
    readNumber: () => Number(stackItems.shift().value),
    readBoolean: () => stackItems.shift().value === -1n, // -1 is true in TVM
    readBigNumber: () => stackItems.shift().value,
    readCell: () => stackItems.shift().cell,
    readCellOpt: () => stackItems.shift()?.cell, // simplified
    // add other methods if needed
  };

  return {
    get: jest.fn().mockResolvedValue({ stack: reader }),
  } as any;
};

describe('DeDustPoolContract', () => {
  const POOL_ADDRESS = Address.parse('EQDyr9Q8SVYiBJnYupTk13ZMYB_iRY3QDFfpfCISCAWxUcWi');
  const pool = new DeDustPoolContract(POOL_ADDRESS);

  describe('Payload Builders', () => {
    it('should build PayNative payload (Deposit TON)', () => {
      const payload = pool.createDepositLiquidityPayload({
        amountA: toNano('10'), // TON
        amountB: toNano('50'), // Other token
      });
      
      expect(payload).toBeDefined();
      expect(payload.toBoc().toString('hex')).toMatchSnapshot();
    });

    it('should build Withdraw payload', () => {
      const payload = pool.createWithdrawPayload({
        amount: toNano('10'),
        targetAddress: Address.parse('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs')
      });

      expect(payload).toBeDefined();
      expect(payload.toBoc().toString('hex')).toMatchSnapshot();
    });

    it('should build Claim Fees payload', () => {
      const payload = pool.createClaimFeesPayload();
      
      expect(payload).toBeDefined();
      expect(payload.toBoc().toString('hex')).toMatchSnapshot();
    });
  });

  describe('getPoolData', () => {
    it('should parse pool data correctly', async () => {
      const tonAsset = beginCell().storeUint(0, 4).endCell(); // Native
      const usdtAddress = Address.parse('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs');
      const usdtAsset = beginCell()
        .storeUint(1, 4)
        .storeInt(usdtAddress.workChain, 8)
        .storeBuffer(usdtAddress.hash)
        .endCell();

      // Mock stack response for get_pool_data
      // Order: status(int), deposit_active(bool), swap_active(bool), 
      // assetX(Cell), assetY(Cell), wallets(Cell), assets(Cell), resolutions(Cell), 
      // baseFee(int), reserveX(int), reserveY(int), liquidity(int)
      
      const stack = [
        { type: 'int', value: 2n }, // status: Initialized (2)
        { type: 'int', value: -1n }, // deposit_active: true (-1)
        { type: 'int', value: -1n }, // swap_active: true
        { type: 'cell', cell: tonAsset }, // assetX
        { type: 'cell', cell: usdtAsset }, // assetY
        { type: 'null' }, // wallets
        { type: 'null' }, // assets
        { type: 'null' }, // resolutions
        { type: 'int', value: 30n }, // baseFeeBps (0.3%)
        { type: 'int', value: toNano('100') }, // reserveX
        { type: 'int', value: toNano('500') }, // reserveY
        { type: 'int', value: toNano('1000') }, // liquidity
      ];

      const provider = mockProvider(stack);
      const data = await pool.getPoolData(provider);

      expect(data.status).toBe(2);
      expect(data.depositActive).toBe(true);
      expect(data.swapActive).toBe(true);
      expect(data.baseFeeBps).toBe(30);
      expect(data.reserveX).toEqual(toNano('100'));
      expect(data.reserveY).toEqual(toNano('500'));
      expect(data.liquidity).toEqual(toNano('1000'));
    });
  });
});
