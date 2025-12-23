# Quickstart: TON Chain + DeDust Integration

This quickstart guide walks through setting up and testing the TON chain and DeDust connector integration with Hummingbot Gateway v2.8.0.

## Prerequisites

- Node.js 20+ with pnpm installed
- Gateway development environment configured
- TON Center API key (optional, has free tier)
- DRPC API key (optional, for fallback)

## Installation

1. **Install TON and DeDust dependencies**:
```bash
cd gateway
pnpm add @ton/core @ton/ton @ton/crypto @dedust/sdk
```

2. **Configure environment variables**:
```bash
# Optional: Set API keys for better rate limits
export TONCENTER_API_KEY="your_toncenter_api_key"
export DRPC_API_KEY="your_drpc_api_key"
export GATEWAY_PASSPHRASE="your_secure_passphrase"
```

3. **Initialize configuration**:
```bash
pnpm run setup
# Select: chains (ton), connectors (dedust), tokens, pools
```

## Configuration

### TON Chain Configuration

**File**: `conf/chains/ton.yml`
```yaml
defaultNetwork: mainnet
defaultWallet: '<your-ton-wallet-address>'
```

**File**: `conf/chains/ton/mainnet.yml`
```yaml
nodeURL: https://toncenter.com/api/v2
nativeCurrencySymbol: TON
defaultComputeUnits: 200000
confirmRetryInterval: 0.5
confirmRetryCount: 10
basePriorityFeePct: 90
minPriorityFeePerCU: 0.1
```

### DeDust Connector Configuration

**File**: `conf/connectors/dedust.yml`
```yaml
slippagePct: 0.5
ttlSec: 20
maxHops: 3
priorityLevel: medium
maxComputeUnits: 500000
network: mainnet
```

### Token Configuration

**File**: `conf/tokens/ton/mainnet.json`
```json
[
  {
    "chainId": 101,
    "symbol": "TON",
    "name": "Toncoin",
    "address": "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c",
    "decimals": 9
  },
  {
    "chainId": 101,
    "symbol": "USDT",
    "name": "Tether USD",
    "address": "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    "decimals": 6
  }
]
```

## Quick Start Testing

### 1. Start Gateway

```bash
# Development mode (HTTP)
pnpm start --passphrase=$GATEWAY_PASSPHRASE --dev

# Production mode (HTTPS) - requires certificates
pnpm start --passphrase=$GATEWAY_PASSPHRASE
```

Expected output:
```
⚡️ Gateway version 2.8.0 starting at http://localhost:15888
🔴 Running in development mode with (unsafe!) HTTP endpoints
📓 Documentation available at http://localhost:15888/docs
```

### 2. Test TON Chain Operations

**Check Chain Status**:
```bash
curl http://localhost:15888/chains/ton/status
```

Expected response:
```json
{
  "chain": "ton",
  "network": "mainnet",
  "rpcUrl": "https://toncenter.com/api/v2",
  "currentBlockNumber": 12345678,
  "nativeCurrency": "TON"
}
```

**Get Token Information**:
```bash
curl "http://localhost:15888/chains/ton/tokens?tokenSymbols=TON,USDT"
```

**Check Wallet Balance**:
```bash
curl -X POST http://localhost:15888/chains/ton/balances \
  -H "Content-Type: application/json" \
  -d '{
    "network": "mainnet",
    "address": "EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N",
    "tokens": ["TON", "USDT"]
  }'
```

### 3. Test DeDust Router Operations

**Get Swap Quote**:
```bash
curl -X POST http://localhost:15888/connectors/dedust/router/quote-swap \
  -H "Content-Type: application/json" \
  -d '{
    "network": "mainnet",
    "baseToken": "TON",
    "quoteToken": "USDT",
    "amount": "1.0",
    "side": "SELL",
    "slippage": 0.5
  }'
```

Expected response:
```json
{
  "route": [
    {
      "pool": "EQD...",
      "tokenIn": "EQAAAA...",
      "tokenOut": "EQCxE6...",
      "amountIn": "1000000000",
      "amountOut": "5234567890",
      "poolType": "volatile",
      "fee": 0.3
    }
  ],
  "amountIn": "1000000000",
  "amountOut": "5234567890",
  "amountOutMin": "5207453333",
  "priceImpact": 0.15,
  "gasEstimate": "50000000",
  "ttl": 1640995200,
  "slippage": 0.5,
  "quoteId": "quote_abc123"
}
```

### 4. Test DeDust AMM Operations

**Get Pool Information**:
```bash
curl "http://localhost:15888/connectors/dedust/amm/pool-info?baseToken=TON&quoteToken=USDT"
```

**Quote Liquidity Addition**:
```bash
curl -X POST http://localhost:15888/connectors/dedust/amm/quote-liquidity \
  -H "Content-Type: application/json" \
  -d '{
    "network": "mainnet",
    "baseToken": "TON",
    "quoteToken": "USDT",
    "amount": "10.0",
    "amountType": "base"
  }'
```

**Check Position Info**:
```bash
curl "http://localhost:15888/connectors/dedust/amm/position-info?address=EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N&baseToken=TON&quoteToken=USDT"
```

