import { Type, Static } from '@sinclair/typebox';

// Common DeDust AMM schemas
export const DedustNetworkSchema = Type.Union([
  Type.Literal('mainnet'),
  Type.Literal('testnet')
], {
  description: 'DeDust network identifier'
});

export const PoolTypeSchema = Type.Union([
  Type.Literal('volatile'),
  Type.Literal('stable')
], {
  description: 'DeDust pool type'
});

export const AmountSchema = Type.String({
  pattern: '^[0-9]+(\\.[0-9]+)?$',
  description: 'Amount as decimal string'
});

export const SlippageSchema = Type.Number({
  minimum: 0,
  maximum: 50,
  description: 'Slippage tolerance percentage (0-50)'
});

export const PercentageSchema = Type.Number({
  minimum: 0,
  maximum: 100,
  description: 'Percentage value (0-100)'
});

export const TONAddressSchema = Type.String({
  pattern: '^(EQ|UQ)[A-Za-z0-9_-]{46}$|^[A-Za-z0-9_-]{48}$',
  description: 'Valid TON address'
});

export const LiquidityOperationSchema = Type.Union([
  Type.Literal('add'),
  Type.Literal('remove')
], {
  description: 'Liquidity operation type'
});

// Pool Info schemas
export const PoolInfoRequestSchema = Type.Object({
  network: Type.Optional(DedustNetworkSchema),
  baseToken: Type.String({ description: 'Base token symbol or address' }),
  quoteToken: Type.String({ description: 'Quote token symbol or address' }),
  poolType: Type.Optional(PoolTypeSchema)
}, {
  description: 'Request for pool information'
});

export const PoolInfoResponseSchema = Type.Object({
  address: TONAddressSchema,
  baseSymbol: Type.String({ description: 'Base token symbol' }),
  quoteSymbol: Type.String({ description: 'Quote token symbol' }),
  baseReserve: Type.String({ description: 'Base token reserve amount' }),
  quoteReserve: Type.String({ description: 'Quote token reserve amount' }),
  fee: Type.Number({ minimum: 0, maximum: 100, description: 'Pool fee percentage' }),
  totalSupply: Type.String({ description: 'Total LP token supply' }),
  type: PoolTypeSchema,
  network: Type.String({ description: 'Network identifier' }),
  currentPrice: Type.Optional(Type.String({ description: 'Current price of base token in quote token' })),
  priceChange24h: Type.Optional(Type.Number({ description: '24h price change percentage' })),
  volume24h: Type.Optional(Type.String({ description: '24h trading volume' })),
  tvl: Type.Optional(Type.String({ description: 'Total value locked in USD' }))
}, {
  description: 'Pool information response'
});

// Liquidity Quote schemas
export const LiquidityQuoteRequestSchema = Type.Object({
  network: Type.Optional(DedustNetworkSchema),
  baseToken: Type.String({ description: 'Base token symbol or address' }),
  quoteToken: Type.String({ description: 'Quote token symbol or address' }),
  operation: LiquidityOperationSchema,
  baseAmount: Type.Optional(AmountSchema),
  quoteAmount: Type.Optional(AmountSchema),
  lpTokenAmount: Type.Optional(AmountSchema),
  poolType: Type.Optional(PoolTypeSchema)
}, {
  description: 'Request for liquidity operation quote'
});

