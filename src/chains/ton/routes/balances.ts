import { FastifyPluginAsync } from 'fastify';

import { BalanceRequestSchema, BalanceResponseType } from '../../../schemas/chain-schema';
import { Ton } from '../ton';

export const balancesRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: { network?: string; address: string; tokens?: string[] } }>(
    '/balances',
    {
      schema: {
        body: BalanceRequestSchema,
        tags: ['ton'],
        description: 'Get TON account balances',
      },
    },
    async (request): Promise<BalanceResponseType> => {
      const { network = 'mainnet', address, tokens } = request.body;
      const ton = Ton.getInstance(network);
      if (!ton.initialized) await ton.init();

      const balances = await ton.getBalances(address, tokens);
      return { balances };
    },
  );
};