## Running Tests

### Unit Tests (TON/DeDust only)
```bash
# Run TON chain tests
GATEWAY_TEST_MODE=dev jest --runInBand test/chains/ton.test.ts

# Run DeDust connector tests
GATEWAY_TEST_MODE=dev jest --runInBand test/connectors/dedust/

# Run all TON/DeDust tests with coverage
GATEWAY_TEST_MODE=dev jest --runInBand --coverage test/chains/ton test/connectors/dedust
```

### Integration Tests
```bash
# Test with mock backends
GATEWAY_TEST_MODE=dev jest --runInBand test/integration/ton-dedust.test.ts
```

### Contract Tests (API Schema Validation)
```bash
# Validate all API contracts
GATEWAY_TEST_MODE=dev jest --runInBand test/contract/ton-chain-api.test.ts
GATEWAY_TEST_MODE=dev jest --runInBand test/contract/dedust-router-api.test.ts
GATEWAY_TEST_MODE=dev jest --runInBand test/contract/dedust-amm-api.test.ts
```

## CLI Harness Testing

Test CLI tools for automation and CI/CD:

```bash
# TON chain CLI tests
echo '{"network": "mainnet"}' | node scripts/cli/ton/status.js
echo '{"address": "EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N"}' | node scripts/cli/ton/balances.js

# DeDust CLI tests
echo '{"baseToken": "TON", "quoteToken": "USDT", "amount": "1.0", "side": "SELL"}' | node scripts/cli/dedust/quote-swap.js
echo '{"baseToken": "TON", "quoteToken": "USDT"}' | node scripts/cli/dedust/pool-info.js
```

## Swagger Documentation

Access interactive API documentation at:
- **Development**: http://localhost:15888/docs
- **Production**: https://localhost:15888/docs

The documentation includes:
- Complete API endpoint reference
- Request/response schemas
- Interactive testing interface
- Authentication requirements

## Performance Validation

### Latency Benchmarks
```bash
# Test quote performance (target: p95 ≤ 800ms)
for i in {1..100}; do
  time curl -X POST http://localhost:15888/connectors/dedust/router/quote-swap \
    -H "Content-Type: application/json" \
    -d '{"baseToken": "TON", "quoteToken": "USDT", "amount": "1.0", "side": "SELL"}'
done

# Test pool info performance (target: p95 ≤ 500ms)
for i in {1..100}; do
  time curl "http://localhost:15888/connectors/dedust/amm/pool-info?baseToken=TON&quoteToken=USDT"
done
```

### Rate Limiting Test
```bash
# Test global rate limit (100 req/min)
for i in {1..101}; do
  curl -w "%{http_code}\n" http://localhost:15888/chains/ton/status
done
# Expect: 100 responses with 200, 1 response with 429
```

## Monitoring and Observability

### Log Analysis
```bash
# Check structured logs
tail -f logs/gateway.log | grep -E "(ton|dedust)" | jq .

# Monitor performance metrics
tail -f logs/gateway.log | grep -E "latencyMs" | jq '.latencyMs'
```

### Health Checks
```bash
# Chain connectivity
curl http://localhost:15888/chains/ton/status | jq '.currentBlockNumber'

# Provider fallback testing
# Temporarily block TON Center to test DRPC fallback
# (Implementation specific - modify provider configuration)
```

## Troubleshooting

### Common Issues

**1. TON Center API Rate Limiting**
```
Error: 429 Too Many Requests
Solution: Add TONCENTER_API_KEY or reduce request frequency
```

**2. Invalid Address Format**
```
Error: 400 Invalid address format
Solution: Use user-friendly bounceable address format
```

**3. Pool Not Found**
```
Error: 404 Pool not found
Solution: Check token symbols and pool existence on DeDust
```

**4. Insufficient Gas**
```
Error: 422 Insufficient gas for transaction
Solution: Increase gas limit or check wallet TON balance
```

### Debug Mode
```bash
# Enable verbose logging
DEBUG=gateway:* pnpm start --passphrase=$GATEWAY_PASSPHRASE --dev

# Test specific components
DEBUG=gateway:ton:* pnpm start --passphrase=$GATEWAY_PASSPHRASE --dev
DEBUG=gateway:dedust:* pnpm start --passphrase=$GATEWAY_PASSPHRASE --dev
```

## Next Steps

1. **Connect to Hummingbot**: Configure Hummingbot client to use Gateway with TON/DeDust
2. **Strategy Development**: Create trading strategies using Gateway TON/DeDust endpoints
3. **Production Deployment**: Configure HTTPS, certificates, and production environment
4. **Monitoring Setup**: Implement comprehensive monitoring and alerting
5. **Performance Tuning**: Optimize cache TTL and rate limiting based on usage patterns

## Support

- **Documentation**: Check `/docs` endpoint for complete API reference
- **Logs**: Monitor Gateway logs for error details and performance metrics
- **Configuration**: Validate YAML/JSON configuration files against schemas
- **Testing**: Run comprehensive test suite before production deployment

This quickstart provides the foundation for integrating TON blockchain and DeDust DEX with Hummingbot Gateway while maintaining v2.8.0 compatibility and constitutional compliance.