export const LiquidityQuoteResponseSchema = Type.Object({
  operation: LiquidityOperationSchema,
  poolAddress: TONAddressSchema,
  baseTokenRequired: Type.Optional(Type.String({ description: 'Base token amount required' })),
  quoteTokenRequired: Type.Optional(Type.String({ description: 'Quote token amount required' })),
  baseTokenToReceive: Type.Optional(Type.String({ description: 'Base token amount to receive' })),
  quoteTokenToReceive: Type.Optional(Type.String({ description: 'Quote token amount to receive' })),
  lpTokensToReceive: Type.Optional(Type.String({ description: 'LP tokens to receive' })),
  lpTokensToBurn: Type.Optional(Type.String({ description: 'LP tokens to burn' })),
  priceImpact: Type.Number({ minimum: 0, maximum: 100, description: 'Price impact percentage' }),
  poolShare: Type.Optional(Type.Number({ minimum: 0, maximum: 100, description: 'Pool share percentage' })),
  gasEstimate: Type.String({ description: 'Estimated gas cost' }),
  fee: Type.Number({ minimum: 0, maximum: 100, description: 'Pool fee percentage' }),
  poolType: PoolTypeSchema,
  currentPrice: Type.Optional(Type.String({ description: 'Current pool price' })),
  expectedPrice: Type.Optional(Type.String({ description: 'Expected price after operation' }))
}, {
  description: 'Liquidity operation quote response'
});

// Add Liquidity schemas
export const AddLiquidityRequestSchema = Type.Object({
  network: Type.Optional(DedustNetworkSchema),
  walletAddress: TONAddressSchema,
  baseToken: Type.String({ description: 'Base token symbol or address' }),
  quoteToken: Type.String({ description: 'Quote token symbol or address' }),
  baseAmount: AmountSchema,
  quoteAmount: AmountSchema,
  minLpTokens: Type.Optional(AmountSchema),
  slippage: Type.Optional(SlippageSchema),
  poolType: Type.Optional(PoolTypeSchema),
  gasLimit: Type.Optional(Type.String({ description: 'Custom gas limit' })),
  priorityFee: Type.Optional(Type.String({ description: 'Custom priority fee' }))
}, {
  description: 'Request to add liquidity to a pool'
});

export const AddLiquidityResponseSchema = Type.Object({
  txHash: Type.String({ pattern: '^0x[a-fA-F0-9]{64}$', description: 'Transaction hash' }),
  nonce: Type.Number({ minimum: 0, description: 'Transaction nonce' }),
  baseAmountAdded: Type.String({ description: 'Actual base token amount added' }),
  quoteAmountAdded: Type.String({ description: 'Actual quote token amount added' }),
  lpTokensReceived: Type.String({ description: 'LP tokens received' }),
  actualPriceImpact: Type.Number({ minimum: 0, maximum: 100, description: 'Actual price impact' }),
  gasUsed: Type.String({ description: 'Gas consumed by transaction' }),
  gasCost: Type.String({ description: 'Gas cost in TON' }),
  poolAddress: TONAddressSchema,
  poolType: PoolTypeSchema,
  addedAt: Type.Number({ minimum: 0, description: 'Addition timestamp' })
}, {
  description: 'Add liquidity response with transaction details'
});

// Remove Liquidity schemas
export const RemoveLiquidityRequestSchema = Type.Object({
  network: Type.Optional(DedustNetworkSchema),
  walletAddress: TONAddressSchema,
  baseToken: Type.String({ description: 'Base token symbol or address' }),
  quoteToken: Type.String({ description: 'Quote token symbol or address' }),
  lpTokenAmount: Type.Optional(AmountSchema),
  percentage: Type.Optional(PercentageSchema),
  minBaseAmount: Type.Optional(AmountSchema),
  minQuoteAmount: Type.Optional(AmountSchema),
  slippage: Type.Optional(SlippageSchema),
  poolType: Type.Optional(PoolTypeSchema),
  gasLimit: Type.Optional(Type.String({ description: 'Custom gas limit' })),
  priorityFee: Type.Optional(Type.String({ description: 'Custom priority fee' }))
}, {
  description: 'Request to remove liquidity from a pool'
});

