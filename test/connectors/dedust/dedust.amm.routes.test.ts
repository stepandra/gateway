import { FastifyInstance } from 'fastify';

import { gatewayApp } from '../../../src/app';
import { DeDustAMM } from '../../../src/connectors/dedust/dedust.amm';

jest.mock('../../../src/connectors/dedust/dedust.amm', () => {
  const mockAmm = {
    poolInfo: jest.fn(),
    addLiquidity: jest.fn(),
    removeLiquidity: jest.fn(),
    positionInfo: jest.fn(),
    quoteLiquidity: jest.fn(),
    claimFees: jest.fn(),
  };
  return {
    DeDustAMM: {
      getInstance: jest.fn().mockReturnValue(mockAmm),
    },
  };
});

describe('DeDust AMM Routes', () => {
  let app: FastifyInstance;
  let mockDeDustAmm: any;

  beforeAll(async () => {
    app = gatewayApp;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockDeDustAmm = DeDustAMM.getInstance('mainnet');
  });

  it('GET /connector/dedust/amm/pool-info should return pool info', async () => {
    mockDeDustAmm.poolInfo.mockResolvedValue({
      address: 'EQA-pool',
      baseTokenAddress: 'native',
      quoteTokenAddress: 'EQ...usdt',
      feePct: 0.3,
      price: 5,
      baseTokenAmount: 100,
      quoteTokenAmount: 500,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/connector/dedust/amm/pool-info',
      query: {
        network: 'mainnet',
        poolAddress: 'EQA-pool',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.address).toBe('EQA-pool');
    expect(mockDeDustAmm.poolInfo).toHaveBeenCalled();
  });

  it('POST /connector/dedust/amm/add-liquidity should initiate deposit', async () => {
    mockDeDustAmm.addLiquidity.mockResolvedValue({
      signature: 'tx_hash',
      status: 1,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/connector/dedust/amm/add-liquidity',
      body: {
        network: 'mainnet',
        walletAddress: 'UQ...wallet',
        poolAddress: 'EQA-pool',
        baseTokenAmount: 10,
        quoteTokenAmount: 50,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.signature).toBe('tx_hash');
    expect(mockDeDustAmm.addLiquidity).toHaveBeenCalled();
  });

  it('POST /connector/dedust/amm/remove-liquidity should initiate withdrawal', async () => {
    mockDeDustAmm.removeLiquidity.mockResolvedValue({
      signature: 'tx_hash',
      status: 1,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/connector/dedust/amm/remove-liquidity',
      body: {
        network: 'mainnet',
        walletAddress: 'UQ...wallet',
        poolAddress: 'EQA-pool',
        percentageToRemove: 50,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockDeDustAmm.removeLiquidity).toHaveBeenCalled();
  });

  it('GET /connector/dedust/amm/position-info should return position info', async () => {
    mockDeDustAmm.positionInfo.mockResolvedValue({
      poolAddress: 'EQA-pool',
      walletAddress: 'UQ...wallet',
      baseTokenAddress: 'native',
      quoteTokenAddress: 'EQ...usdt',
      lpTokenAmount: 100,
      baseTokenAmount: 10,
      quoteTokenAmount: 50,
      price: 5,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/connector/dedust/amm/position-info',
      query: {
        network: 'mainnet',
        poolAddress: 'EQA-pool',
        walletAddress: 'UQ...wallet',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockDeDustAmm.positionInfo).toHaveBeenCalled();
  });

  it('GET /connectors/dedust/amm/quote-liquidity should return liquidity quote', async () => {
    mockDeDustAmm.quoteLiquidity.mockResolvedValue({
      baseLimited: true,
      baseTokenAmount: 10,
      quoteTokenAmount: 50,
      baseTokenAmountMax: 10.1,
      quoteTokenAmountMax: 50.5,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/connectors/dedust/amm/quote-liquidity',
      query: {
        network: 'mainnet',
        poolAddress: 'EQA-pool',
        baseTokenAmount: '10',
        quoteTokenAmount: '0',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockDeDustAmm.quoteLiquidity).toHaveBeenCalled();
  });

  it('POST /connectors/dedust/amm/claim-fees should initiate fee claim', async () => {
    mockDeDustAmm.claimFees.mockResolvedValue({
      signature: 'tx_hash',
      status: 1,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/claim-fees',
      body: {
        network: 'mainnet',
        walletAddress: 'UQ...wallet',
        poolAddress: 'EQA-pool',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockDeDustAmm.claimFees).toHaveBeenCalled();
  });
});
