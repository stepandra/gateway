import { FastifyPluginAsync } from 'fastify';

import { Ton } from '../ton';
import { PollRequest, PollRequestType, PollResponse, PollResponseType } from '../ton.schema';
import { parseTransactionStatus } from '../ton.utils';

export const pollRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: PollRequestType }>(
    '/poll',
    {
      schema: {
        body: PollRequest,
        tags: ['ton'],
        description: 'Poll TON transaction status by message hash',
        response: {
          200: PollResponse,
        },
      },
    },
    async (request): Promise<PollResponseType> => {
      const { network = 'mainnet', txHash, signature } = request.body;
      const hash = txHash || signature;

      if (!hash) {
        throw new Error('Either txHash or signature is required');
      }

      const ton = Ton.getInstance(network);
      if (!ton.initialized) await ton.init();

      const tx = await ton.getTransaction(hash);

      if (!tx) {
        return {
          network: ton.network,
          txHash: hash,
          confirmed: false,
          success: false,
          exitCode: 0,
        };
      }

      const status = parseTransactionStatus(tx);

      return {
        network: ton.network,
        txHash: hash,
        confirmed: true,
        success: status.success,
        exitCode: status.status,
        receipt: tx,
      };
    },
  );
};
