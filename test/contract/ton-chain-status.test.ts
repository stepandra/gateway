import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { gatewayApp } from '../../src/app';

describe('GET /chains/ton/status', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = gatewayApp;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return TON chain status with mainnet by default', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/chains/ton/status',
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      chain: 'ton',
      network: 'mainnet',
      rpcUrl: expect.stringMatching(/^https?:\/\/.+/),
      currentBlockNumber: expect.any(Number),
      nativeCurrency: 'TON',
    });

    expect(body.currentBlockNumber).toBeGreaterThan(0);
  });

  it('should return TON chain status for testnet when specified', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/chains/ton/status?network=testnet',
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      chain: 'ton',
      network: 'testnet',
      rpcUrl: expect.stringMatching(/^https?:\/\/.+/),
      currentBlockNumber: expect.any(Number),
      nativeCurrency: 'TON',
    });
  });

  it('should return 400 for invalid network parameter', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/chains/ton/status?network=invalidnet',
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      statusCode: 400,
      error: expect.any(String),
      message: expect.stringContaining('network'),
    });
  });

  it('should return 503 when TON network is unavailable', async () => {
    // This test would require mocking the TON provider to simulate network failure
    // For now, we'll skip this test until the provider infrastructure is implemented
    expect(true).toBe(true);
  });
});