import { FastifyInstance } from 'fastify';

// Import shared mocks before importing app
import '../../mocks/app-mocks';

import { gatewayApp } from '../../../src/app';
import { Ton } from '../../../src/chains/ton/ton';

jest.mock('../../../src/chains/ton/ton');

describe('TON Routes', () => {
  let app: FastifyInstance;
  let mockTon: any;

  beforeAll(async () => {
    app = gatewayApp;
    mockTon = {
      network: 'mainnet',
      initialized: true,
      init: jest.fn(),
      config: {
        nodeURL: 'https://toncenter.com',
        rpcProvider: 'toncenter',
      },
      nativeTokenSymbol: 'TON',
      getBalances: jest.fn().mockResolvedValue({ TON: 1.5 }),
      getTokens: jest.fn().mockReturnValue([{ symbol: 'TON', address: 'native', decimals: 9, name: 'Toncoin' }]),
      getTransaction: jest.fn(),
    };
    (Ton.getInstance as jest.Mock).mockReturnValue(mockTon);
  });

  afterAll(async () => {
    // Note: Do not close the app here if it's shared, but usually it's fine in isolated tests
  });

  describe('GET /chains/ton/status', () => {
    it('should return 200 and chain status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/chains/ton/status',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.chain).toBe('ton');
      expect(data.rpcProvider).toBe('toncenter');
    });
  });

  describe('POST /chains/ton/poll', () => {
    it('should return 200 and transaction status', async () => {
      mockTon.getTransaction.mockResolvedValue({
        hash: 'txhash',
        description: {
          compute_phase: { type: 'vm', exit_code: 0 },
          action_phase: { result_code: 0 },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/chains/ton/poll',
        payload: {
          txHash: 'txhash',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.confirmed).toBe(true);
      expect(data.success).toBe(true);
    });

    it('should return unconfirmed if tx not found', async () => {
      mockTon.getTransaction.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/chains/ton/poll',
        payload: {
          txHash: 'unknown',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.confirmed).toBe(false);
    });
  });

  describe('POST /chains/ton/balances', () => {
    it('should return 200 and account balances', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/chains/ton/balances',
        payload: {
          address: '0:ee6f7a03da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da3da',
          tokens: ['TON'],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.balances['TON']).toBe(1.5);
    });
  });

  describe('GET /chains/ton/tokens', () => {
    it('should return 200 and token list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/chains/ton/tokens',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.tokens).toHaveLength(1);
      expect(data.tokens[0].symbol).toBe('TON');
    });
  });
});
