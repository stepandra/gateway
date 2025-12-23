/**
 * Mock implementations for DeDust SDK
 * Used in unit and integration tests to avoid external dependencies
 */

import { Address } from '@ton/core';

export const MOCK_MAINNET_FACTORY_ADDR = 'EQBfBWT7X2BHg9tXAxzhz2aKiNTU1tpt5NsiK0uSDW_YAJ67';

export const mockDedustFactory = {
  async getPoolsByJettonMinters(jetton0: any, jetton1: any) {
    return [
      {
        address: Address.parse('EQPOOL123456789ABCDEF123456789ABCDEF123456789ABCDEF123456'),
        assets: [jetton0, jetton1],
        type: 'volatile',
        fee: 0.3
      }
    ];
  },

  async getPool(assets: any[]) {
    return {
      address: Address.parse('EQPOOL123456789ABCDEF123456789ABCDEF123456789ABCDEF123456'),
      assets,
      type: 'volatile',
      fee: 0.3
    };
  },

  async getPools() {
    return [
      {
        address: Address.parse('EQPOOL123456789ABCDEF123456789ABCDEF123456789ABCDEF123456'),
        assets: [mockAssets.TON, mockAssets.USDT],
        type: 'volatile',
        fee: 0.3
      },
      {
        address: Address.parse('EQPOOL789ABC456DEF123789ABC456DEF123789ABC456DEF123789ABC'),
        assets: [mockAssets.USDT, mockAssets.USDC],
        type: 'stable',
        fee: 0.1
      }
    ];
  }
};

export const mockDedustPool = {
  async getReserves() {
    return {
      reserve0: '1000000000000', // 1M units
      reserve1: '5000000000000'  // 5M units
    };
  },

  async getTotalSupply() {
    return '2236067977500'; // sqrt(1M * 5M) approximately
  },

  async getExpectedOutputs(amountIn: string) {
    const amountInNum = parseInt(amountIn);
    const amountOut = Math.floor(amountInNum * 0.997 * 4.95); // ~5:1 ratio with 0.3% fee
    return {
      amountOut: amountOut.toString(),
      tradeFee: Math.floor(amountInNum * 0.003).toString()
    };
  },

  async getExpectedInputs(amountOut: string) {
    const amountOutNum = parseInt(amountOut);
    const amountIn = Math.floor(amountOutNum / 4.95 / 0.997); // Reverse calculation
    return {
      amountIn: amountIn.toString(),
      tradeFee: Math.floor(amountIn * 0.003).toString()
    };
  },

  async getExpectedLiquidityOut(amount0: string, amount1: string) {
    const amount0Num = parseInt(amount0);
    const amount1Num = parseInt(amount1);
    const liquidity = Math.floor(Math.sqrt(amount0Num * amount1Num));
    return {
      liquidityOut: liquidity.toString(),
      amount0Min: Math.floor(amount0Num * 0.99).toString(),
      amount1Min: Math.floor(amount1Num * 0.99).toString()
    };
  },

  async getExpectedTokensOut(liquidityIn: string) {
    const liquidityNum = parseInt(liquidityIn);
    const totalSupply = 2236067977500;
    const share = liquidityNum / totalSupply;

    return {
      amount0Out: Math.floor(1000000000000 * share).toString(),
      amount1Out: Math.floor(5000000000000 * share).toString()
    };
  }
};

export const mockAssets = {
  TON: {
    type: 'native',
    address: Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c')
  },
  USDT: {
    type: 'jetton',
    address: Address.parse('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs')
  },
  USDC: {
    type: 'jetton',
    address: Address.parse('EQB-MPwrd1G6WKNkLz_VnV6WqBDd142KMQv-g1O-8QUA3728')
  }
};

export const mockVaultNative = {
  async getBalance() {
    return '1000000000000'; // 1000 TON
  },

  async deposit(amount: string) {
    return {
      to: Address.parse('EQVAULT123456789ABCDEF123456789ABCDEF123456789ABCDEF12345'),
      value: amount,
      body: null
    };
  },

  async withdraw(amount: string) {
    return {
      to: Address.parse('EQVAULT123456789ABCDEF123456789ABCDEF123456789ABCDEF12345'),
      value: '100000000', // 0.1 TON for gas
      body: null
    };
  }
};