export const RemoveLiquidityResponseSchema = Type.Object({
  txHash: Type.String({ pattern: '^0x[a-fA-F0-9]{64}$', description: 'Transaction hash' }),
  nonce: Type.Number({ minimum: 0, description: 'Transaction nonce' }),
  baseAmountReceived: Type.String({ description: 'Base token amount received' }),
  quoteAmountReceived: Type.String({ description: 'Quote token amount received' }),
  lpTokensBurned: Type.String({ description: 'LP tokens burned' }),
  actualPriceImpact: Type.Number({ minimum: 0, maximum: 100, description: 'Actual price impact' }),
  gasUsed: Type.String({ description: 'Gas consumed by transaction' }),
  gasCost: Type.String({ description: 'Gas cost in TON' }),
  poolAddress: TONAddressSchema,
  poolType: PoolTypeSchema,
  removedAt: Type.Number({ minimum: 0, description: 'Removal timestamp' })
}, {
  description: 'Remove liquidity response with transaction details'
});

// Position schemas
export const PositionRequestSchema = Type.Object({
  network: Type.Optional(DedustNetworkSchema),
  walletAddress: TONAddressSchema,
  baseToken: Type.String({ description: 'Base token symbol or address' }),
  quoteToken: Type.String({ description: 'Quote token symbol or address' }),
  poolType: Type.Optional(PoolTypeSchema)
}, {
  description: 'Request for liquidity position information'
});

export const PositionResponseSchema = Type.Object({
  poolAddress: TONAddressSchema,
  baseToken: Type.String({ description: 'Base token symbol' }),
  quoteToken: Type.String({ description: 'Quote token symbol' }),
  lpTokenAmount: Type.String({ description: 'LP token amount owned' }),
  baseAmount: Type.String({ description: 'Base token amount in position' }),
  quoteAmount: Type.String({ description: 'Quote token amount in position' }),
  poolShare: Type.Number({ minimum: 0, maximum: 100, description: 'Pool share percentage' }),
  valueUSD: Type.Optional(Type.String({ description: 'Position value in USD' })),
  impermanentLoss: Type.Optional(Type.Number({ description: 'Impermanent loss percentage' })),
  fees24h: Type.Optional(Type.String({ description: 'Fees earned in last 24h' })),
  rewardsAvailable: Type.Optional(Type.String({ description: 'Available rewards to claim' })),
  poolType: PoolTypeSchema,
  createdAt: Type.Number({ minimum: 0, description: 'Position creation timestamp' }),
  lastUpdated: Type.Number({ minimum: 0, description: 'Last update timestamp' })
}, {
  description: 'Liquidity position information'
});

export const PositionsRequestSchema = Type.Object({
  network: Type.Optional(DedustNetworkSchema),
  walletAddress: TONAddressSchema
}, {
  description: 'Request for all liquidity positions'
});

export const PositionsResponseSchema = Type.Object({
  positions: Type.Array(PositionResponseSchema, { description: 'Array of liquidity positions' }),
  totalValueUSD: Type.Optional(Type.String({ description: 'Total value of all positions in USD' })),
  positionCount: Type.Number({ minimum: 0, description: 'Number of positions' })
}, {
  description: 'All liquidity positions for a wallet'
});

// Error schemas
export const DedustAMMErrorSchema = Type.Object({
  statusCode: Type.Number({ description: 'HTTP status code' }),
  error: Type.String({ description: 'Error type' }),
  message: Type.String({ description: 'Error message' })
}, {
  description: 'DeDust AMM error response'
});

// Validation helpers
export const validateSlippage = (slippage: number): boolean => {
  return typeof slippage === 'number' && slippage >= 0 && slippage <= 50;
};

export const validatePercentage = (percentage: number): boolean => {
  return typeof percentage === 'number' && percentage >= 0 && percentage <= 100;
};

export const validateAmount = (amount: string): boolean => {
  return /^[0-9]+(\.[0-9]+)?$/.test(amount) && parseFloat(amount) > 0;
};

export const validateTONAddress = (address: string): boolean => {
  return /^(EQ|UQ)[A-Za-z0-9_-]{46}$|^[A-Za-z0-9_-]{48}$/.test(address);
};

export const validatePoolType = (poolType: string): boolean => {
  return ['volatile', 'stable'].includes(poolType);
};

export const validateNetwork = (network: string): boolean => {
  return ['mainnet', 'testnet'].includes(network);
};

