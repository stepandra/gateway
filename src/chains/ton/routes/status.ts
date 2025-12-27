import { FastifyPluginAsync } from 'fastify';
import { Ton } from '../ton';
import { StatusRequestSchema, StatusResponseType } from '../../../schemas/chain-schema';

export const statusRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: { network?: string } }>(
    '/status',
    {
      schema: {
        querystring: StatusRequestSchema,
        tags: ['ton'],
        description: 'Get TON chain status',
      },
    },
    async (request): Promise<StatusResponseType> => {
      const network = request.query.network || 'mainnet';
      const ton = Ton.getInstance(network);
      if (!ton.initialized) await ton.init();

      return {
        chain: 'ton',
        network: ton.network,
        rpcUrl: ton.config.nodeURL,
        rpcProvider: ton.config.rpcProvider,
        currentBlockNumber: 0,
        nativeCurrency: ton.nativeTokenSymbol,
        swapProvider: 'dedust',
      };
    },
  );
};
