import sensible from '@fastify/sensible';
import { FastifyPluginAsync } from 'fastify';
import { statusRoute } from './routes/status';
import { balancesRoute } from './routes/balances';
import { tokensRoute } from './routes/tokens';
import { pollRoute } from './routes/poll';

export const tonRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(sensible);

  fastify.register(statusRoute);
  fastify.register(balancesRoute);
  fastify.register(tokensRoute);
  fastify.register(pollRoute);
};

export default tonRoutes;