export const mockSwapParams = {
  gasAmount: '100000000', // 0.1 TON
  queryId: 123456789,
  deadline: Math.floor(Date.now() / 1000) + 300, // 5 minutes from now
  recipientAddress: Address.parse('EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N'),
  referralAddress: null
};

export const mockLiquidityParams = {
  gasAmount: '200000000', // 0.2 TON
  queryId: 123456790,
  deadline: Math.floor(Date.now() / 1000) + 300,
  recipientAddress: Address.parse('EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N'),
  fulfillPayload: true,
  rejectPayload: true
};

export const mockRoutes = [
  {
    pool: Address.parse('EQPOOL123456789ABCDEF123456789ABCDEF123456789ABCDEF123456'),
    tokenIn: mockAssets.TON,
    tokenOut: mockAssets.USDT,
    amountIn: '1000000000', // 1 TON
    amountOut: '4975000000', // ~4.975 USDT (accounting for fees)
    poolType: 'volatile',
    fee: 0.3,
    priceImpact: 0.15
  },
  {
    pool: Address.parse('EQPOOL789ABC456DEF123789ABC456DEF123789ABC456DEF123789ABC'),
    tokenIn: mockAssets.USDT,
    tokenOut: mockAssets.USDC,
    amountIn: '4975000000',
    amountOut: '4970025000', // ~4.97 USDC (minimal slippage for stablecoin pair)
    poolType: 'stable',
    fee: 0.1,
    priceImpact: 0.05
  }
];

export const mockQuotes = {
  simple: {
    amountIn: '1000000000', // 1 TON
    amountOut: '4975000000', // ~4.975 USDT
    amountOutMin: '4925125000', // 1% slippage
    priceImpact: 0.15,
    route: [mockRoutes[0]],
    gasEstimate: '100000000',
    ttl: Math.floor(Date.now() / 1000) + 30,
    slippage: 1.0
  },

  multiHop: {
    amountIn: '1000000000', // 1 TON
    amountOut: '4970025000', // ~4.97 USDC after two hops
    amountOutMin: '4920924750', // 1% total slippage
    priceImpact: 0.20, // Combined impact
    route: mockRoutes,
    gasEstimate: '200000000', // Higher gas for multi-hop
    ttl: Math.floor(Date.now() / 1000) + 30,
    slippage: 1.0
  }
};

export const mockPositions = {
  active: {
    positionId: 'POS123456789',
    poolAddress: 'EQPOOL123456789ABCDEF123456789ABCDEF123456789ABCDEF123456',
    owner: 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N',
    lpTokens: '223606797750', // sqrt(500M * 1B) / 1000
    baseAmount: '500000000', // 0.5 TON
    quoteAmount: '2500000000', // 2.5 USDT
    claimableFees: {
      baseToken: '1000000', // 0.001 TON in fees
      quoteToken: '5000000', // 0.005 USDT in fees
      lastCollected: Date.now() - 86400000 // 1 day ago
    },
    createdAt: Date.now() - 7 * 86400000, // 1 week ago
    lastUpdated: Date.now() - 3600000 // 1 hour ago
  },

  empty: {
    positionId: 'POS987654321',
    poolAddress: 'EQPOOL789ABC456DEF123789ABC456DEF123789ABC456DEF123789ABC',
    owner: 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N',
    lpTokens: '0',
    baseAmount: '0',
    quoteAmount: '0',
    claimableFees: {
      baseToken: '0',
      quoteToken: '0',
      lastCollected: 0
    },
    createdAt: Date.now() - 86400000,
    lastUpdated: Date.now() - 86400000
  }
};

