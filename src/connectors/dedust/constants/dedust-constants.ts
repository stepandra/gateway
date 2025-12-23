// DeDust Protocol Constants

// Network configurations
export const DEDUST_NETWORKS = {
  mainnet: {
    name: 'mainnet',
    factoryAddress: 'EQBfAN7LfaUYgXZNw5Wc7GBgkEX2yhuJ5ka95J1JJwXXf4a8',
    tonClientEndpoint: 'https://toncenter.com/api/v2/jsonRPC',
    explorerUrl: 'https://tonapi.io',
    chainId: 101,
  },
  testnet: {
    name: 'testnet',
    factoryAddress: 'EQDHcPEKqCUJHkVY8o2YTGrX5aMLOJ3FD8BRoaYOX6t0F0Xs',
    tonClientEndpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
    explorerUrl: 'https://testnet.tonapi.io',
    chainId: 102,
  },
} as const;

// Pool types and fees
export const POOL_TYPES = {
  VOLATILE: 'volatile',
  STABLE: 'stable',
} as const;

export const POOL_FEES = {
  [POOL_TYPES.VOLATILE]: 0.3, // 0.3%
  [POOL_TYPES.STABLE]: 0.05,  // 0.05%
} as const;

// Transaction limits and defaults
export const TRANSACTION_LIMITS = {
  MIN_TON_AMOUNT: '0.01',        // Minimum 0.01 TON
  MAX_TON_AMOUNT: '1000000',     // Maximum 1M TON
  MIN_SLIPPAGE: 0,               // 0%
  MAX_SLIPPAGE: 50,              // 50%
  DEFAULT_SLIPPAGE: 1.0,         // 1%
  MIN_GAS_AMOUNT: '0.001',       // Minimum gas
  DEFAULT_GAS_AMOUNT: '0.1',     // Default gas
  MAX_GAS_AMOUNT: '1.0',         // Maximum gas
} as const;

// Router configuration defaults
export const ROUTER_DEFAULTS = {
  MAX_HOPS: 3,
  QUOTE_TTL: 60,                 // 60 seconds
  SLIPPAGE_TOLERANCE: 1.0,       // 1%
  GAS_ESTIMATE: '0.1',           // 0.1 TON
  CACHE_TTL: 30000,              // 30 seconds
} as const;

// AMM configuration defaults
export const AMM_DEFAULTS = {
  GAS_LIMIT: '100000',
  PRIORITY_FEE: '0.01',
  CONFIRMATION_TIMEOUT: 30000,   // 30 seconds
  MAX_RETRIES: 3,
  CACHE_TTL: 30000,              // 30 seconds
} as const;

// Native TON token configuration
export const TON_NATIVE = {
  symbol: 'TON',
  name: 'Toncoin',
  decimals: 9,
  address: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
  isNative: true,
} as const;

// Common token addresses (mainnet)
export const COMMON_TOKENS_MAINNET = {
  TON: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
  USDT: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
  USDC: 'EQB-MPwrd1G6WKNkLz_VnV6WqBDd142KMQv-g1O-8QUA3728',
  WTON: 'EQCM3B12QbZ3rpnByYuQqPiVOLy_YqUQnXBdNbXP5-N9Gsc_',
  jUSDT: 'EQBynBO23ywHy_CgarY9NK9FTz0yDsG82PtcbSTQgGoXwiuA',
  jUSDC: 'EQB-MPwrd1G6WKNkLz_VnV6WqBDd142KMQv-g1O-8QUA3728',
} as const;

// Common token addresses (testnet)
export const COMMON_TOKENS_TESTNET = {
  TON: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
  USDT: 'EQC61Y3prYwR2GDuPH5kH_QFqFmNEUGQxxnKzI4W8mpLgfFy',
  USDC: 'EQAs87m4yUXHBZOdJzJOYU9cX3RDxE_-jYGOqm-BeTKWJZX8',
} as const;

// API endpoints and timeouts
export const API_CONFIG = {
  REQUEST_TIMEOUT: 30000,        // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,             // 1 second
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: 100,
    BURST_LIMIT: 10,
  },
} as const;

