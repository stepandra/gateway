import sensible from '@fastify/sensible';
import { Type, Static } from '@sinclair/typebox';
import { FastifyPluginAsync } from 'fastify';

import {
  QuoteSwapRequest,
  QuoteSwapResponse,
  QuoteSwapRequestType,
  QuoteSwapResponseType,
  ExecuteSwapRequest,
  SwapExecuteResponse,
  SwapExecuteResponseType,
} from '../../schemas/router-schema';

import { DeDust } from './dedust';

const DeDustExecuteSwapRequest = Type.Intersect([
  ExecuteSwapRequest,
  Type.Object({
    quoteId: Type.Optional(Type.String({ description: 'Serialized swapData from /quote response' })),
  }),
]);
type DeDustExecuteSwapRequestType = Static<typeof DeDustExecuteSwapRequest>;

export const dedustRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(sensible);

  const quoteHandler = async (request: { body: QuoteSwapRequestType }): Promise<QuoteSwapResponseType> => {
    const { network = 'mainnet', baseToken, quoteToken, amount, side, slippagePct } = request.body;

    const dedust = DeDust.getInstance(network);

    if (!dedust.chain.initialized) {
      await dedust.chain.init();
    }

    let tokenIn: string;
    let tokenOut: string;
    let amountIn: number;

    if (side === 'SELL') {
      tokenIn = baseToken;
      tokenOut = quoteToken;
      amountIn = amount;
    } else {
      tokenIn = quoteToken;
      tokenOut = baseToken;
      amountIn = amount;
    }

    const quote = await dedust.getQuote(tokenIn, tokenOut, amountIn, slippagePct);

    return {
      quoteId: JSON.stringify(quote.swapData),
      tokenIn: quote.tokenIn,
      tokenOut: quote.tokenOut,
      amountIn: amountIn,
      amountOut: quote.amountOut,
      price: quote.amountOut / amountIn,
      priceImpactPct: 0,
      minAmountOut: quote.amountOut * (1 - (slippagePct || 0.5) / 100),
      maxAmountIn: amountIn,
    };
  };

  const quoteSchema = {
    schema: {
      body: QuoteSwapRequest,
      tags: ['/connector/dedust'],
      description: 'Get DeDust swap quote',
      response: {
        200: QuoteSwapResponse,
      },
    },
  };

  // Original endpoint
  fastify.post<{ Body: QuoteSwapRequestType }>('/quote', quoteSchema, quoteHandler);

  // Alias for hummingbot-api compatibility (GET /quote-swap)
  fastify.get<{ Querystring: QuoteSwapRequestType }>(
    '/quote-swap',
    {
      schema: {
        querystring: QuoteSwapRequest,
        tags: ['/connector/dedust'],
        description: 'Get DeDust swap quote (hummingbot-api compatible)',
        response: {
          200: QuoteSwapResponse,
        },
      },
    },
    async (request): Promise<QuoteSwapResponseType> => {
      return quoteHandler({ body: request.query });
    },
  );

  // POST alias for quote-swap
  fastify.post<{ Body: QuoteSwapRequestType }>('/quote-swap', quoteSchema, quoteHandler);

  const swapHandler = async (request: { body: DeDustExecuteSwapRequestType }): Promise<SwapExecuteResponseType> => {
    const {
      network = 'mainnet',
      walletAddress,
      baseToken,
      quoteToken,
      amount,
      side,
      slippagePct,
      quoteId,
    } = request.body;
    const dedust = DeDust.getInstance(network);

    if (!dedust.chain.initialized) {
      await dedust.chain.init();
    }

    if (!walletAddress) {
      throw new Error('Wallet address is required for swap execution');
    }

    let swapData: any;
    let tokenIn: string;
    let amountIn: number;

    if (quoteId) {
      swapData = JSON.parse(quoteId);
      tokenIn = side === 'SELL' ? baseToken : quoteToken;
      amountIn = amount;
    } else {
      let tokenOut: string;
      if (side === 'SELL') {
        tokenIn = baseToken;
        tokenOut = quoteToken;
        amountIn = amount;
      } else {
        tokenIn = quoteToken;
        tokenOut = baseToken;
        amountIn = amount;
      }
      const quote = await dedust.getQuote(tokenIn, tokenOut, amountIn, slippagePct);
      swapData = quote.swapData;
    }

    const result = await dedust.executeSwap(walletAddress, swapData, tokenIn, amountIn);

    return {
      signature: result.signature,
      status: result.status,
    };
  };

  const swapSchema = {
    schema: {
      body: DeDustExecuteSwapRequest,
      tags: ['/connector/dedust'],
      description: 'Execute DeDust swap',
      response: {
        200: SwapExecuteResponse,
      },
    },
  };

  // Original endpoint
  fastify.post<{ Body: DeDustExecuteSwapRequestType }>('/swap', swapSchema, swapHandler);

  // Alias for hummingbot-api compatibility
  fastify.post<{ Body: DeDustExecuteSwapRequestType }>('/execute-swap', swapSchema, swapHandler);

  // Execute quote endpoint (hummingbot-api uses this to execute a previously obtained quote)
  fastify.post<{ Body: { network: string; address: string; quoteId: string } }>(
    '/execute-quote',
    {
      schema: {
        body: Type.Object({
          network: Type.String({ default: 'mainnet' }),
          address: Type.String({ description: 'Wallet address' }),
          quoteId: Type.String({ description: 'Serialized quote from /quote-swap' }),
        }),
        tags: ['/connector/dedust'],
        description: 'Execute a previously obtained quote',
        response: {
          200: SwapExecuteResponse,
        },
      },
    },
    async (request): Promise<SwapExecuteResponseType> => {
      const { network = 'mainnet', address, quoteId } = request.body;
      const dedust = DeDust.getInstance(network);

      if (!dedust.chain.initialized) {
        await dedust.chain.init();
      }

      const swapData = JSON.parse(quoteId);
      const tokenIn = swapData.tokenIn || 'TON';
      const amountIn = swapData.amountIn || 0;

      const result = await dedust.executeSwap(address, swapData, tokenIn, amountIn);

      return {
        signature: result.signature,
        status: result.status,
      };
    },
  );
};
