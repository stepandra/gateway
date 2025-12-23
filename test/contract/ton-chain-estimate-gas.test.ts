import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { gatewayApp } from '../../src/app';

describe('POST /chains/ton/estimate-gas', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = gatewayApp;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const testWalletAddress = 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N';
  const testToAddress = 'EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt';

  it('should return gas estimate for TON transfer', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/chains/ton/estimate-gas',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: testWalletAddress,
        toAddress: testToAddress,
        value: '1.0',
        token: 'TON',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      gasEstimate: expect.any(String),
      gasCost: expect.any(String),
      maxFee: expect.any(String),
      priorityFee: expect.any(String),
    });

    expect(parseFloat(body.gasEstimate)).toBeGreaterThan(0);
    expect(parseFloat(body.gasCost)).toBeGreaterThan(0);
  });

  it('should return gas estimate for jetton transfer', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/chains/ton/estimate-gas',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: testWalletAddress,
        toAddress: testToAddress,
        value: '100.0',
        token: 'USDT',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body.gasEstimate).toBeDefined();
    expect(body.gasCost).toBeDefined();
    expect(parseFloat(body.gasEstimate)).toBeGreaterThan(0);
  });

  it('should work with testnet network', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/chains/ton/estimate-gas',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        network: 'testnet',
        fromAddress: testWalletAddress,
        toAddress: testToAddress,
        value: '1.0',
        token: 'TON',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body.gasEstimate).toBeDefined();
  });

  it('should return 400 for invalid addresses', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/chains/ton/estimate-gas',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: 'invalid-address',
        toAddress: testToAddress,
        value: '1.0',
        token: 'TON',
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

  it('should return 400 for negative value', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/chains/ton/estimate-gas',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: testWalletAddress,
        toAddress: testToAddress,
        value: '-1.0',
        token: 'TON',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for unsupported token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/chains/ton/estimate-gas',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: testWalletAddress,
        toAddress: testToAddress,
        value: '1.0',
        token: 'INVALIDTOKEN',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for missing required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/chains/ton/estimate-gas',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: testWalletAddress,
        // Missing toAddress, value, token
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for invalid network parameter', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/chains/ton/estimate-gas',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        network: 'invalidnet',
        fromAddress: testWalletAddress,
        toAddress: testToAddress,
        value: '1.0',
        token: 'TON',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });
});