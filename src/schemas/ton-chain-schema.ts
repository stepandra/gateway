import { Type, Static } from '@sinclair/typebox';

// Common TON schemas
export const TONAddressSchema = Type.String({
  pattern: '^(EQ|UQ)[A-Za-z0-9_-]{46}$|^[A-Za-z0-9_-]{48}$',
  description: 'Valid TON address in user-friendly or raw format'
});

export const TONAmountSchema = Type.String({
  pattern: '^[0-9]+(\\.[0-9]+)?$',
  description: 'Amount as decimal string'
});

export const TONHashSchema = Type.String({
  pattern: '^[a-fA-F0-9]{64}$',
  description: 'Transaction hash in hex format'
});

export const TONNetworkSchema = Type.Union([
  Type.Literal('mainnet'),
  Type.Literal('testnet')
], {
  description: 'TON network identifier'
});

// Token schema
export const TONTokenSchema = Type.Object({
  symbol: Type.String({ description: 'Token symbol' }),
  address: TONAddressSchema,
  decimals: Type.Number({ minimum: 0, maximum: 18, description: 'Token decimals' }),
  name: Type.String({ description: 'Token name' })
}, {
  description: 'TON token information'
});

// Chain status schemas
export const TONStatusResponseSchema = Type.Object({
  network: TONNetworkSchema,
  isConnected: Type.Boolean({ description: 'Whether the chain is connected' }),
  currentBlockNumber: Type.Number({ minimum: 0, description: 'Current block number' }),
  provider: Type.String({ description: 'Current provider name' }),
  latency: Type.Number({ minimum: 0, description: 'Provider latency in ms' }),
  lastSyncedAt: Type.Number({ minimum: 0, description: 'Last sync timestamp' })
}, {
  description: 'TON chain status response'
});

// Tokens schemas
export const TONTokensRequestSchema = Type.Object({
  tokenSymbols: Type.Optional(Type.Union([
    Type.String(),
    Type.Array(Type.String())
  ], { description: 'Token symbols to retrieve' })),
  network: Type.Optional(TONNetworkSchema)
}, {
  description: 'Request for TON tokens'
});

export const TONTokensResponseSchema = Type.Object({
  tokens: Type.Array(TONTokenSchema, { description: 'List of TON tokens' })
}, {
  description: 'TON tokens response'
});

// Balances schemas
export const TONBalancesRequestSchema = Type.Object({
  address: TONAddressSchema,
  tokens: Type.Optional(Type.Array(Type.String(), { description: 'Token symbols to check' })),
  fetchAll: Type.Optional(Type.Boolean({ description: 'Fetch all token balances' })),
  network: Type.Optional(TONNetworkSchema)
}, {
  description: 'Request for TON balances'
});

export const TONBalancesResponseSchema = Type.Object({
  balances: Type.Record(Type.String(), Type.Number(), {
    description: 'Token balances by symbol'
  })
}, {
  description: 'TON balances response'
});

// Gas estimation schemas
export const TONEstimateGasRequestSchema = Type.Object({
  fromAddress: TONAddressSchema,
  toAddress: TONAddressSchema,
  value: TONAmountSchema,
  token: Type.String({ description: 'Token symbol' }),
  network: Type.Optional(TONNetworkSchema)
}, {
  description: 'Request for TON gas estimation'
});

export const TONEstimateGasResponseSchema = Type.Object({
  gasEstimate: Type.String({ description: 'Estimated gas units' }),
  gasCost: Type.String({ description: 'Estimated gas cost in TON' }),
  maxFee: Type.String({ description: 'Maximum fee in TON' }),
  priorityFee: Type.String({ description: 'Priority fee in TON' })
}, {
  description: 'TON gas estimation response'
});

// Transaction polling schemas
export const TONPollRequestSchema = Type.Object({
  txHash: Type.String({ description: 'Transaction hash to poll' }),
  network: Type.Optional(TONNetworkSchema)
}, {
  description: 'Request to poll transaction status'
});

