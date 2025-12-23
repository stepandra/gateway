import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { gatewayApp } from '../../src/app';

describe('POST /chains/ton/poll', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = gatewayApp;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const testTxHash = 'abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab';

  it('should return transaction status for valid hash', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/chains/ton/poll',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        txHash: testTxHash,
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      txHash: testTxHash,
      status: expect.stringMatching(/^(pending|confirmed|failed)$/),
      gasUsed: expect.any(String),
      gasPrice: expect.any(String),
      confirmations: expect.any(Number),
      blockHash: expect.any(String),
      blockNumber: expect.any(Number),
    });

    expect(body.confirmations).toBeGreaterThanOrEqual(0);
  });

  it('should work with testnet network', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/chains/ton/poll',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        network: 'testnet',
        txHash: testTxHash,
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body.txHash).toBe(testTxHash);
    expect(body.status).toMatch(/^(pending|confirmed|failed)$/);
  });

  it('should return 404 for non-existent transaction', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/chains/ton/poll',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        txHash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      statusCode: 404,
      error: expect.any(String),
      message: expect.stringContaining('transaction'),
    });
  });

  it('should return 400 for invalid transaction hash', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/chains/ton/poll',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        txHash: 'invalid-hash',
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      statusCode: 400,
      error: expect.any(String),
      message: expect.stringContaining('hash'),
    });
  });

  it('should return 400 for missing required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/chains/ton/poll',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for invalid network parameter', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/chains/ton/poll',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        network: 'invalidnet',
        txHash: testTxHash,
      }),
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });
});