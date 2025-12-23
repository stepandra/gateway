# Research: TON Chain + DeDust Integration

## TON Center API Integration

### Decision: Dual Provider Strategy (TON Center + DRPC)
**Rationale**:
- TON Center provides comprehensive v2/v3 APIs with advanced features
- DRPC offers v2-compatible fallback for reliability
- Redundancy ensures high availability for Gateway operations

**Implementation Pattern**:
```typescript
// Provider hierarchy with automatic fallback
const providers = [
  { url: 'https://toncenter.com/api/v2', auth: 'X-API-Key' },
  { url: 'https://ton.drpc.org/rest', auth: 'Drpc-Key' }
];
```

**Alternatives Considered**:
- TON Center only: Single point of failure
- DRPC only: Limited to v2 features, missing v3 capabilities

### Decision: TON Center v2 for Core Operations
**Rationale**:
- v2 provides all required Gateway operations (balances, tokens, status, poll, estimate-gas)
- Better compatibility with DRPC fallback
- v3 reserved for future advanced features

**Core Endpoints Mapping**:
- `/chains/ton/balances` → `getAddressBalance` + `getAddressInformation`
- `/chains/ton/tokens` → Token metadata from configuration + `getTokenData`
- `/chains/ton/status` → `getMasterchainInfo`
- `/chains/ton/poll` → Transaction polling via `getTransactions`
- `/chains/ton/estimate-gas` → `estimateFee`

## TON Address Format Handling

### Decision: User-Friendly Bounceable as Standard
**Rationale**:
- User-friendly format preferred by most TON wallets and applications
- Bounceable addresses provide better error handling for failed transactions
- Consistent with TON ecosystem conventions

**Conversion Strategy**:
```typescript
// Normalize all addresses to user-friendly bounceable
const normalizeAddress = (address: string): string => {
  const addr = Address.parse(address);
  return addr.toString({ bounceable: true, testOnly: false });
};
```

**Alternatives Considered**:
- Raw format: Less user-friendly, harder debugging
- Non-bounceable: Risk of lost tokens on failed transactions

## DeDust SDK Integration

### Decision: Direct @dedust/sdk Usage
**Rationale**:
- Official SDK provides type safety and maintained API compatibility
- Handles complex routing and pool discovery automatically
- Reduces implementation complexity for multi-hop swaps

**Router v2 Pattern**:
```typescript
import { Factory, MAINNET_FACTORY_ADDR } from '@dedust/sdk';
import { TonClient4 } from "@ton/ton";

const factory = tonClient.open(Factory.createFromAddress(MAINNET_FACTORY_ADDR));
const pools = await factory.getPoolsByJettonMinters(baseToken, quoteToken);
```

**AMM Operations Pattern**:
```typescript
// Pool information retrieval
const pool = tonClient.open(Pool.createFromAddress(poolAddress));
const reserves = await pool.getReserves();
const totalSupply = await pool.getTotalSupply();
```

## Error Handling Strategy

### Decision: Circuit Breaker with Exponential Backoff
**Rationale**:
- TON network can experience temporary congestion
- Multiple provider fallback requires intelligent retry logic
- Circuit breaker prevents cascade failures

**Implementation Pattern**:
```typescript
class TONProviderManager {
  private circuitBreaker = new CircuitBreaker({
    timeout: 5000,
    errorThreshold: 5,
    resetTimeout: 30000
  });

  async callWithFallback(method: string, params: any) {
    for (const provider of this.providers) {
      try {
        return await this.circuitBreaker.fire(() =>
          this.makeRequest(provider, method, params)
        );
      } catch (error) {
        // Log and try next provider
        this.logger.warn('Provider failed, trying fallback', { provider, error });
      }
    }
    throw new Error('All providers failed');
  }
}
```

## Caching Strategy

### Decision: Multi-Layer Caching with TTL
**Rationale**:
- TON blockchain data has different volatility levels
- Reduces API calls and improves performance
- Balances cost vs. data freshness

**Cache TTL Strategy**:
- Token metadata: 1 hour (rarely changes)
- Pool reserves: 15-30 seconds (moderate volatility)
- Gas estimates: 10 seconds (network dependent)
- Quotes: 2-5 seconds (high volatility)

**Implementation**:
```typescript
const cacheConfig = {
  tokens: { ttl: 3600000 },      // 1 hour
  pools: { ttl: 15000 },         // 15 seconds
  gas: { ttl: 10000 },           // 10 seconds
  quotes: { ttl: 2000 }          // 2 seconds
};
```

## Testing Strategy

### Decision: Comprehensive Mock Strategy
**Rationale**:
- External API dependencies must be mocked for CI/CD
- Real contract formats preserved for accuracy
- Enables deterministic testing

