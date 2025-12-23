import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { gatewayApp } from '../../src/app';

describe('POST /connectors/dedust/amm/quote-liquidity', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = gatewayApp;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return liquidity quote for adding liquidity', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/quote-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'add',
        baseToken: 'TON',
        quoteToken: 'USDT',
        baseAmount: '10.0',
        quoteAmount: '50.0',
        poolType: 'volatile',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      operation: 'add',
      poolAddress: expect.any(String),
      baseTokenRequired: expect.any(String),
      quoteTokenRequired: expect.any(String),
      lpTokensToReceive: expect.any(String),
      priceImpact: expect.any(Number),
      poolShare: expect.any(Number),
      gasEstimate: expect.any(String),
      fee: expect.any(Number),
      poolType: 'volatile',
      currentPrice: expect.any(String),
      expectedPrice: expect.any(String),
    });

    expect(body.priceImpact).toBeGreaterThanOrEqual(0);
    expect(body.poolShare).toBeGreaterThanOrEqual(0);
    expect(body.poolShare).toBeLessThanOrEqual(100);
  });

  it('should return liquidity quote for removing liquidity', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/quote-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'remove',
        baseToken: 'TON',
        quoteToken: 'USDT',
        lpTokenAmount: '5.0',
        poolType: 'volatile',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      operation: 'remove',
      poolAddress: expect.any(String),
      baseTokenToReceive: expect.any(String),
      quoteTokenToReceive: expect.any(String),
      lpTokensToBurn: expect.any(String),
      priceImpact: expect.any(Number),
      gasEstimate: expect.any(String),
      fee: expect.any(Number),
      poolType: 'volatile',
    });
  });

  it('should work with stable pool type', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/quote-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'add',
        baseToken: 'USDT',
        quoteToken: 'USDC',
        baseAmount: '100.0',
        quoteAmount: '100.0',
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
      url: '/connectors/dedust/amm/quote-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        network: 'testnet',
        operation: 'add',
        baseToken: 'TON',
        quoteToken: 'USDT',
        baseAmount: '1.0',
        quoteAmount: '5.0',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);
  });

  it('should return 404 when pool does not exist', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/quote-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'add',
        baseToken: 'NONEXISTENT',
        quoteToken: 'ALSONONEXISTENT',
        baseAmount: '1.0',
        quoteAmount: '1.0',
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

  it('should return 400 for invalid operation', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/quote-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'invalid',
        baseToken: 'TON',
        quoteToken: 'USDT',
        baseAmount: '1.0',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for negative amounts', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/quote-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'add',
        baseToken: 'TON',
        quoteToken: 'USDT',
        baseAmount: '-1.0',
        quoteAmount: '5.0',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for missing required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/quote-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'add',
        baseToken: 'TON',
        // Missing required fields
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });
});