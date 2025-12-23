import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { gatewayApp } from '../../src/app';

describe('POST /connectors/dedust/router/quote-swap', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = gatewayApp;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return swap quote for valid token pair', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/quote-swap',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        baseToken: 'TON',
        quoteToken: 'USDT',
        amount: '1.0',
        side: 'SELL',
        slippage: 0.5,
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      route: expect.arrayContaining([
        expect.objectContaining({
          pool: expect.any(String),
          tokenIn: expect.any(String),
          tokenOut: expect.any(String),
          amountIn: expect.any(String),
          amountOut: expect.any(String),
          poolType: expect.stringMatching(/^(volatile|stable)$/),
        }),
      ]),
      amountIn: expect.any(String),
      amountOut: expect.any(String),
      amountOutMin: expect.any(String),
      priceImpact: expect.any(Number),
      gasEstimate: expect.any(String),
      ttl: expect.any(Number),
      slippage: 0.5,
      quoteId: expect.any(String),
    });

    expect(body.priceImpact).toBeGreaterThanOrEqual(0);
    expect(body.priceImpact).toBeLessThanOrEqual(100);
    expect(body.ttl).toBeGreaterThan(Date.now() / 1000);
  });

  it('should return quote for BUY side', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/quote-swap',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        baseToken: 'TON',
        quoteToken: 'USDT',
        amount: '100.0',
        side: 'BUY',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body.route).toBeDefined();
    expect(body.amountIn).toBeDefined();
    expect(body.amountOut).toBeDefined();
  });

  it('should work with testnet network', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/quote-swap',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        network: 'testnet',
        baseToken: 'TON',
        quoteToken: 'USDT',
        amount: '1.0',
        side: 'SELL',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);
  });

  it('should return 422 when no route found', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/quote-swap',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        baseToken: 'NONEXISTENT',
        quoteToken: 'ALSONONEXISTENT',
        amount: '1.0',
        side: 'SELL',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.UNPROCESSABLE_ENTITY);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      statusCode: 422,
      error: expect.any(String),
      message: expect.stringContaining('route'),
    });
  });

  it('should return 400 for invalid request parameters', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/quote-swap',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        baseToken: 'TON',
        // Missing required fields
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for invalid slippage value', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/quote-swap',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        baseToken: 'TON',
        quoteToken: 'USDT',
        amount: '1.0',
        side: 'SELL',
        slippage: 51, // Over 50% limit
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for negative amount', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/quote-swap',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        baseToken: 'TON',
        quoteToken: 'USDT',
        amount: '-1.0',
        side: 'SELL',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });
});