import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { gatewayApp } from '../../src/app';

describe('POST /connectors/dedust/router/execute-quote', () => {
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

  it('should execute quote and return transaction details', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/execute-quote',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        quoteId: testQuoteId,
        maxSlippage: 1.0,
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      txHash: expect.any(String),
      nonce: expect.any(Number),
      executedAmountIn: expect.any(String),
      executedAmountOut: expect.any(String),
      executionPrice: expect.any(String),
      priceImpact: expect.any(Number),
      gasUsed: expect.any(String),
      gasCost: expect.any(String),
      fee: expect.any(String),
      route: expect.arrayContaining([
        expect.objectContaining({
          pool: expect.any(String),
          tokenIn: expect.any(String),
          tokenOut: expect.any(String),
          executedAmountIn: expect.any(String),
          executedAmountOut: expect.any(String),
        }),
      ]),
      quoteId: testQuoteId,
      executedAt: expect.any(Number),
    });

    expect(body.txHash).toMatch(/^[a-fA-F0-9]{64}$/);
    expect(body.priceImpact).toBeGreaterThanOrEqual(0);
    expect(body.executedAt).toBeGreaterThan(Date.now() / 1000 - 60); // Within last minute
  });

  it('should execute quote with custom gas settings', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/execute-quote',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        quoteId: testQuoteId,
        maxSlippage: 0.5,
        gasLimit: '300000',
        priorityFee: '0.001',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body.txHash).toBeDefined();
    expect(body.gasUsed).toBeDefined();
    expect(body.gasCost).toBeDefined();
  });

  it('should work with testnet network', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/execute-quote',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        network: 'testnet',
        walletAddress: testWalletAddress,
        quoteId: testQuoteId,
        maxSlippage: 1.0,
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);
  });

  it('should return 404 for invalid quote ID', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/execute-quote',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        quoteId: 'invalid_quote_id',
        maxSlippage: 1.0,
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

  it('should return 410 for expired quote', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/execute-quote',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        quoteId: 'expired_quote_12345',
        maxSlippage: 1.0,
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.GONE);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      statusCode: 410,
      error: expect.any(String),
      message: expect.stringContaining('expired'),
    });
  });

  it('should return 422 when slippage exceeded', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/execute-quote',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        quoteId: testQuoteId,
        maxSlippage: 0.01, // Very low slippage tolerance
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

  it('should return 400 for invalid wallet address', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/execute-quote',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: 'invalid-address',
        quoteId: testQuoteId,
        maxSlippage: 1.0,
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for missing required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/execute-quote',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        // Missing quoteId and maxSlippage
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for invalid slippage value', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/router/execute-quote',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        quoteId: testQuoteId,
        maxSlippage: 51, // Over 50% limit
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });
});