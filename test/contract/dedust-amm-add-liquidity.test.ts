import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { gatewayApp } from '../../src/app';

describe('POST /connectors/dedust/amm/add-liquidity', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = gatewayApp;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const testWalletAddress = 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N';

  it('should add liquidity to existing pool', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/add-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        quoteToken: 'USDT',
        baseAmount: '10.0',
        quoteAmount: '50.0',
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
      baseTokenDeposited: expect.any(String),
      quoteTokenDeposited: expect.any(String),
      lpTokensReceived: expect.any(String),
      priceImpact: expect.any(Number),
      poolShare: expect.any(Number),
      gasUsed: expect.any(String),
      gasCost: expect.any(String),
      fee: expect.any(Number),
      poolType: 'volatile',
      executedAt: expect.any(Number),
    });

    expect(body.txHash).toMatch(/^[a-fA-F0-9]{64}$/);
    expect(body.priceImpact).toBeGreaterThanOrEqual(0);
    expect(body.poolShare).toBeGreaterThanOrEqual(0);
    expect(body.poolShare).toBeLessThanOrEqual(100);
  });

  it('should add liquidity with minimum output protection', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/add-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        quoteToken: 'USDT',
        baseAmount: '5.0',
        quoteAmount: '25.0',
        minLpTokens: '4.0',
        slippage: 0.5,
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body.lpTokensReceived).toBeDefined();
    expect(parseFloat(body.lpTokensReceived)).toBeGreaterThanOrEqual(4.0);
  });

  it('should work with stable pool type', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/add-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
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
      url: '/connectors/dedust/amm/add-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        network: 'testnet',
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        quoteToken: 'USDT',
        baseAmount: '1.0',
        quoteAmount: '5.0',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);
  });

  it('should return 422 when insufficient balance', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/add-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        quoteToken: 'USDT',
        baseAmount: '999999999.0',
        quoteAmount: '999999999.0',
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
      url: '/connectors/dedust/amm/add-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        quoteToken: 'USDT',
        baseAmount: '10.0',
        quoteAmount: '50.0',
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
      url: '/connectors/dedust/amm/add-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'NONEXISTENT',
        quoteToken: 'ALSONONEXISTENT',
        baseAmount: '1.0',
        quoteAmount: '1.0',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
  });

  it('should return 400 for invalid wallet address', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/add-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: 'invalid-address',
        baseToken: 'TON',
        quoteToken: 'USDT',
        baseAmount: '1.0',
        quoteAmount: '5.0',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for negative amounts', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/add-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        quoteToken: 'USDT',
        baseAmount: '-1.0',
        quoteAmount: '5.0',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for invalid slippage value', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/add-liquidity',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        baseToken: 'TON',
        quoteToken: 'USDT',
        baseAmount: '1.0',
        quoteAmount: '5.0',
        slippage: 51, // Over 50% limit
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for missing required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/connectors/dedust/amm/add-liquidity',
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