import { Type } from '@sinclair/typebox';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';

import {
  AddLiquidityRequest,
  AddLiquidityResponse,
  GetPoolInfoRequest,
  GetPositionInfoRequest,
  PoolInfoSchema,
  PositionInfoSchema,
  QuoteLiquidityRequest,
  QuoteLiquidityResponse,
  RemoveLiquidityRequest,
  RemoveLiquidityResponse,
} from '../../schemas/amm-schema';

import { DeDustAMM } from './dedust.amm';

export const dedustAmmRoutes: FastifyPluginAsync = async (gatewayApp: FastifyInstance) => {
  gatewayApp.get(
    '/pool-info',
    {
      schema: {
        description: 'Get pool information for DeDust AMM',
        tags: ['/connectors/dedust'],
        querystring: GetPoolInfoRequest,
        response: {
          200: PoolInfoSchema,
        },
      },
    },
    async (request) => {
      const { network } = request.query as any;
      const dedustAmm = DeDustAMM.getInstance(network || 'mainnet');
      return await dedustAmm.poolInfo(request.query as any);
    },
  );

  gatewayApp.post(
    '/add-liquidity',
    {
      schema: {
        description: 'Add liquidity to a DeDust AMM pool',
        tags: ['/connectors/dedust'],
        body: AddLiquidityRequest,
        response: {
          200: AddLiquidityResponse,
        },
      },
    },
    async (request) => {
      const { network } = request.body as any;
      const dedustAmm = DeDustAMM.getInstance(network || 'mainnet');
      return await dedustAmm.addLiquidity(request.body as any);
    },
  );

  gatewayApp.post(
    '/remove-liquidity',
    {
      schema: {
        description: 'Remove liquidity from a DeDust AMM pool',
        tags: ['/connectors/dedust'],
        body: RemoveLiquidityRequest,
        response: {
          200: RemoveLiquidityResponse,
        },
      },
    },
    async (request) => {
      const { network } = request.body as any;
      const dedustAmm = DeDustAMM.getInstance(network || 'mainnet');
      return await dedustAmm.removeLiquidity(request.body as any);
    },
  );

  gatewayApp.get(
    '/position-info',
    {
      schema: {
        description: 'Get position information for a wallet in DeDust AMM',
        tags: ['/connectors/dedust'],
        querystring: GetPositionInfoRequest,
        response: {
          200: PositionInfoSchema,
        },
      },
    },
    async (request) => {
      const { network } = request.query as any;
      const dedustAmm = DeDustAMM.getInstance(network || 'mainnet');
      return await dedustAmm.positionInfo(request.query as any);
    },
  );

  gatewayApp.get(
    '/quote-liquidity',
    {
      schema: {
        description: 'Get a liquidity quote for DeDust AMM',
        tags: ['/connectors/dedust'],
        querystring: QuoteLiquidityRequest,
        response: {
          200: QuoteLiquidityResponse,
        },
      },
    },
    async (request) => {
      const { network } = request.query as any;
      const dedustAmm = DeDustAMM.getInstance(network || 'mainnet');
      return await dedustAmm.quoteLiquidity(request.query as any);
    },
  );

  gatewayApp.post(
    '/claim-fees',
    {
      schema: {
        description: 'Claim accumulated fees from a DeDust AMM pool',
        tags: ['/connectors/dedust'],
        body: Type.Object({
          network: Type.Optional(Type.String()),
          walletAddress: Type.String(),
          poolAddress: Type.String(),
        }),
        response: {
          200: AddLiquidityResponse, // Using same structure for transaction response
        },
      },
    },
    async (request) => {
      const { network } = request.body as any;
      const dedustAmm = DeDustAMM.getInstance(network || 'mainnet');
      return await dedustAmm.claimFees(request.body as any);
    },
  );
};