export const validateLiquidityOperation = (operation: string): boolean => {
  return ['add', 'remove'].includes(operation);
};

// Type exports for TypeScript usage
export type DedustNetwork = Static<typeof DedustNetworkSchema>;
export type PoolType = Static<typeof PoolTypeSchema>;
export type LiquidityOperation = Static<typeof LiquidityOperationSchema>;
export type PoolInfoRequest = Static<typeof PoolInfoRequestSchema>;
export type PoolInfoResponse = Static<typeof PoolInfoResponseSchema>;
export type LiquidityQuoteRequest = Static<typeof LiquidityQuoteRequestSchema>;
export type LiquidityQuoteResponse = Static<typeof LiquidityQuoteResponseSchema>;
export type AddLiquidityRequest = Static<typeof AddLiquidityRequestSchema>;
export type AddLiquidityResponse = Static<typeof AddLiquidityResponseSchema>;
export type RemoveLiquidityRequest = Static<typeof RemoveLiquidityRequestSchema>;
export type RemoveLiquidityResponse = Static<typeof RemoveLiquidityResponseSchema>;
export type PositionRequest = Static<typeof PositionRequestSchema>;
export type PositionResponse = Static<typeof PositionResponseSchema>;
export type PositionsRequest = Static<typeof PositionsRequestSchema>;
export type PositionsResponse = Static<typeof PositionsResponseSchema>;
export type DedustAMMError = Static<typeof DedustAMMErrorSchema>;

// Schema collection for route registration
export const dedustAMMSchemas = {
  // Request schemas
  poolInfoRequest: PoolInfoRequestSchema,
  liquidityQuoteRequest: LiquidityQuoteRequestSchema,
  addLiquidityRequest: AddLiquidityRequestSchema,
  removeLiquidityRequest: RemoveLiquidityRequestSchema,
  positionRequest: PositionRequestSchema,
  positionsRequest: PositionsRequestSchema,

  // Response schemas
  poolInfoResponse: PoolInfoResponseSchema,
  liquidityQuoteResponse: LiquidityQuoteResponseSchema,
  addLiquidityResponse: AddLiquidityResponseSchema,
  removeLiquidityResponse: RemoveLiquidityResponseSchema,
  positionResponse: PositionResponseSchema,
  positionsResponse: PositionsResponseSchema,

  // Error schemas
  error: DedustAMMErrorSchema,

  // Component schemas
  dedustNetwork: DedustNetworkSchema,
  poolType: PoolTypeSchema,
  liquidityOperation: LiquidityOperationSchema,
  amount: AmountSchema,
  slippage: SlippageSchema,
  percentage: PercentageSchema,
  tonAddress: TONAddressSchema
};

// Response status code mappings
export const responseStatusCodes = {
  success: 200,
  badRequest: 400,
  notFound: 404,
  unprocessableEntity: 422,
  internalServerError: 500
} as const;

// Common error messages
export const errorMessages = {
  invalidNetwork: 'Invalid network parameter. Must be "mainnet" or "testnet"',
  invalidSlippage: 'Slippage must be between 0 and 50%',
  invalidPercentage: 'Percentage must be between 0 and 100%',
  invalidAmount: 'Amount must be a positive number',
  invalidAddress: 'Invalid TON address format',
  invalidOperation: 'Operation must be "add" or "remove"',
  poolNotFound: 'Pool not found for the specified token pair',
  positionNotFound: 'No liquidity position found',
  insufficientBalance: 'Insufficient balance for liquidity operation',
  insufficientLiquidity: 'Insufficient liquidity in the pool',
  slippageExceeded: 'Slippage tolerance exceeded',
  invalidLiquidityParams: 'Invalid liquidity parameters',
  executionFailed: 'Liquidity operation execution failed',
  missingAmount: 'Either LP token amount or percentage must be provided',
  invalidPoolType: 'Pool type must be "volatile" or "stable"'
} as const;