export const TONPollResponseSchema = Type.Object({
  txHash: Type.String({ description: 'Transaction hash' }),
  status: Type.Union([
    Type.Literal('pending'),
    Type.Literal('confirmed'),
    Type.Literal('failed')
  ], { description: 'Transaction status' }),
  gasUsed: Type.String({ description: 'Gas used by transaction' }),
  gasPrice: Type.String({ description: 'Gas price paid' }),
  confirmations: Type.Number({ minimum: 0, description: 'Number of confirmations' }),
  blockHash: Type.String({ description: 'Block hash containing transaction' }),
  blockNumber: Type.Number({ minimum: 0, description: 'Block number containing transaction' })
}, {
  description: 'Transaction poll response'
});

// Error schemas
export const TONErrorSchema = Type.Object({
  statusCode: Type.Number({ description: 'HTTP status code' }),
  error: Type.String({ description: 'Error type' }),
  message: Type.String({ description: 'Error message' })
}, {
  description: 'TON chain error response'
});

// Query parameter schemas for GET endpoints
export const TONStatusQuerySchema = Type.Object({
  network: Type.Optional(TONNetworkSchema)
}, {
  description: 'Query parameters for TON status endpoint'
});

export const TONTokensQuerySchema = Type.Object({
  tokenSymbols: Type.Optional(Type.String({ description: 'Comma-separated token symbols' })),
  network: Type.Optional(TONNetworkSchema)
}, {
  description: 'Query parameters for TON tokens endpoint'
});

// Validation helpers
export const validateTONAddress = (address: string): boolean => {
  return /^(EQ|UQ)[A-Za-z0-9_-]{46}$|^[A-Za-z0-9_-]{48}$/.test(address);
};

export const validateTONAmount = (amount: string): boolean => {
  return /^[0-9]+(\.[0-9]+)?$/.test(amount) && parseFloat(amount) >= 0;
};

export const validateTONNetwork = (network: string): boolean => {
  return ['mainnet', 'testnet'].includes(network);
};

export const validateTONHash = (hash: string): boolean => {
  return /^[a-fA-F0-9]{64}$/.test(hash);
};

// Type exports for TypeScript usage
export type TONStatusResponse = Static<typeof TONStatusResponseSchema>;
export type TONTokensRequest = Static<typeof TONTokensRequestSchema>;
export type TONTokensResponse = Static<typeof TONTokensResponseSchema>;
export type TONBalancesRequest = Static<typeof TONBalancesRequestSchema>;
export type TONBalancesResponse = Static<typeof TONBalancesResponseSchema>;
export type TONEstimateGasRequest = Static<typeof TONEstimateGasRequestSchema>;
export type TONEstimateGasResponse = Static<typeof TONEstimateGasResponseSchema>;
export type TONPollRequest = Static<typeof TONPollRequestSchema>;
export type TONPollResponse = Static<typeof TONPollResponseSchema>;
export type TONError = Static<typeof TONErrorSchema>;
export type TONStatusQuery = Static<typeof TONStatusQuerySchema>;
export type TONTokensQuery = Static<typeof TONTokensQuerySchema>;
export type TONToken = Static<typeof TONTokenSchema>;

// Schema validation functions
export const schemas = {
  // Request schemas
  tonStatusQuery: TONStatusQuerySchema,
  tonTokensQuery: TONTokensQuerySchema,
  tonTokensRequest: TONTokensRequestSchema,
  tonBalancesRequest: TONBalancesRequestSchema,
  tonEstimateGasRequest: TONEstimateGasRequestSchema,
  tonPollRequest: TONPollRequestSchema,

  // Response schemas
  tonStatusResponse: TONStatusResponseSchema,
  tonTokensResponse: TONTokensResponseSchema,
  tonBalancesResponse: TONBalancesResponseSchema,
  tonEstimateGasResponse: TONEstimateGasResponseSchema,
  tonPollResponse: TONPollResponseSchema,
  tonError: TONErrorSchema,

  // Common schemas
  tonAddress: TONAddressSchema,
  tonAmount: TONAmountSchema,
  tonHash: TONHashSchema,
  tonNetwork: TONNetworkSchema,
  tonToken: TONTokenSchema
};