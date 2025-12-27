import { FastifyInstance } from 'fastify';
import { gatewayApp } from '../../../src/app';
import { DeDust } from '../../../src/connectors/dedust/dedust';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock ConfigManagerV2
jest.mock('../../../src/services/config-manager-v2', () => ({
  ConfigManagerV2: {
    getInstance: jest.fn().mockReturnValue({
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'ton-mainnet.rpcProvider') return 'toncenter';
        if (key === 'ton-mainnet.nativeCurrencySymbol') return 'TON';
        if (key === 'ton-mainnet.chainID') return -239;
        if (key === 'ton-mainnet.nodeURL') return 'https://toncenter.com/api/v2/jsonRPC';
        if (key === 'ton-mainnet.commissionBuffer') return 0.3;
        if (key === 'ton-mainnet.txConfirmationTimeoutSeconds') return 0.5; // Fast timeout
        if (key === 'ton-mainnet.txPollIntervalSeconds') return 0.1;
        if (key === 'dedust.router.baseUrl') return 'https://api.dedust.io';
        if (key === 'dedust.router.slippage') return 0.5;
        if (key === 'apiKeys.toncenter') return 'fake-key';
        return undefined;
      }),
    }),
  },
}));

// Mock TokenService
jest.mock('../../../src/services/token-service', () => ({
  TokenService: {
    getInstance: jest.fn().mockReturnValue({
      loadTokenList: jest.fn().mockResolvedValue([{ symbol: 'TON', address: 'native', decimals: 9, chainId: -239 }]),
    }),
  },
}));

// Mock cert passphrase
jest.mock('../../../src/services/config-manager-cert-passphrase', () => ({
  ConfigManagerCertPassphrase: {
    readPassphrase: jest.fn().mockReturnValue('pass'),
  },
}));

// Mock wallet reading (fs-extra)
jest.mock('fs-extra', () => ({
  readFile: jest.fn().mockResolvedValue(
    JSON.stringify({
      algorithm: 'aes-256-ctr',
      iv: { type: 'Buffer', data: [] },
      salt: { type: 'Buffer', data: [] },
      encrypted: { type: 'Buffer', data: [] },
    }),
  ),
}));

describe('DeDust E2E (Simulated)', () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    // Setup Axios mocks for Toncenter (instantiated in Ton class)
    // Since axios.create is used, we need to mock the instance it returns
    const mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
    };
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    fastify = gatewayApp;
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  it('should execute swap and wait for confirmation (Success)', async () => {
    const dedust = DeDust.getInstance('mainnet');

    // Mock DeDust internal methods to isolate swap logic
    jest.spyOn(dedust.chain, 'getWallet').mockResolvedValue({
      address: '0:wallet',
      contract: { address: '0:wallet-contract' } as any,
      keyPair: {} as any,
      signMessage: jest.fn(),
    } as any);

    jest.spyOn(dedust.chain, 'getBalances').mockResolvedValue({ TON: 100 });
    jest.spyOn(dedust.chain, 'sendTransfer').mockResolvedValue({ message_hash: 'msg-hash-success' });

    // Mock DeDust quote response (internal call)
    jest.spyOn(dedust, 'getQuote').mockResolvedValue({
      swapData: { some: 'data' },
      amountOut: 10,
      tokenIn: 'native',
      tokenOut: '0:token',
    } as any);

    // Mock Axios calls made by DeDust.executeSwap
    // DeDust.executeSwap calls axios.post to dedust API
    mockedAxios.post.mockResolvedValueOnce({
      data: { transactions: [{ address: '0:target', amount: '1000' }] },
    });

    // Mock RPC Provider calls for confirmation
    const rpcProvider = dedust.chain.rpcProvider;
    // @ts-ignore
    const mockRpcAxiosGet = rpcProvider.axios.get as jest.Mock;

    // Mock actionsByMessage
    mockRpcAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/v3/actions') {
        return Promise.resolve({ data: { actions: [{ status: 'ok' }] } });
      }
      return Promise.resolve({ data: {} });
    });

    const response = await fastify.inject({
      method: 'POST',
      url: '/connectors/dedust/router/swap',
      payload: {
        chain: 'ton',
        network: 'mainnet',
        baseToken: 'TON',
        quoteToken: 'USDT',
        amount: 1,
        side: 'SELL',
        walletAddress: '0:wallet',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe(1);
    expect(body.signature).toBe('msg-hash-success');
  });

  it('should return pending if timeout', async () => {
    const dedust = DeDust.getInstance('mainnet');

    jest.spyOn(dedust.chain, 'getWallet').mockResolvedValue({ address: '0:wallet' } as any);
    jest.spyOn(dedust.chain, 'getBalances').mockResolvedValue({ TON: 100 });
    jest.spyOn(dedust.chain, 'sendTransfer').mockResolvedValue({ message_hash: 'msg-hash-timeout' });
    jest.spyOn(dedust, 'getQuote').mockResolvedValue({
      swapData: { some: 'data' },
      amountOut: 10,
      tokenIn: 'native',
      tokenOut: '0:token',
    } as any);

    // Mock DeDust API swap response
    mockedAxios.post.mockResolvedValueOnce({
      data: { transactions: [{ address: '0:target', amount: '1000' }] },
    });

    const rpcProvider = dedust.chain.rpcProvider;
    // @ts-ignore
    const mockRpcAxiosGet = rpcProvider.axios.get as jest.Mock;

    // Mock actions/transactions returning empty
    mockRpcAxiosGet.mockImplementation(() => Promise.resolve({ data: { actions: [], transactions: [] } }));
    const response = await fastify.inject({
      method: 'POST',
      url: '/connectors/dedust/router/swap',
      payload: {
        chain: 'ton',
        network: 'mainnet',
        baseToken: 'TON',
        quoteToken: 'USDT',
        amount: 1,
        side: 'SELL',
        walletAddress: '0:wallet',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe(0);
    expect(body.signature).toBe('msg-hash-timeout');
  });
});
