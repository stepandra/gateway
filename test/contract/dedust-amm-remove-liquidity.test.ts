import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { gatewayApp } from '../../src/app';

describe('POST /connectors/dedust/amm/remove-liquidity', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = gatewayApp;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const testWalletAddress = 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N';

  it('should remove liquidity from pool', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/remove-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        quoteToken: 'USDT',
        lpTokenAmount: '5.0',
        slippage: 1.0,
        poolType: 'volatile',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      txHash: expect.any(String),
      nonce: expect.any(Number),
      poolAddress: expect.any(String),
      lpTokensBurned: expect.any(String),
      baseTokenReceived: expect.any(String),
      quoteTokenReceived: expect.any(String),
      priceImpact: expect.any(Number),
      gasUsed: expect.any(String),
      gasCost: expect.any(String),
      fee: expect.any(Number),
      poolType: 'volatile',
      executedAt: expect.any(Number),
    });

    expect(body.txHash).toMatch(/^[a-fA-F0-9]{64}$/);
    expect(body.priceImpact).toBeGreaterThanOrEqual(0);
    expect(parseFloat(body.lpTokensBurned)).toBeGreaterThan(0);
  });

  it('should remove liquidity by percentage', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/remove-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        quoteToken: 'USDT',
        percentage: 50.0, // Remove 50% of position
        slippage: 1.0,
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body.lpTokensBurned).toBeDefined();
    expect(body.baseTokenReceived).toBeDefined();
    expect(body.quoteTokenReceived).toBeDefined();
  });

  it('should remove liquidity with minimum output protection', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/remove-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        quoteToken: 'USDT',
        lpTokenAmount: '3.0',
        minBaseAmount: '2.0',
        minQuoteAmount: '10.0',
        slippage: 0.5,
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(parseFloat(body.baseTokenReceived)).toBeGreaterThanOrEqual(2.0);
    expect(parseFloat(body.quoteTokenReceived)).toBeGreaterThanOrEqual(10.0);
  });

  it('should work with stable pool type', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/remove-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'USDT',
        quoteToken: 'USDC',
        lpTokenAmount: '50.0',
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
      url: '/connectors/dedust/amm/remove-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        network: 'testnet',
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        quoteToken: 'USDT',
        lpTokenAmount: '1.0',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);
  });

  it('should return 422 when insufficient LP balance', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/remove-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        quoteToken: 'USDT',
        lpTokenAmount: '999999999.0',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.UNPROCESSABLE_ENTITY);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      statusCode: 422,
      error: expect.any(String),
      message: expect.stringContaining('balance'),
    });
  });

  it('should return 422 when slippage exceeded', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/remove-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        quoteToken: 'USDT',
        lpTokenAmount: '5.0',
        slippage: 0.01, // Very low tolerance
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.UNPROCESSABLE_ENTITY);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      statusCode: 422,
      error: expect.any(String),
      message: expect.stringContaining('slippage'),
    });
  });

  it('should return 404 when pool does not exist', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/remove-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'NONEXISTENT',
        quoteToken: 'ALSONONEXISTENT',
        lpTokenAmount: '1.0',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
  });

  it('should return 400 for invalid wallet address', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/remove-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: 'invalid-address',
        baseToken: 'TON',
        quoteToken: 'USDT',
        lpTokenAmount: '5.0',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for negative amounts', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/remove-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        quoteToken: 'USDT',
        lpTokenAmount: '-1.0',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for invalid percentage value', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/remove-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        quoteToken: 'USDT',
        percentage: 150.0, // Over 100%
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for invalid slippage value', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/remove-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        quoteToken: 'USDT',
        lpTokenAmount: '5.0',
        slippage: 51, // Over 50% limit
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for missing required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/remove-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        // Missing required fields
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });
});