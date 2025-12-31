import { FastifyPluginAsync } from 'fastify';

import { EstimateGasRequestType, EstimateGasResponse, EstimateGasResponseSchema } from '../../../schemas/chain-schema';
import { logger } from '../../../services/logger';
import { Ton } from '../ton';

export async function estimateGasTon(network: string): Promise<EstimateGasResponse> {
  try {
    const ton = Ton.getInstance(network);
    if (!ton.initialized) await ton.init();

    const fee = ton.config.commissionBuffer || 0.3;

    return {
      feePerComputeUnit: fee,
      denomination: 'ton',
      computeUnits: 1,
      feeAsset: ton.nativeTokenSymbol,
      fee,
      timestamp: Date.now(),
    };
  } catch (error) {
    logger.error(`Error estimating TON gas for network ${network}: ${error.message}`);
    throw error;
  }
}

export const estimateGasRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Querystring: EstimateGasRequestType;
    Reply: EstimateGasResponse;
  }>(
    '/estimate-gas',
    {
      schema: {
        description: 'Estimate transaction fee buffer for TON',
        tags: ['/chain/ton'],
        response: {
          200: EstimateGasResponseSchema,
        },
      },
    },
    async (request) => {
      const network = request.query.network || 'mainnet';
      return await estimateGasTon(network);
    },
  );
};

export default estimateGasRoute;