**Mock Implementation Pattern**:
```typescript
// Mock TON Center responses
const mockTONCenterAPI = {
  getAddressBalance: jest.fn().mockResolvedValue({
    ok: true,
    result: '1000000000' // 1 TON in nanotons
  }),
  getAddressInformation: jest.fn().mockResolvedValue({
    ok: true,
    result: { balance: '1000000000', state: 'active' }
  })
};

// Mock DeDust SDK
jest.mock('@dedust/sdk', () => ({
  Factory: {
    createFromAddress: jest.fn().mockReturnValue({
      getPoolsByJettonMinters: jest.fn().mockResolvedValue([mockPool])
    })
  }
}));
```

## Configuration Architecture

### Decision: Hierarchical YAML + JSON Configuration
**Rationale**:
- Follows existing Gateway patterns
- Separates concerns (chains vs connectors vs tokens/pools)
- Environment-specific overrides supported

**Structure**:
```
conf/
├── chains/ton.yml                    # Default network and wallet
├── chains/ton/mainnet.yml           # Mainnet RPC config
├── chains/ton/testnet.yml           # Testnet RPC config
├── connectors/dedust.yml            # DeDust connector config
├── tokens/ton/mainnet.json          # Jetton definitions
├── tokens/ton/testnet.json          # Test Jetton definitions
└── pools/dedust.json                # Pool configurations
```

## Performance Optimization

### Decision: Batch Operations and Connection Pooling
**Rationale**:
- TON Center supports bulk operations for better efficiency
- Connection reuse reduces latency overhead
- Rate limiting compliance through request batching

**Batch Operations**:
```typescript
// Use v3 bulk endpoints when available
const accountStates = await tonCenterV3.accountStates({
  addresses: [addr1, addr2, addr3],
  include_boc: false
});
```

**Connection Pooling**:
```typescript
const httpAgent = new Agent({
  keepAlive: true,
  maxSockets: 10,
  timeout: 5000
});
```

## Security Considerations

### Decision: Defense in Depth
**Rationale**:
- Wallet operations require maximum security
- Input validation prevents injection attacks
- Secrets management follows best practices

**Security Measures**:
1. TypeBox schema validation for all inputs
2. Address format validation before blockchain calls
3. Amount bounds checking (positive, within limits)
4. Timeout enforcement on all external calls
5. Rate limiting per client/IP
6. Wallet encryption with user passphrase
7. No sensitive data in logs or error messages

## Gateway Schema Compatibility

### Decision: Strict v2.8.0 Schema Adherence
**Rationale**:
- Ensures Hummingbot client compatibility
- Prevents breaking changes for existing strategies
- Allows incremental feature rollout

**Schema Mapping**:
- Chain operations: Standard Gateway chain schema with TON-specific adaptations
- Router operations: Standard router schema with DeDust routing data
- AMM operations: Standard AMM schema with DeDust pool specifics
- Error responses: Standard httpErrors with TON-specific error codes

**TON-Specific Adaptations**:
```typescript
// Chain status response
{
  chain: 'ton',
  network: 'mainnet',
  rpcUrl: 'https://toncenter.com/api/v2',
  currentBlockNumber: 12345678,
  nativeCurrency: 'TON'
}

// Balance response (nanoTON converted to TON)
{
  balances: {
    'TON': 1.5,
    'USDT': 100.0
  }
}
```

## Implementation Priorities

### Phase 1: TON Chain Integration
1. TON provider management (TON Center + DRPC)
2. Address format handling and validation
3. Core chain operations (status, balances, tokens)
4. Transaction polling and gas estimation
5. Configuration system integration

### Phase 2: DeDust Router v2
1. Quote generation with routing
2. Swap execution with slippage protection
3. Multi-hop route optimization
4. Quote caching and TTL management

### Phase 3: DeDust AMM
1. Pool information queries
2. Liquidity provision operations
3. Position tracking and management
4. Fee collection mechanisms

### Phase 4: Testing and Documentation
1. Comprehensive test suite (unit, integration, contract)
2. CLI harness implementation
3. Performance benchmarking
4. Documentation updates

## Risk Mitigation

### High Priority Risks
1. **TON Network Congestion**: Circuit breaker + provider fallback
2. **DeDust SDK Breaking Changes**: Version pinning + update testing
3. **Rate Limiting**: Request batching + exponential backoff
4. **Address Format Confusion**: Strict normalization + validation
5. **Gas Estimation Accuracy**: Conservative estimates + user override

### Medium Priority Risks
1. **Cache Invalidation**: TTL tuning + manual refresh endpoints
2. **Configuration Complexity**: Validation schemas + defaults
3. **Error Message Clarity**: Structured error codes + user guidance

This research provides the foundation for implementing TON chain and DeDust connectors while maintaining Gateway v2.8.0 compatibility and constitutional compliance.