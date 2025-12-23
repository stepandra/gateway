import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import {
  schemas,
  TONStatusQuery,
  TONTokensQuery,
  TONTokensRequest,
  TONBalancesRequest,
  TONEstimateGasRequest,
  TONPollRequest,
  validateTONNetwork
} from '../../../schemas/ton-chain-schema';
import { TON } from '../ton';
import { logger } from '../../../services/logger';

export async function tonChainRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /chains/ton/status
  fastify.get<{
    Querystring: TONStatusQuery;
  }>('/chains/ton/status', {
    schema: {
      querystring: schemas.tonStatusQuery,
      response: {
        200: schemas.tonStatusResponse,
        400: schemas.tonError,
        503: schemas.tonError,
      },
      description: 'Get TON chain status and connectivity information',
      tags: ['TON Chain'],
    },
  }, async (request: FastifyRequest<{ Querystring: TONStatusQuery }>, reply: FastifyReply) => {
    try {
      const network = request.query.network || 'mainnet';

      if (!validateTONNetwork(network)) {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          statusCode: StatusCodes.BAD_REQUEST,
          error: 'Bad Request',
          message: 'Invalid network parameter. Must be "mainnet" or "testnet"',
        });
      }

      const ton = TON.getInstance(network);
      const status = await ton.getStatus();

      if (!status.isConnected) {
        return reply.code(StatusCodes.SERVICE_UNAVAILABLE).send({
          statusCode: StatusCodes.SERVICE_UNAVAILABLE,
          error: 'Service Unavailable',
          message: 'TON network is unavailable',
        });
      }

      logger.info('TON chain status retrieved', {
        network,
        currentBlockNumber: status.currentBlockNumber,
        provider: status.provider,
        latency: status.latency,
      });

      return reply.code(StatusCodes.OK).send(status);
    } catch (error) {
      logger.error('Failed to get TON chain status', {
        error: (error as Error).message,
        network: request.query.network,
      });

      return reply.code(StatusCodes.SERVICE_UNAVAILABLE).send({
        statusCode: StatusCodes.SERVICE_UNAVAILABLE,
        error: 'Service Unavailable',
        message: 'Failed to connect to TON network',
      });
    }
  });

  // GET /chains/ton/tokens
  fastify.get<{
    Querystring: TONTokensQuery;
  }>('/chains/ton/tokens', {
    schema: {
      querystring: schemas.tonTokensQuery,
      response: {
        200: schemas.tonTokensResponse,
        400: schemas.tonError,
      },
      description: 'Get list of supported TON tokens',
      tags: ['TON Chain'],
    },
  }, async (request: FastifyRequest<{ Querystring: TONTokensQuery }>, reply: FastifyReply) => {
    try {
      const network = request.query.network || 'mainnet';

      if (!validateTONNetwork(network)) {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          statusCode: StatusCodes.BAD_REQUEST,
          error: 'Bad Request',
          message: 'Invalid network parameter. Must be "mainnet" or "testnet"',
        });
      }

      const ton = TON.getInstance(network);

      // Parse tokenSymbols query parameter
      let tokenSymbols: string[] | undefined;
      if (request.query.tokenSymbols) {
        if (typeof request.query.tokenSymbols === 'string') {
          tokenSymbols = request.query.tokenSymbols.split(',').map(s => s.trim());
        }
      }

      const tokensRequest: TONTokensRequest = {
        tokenSymbols,
        network,
      };

      const response = await ton.getTokens(tokensRequest);

      logger.info('TON tokens retrieved', {
        network,
        requestedTokens: tokenSymbols,
        returnedCount: response.tokens.length,
      });

      return reply.code(StatusCodes.OK).send(response);
    } catch (error) {
      logger.error('Failed to get TON tokens', {
        error: (error as Error).message,
        network: request.query.network,
        tokenSymbols: request.query.tokenSymbols,
      });

      if ((error as Error).message.includes('not found')) {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          statusCode: StatusCodes.BAD_REQUEST,
          error: 'Bad Request',
          message: (error as Error).message,
        });
      }

      return reply.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'Failed to retrieve tokens',
      });
    }
  });

  // POST /chains/ton/balances
  fastify.post<{
    Body: TONBalancesRequest;
  }>('/chains/ton/balances', {
    schema: {
      body: schemas.tonBalancesRequest,
      response: {
        200: schemas.tonBalancesResponse,
        400: schemas.tonError,
      },
      description: 'Get TON wallet balances for specified tokens',
      tags: ['TON Chain'],
    },
  }, async (request: FastifyRequest<{ Body: TONBalancesRequest }>, reply: FastifyReply) => {
    try {
      const { address, tokens, fetchAll, network = 'mainnet' } = request.body;

      if (!validateTONNetwork(network)) {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          statusCode: StatusCodes.BAD_REQUEST,
          error: 'Bad Request',
          message: 'Invalid network parameter. Must be "mainnet" or "testnet"',
        });
      }

      const ton = TON.getInstance(network);
      const response = await ton.getBalances(request.body);

      logger.info('TON balances retrieved', {
        network,
        address: address.slice(0, 8) + '...' + address.slice(-8),
        tokenCount: Object.keys(response.balances).length,
        fetchAll,
      });

      return reply.code(StatusCodes.OK).send(response);
    } catch (error) {
      logger.error('Failed to get TON balances', {
        error: (error as Error).message,
        address: request.body.address,
        network: request.body.network,
      });

      if ((error as Error).message.includes('Invalid')) {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          statusCode: StatusCodes.BAD_REQUEST,
          error: 'Bad Request',
          message: (error as Error).message,
        });
      }

      return reply.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'Failed to retrieve balances',
      });
    }
  });

  // POST /chains/ton/estimate-gas
  fastify.post<{
    Body: TONEstimateGasRequest;
  }>('/chains/ton/estimate-gas', {
    schema: {
      body: schemas.tonEstimateGasRequest,
      response: {
        200: schemas.tonEstimateGasResponse,
        400: schemas.tonError,
      },
      description: 'Estimate gas costs for TON transactions',
      tags: ['TON Chain'],
    },
  }, async (request: FastifyRequest<{ Body: TONEstimateGasRequest }>, reply: FastifyReply) => {
    try {
      const { network = 'mainnet' } = request.body;

      if (!validateTONNetwork(network)) {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          statusCode: StatusCodes.BAD_REQUEST,
          error: 'Bad Request',
          message: 'Invalid network parameter. Must be "mainnet" or "testnet"',
        });
      }

      const ton = TON.getInstance(network);
      const response = await ton.estimateGas(request.body);

      logger.info('TON gas estimated', {
        network,
        fromAddress: request.body.fromAddress.slice(0, 8) + '...',
        toAddress: request.body.toAddress.slice(0, 8) + '...',
        token: request.body.token,
        value: request.body.value,
        gasEstimate: response.gasEstimate,
      });

      return reply.code(StatusCodes.OK).send(response);
    } catch (error) {
      logger.error('Failed to estimate TON gas', {
        error: (error as Error).message,
        fromAddress: request.body.fromAddress,
        toAddress: request.body.toAddress,
        network: request.body.network,
      });

      if ((error as Error).message.includes('Invalid') || (error as Error).message.includes('not found')) {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          statusCode: StatusCodes.BAD_REQUEST,
          error: 'Bad Request',
          message: (error as Error).message,
        });
      }

      return reply.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'Failed to estimate gas',
      });
    }
  });

  // POST /chains/ton/poll
  fastify.post<{
    Body: TONPollRequest;
  }>('/chains/ton/poll', {
    schema: {
      body: schemas.tonPollRequest,
      response: {
        200: schemas.tonPollResponse,
        400: schemas.tonError,
        404: schemas.tonError,
      },
      description: 'Poll TON transaction status and confirmations',
      tags: ['TON Chain'],
    },
  }, async (request: FastifyRequest<{ Body: TONPollRequest }>, reply: FastifyReply) => {
    try {
      const { network = 'mainnet' } = request.body;

      if (!validateTONNetwork(network)) {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          statusCode: StatusCodes.BAD_REQUEST,
          error: 'Bad Request',
          message: 'Invalid network parameter. Must be "mainnet" or "testnet"',
        });
      }

      // Validate transaction hash format
      if (!/^[a-fA-F0-9]{64}$/.test(request.body.txHash)) {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          statusCode: StatusCodes.BAD_REQUEST,
          error: 'Bad Request',
          message: 'Invalid transaction hash format',
        });
      }

      const ton = TON.getInstance(network);
      const response = await ton.poll(request.body);

      logger.info('TON transaction polled', {
        network,
        txHash: request.body.txHash,
        status: response.status,
        confirmations: response.confirmations,
      });

      return reply.code(StatusCodes.OK).send(response);
    } catch (error) {
      logger.error('Failed to poll TON transaction', {
        error: (error as Error).message,
        txHash: request.body.txHash,
        network: request.body.network,
      });

      if ((error as Error).message.includes('not found')) {
        return reply.code(StatusCodes.NOT_FOUND).send({
          statusCode: StatusCodes.NOT_FOUND,
          error: 'Not Found',
          message: 'Transaction not found',
        });
      }

      if ((error as Error).message.includes('Invalid')) {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          statusCode: StatusCodes.BAD_REQUEST,
          error: 'Bad Request',
          message: (error as Error).message,
        });
      }

      return reply.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'Failed to poll transaction',
      });
    }
  });
}