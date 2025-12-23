import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { gatewayApp } from '../../src/app';

describe('POST /connectors/dedust/amm/collect-fees', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = gatewayApp;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const testWalletAddress = 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N';

  it('should collect fees from liquidity position', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/collect-fees',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        quoteToken: 'USDT',
        poolType: 'volatile',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      txHash: expect.any(String),
      nonce: expect.any(Number),
      poolAddress: expect.any(String),
      feesCollected: expect.arrayContaining([
        expect.objectContaining({
          token: expect.any(String),
          amount: expect.any(String),
          symbol: expect.any(String),
        }),
      ]),
      totalValueCollected: expect.any(String),
      gasUsed: expect.any(String),
      gasCost: expect.any(String),
      poolType: 'volatile',
      collectedAt: expect.any(Number),
    });

    expect(body.txHash).toMatch(/^[a-fA-F0-9]{64}$/);
    expect(body.feesCollected.length).toBeGreaterThanOrEqual(0);
    expect(parseFloat(body.totalValueCollected)).toBeGreaterThanOrEqual(0);
  });

  it('should collect fees from stable pool', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/collect-fees',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'USDT',
        quoteToken: 'USDC',
        poolType: 'stable',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body.poolType).toBe('stable');
  });

  it('should work with testnet network', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/collect-fees',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        network: 'testnet',
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        quoteToken: 'USDT',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);
  });

  it('should collect specific token fees when specified', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/collect-fees',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        quoteToken: 'USDT',
        tokensToCollect: ['TON'],
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body.feesCollected).toBeDefined();
    // Should only collect TON fees if specified
    if (body.feesCollected.length > 0) {
      const tonFees = body.feesCollected.find((fee: any) => fee.symbol === 'TON');
      expect(tonFees).toBeDefined();
    }
  });

  it('should return transaction hash even when no fees to collect', async () => {
    const emptyWallet = 'EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt';
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/collect-fees',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: emptyWallet,
        baseToken: 'TON',
        quoteToken: 'USDT',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      txHash: expect.any(String),
      feesCollected: [],
      totalValueCollected: '0',
    });
  });

  it('should return fee estimate when requested', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/collect-fees',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        quoteToken: 'USDT',
        estimateOnly: true,
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      estimatedFees: expect.arrayContaining([
        expect.objectContaining({
          token: expect.any(String),
          amount: expect.any(String),
          symbol: expect.any(String),
        }),
      ]),
      estimatedTotalValue: expect.any(String),
      gasEstimate: expect.any(String),
      canCollect: expect.any(Boolean),
    });

    // Should not have txHash for estimate
    expect(body.txHash).toBeUndefined();
  });

  it('should return 404 when pool does not exist', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/collect-fees',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'NONEXISTENT',
        quoteToken: 'ALSONONEXISTENT',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      statusCode: 404,
      error: expect.any(String),
      message: expect.stringContaining('pool'),
    });
  });

  it('should return 422 when no liquidity position exists', async () => {
    const emptyWallet = 'EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt';
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/collect-fees',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: emptyWallet,
        baseToken: 'TON',
        quoteToken: 'USDT',
        requirePosition: true,
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.UNPROCESSABLE_ENTITY);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      statusCode: 422,
      error: expect.any(String),
      message: expect.stringContaining('position'),
    });
  });

  it('should return 400 for invalid wallet address', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/collect-fees',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: 'invalid-address',
        baseToken: 'TON',
        quoteToken: 'USDT',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      statusCode: 400,
      error: expect.any(String),
      message: expect.stringContaining('address'),
    });
  });

  it('should return 400 for missing required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/collect-fees',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        // Missing quoteToken
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for invalid network parameter', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/collect-fees',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        network: 'invalidnet',
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        quoteToken: 'USDT',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for invalid poolType parameter', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/collect-fees',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        quoteToken: 'USDT',
        poolType: 'invalid',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });
});