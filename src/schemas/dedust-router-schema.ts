import { Type, Static } from '@sinclair/typebox';

// Common DeDust Router schemas
export const DedustNetworkSchema = Type.Union([
  Type.Literal('mainnet'),
  Type.Literal('testnet')
], {
  description: 'DeDust network identifier'
});

export const SwapSideSchema = Type.Union([
  Type.Literal('SELL'),
  Type.Literal('BUY')
], {
  description: 'Swap side - SELL (exact input) or BUY (exact output)'
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

export const TONAddressSchema = Type.String({
  pattern: '^(EQ|UQ)[A-Za-z0-9_-]{46}$|^[A-Za-z0-9_-]{48}$',
  description: 'Valid TON address'
});

// Route schemas
export const RouteStepSchema = Type.Object({
  pool: TONAddressSchema,
  tokenIn: TONAddressSchema,
  tokenOut: TONAddressSchema,
  amountIn: Type.String({ description: 'Input amount for this hop' }),
  amountOut: Type.String({ description: 'Output amount for this hop' }),
  poolType: PoolTypeSchema
}, {
  description: 'Single routing step in a swap'
});

// Quote swap schemas
export const QuoteSwapRequestSchema = Type.Object({
  network: Type.Optional(DedustNetworkSchema),
  baseToken: Type.String({ description: 'Base token symbol or address' }),
  quoteToken: Type.String({ description: 'Quote token symbol or address' }),
  amount: AmountSchema,
  side: SwapSideSchema,
  slippage: Type.Optional(SlippageSchema)
}, {
  description: 'Request for swap quote generation'
});

export const QuoteSwapResponseSchema = Type.Object({
  route: Type.Array(RouteStepSchema, { description: 'Routing path for the swap' }),
  amountIn: Type.String({ description: 'Total input amount' }),
  amountOut: Type.String({ description: 'Expected output amount' }),
  amountOutMin: Type.String({ description: 'Minimum output after slippage' }),
  priceImpact: Type.Number({ minimum: 0, maximum: 100, description: 'Price impact percentage' }),
  gasEstimate: Type.String({ description: 'Estimated gas cost' }),
  ttl: Type.Number({ minimum: 0, description: 'Quote expiration timestamp' }),
  slippage: Type.Number({ minimum: 0, maximum: 50, description: 'Applied slippage percentage' }),
  quoteId: Type.String({ description: 'Unique quote identifier' })
}, {
  description: 'Swap quote response with routing information'
});

// Execute swap schemas
export const ExecuteSwapRequestSchema = Type.Object({
  network: Type.Optional(DedustNetworkSchema),
  walletAddress: TONAddressSchema,
  quoteId: Type.String({ description: 'Quote identifier from quote-swap' }),
  baseToken: Type.String({ description: 'Base token symbol or address' }),
  quoteToken: Type.String({ description: 'Quote token symbol or address' }),
  amount: AmountSchema,
  side: SwapSideSchema,
  slippage: Type.Optional(SlippageSchema)
}, {
  description: 'Request to execute swap using quote ID'
});

export const ExecuteSwapResponseSchema = Type.Object({
  txHash: Type.String({ pattern: '^[a-fA-F0-9]{64}$', description: 'Transaction hash' }),
  nonce: Type.Number({ minimum: 0, description: 'Transaction nonce' }),
  expectedAmountOut: Type.String({ description: 'Expected output amount from quote' }),
  actualAmountOut: Type.String({ description: 'Actual output amount received' }),
  priceImpact: Type.Number({ minimum: 0, maximum: 100, description: 'Actual price impact' }),
  gasUsed: Type.String({ description: 'Gas consumed by transaction' }),
  fee: Type.String({ description: 'Transaction fee paid' }),
  route: Type.Array(RouteStepSchema, { description: 'Executed routing path' })
}, {
  description: 'Swap execution response with transaction details'
});

// Execute quote schemas
export const ExecuteQuoteRequestSchema = Type.Object({
  network: Type.Optional(DedustNetworkSchema),
  walletAddress: TONAddressSchema,
  quoteId: Type.String({ description: 'Quote identifier' }),
  maxSlippage: SlippageSchema,
  gasLimit: Type.Optional(Type.String({ description: 'Custom gas limit' })),
  priorityFee: Type.Optional(Type.String({ description: 'Custom priority fee' }))
}, {
  description: 'Request to execute quote with advanced parameters'
});

export const ExecuteQuoteResponseSchema = Type.Object({
  txHash: Type.String({ pattern: '^[a-fA-F0-9]{64}$', description: 'Transaction hash' }),
  nonce: Type.Number({ minimum: 0, description: 'Transaction nonce' }),
  executedAmountIn: Type.String({ description: 'Actual input amount' }),
  executedAmountOut: Type.String({ description: 'Actual output amount' }),
  executionPrice: Type.String({ description: 'Effective execution price' }),
  priceImpact: Type.Number({ minimum: 0, maximum: 100, description: 'Actual price impact' }),
  gasUsed: Type.String({ description: 'Gas consumed' }),
  gasCost: Type.String({ description: 'Gas cost in TON' }),
  fee: Type.String({ description: 'Total transaction fee' }),
  route: Type.Array(RouteStepSchema, { description: 'Executed routing path' }),
  quoteId: Type.String({ description: 'Original quote identifier' }),
  executedAt: Type.Number({ minimum: 0, description: 'Execution timestamp' })
}, {
  description: 'Quote execution response with detailed transaction information'
});

// Error schemas
export const DedustRouterErrorSchema = Type.Object({
  statusCode: Type.Number({ description: 'HTTP status code' }),
  error: Type.String({ description: 'Error type' }),
  message: Type.String({ description: 'Error message' })
}, {
  description: 'DeDust router error response'
});

// Validation helpers
export const validateSlippage = (slippage: number): boolean => {
  return typeof slippage === 'number' && slippage >= 0 && slippage <= 50;
};

export const validateAmount = (amount: string): boolean => {
  return /^[0-9]+(\.[0-9]+)?$/.test(amount) && parseFloat(amount) > 0;
};

export const validateTONAddress = (address: string): boolean => {
  return /^(EQ|UQ)[A-Za-z0-9_-]{46}$|^[A-Za-z0-9_-]{48}$/.test(address);
};

export const validateSwapSide = (side: string): boolean => {
  return ['SELL', 'BUY'].includes(side);
};

export const validatePoolType = (poolType: string): boolean => {
  return ['volatile', 'stable'].includes(poolType);
};

export const validateNetwork = (network: string): boolean => {
  return ['mainnet', 'testnet'].includes(network);
};

// Type exports for TypeScript usage
export type DedustNetwork = Static<typeof DedustNetworkSchema>;
export type SwapSide = Static<typeof SwapSideSchema>;
export type PoolType = Static<typeof PoolTypeSchema>;
export type RouteStep = Static<typeof RouteStepSchema>;
export type QuoteSwapRequest = Static<typeof QuoteSwapRequestSchema>;
export type QuoteSwapResponse = Static<typeof QuoteSwapResponseSchema>;
export type ExecuteSwapRequest = Static<typeof ExecuteSwapRequestSchema>;
export type ExecuteSwapResponse = Static<typeof ExecuteSwapResponseSchema>;
export type ExecuteQuoteRequest = Static<typeof ExecuteQuoteRequestSchema>;
export type ExecuteQuoteResponse = Static<typeof ExecuteQuoteResponseSchema>;
export type DedustRouterError = Static<typeof DedustRouterErrorSchema>;

// Schema collection for route registration
export const dedustRouterSchemas = {
  // Request schemas
  quoteSwapRequest: QuoteSwapRequestSchema,
  executeSwapRequest: ExecuteSwapRequestSchema,
  executeQuoteRequest: ExecuteQuoteRequestSchema,

  // Response schemas
  quoteSwapResponse: QuoteSwapResponseSchema,
  executeSwapResponse: ExecuteSwapResponseSchema,
  executeQuoteResponse: ExecuteQuoteResponseSchema,

  // Error schemas
  error: DedustRouterErrorSchema,

  // Component schemas
  routeStep: RouteStepSchema,
  dedustNetwork: DedustNetworkSchema,
  swapSide: SwapSideSchema,
  poolType: PoolTypeSchema,
  amount: AmountSchema,
  slippage: SlippageSchema,
  tonAddress: TONAddressSchema
};

// Response status code mappings
export const responseStatusCodes = {
  success: 200,
  badRequest: 400,
  notFound: 404,
  gone: 410,
  unprocessableEntity: 422,
  internalServerError: 500
} as const;

// Common error messages
export const errorMessages = {
  invalidNetwork: 'Invalid network parameter. Must be "mainnet" or "testnet"',
  invalidSlippage: 'Slippage must be between 0 and 50%',
  invalidAmount: 'Amount must be a positive number',
  invalidAddress: 'Invalid TON address format',
  invalidSide: 'Side must be "SELL" or "BUY"',
  noRoute: 'No route found for this token pair',
  quoteNotFound: 'Quote not found',
  quoteExpired: 'Quote has expired',
  insufficientBalance: 'Insufficient balance for swap',
  slippageExceeded: 'Slippage tolerance exceeded',
  executionFailed: 'Swap execution failed'
} as const;