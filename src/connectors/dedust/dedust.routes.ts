import { FastifyPluginAsync } from 'fastify';

import { dedustRouterRoutes } from './router-routes/router.routes';
import { dedustAMMRoutes } from './amm-routes/amm.routes';

// Register the type declaration needed for Fastify schema tags
declare module 'fastify' {
  interface FastifySchema {
    tags?: readonly string[];
    description?: string;
  }
}

export const dedustRoutes = {
  router: dedustRouterRoutes,
  amm: dedustAMMRoutes,
};

export default dedustRoutes;