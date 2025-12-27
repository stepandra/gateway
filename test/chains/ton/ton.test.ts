import { Ton, TonWallet } from '../../../src/chains/ton/ton';
import { ConfigManagerV2 } from '../../../src/services/config-manager-v2';
import { TokenService } from '../../../src/services/token-service';
import { ConfigManagerCertPassphrase } from '../../../src/services/config-manager-cert-passphrase';
import fse from 'fs-extra';
import { WalletContractV5R1 } from '@ton/ton';
import { Address, beginCell } from '@ton/core';

jest.mock('../../../src/services/config-manager-v2', () => ({
  ConfigManagerV2: {
    getInstance: jest.fn().mockReturnValue({
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'ton-mainnet.chainID') return -239;
        if (key === 'ton-mainnet.nodeURL') return 'https://toncenter.com';
        if (key === 'ton-mainnet.nativeCurrencySymbol') return 'TON';
        if (key === 'ton-mainnet.rpcProvider') return 'toncenter';
        if (key === 'ton-mainnet.commissionBuffer') return 0.3;
        return undefined;
      }),
    }),
  },
}));

jest.mock('../../../src/services/token-service', () => ({
  TokenService: {
    getInstance: jest.fn().mockReturnValue({
      loadTokenList: jest.fn().mockResolvedValue([
        { symbol: 'TON', address: 'native', decimals: 9, name: 'Toncoin', chainId: -239 },
      ]),
    }),
  },
}));

jest.mock('../../../src/services/config-manager-cert-passphrase', () => ({
  ConfigManagerCertPassphrase: {
    readPassphrase: jest.fn().mockReturnValue('test-passphrase'),
  },
}));

jest.mock('fs-extra');
jest.mock('@ton/ton');
jest.mock('@ton/core', () => {
  const actual = jest.requireActual('@ton/core');
  return {
    ...actual,
    external: jest.fn().mockReturnValue({}),
    internal: jest.fn().mockReturnValue({}),
    storeMessage: jest.fn().mockReturnValue(() => {}),
  };
});

describe('Ton', () => {
  let ton: Ton;

  beforeEach(() => {
    jest.clearAllMocks();
    (Ton as any)._instances = {};
    ton = Ton.getInstance('mainnet');
  });

  it('should be a singleton', () => {
    const ton2 = Ton.getInstance('mainnet');
    expect(ton).toBe(ton2);
  });

  describe('getWallet', () => {
    it('should load and decrypt a wallet', async () => {
      const address = '0:ee6f7a03da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da';
      const rawAddress = '0:ee6f7a03da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da';
      const mockEncrypted = JSON.stringify({
        algorithm: 'aes-256-ctr',
        iv: { type: 'Buffer', data: Array.from(Buffer.alloc(16)) },
        salt: { type: 'Buffer', data: Array.from(Buffer.alloc(32)) },
        encrypted: { type: 'Buffer', data: Array.from(Buffer.alloc(32)) },
      });

      (fse.readFile as jest.Mock).mockResolvedValue(mockEncrypted);
      
      const wallet = await ton.getWallet(address);
      
      expect(wallet).toBeInstanceOf(TonWallet);
      expect(wallet.address).toBe(rawAddress);
      expect(WalletContractV5R1.create).toHaveBeenCalled();
    });
  });

  describe('sendTransfer', () => {
    it('should build and send a transfer', async () => {
      const mockWallet = {
        address: '0:ee6f7a03da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da',
        keyPair: { secretKey: Buffer.alloc(64) },
        contract: {
          address: Address.parseRaw('0:ee6f7a03da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da'),
          createTransfer: jest.fn().mockReturnValue(beginCell().endCell()),
        }
      } as any;

      const internalMessages = [
        { address: '0:to', amount: BigInt(1000000), payload: beginCell().endCell() }
      ];

      (ton.rpcProvider.getWalletSeqno as jest.Mock) = jest.fn().mockResolvedValue(1);
      (ton.rpcProvider.sendMessage as jest.Mock) = jest.fn().mockResolvedValue({ message_hash: 'hash' });

      const result = await ton.sendTransfer(mockWallet, internalMessages);

      expect(ton.rpcProvider.getWalletSeqno).toHaveBeenCalledWith(mockWallet.address);
      expect(mockWallet.contract.createTransfer).toHaveBeenCalled();
      expect(ton.rpcProvider.sendMessage).toHaveBeenCalled();
      expect(result.message_hash).toBe('hash');
    });
  });

  describe('getBalances', () => {
    it('should fetch native and jetton balances', async () => {
      const address = '0:ee6f7a03da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da';
      const tokens = ['TON', 'USDT'];
      
      (ton.rpcProvider.getAccountState as jest.Mock) = jest.fn()
        .mockResolvedValueOnce({ balance: '1000000000' }) // TON
        .mockResolvedValueOnce({ balance: '5000000' });  // USDT
      
      (ton.rpcProvider.getJettonWalletAddress as jest.Mock) = jest.fn()
        .mockResolvedValue('0:jettonwallet');

      ton.tokenList = [
        { symbol: 'USDT', address: '0:usdtmaster', decimals: 6, name: 'Tether', chainId: -239 }
      ];

      const result = await ton.getBalances(address, tokens);

      expect(result['TON']).toBe(1);
      expect(result['USDT']).toBe(5);
    });
  });

  describe('getTokens', () => {
    it('should return the token list', () => {
      ton.tokenList = [{ symbol: 'TON', address: 'native', decimals: 9, name: 'Toncoin', chainId: -239 }];
      expect(ton.getTokens()).toEqual(ton.tokenList);
    });
  });
});