export const mockTransactions = {
  swap: {
    hash: 'TXHASH123456789ABCDEF123456789ABCDEF123456789ABCDEF123456789',
    status: 1, // confirmed
    type: 'swap',
    from: 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N',
    gasUsed: '95000000',
    fee: '95000000',
    blockNumber: 12345679,
    timestamp: Date.now() - 300000, // 5 minutes ago
    details: {
      tokenIn: 'TON',
      tokenOut: 'USDT',
      amountIn: '1000000000',
      amountOut: '4975000000',
      route: mockRoutes
    }
  },

  addLiquidity: {
    hash: 'TXHASH987654321FEDCBA987654321FEDCBA987654321FEDCBA987654321',
    status: 1,
    type: 'addLiquidity',
    from: 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N',
    gasUsed: '180000000',
    fee: '180000000',
    blockNumber: 12345680,
    timestamp: Date.now() - 600000, // 10 minutes ago
    details: {
      poolAddress: 'EQPOOL123456789ABCDEF123456789ABCDEF123456789ABCDEF123456',
      baseAmount: '500000000',
      quoteAmount: '2500000000',
      lpTokensReceived: '223606797750'
    }
  }
};

/**
 * Jest mock setup for DeDust SDK
 */
export const setupDedustSdkMocks = () => {
  jest.mock('@dedust/sdk', () => ({
    Factory: {
      createFromAddress: jest.fn(() => mockDedustFactory)
    },
    Pool: {
      createFromAddress: jest.fn(() => mockDedustPool)
    },
    VaultNative: {
      create: jest.fn(() => mockVaultNative)
    },
    Asset: {
      native: jest.fn(() => mockAssets.TON),
      jetton: jest.fn((address: any) => ({
        type: 'jetton',
        address
      }))
    },
    MAINNET_FACTORY_ADDR: MOCK_MAINNET_FACTORY_ADDR,
    PoolType: {
      VOLATILE: 'volatile',
      STABLE: 'stable'
    }
  }));
};

/**
 * Mock DeDust router for testing
 */
export class MockDedustRouter {
  private shouldFail: boolean = false;
  private latencyMs: number = 150;

  constructor(options: { shouldFail?: boolean; latencyMs?: number } = {}) {
    this.shouldFail = options.shouldFail || false;
    this.latencyMs = options.latencyMs || 150;
  }

  async getSwapQuote(params: any) {
    await this.simulateLatency();

    if (this.shouldFail) {
      throw new Error('Mock DeDust router failure');
    }

    // Return simple or multi-hop quote based on token pair
    if (params.baseToken === 'TON' && params.quoteToken === 'USDC') {
      return mockQuotes.multiHop;
    }

    return mockQuotes.simple;
  }

  async executeSwap(params: any) {
    await this.simulateLatency();

    if (this.shouldFail) {
      throw new Error('Mock swap execution failure');
    }

    return mockTransactions.swap;
  }

  async getPoolInfo(baseToken: string, quoteToken: string) {
    await this.simulateLatency();

    if (this.shouldFail) {
      throw new Error('Mock pool info failure');
    }

    return {
      address: 'EQPOOL123456789ABCDEF123456789ABCDEF123456789ABCDEF123456',
      baseToken,
      quoteToken,
      reserves: ['1000000000000', '5000000000000'],
      fee: 0.3,
      type: 'volatile',
      totalSupply: '2236067977500'
    };
  }

  async addLiquidity(params: any) {
    await this.simulateLatency();

    if (this.shouldFail) {
      throw new Error('Mock add liquidity failure');
    }

    return mockTransactions.addLiquidity;
  }

  async getPosition(address: string, poolAddress: string) {
    await this.simulateLatency();

    if (this.shouldFail) {
      throw new Error('Mock position query failure');
    }

    return mockPositions.active;
  }

  setShouldFail(shouldFail: boolean) {
    this.shouldFail = shouldFail;
  }

  setLatency(ms: number) {
    this.latencyMs = ms;
  }

  private async simulateLatency() {
    await new Promise(resolve => setTimeout(resolve, this.latencyMs));
  }
}

/**
 * Clean up mocks after tests
 */
export const teardownDedustSdkMocks = () => {
  jest.restoreAllMocks();
};