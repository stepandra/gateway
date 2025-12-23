import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { gatewayApp } from '../../src/app';

describe('GET /connectors/dedust/amm/position-info', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = gatewayApp;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const testWalletAddress = 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N';

  it('should return position info for valid wallet and pool', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/connectors/dedust/amm/position-info?walletAddress=${testWalletAddress}&baseToken=TON&quoteToken=USDT`,
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      walletAddress: testWalletAddress,
      poolAddress: expect.any(String),
      baseToken: {
        symbol: 'TON',
        address: expect.any(String),
        decimals: expect.any(Number),
        name: expect.any(String),
      },
      quoteToken: {
        symbol: 'USDT',
        address: expect.any(String),
        decimals: expect.any(Number),
        name: expect.any(String),
      },
      lpTokenBalance: expect.any(String),
      lpTokenValue: expect.any(String),
      baseTokenBalance: expect.any(String),
      quoteTokenBalance: expect.any(String),
      poolShare: expect.any(Number),
      totalPoolLiquidity: expect.any(String),
      currentPrice: expect.any(String),
      poolType: expect.stringMatching(/^(volatile|stable)$/),
      hasPosition: expect.any(Boolean),
    });

    expect(body.poolShare).toBeGreaterThanOrEqual(0);
    expect(body.poolShare).toBeLessThanOrEqual(100);
    expect(parseFloat(body.lpTokenBalance)).toBeGreaterThanOrEqual(0);
  });

  it('should return position info for stable pool', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/connectors/dedust/amm/position-info?walletAddress=${testWalletAddress}&baseToken=USDT&quoteToken=USDC&poolType=stable`,
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body.poolType).toBe('stable');
  });

  it('should return position info for volatile pool', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/connectors/dedust/amm/position-info?walletAddress=${testWalletAddress}&baseToken=TON&quoteToken=USDT&poolType=volatile`,
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body.poolType).toBe('volatile');
  });

  it('should work with testnet network', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/connectors/dedust/amm/position-info?network=testnet&walletAddress=${testWalletAddress}&baseToken=TON&quoteToken=USDT`,
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body.walletAddress).toBe(testWalletAddress);
  });

  it('should return empty position when wallet has no liquidity', async () => {
    const emptyWallet = 'EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt';
    const response = await app.inject({
      method: 'GET',
      url: `/connectors/dedust/amm/position-info?walletAddress=${emptyWallet}&baseToken=TON&quoteToken=USDT`,
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      walletAddress: emptyWallet,
      lpTokenBalance: '0',
      lpTokenValue: '0',
      baseTokenBalance: '0',
      quoteTokenBalance: '0',
      poolShare: 0,
      hasPosition: false,
    });
  });

  it('should return rewards info when available', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/connectors/dedust/amm/position-info?walletAddress=${testWalletAddress}&baseToken=TON&quoteToken=USDT&includeRewards=true`,
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    if (body.hasPosition) {
      expect(body).toHaveProperty('rewards');
      expect(body.rewards).toMatchObject({
        available: expect.any(Boolean),
        claimable: expect.any(String),
        tokens: expect.any(Array),
      });
    }
  });

  it('should return 404 when pool does not exist', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/connectors/dedust/amm/position-info?walletAddress=${testWalletAddress}&baseToken=NONEXISTENT&quoteToken=ALSONONEXISTENT`,
    });

    expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      statusCode: 404,
      error: expect.any(String),
      message: expect.stringContaining('pool'),
    });
  });

  it('should return 400 for invalid wallet address', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/connectors/dedust/amm/position-info?walletAddress=invalid-address&baseToken=TON&quoteToken=USDT',
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      statusCode: 400,
      error: expect.any(String),
      message: expect.stringContaining('address'),
    });
  });

  it('should return 400 for missing required parameters', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/connectors/dedust/amm/position-info?walletAddress=${testWalletAddress}&baseToken=TON`,
      // Missing quoteToken
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      statusCode: 400,
      error: expect.any(String),
    });
  });

  it('should return 400 for invalid network parameter', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/connectors/dedust/amm/position-info?network=invalidnet&walletAddress=${testWalletAddress}&baseToken=TON&quoteToken=USDT`,
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for invalid poolType parameter', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/connectors/dedust/amm/position-info?walletAddress=${testWalletAddress}&baseToken=TON&quoteToken=USDT&poolType=invalid`,
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });
});