import { FastifyPluginAsync } from 'fastify';
import { Ton } from '../ton';
import { TokensRequestSchema, TokensResponseType } from '../../../schemas/chain-schema';

export const tokensRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: { network?: string } }>(
    '/tokens',
    {
      schema: {
        querystring: TokensRequestSchema,
        tags: ['ton'],
        description: 'Get TON supported tokens',
      },
    },
    async (request): Promise<TokensResponseType> => {
      const network = request.query.network || 'mainnet';
      const ton = Ton.getInstance(network);
      if (!ton.initialized) await ton.init();

      return {
        tokens: ton.getTokens().map(t => ({
          symbol: t.symbol,
          address: t.address,
          decimals: t.decimals,
          name: t.name
        })),
      };
    },
  );
};
