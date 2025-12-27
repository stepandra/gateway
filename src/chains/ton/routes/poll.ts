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
          200: PollResponse
        }
      },
    },
    async (request): Promise<PollResponseType> => {
      const { network = 'mainnet', txHash } = request.body;
      const ton = Ton.getInstance(network);
      if (!ton.initialized) await ton.init();

      const tx = await ton.getTransaction(txHash);

      if (!tx) {
          return {
              network: ton.network,
              txHash,
              confirmed: false,
              success: false,
              exitCode: 0,
          };
      }

      const status = parseTransactionStatus(tx);

      return {
        network: ton.network,
        txHash,
        confirmed: true,
        success: status.success,
        exitCode: status.status,
        receipt: tx
      };
    },
  );
};
