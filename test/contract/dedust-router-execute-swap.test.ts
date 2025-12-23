import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { gatewayApp } from '../../src/app';

describe('POST /connectors/dedust/router/execute-swap', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = gatewayApp;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const testWalletAddress = 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N';
  const testQuoteId = 'quote_12345678901234567890';

  it('should execute swap with valid quote ID', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/execute-swap',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        quoteId: testQuoteId,
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
      txHash: expect.any(String),
      nonce: expect.any(Number),
      expectedAmountOut: expect.any(String),
      actualAmountOut: expect.any(String),
      priceImpact: expect.any(Number),
      gasUsed: expect.any(String),
      fee: expect.any(String),
      route: expect.arrayContaining([
        expect.objectContaining({
          pool: expect.any(String),
          tokenIn: expect.any(String),
          tokenOut: expect.any(String),
          amountIn: expect.any(String),
          amountOut: expect.any(String),
        }),
      ]),
    });

    expect(body.txHash).toMatch(/^[a-fA-F0-9]{64}$/);
    expect(body.priceImpact).toBeGreaterThanOrEqual(0);
    expect(body.priceImpact).toBeLessThanOrEqual(100);
  });

  it('should execute BUY side swap', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/execute-swap',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        quoteId: testQuoteId,
        baseToken: 'TON',
        quoteToken: 'USDT',
        amount: '100.0',
        side: 'BUY',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body.txHash).toBeDefined();
    expect(body.route).toBeDefined();
  });

  it('should work with testnet network', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/execute-swap',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        network: 'testnet',
        walletAddress: testWalletAddress,
        quoteId: testQuoteId,
        baseToken: 'TON',
        quoteToken: 'USDT',
        amount: '1.0',
        side: 'SELL',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);
  });

  it('should return 404 for expired quote ID', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/execute-swap',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        quoteId: 'expired_quote_id',
        baseToken: 'TON',
        quoteToken: 'USDT',
        amount: '1.0',
        side: 'SELL',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      statusCode: 404,
      error: expect.any(String),
      message: expect.stringContaining('quote'),
    });
  });

  it('should return 422 when insufficient balance', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/execute-swap',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        quoteId: testQuoteId,
        baseToken: 'TON',
        quoteToken: 'USDT',
        amount: '999999999.0',
        side: 'SELL',
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

  it('should return 400 for invalid wallet address', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/execute-swap',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: 'invalid-address',
        quoteId: testQuoteId,
        baseToken: 'TON',
        quoteToken: 'USDT',
        amount: '1.0',
        side: 'SELL',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for missing required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/execute-swap',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        // Missing required fields
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for invalid slippage value', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/execute-swap',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        quoteId: testQuoteId,
        baseToken: 'TON',
        quoteToken: 'USDT',
        amount: '1.0',
        side: 'SELL',
        slippage: 51, // Over 50% limit
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });
});