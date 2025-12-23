import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { gatewayApp } from '../../src/app';

describe('GET /chains/ton/tokens', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = gatewayApp;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return all available TON tokens by default', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/chains/ton/tokens',
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('tokens');
    expect(Array.isArray(body.tokens)).toBe(true);
    expect(body.tokens.length).toBeGreaterThan(0);

    // Check that TON native token is included
    const tonToken = body.tokens.find((token: any) => token.symbol === 'TON');
    expect(tonToken).toMatchObject({
      symbol: 'TON',
      address: expect.any(String),
      decimals: 9,
      name: expect.stringContaining('Toncoin'),
    });
  });

  it('should return specific tokens when tokenSymbols is provided', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/chains/ton/tokens?tokenSymbols=TON,USDT',
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body.tokens).toHaveLength(2);

    const symbols = body.tokens.map((token: any) => token.symbol);
    expect(symbols).toContain('TON');
    expect(symbols).toContain('USDT');
  });

  it('should return single token when tokenSymbols is a string', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/chains/ton/tokens?tokenSymbols=TON',
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body.tokens).toHaveLength(1);
    expect(body.tokens[0].symbol).toBe('TON');
  });

  it('should return testnet tokens when network=testnet', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/chains/ton/tokens?network=testnet',
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    const body = JSON.parse(response.body);
    expect(body.tokens).toHaveLength(expect.any(Number));

    // Should include testnet tokens
    const tonToken = body.tokens.find((token: any) => token.symbol === 'TON');
    expect(tonToken).toBeDefined();
  });

  it('should return 400 for invalid token symbols', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/chains/ton/tokens?tokenSymbols=INVALIDTOKEN',
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      statusCode: 400,
      error: expect.any(String),
      message: expect.stringContaining('token'),
    });
  });

  it('should return 400 for invalid network parameter', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/chains/ton/tokens?network=invalidnet',
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });
});