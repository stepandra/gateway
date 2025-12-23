/**
 * Mock implementations for TON Center API and DRPC providers
 * Used in unit and integration tests to avoid external API dependencies
 */

export const mockTonCenterResponses = {
  // Chain status mocks
  getMasterchainInfo: {
    ok: true,
    result: {
      last: {
        seqno: 12345678,
        shard: '-9223372036854775808',
        workchain: -1,
        root_hash: 'ABC123DEF456789ABCDEF123456789ABCDEF123456789ABCDEF123456789AB',
        file_hash: 'DEF456ABC789123DEF456ABC789123DEF456ABC789123DEF456ABC789123D'
      },
      state_root_hash: 'XYZ789ABC123456XYZ789ABC123456XYZ789ABC123456XYZ789ABC123456X',
      init: {
        file_hash: 'INIT123456789ABCDEF123456789ABCDEF123456789ABCDEF123456789ABC',
        root_hash: 'ROOT987654321FEDCBA987654321FEDCBA987654321FEDCBA987654321FED'
      }
    }
  },

  // Address balance mocks
  getAddressBalance: {
    ok: true,
    result: '1000000000' // 1 TON in nanotons
  },

  getAddressInformation: {
    ok: true,
    result: {
      balance: '1000000000',
      state: 'active',
      code: '',
      data: '',
      last_transaction_id: {
        '@type': 'internal.transactionId',
        lt: '123456789',
        hash: 'TX123456789ABCDEF123456789ABCDEF123456789ABCDEF123456789ABC'
      },
      block_id: {
        '@type': 'ton.blockIdExt',
        workchain: 0,
        shard: '8000000000000000',
        seqno: 12345678,
        root_hash: 'BLOCK123456789ABCDEF123456789ABCDEF123456789ABCDEF123456789',
        file_hash: 'FILE123456789ABCDEF123456789ABCDEF123456789ABCDEF123456789A'
      },
      sync_utime: Math.floor(Date.now() / 1000)
    }
  },

  // Token balance mock (jetton)
  getTokenData: {
    ok: true,
    result: {
      balance: '100000000', // 100 USDT (6 decimals)
      wallet_address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
      jetton_address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs'
    }
  },

  // Transaction mocks
  getTransactions: {
    ok: true,
    result: [
      {
        utime: Math.floor(Date.now() / 1000),
        data: 'TX_DATA_HASH',
        transaction_id: {
          lt: '123456789',
          hash: 'TX123456789ABCDEF123456789ABCDEF123456789ABCDEF123456789ABC'
        },
        fee: '1000000', // 0.001 TON
        storage_fee: '100000', // 0.0001 TON
        other_fee: '900000', // 0.0009 TON
        in_msg: {
          source: 'EQD_source_address_123456789ABCDEF123456789ABCDEF123456789A',
          destination: 'EQD_dest_address_123456789ABCDEF123456789ABCDEF123456789AB',
          value: '500000000', // 0.5 TON
          fwd_fee: '100000',
          ihr_fee: '0',
          created_lt: '123456788',
          body_hash: 'MSG_BODY_HASH_123456789ABCDEF123456789ABCDEF123456789ABC',
          msg_data: {
            '@type': 'msg.dataText',
            text: 'SGVsbG8gV29ybGQ=' // "Hello World" in base64
          }
        },
        out_msgs: []
      }
    ]
  },

  // Fee estimation mock
  estimateFee: {
    ok: true,
    result: {
      '@type': 'query.fees',
      source_fees: {
        '@type': 'fees',
        in_fwd_fee: 1000000,
        storage_fee: 100000,
        gas_fee: 5000000,
        fwd_fee: 1000000
      }
    }
  },

  // Error responses
  errors: {
    invalidAddress: {
      ok: false,
      error: 'Invalid address format',
      code: 400
    },
    rateLimited: {
      ok: false,
      error: 'Too many requests',
      code: 429
    },
    networkError: {
      ok: false,
      error: 'Network timeout',
      code: 503
    }
  }
};

export const mockDrpcResponses = {
  // Similar structure to TON Center but different format
  getMasterchainInfo: {
    result: {
      last_known_block: {
        seqno: 12345678,
        workchain: -1,
        shard: '-9223372036854775808',
        root_hash: 'ABC123DEF456789ABCDEF123456789ABCDEF123456789ABCDEF123456789AB'
      }
    }
  },

  getAccount: {
    result: {
      account: {
        address: 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N',
        balance: '1000000000',
        state: 'active',
        code: null,
        data: null,
        last_transaction_lt: '123456789',
        last_transaction_hash: 'TX123456789ABCDEF123456789ABCDEF123456789ABCDEF123456789ABC'
      }
    }
  },

  errors: {
    invalidAddress: {
      error: {
        code: -32602,
        message: 'Invalid address format'
      }
    },
    networkError: {
      error: {
        code: -32603,
        message: 'Internal error'
      }
    }
  }
};

export const mockWalletAddresses = {
  valid: [
    'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N',
    'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
    'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'
  ],
  invalid: [
    'invalid_address',
    '0x1234567890abcdef',
    'ton://invalid',
    ''
  ]
};

export const mockTokens = [
  {
    symbol: 'TON',
    name: 'Toncoin',
    address: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
    decimals: 9,
    chainId: 101
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
    decimals: 6,
    chainId: 101
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: 'EQB-MPwrd1G6WKNkLz_VnV6WqBDd142KMQv-g1O-8QUA3728',
    decimals: 6,
    chainId: 101
  }
];

/**
 * Mock HTTP response creator for testing
 */
export class MockTonProvider {
  private failureRate: number = 0;
  private latencyMs: number = 100;

  constructor(options: { failureRate?: number; latencyMs?: number } = {}) {
    this.failureRate = options.failureRate || 0;
    this.latencyMs = options.latencyMs || 100;
  }

  async makeRequest(method: string, params: any): Promise<any> {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, this.latencyMs));

    // Simulate random failures
    if (Math.random() < this.failureRate) {
      throw new Error('Mock network failure');
    }

    // Route to appropriate mock response
    switch (method) {
      case 'getMasterchainInfo':
        return mockTonCenterResponses.getMasterchainInfo;
      case 'getAddressBalance':
        return mockTonCenterResponses.getAddressBalance;
      case 'getAddressInformation':
        return mockTonCenterResponses.getAddressInformation;
      case 'getTokenData':
        return mockTonCenterResponses.getTokenData;
      case 'getTransactions':
        return mockTonCenterResponses.getTransactions;
      case 'estimateFee':
        return mockTonCenterResponses.estimateFee;
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  setFailureRate(rate: number) {
    this.failureRate = rate;
  }

  setLatency(ms: number) {
    this.latencyMs = ms;
  }
}

/**
 * Jest mock setup for TON providers
 */
export const setupTonProviderMocks = () => {
  // Mock fetch for TON Center
  global.fetch = jest.fn((url: string, options: any = {}) => {
    const isTonCenter = url.includes('toncenter.com');
    const isDrpc = url.includes('drpc.org');

    if (isTonCenter || isDrpc) {
      const body = options.body ? JSON.parse(options.body) : null;
      const method = body?.method || 'getMasterchainInfo';

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(
          isTonCenter
            ? mockTonCenterResponses[method] || mockTonCenterResponses.getMasterchainInfo
            : mockDrpcResponses[method] || mockDrpcResponses.getMasterchainInfo
        )
      });
    }

    return Promise.reject(new Error('Unmocked fetch call'));
  });
};

/**
 * Clean up mocks after tests
 */
export const teardownTonProviderMocks = () => {
  jest.restoreAllMocks();
};