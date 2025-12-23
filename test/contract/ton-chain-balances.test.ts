import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { gatewayApp } from '../../src/app';

describe('POST /chains/ton/balances', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = gatewayApp;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const testWalletAddress = 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N';

  it('should return balances for valid wallet address', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/chains/ton/balances',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: testWalletAddress,
        tokens: ['TON', 'USDT'],
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('balances');
    expect(typeof body.balances).toBe('object');

    // Should have TON balance (might be 0)
    expect(body.balances).toHaveProperty('TON');
    expect(typeof body.balances.TON).toBe('number');
    expect(body.balances.TON).toBeGreaterThanOrEqual(0);
  });

  it('should return all balances when fetchAll is true', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/chains/ton/balances',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: testWalletAddress,
        fetchAll: true,
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body.balances).toBeDefined();
    expect(typeof body.balances).toBe('object');
  });

  it('should work with testnet network', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/chains/ton/balances',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        network: 'testnet',
        address: testWalletAddress,
        tokens: ['TON'],
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body.balances).toHaveProperty('TON');
  });

  it('should return 400 for invalid wallet address', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/chains/ton/balances',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: 'invalid-address',
        tokens: ['TON'],
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
      url: '/chains/ton/balances',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for invalid network', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/chains/ton/balances',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        network: 'invalidnet',
        address: testWalletAddress,
        tokens: ['TON'],
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });
});