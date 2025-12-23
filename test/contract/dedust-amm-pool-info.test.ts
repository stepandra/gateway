import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { gatewayApp } from '../../src/app';

describe('GET /connectors/dedust/amm/pool-info', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = gatewayApp;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return pool information for valid token pair', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/connectors/dedust/amm/pool-info?baseToken=TON&quoteToken=USDT',
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      address: expect.any(String),
      baseToken: {
        symbol: 'TON',
        address: expect.any(String),
        decimals: expect.any(Number),
        name: expect.any(String),
      },
      quoteToken: {
        symbol: 'USDT',
        address: expect.any(String),
        decimals: expect.any(Number),
        name: expect.any(String),
      },
      reserves: expect.arrayContaining([
        expect.any(String), // baseReserve
        expect.any(String), // quoteReserve
      ]),
      fee: expect.any(Number),
      totalSupply: expect.any(String),
      poolType: expect.stringMatching(/^(volatile|stable)$/),
      price: expect.any(String),
    });

    expect(body.reserves).toHaveLength(2);
    expect(body.fee).toBeGreaterThanOrEqual(0);
    expect(body.fee).toBeLessThanOrEqual(10);
  });

  it('should return pool info for testnet when specified', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/connectors/dedust/amm/pool-info?network=testnet&baseToken=TON&quoteToken=USDT',
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body.address).toBeDefined();
    expect(body.baseToken.symbol).toBe('TON');
    expect(body.quoteToken.symbol).toBe('USDT');
  });

  it('should work with stable pool type preference', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/connectors/dedust/amm/pool-info?baseToken=USDT&quoteToken=USDC&poolType=stable',
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body.poolType).toBe('stable');
  });

  it('should work with volatile pool type preference', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/connectors/dedust/amm/pool-info?baseToken=TON&quoteToken=USDT&poolType=volatile',
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body.poolType).toBe('volatile');
  });

  it('should return 404 when pool does not exist', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/connectors/dedust/amm/pool-info?baseToken=NONEXISTENT&quoteToken=ALSONONEXISTENT',
    });

    expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      statusCode: 404,
      error: expect.any(String),
      message: expect.stringContaining('pool'),
    });
  });

  it('should return 400 for missing required parameters', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/connectors/dedust/amm/pool-info?baseToken=TON',
      // Missing quoteToken
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      statusCode: 400,
      error: expect.any(String),
    });
  });

  it('should return 400 for invalid network parameter', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/connectors/dedust/amm/pool-info?network=invalidnet&baseToken=TON&quoteToken=USDT',
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return 400 for invalid poolType parameter', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/connectors/dedust/amm/pool-info?baseToken=TON&quoteToken=USDT&poolType=invalid',
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });
});