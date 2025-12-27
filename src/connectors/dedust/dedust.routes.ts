import sensible from '@fastify/sensible';
import { FastifyPluginAsync } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
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

  fastify.post<{ Body: QuoteSwapRequestType }>(
    '/quote',
    {
      schema: {
        body: QuoteSwapRequest,
        tags: ['dedust'],
        description: 'Get DeDust swap quote',
        response: {
          200: QuoteSwapResponse,
        },
      },
    },
    async (request): Promise<QuoteSwapResponseType> => {
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
    },
  );

  fastify.post<{ Body: DeDustExecuteSwapRequestType }>(
    '/swap',
    {
      schema: {
        body: DeDustExecuteSwapRequest,
        tags: ['dedust'],
        description: 'Execute DeDust swap',
        response: {
          200: SwapExecuteResponse,
        },
      },
    },
    async (request): Promise<SwapExecuteResponseType> => {
      const { network = 'mainnet', walletAddress, baseToken, quoteToken, amount, side, slippagePct, quoteId } = request.body;
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
    },
  );
};
