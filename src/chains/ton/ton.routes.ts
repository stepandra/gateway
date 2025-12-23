import { FastifyPluginAsync } from 'fastify';

import { tonChainRoutes } from './routes/ton-chain.routes';

// Register the type declaration needed for Fastify schema tags
declare module 'fastify' {
  interface FastifySchema {
    tags?: readonly string[];
    description?: string;
  }
}

export const tonRoutes: FastifyPluginAsync = async (fastify) => {
  // Register all the TON chain route handlers
  fastify.register(tonChainRoutes);
};

export default tonRoutes;