// Error codes
export const ERROR_CODES = {
  POOL_NOT_FOUND: 'POOL_NOT_FOUND',
  INSUFFICIENT_LIQUIDITY: 'INSUFFICIENT_LIQUIDITY',
  SLIPPAGE_EXCEEDED: 'SLIPPAGE_EXCEEDED',
  QUOTE_EXPIRED: 'QUOTE_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  POSITION_NOT_FOUND: 'POSITION_NOT_FOUND',
} as const;

// Operation codes for DeDust contracts
export const OP_CODES = {
  SWAP: 0x61fb5cc5,
  ADD_LIQUIDITY: 0x4cf82803,
  REMOVE_LIQUIDITY: 0x166a0623,
  COLLECT_FEES: 0x60240084,
  DEPOSIT: 0x0a6b7b78,
  WITHDRAW: 0x41836980,
} as const;

// Gas amounts for different operations (in TON)
export const GAS_AMOUNTS = {
  SWAP: '0.1',
  ADD_LIQUIDITY: '0.15',
  REMOVE_LIQUIDITY: '0.1',
  COLLECT_FEES: '0.05',
  QUERY_POOL: '0.01',
  QUERY_BALANCE: '0.01',
} as const;

// Cache configuration
export const CACHE_CONFIG = {
  POOL_CACHE_TTL: 30000,         // 30 seconds
  QUOTE_CACHE_TTL: 60000,        // 60 seconds
  TOKEN_CACHE_TTL: 300000,       // 5 minutes
  POSITION_CACHE_TTL: 15000,     // 15 seconds
  MAX_CACHE_SIZE: 1000,          // Maximum cached items
} as const;

// Price impact thresholds
export const PRICE_IMPACT_THRESHOLDS = {
  LOW: 1.0,     // 1%
  MEDIUM: 3.0,  // 3%
  HIGH: 5.0,    // 5%
  VERY_HIGH: 10.0, // 10%
} as const;

// Liquidity position thresholds
export const LIQUIDITY_THRESHOLDS = {
  MIN_POOL_SHARE: 0.0001,       // 0.0001% minimum pool share
  MIN_USD_VALUE: 1.0,           // $1 minimum position value
  DUST_THRESHOLD: '1000000',    // Dust threshold in nano tokens
} as const;

// Supported operations
export const SUPPORTED_OPERATIONS = {
  ROUTER: ['quote-swap', 'execute-swap', 'execute-quote'] as const,
  AMM: ['poolInfo', 'liquidityQuote', 'addLiquidity', 'removeLiquidity', 'position', 'positions'] as const,
} as const;

// Network validation
export const isValidNetwork = (network: string): network is keyof typeof DEDUST_NETWORKS => {
  return network in DEDUST_NETWORKS;
};

// Pool type validation
export const isValidPoolType = (poolType: string): poolType is keyof typeof POOL_FEES => {
  return poolType in POOL_FEES;
};

// Export all constants as a single object for easier importing
export const DEDUST_CONSTANTS = {
  NETWORKS: DEDUST_NETWORKS,
  POOL_TYPES,
  POOL_FEES,
  TRANSACTION_LIMITS,
  ROUTER_DEFAULTS,
  AMM_DEFAULTS,
  TON_NATIVE,
  COMMON_TOKENS_MAINNET,
  COMMON_TOKENS_TESTNET,
  API_CONFIG,
  ERROR_CODES,
  OP_CODES,
  GAS_AMOUNTS,
  CACHE_CONFIG,
  PRICE_IMPACT_THRESHOLDS,
  LIQUIDITY_THRESHOLDS,
  SUPPORTED_OPERATIONS,
} as const;

// Type exports
export type DedustNetwork = keyof typeof DEDUST_NETWORKS;
export type PoolType = keyof typeof POOL_FEES;
export type ErrorCode = keyof typeof ERROR_CODES;
export type SupportedRouterOperation = typeof SUPPORTED_OPERATIONS.ROUTER[number];
export type SupportedAMMOperation = typeof SUPPORTED_OPERATIONS.AMM[number];