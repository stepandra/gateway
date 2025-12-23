# TON Chain & DeDust Connectors Implementation Plan

## Overview

This document provides a comprehensive, step-by-step implementation plan for adding TON blockchain support and DeDust AMM/Router v2 connectors to Hummingbot Gateway. The plan is divided into clear tasks and subtasks that developers can follow without additional implementation questions.

## Prerequisites

- Gateway development environment set up
- Node.js 20+ with pnpm package manager
- TON Center API access and DRPC API keys
- Understanding of TypeScript and Gateway architecture
- DeDust SDK knowledge from documentation

## Required Dependencies

```bash
# Core TON dependencies
pnpm install @ton/core @ton/ton @ton/crypto

# DeDust SDK
pnpm install @dedust/sdk

# Additional TON utilities (if needed)
pnpm install @ton/crypto @ton/client
```

---

## PHASE 1: TON Chain Implementation

### Task 1.1: Create TON Chain Base Structure

#### Subtask 1.1.1: Create main TON chain class
**File**: `src/chains/ton/ton.ts`

```typescript
import { TonClient, TonClient4 } from '@ton/ton';
import { Address, Cell } from '@ton/core';

export class Ton {
  private static instances: Record<string, Ton> = {};
  private client: TonClient4;
  private network: string;

  private constructor(network: string) {
    this.network = network;
    this.initializeClient();
  }

  public static getInstance(network: string): Ton {
    if (!Ton.instances[network]) {
      Ton.instances[network] = new Ton(network);
    }
    return Ton.instances[network];
  }

  private initializeClient(): void {
    // Initialize TON client with network-specific endpoint
    const config = this.getNetworkConfig();
    this.client = new TonClient4({
      endpoint: config.nodeURL
    });
  }

  // Core methods to implement:
  async getStatus(): Promise<NetworkStatus> { }
  async getBalance(address: string): Promise<string> { }
  async getTokens(symbols?: string[]): Promise<Token[]> { }
  async poll(signature: string): Promise<TransactionStatus> { }
  async estimateGas(): Promise<GasEstimate> { }
}
```

#### Subtask 1.1.2: Implement wallet management
**Methods to add to TON class**:
- `getWallet(address: string): Promise<Wallet>`
- `validateAddress(address: string): boolean`
- `formatAddress(address: string, format: 'raw' | 'friendly'): string`

#### Subtask 1.1.3: Implement balance checking
**Methods to add**:
- `getNativeBalance(address: string): Promise<string>`
- `getJettonBalance(walletAddress: string, jettonAddress: string): Promise<string>`
- `getAllBalances(address: string, tokenList?: string[]): Promise<Record<string, string>>`

### Task 1.2: Create TON Chain Routes

#### Subtask 1.2.1: Create status route
**File**: `src/chains/ton/routes/status.route.ts`

```typescript
import { Router, Request, Response } from 'express';
import { Ton } from '../ton';

export const statusRoutes = Router();

statusRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const { network } = req.query;
    const ton = Ton.getInstance(network as string || 'mainnet');
    const status = await ton.getStatus();

    res.status(200).json({
      chain: 'ton',
      network: network || 'mainnet',
      rpcUrl: status.rpcUrl,
      currentBlockNumber: status.currentBlockNumber,
      nativeCurrency: 'TON'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### Subtask 1.2.2: Create tokens route
**File**: `src/chains/ton/routes/tokens.route.ts`

```typescript
// Implement GET /chains/ton/tokens
// - Fetch jetton metadata from token lists
// - Support querying by symbol or address
// - Return standardized token format
```

#### Subtask 1.2.3: Create balances route
**File**: `src/chains/ton/routes/balances.route.ts`

```typescript
// Implement POST /chains/ton/balances
// - Get TON and jetton balances
// - Support multiple token queries
// - Handle address validation
```

#### Subtask 1.2.4: Create poll route
**File**: `src/chains/ton/routes/poll.route.ts`

```typescript
// Implement POST /chains/ton/poll
// - Poll transaction status by hash
// - Return standardized transaction status
// - Include fee information and block details
```

#### Subtask 1.2.5: Create estimate-gas route
**File**: `src/chains/ton/routes/estimate-gas.route.ts`

```typescript
// Implement POST /chains/ton/estimate-gas
// - Estimate TON transaction fees
// - Return fee breakdown and estimates
```

### Task 1.3: TON Configuration Setup

#### Subtask 1.3.1: Create chain schema
**File**: `src/templates/namespace/ton-schema.json`

```json
{
  "type": "object",
  "properties": {
    "defaultNetwork": {
      "type": "string",
      "description": "Default TON network",
      "default": "mainnet"
    },
    "defaultWallet": {
      "type": "string",
      "description": "Default wallet address"
    }
  },
  "required": ["defaultNetwork"]
}
```

#### Subtask 1.3.2: Create network schema
**File**: `src/templates/namespace/ton-network-schema.json`

```json
{
  "type": "object",
  "properties": {
    "nodeURL": {
      "type": "string",
      "description": "TON node RPC endpoint"
    },
    "nativeCurrencySymbol": {
      "type": "string",
      "description": "Native currency symbol",
      "default": "TON"
    },
    "confirmRetryInterval": {
      "type": "number",
      "description": "Transaction confirmation polling interval in seconds",
      "default": 1.0
    },
    "confirmRetryCount": {
      "type": "integer",
      "description": "Number of confirmation retry attempts",
      "default": 15
    }
  },
  "required": ["nodeURL", "nativeCurrencySymbol"]
}
```

#### Subtask 1.3.3: Create default chain configuration
**File**: `src/templates/chains/ton.yml`

```yaml
defaultNetwork: mainnet
defaultWallet: ''
```

#### Subtask 1.3.4: Create network configurations
**File**: `src/templates/chains/ton/mainnet.yml`

```yaml
nodeURL: 'https://toncenter.com/api/v2'
nativeCurrencySymbol: TON
confirmRetryInterval: 1.0
confirmRetryCount: 15
tonCenterApiKey: ''
drpcApiKey: ''
```

**File**: `src/templates/chains/ton/testnet.yml`

```yaml
nodeURL: 'https://testnet.toncenter.com/api/v2'
nativeCurrencySymbol: TON
confirmRetryInterval: 1.0
confirmRetryCount: 15
tonCenterApiKey: ''
drpcApiKey: ''
```

### Task 1.4: TON Token Lists

#### Subtask 1.4.1: Create mainnet token list
**File**: `src/templates/tokens/ton/mainnet.json`

```json
[
  {
    "symbol": "TON",
    "name": "Toncoin",
    "address": "native",
    "decimals": 9
  },
  {
    "symbol": "USDT",
    "name": "Tether USD",
    "address": "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    "decimals": 6
  },
  {
    "symbol": "USDC",
    "name": "USD Coin",
    "address": "EQB-MPwrd1G6WKNkLz_VnV6WqBDd142KMQv-g1O-8QUA3728",
    "decimals": 6
  }
]
```

#### Subtask 1.4.2: Create testnet token list
**File**: `src/templates/tokens/ton/testnet.json`

```json
[
  {
    "symbol": "TON",
    "name": "Toncoin",
    "address": "native",
    "decimals": 9
  }
]
```

### Task 1.5: Register TON Chain

#### Subtask 1.5.1: Add to chain routes
**File**: `src/chains/chain.routes.ts`

```typescript
// Add TON import and routing
import { tonRoutes } from './ton/ton.routes';

// Add route registration
router.use('/ton', tonRoutes);
```

#### Subtask 1.5.2: Update configuration management
**File**: `src/services/config-manager-v2.ts`

```typescript
// Add TON configuration loading
// Register ton-schema.json and ton-network-schema.json
```

---

## PHASE 2: DeDust AMM Connector Implementation

### Task 2.1: Create DeDust Connector Base

#### Subtask 2.1.1: Create main DeDust connector class
**File**: `src/connectors/dedust/dedust.ts`

```typescript
import { Factory, MAINNET_FACTORY_ADDR, Asset, PoolType, VaultNative } from '@dedust/sdk';
import { Address, TonClient4 } from '@ton/ton';
import { Ton } from '../../chains/ton/ton';

export class DeDust {
  private static instances: Record<string, DeDust> = {};
  private factory: Factory;
  private tonClient: TonClient4;
  private chain: string;
  private network: string;

  private constructor(chain: string, network: string) {
    this.chain = chain;
    this.network = network;
    this.initializeSDK();
  }

  public static getInstance(chain: string, network: string): DeDust {
    const key = `${chain}:${network}`;
    if (!DeDust.instances[key]) {
      DeDust.instances[key] = new DeDust(chain, network);
    }
    return DeDust.instances[key];
  }

  private initializeSDK(): void {
    const tonChain = Ton.getInstance(this.network);
    this.tonClient = tonChain.getClient();

    const factoryAddr = this.network === 'mainnet'
      ? MAINNET_FACTORY_ADDR
      : 'testnet-factory-address';

    this.factory = this.tonClient.open(
      Factory.createFromAddress(Address.parse(factoryAddr))
    );
  }

  // Core AMM methods to implement:
  async getPoolInfo(baseToken: Token, quoteToken: Token): Promise<PoolInfo> { }
  async addLiquidity(params: AddLiquidityParams): Promise<Transaction> { }
  async removeLiquidity(params: RemoveLiquidityParams): Promise<Transaction> { }
  async getPositionInfo(params: PositionParams): Promise<Position> { }
  async quoteLiquidity(params: QuoteLiquidityParams): Promise<LiquidityQuote> { }
}
```

#### Subtask 2.1.2: Implement pool operations
**Methods to add**:
- `findPool(asset0: Asset, asset1: Asset): Promise<Pool>`
- `getPoolReserves(poolAddress: Address): Promise<[string, string]>`
- `calculatePoolShare(liquidity: string, totalLiquidity: string): number`

#### Subtask 2.1.3: Implement liquidity calculations
**Methods to add**:
- `calculateTokenAmounts(pool: Pool, liquidity: string): Promise<[string, string]>`
- `calculateOptimalAmounts(pool: Pool, baseAmount: string): Promise<LiquidityQuote>`
- `validateLiquidityParams(params: AddLiquidityParams): void`

### Task 2.2: Create DeDust AMM Routes

#### Subtask 2.2.1: Create pool-info route
**File**: `src/connectors/dedust/amm-routes/pool-info.route.ts`

```typescript
import { Router, Request, Response } from 'express';
import { DeDust } from '../dedust';

export const poolInfoRoutes = Router();

poolInfoRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const { chain, network, connector, base, quote } = req.body;
    const dedust = DeDust.getInstance(chain, network);
    const poolInfo = await dedust.getPoolInfo(base, quote);

    res.status(200).json({
      network,
      timestamp: Date.now(),
      base,
      quote,
      reserves: poolInfo.reserves,
      fee: poolInfo.fee,
      poolShare: poolInfo.poolShare,
      poolAddress: poolInfo.poolAddress
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### Subtask 2.2.2: Create add-liquidity route
**File**: `src/connectors/dedust/amm-routes/add-liquidity.route.ts`

```typescript
// Implement POST /connectors/dedust/amm/add-liquidity
// - Validate liquidity parameters
// - Calculate optimal token amounts
// - Execute add liquidity transaction
// - Return transaction hash and LP tokens received
```

#### Subtask 2.2.3: Create remove-liquidity route
**File**: `src/connectors/dedust/amm-routes/remove-liquidity.route.ts`

```typescript
// Implement POST /connectors/dedust/amm/remove-liquidity
// - Validate removal parameters
// - Calculate token amounts to receive
// - Execute remove liquidity transaction
// - Return transaction hash and tokens received
```

#### Subtask 2.2.4: Create position-info route
**File**: `src/connectors/dedust/amm-routes/position-info.route.ts`

```typescript
// Implement POST /connectors/dedust/amm/position-info
// - Get user's liquidity position
// - Calculate current value and share
// - Return position details and metrics
```

#### Subtask 2.2.5: Create quote-liquidity route
**File**: `src/connectors/dedust/amm-routes/quote-liquidity.route.ts`

```typescript
// Implement POST /connectors/dedust/amm/quote-liquidity
// - Calculate optimal token ratios
// - Estimate LP tokens to receive
// - Calculate price impact and slippage
// - Return liquidity quote without execution
```

---

## PHASE 3: DeDust Router v2 Connector Implementation

### Task 3.1: Create DeDust Router Class

#### Subtask 3.1.1: Extend DeDust connector for router operations
**Add to**: `src/connectors/dedust/dedust.ts`

```typescript
// Router-specific methods to add:
async getSwapQuote(params: SwapQuoteParams): Promise<SwapQuote> { }
async executeSwap(params: SwapParams): Promise<Transaction> { }
async findOptimalRoute(fromAsset: Asset, toAsset: Asset, amount: string): Promise<Route[]> { }
async estimateSwapGas(params: SwapParams): Promise<GasEstimate> { }
```

#### Subtask 3.1.2: Implement multi-hop routing
**Methods to add**:
- `calculateMultiHopRoute(path: Asset[], amount: string): Promise<RouteQuote>`
- `findIntermediateTokens(from: Asset, to: Asset): Promise<Asset[]>`
- `optimizeRouting(routes: Route[]): Route`

#### Subtask 3.1.3: Implement swap calculations
**Methods to add**:
- `calculateSwapOutput(pool: Pool, inputAmount: string): Promise<string>`
- `calculatePriceImpact(inputAmount: string, outputAmount: string, pool: Pool): number`
- `validateSwapParams(params: SwapParams): void`

### Task 3.2: Create DeDust Router Routes

#### Subtask 3.2.1: Create quote-swap route
**File**: `src/connectors/dedust/router-routes/quote-swap.route.ts`

```typescript
import { Router, Request, Response } from 'express';
import { DeDust } from '../dedust';

export const quoteSwapRoutes = Router();

quoteSwapRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const { chain, network, base, quote, amount, side } = req.body;
    const dedust = DeDust.getInstance(chain, network);
    const quote = await dedust.getSwapQuote({
      base, quote, amount, side
    });

    res.status(200).json({
      network,
      timestamp: Date.now(),
      base,
      quote,
      amount,
      expectedOut: quote.expectedOut,
      price: quote.price,
      priceImpact: quote.priceImpact,
      route: quote.route,
      gasEstimate: quote.gasEstimate
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### Subtask 3.2.2: Create execute-swap route
**File**: `src/connectors/dedust/router-routes/execute-swap.route.ts`

```typescript
// Implement POST /connectors/dedust/router/execute-swap
// - Validate swap parameters
// - Execute swap transaction with slippage protection
// - Return transaction hash and execution details
```

#### Subtask 3.2.3: Create execute-quote route
**File**: `src/connectors/dedust/router-routes/execute-quote.route.ts`

```typescript
// Implement POST /connectors/dedust/router/execute-quote
// - Execute pre-fetched quote
// - Handle quote expiration
// - Return transaction results
```

### Task 3.3: DeDust Configuration

#### Subtask 3.3.1: Create DeDust connector schema
**File**: `src/templates/namespace/dedust-schema.json`

```json
{
  "type": "object",
  "properties": {
    "allowedSlippage": {
      "type": "number",
      "description": "Maximum slippage percentage for trades",
      "default": 1.0
    },
    "gasLimitEstimate": {
      "type": "number",
      "description": "Estimated gas limit for transactions",
      "default": 50000000
    },
    "ttl": {
      "type": "number",
      "description": "Quote time-to-live in seconds",
      "default": 30
    },
    "routingConfig": {
      "type": "object",
      "properties": {
        "maxHops": {
          "type": "integer",
          "description": "Maximum number of hops in routing",
          "default": 3
        },
        "preferDirectRoutes": {
          "type": "boolean",
          "description": "Prefer direct routes over multi-hop",
          "default": false
        }
      }
    },
    "contractAddresses": {
      "type": "object",
      "patternProperties": {
        "^[a-z]+$": {
          "type": "object",
          "properties": {
            "factoryAddress": { "type": "string" },
            "routerAddress": { "type": "string" }
          }
        }
      }
    }
  },
  "required": ["allowedSlippage", "gasLimitEstimate", "ttl"]
}
```

#### Subtask 3.3.2: Create default DeDust configuration
**File**: `src/templates/connectors/dedust.yml`

```yaml
allowedSlippage: 1.0
gasLimitEstimate: 50000000
ttl: 30

routingConfig:
  maxHops: 3
  preferDirectRoutes: false

contractAddresses:
  mainnet:
    factoryAddress: 'EQBfBWT7X2BHg9tXAxzhz2aKiNTU1tpt5NsiK0uSDW_YAJ67'
    routerAddress: 'EQBfBWT7X2BHg9tXAxzhz2aKiNTU1tpt5NsiK0uSDW_YAJ67'
  testnet:
    factoryAddress: 'testnet-factory-address'
    routerAddress: 'testnet-router-address'
```

### Task 3.4: DeDust Pool Configuration

#### Subtask 3.4.1: Create DeDust pool definitions
**File**: `src/templates/pools/dedust.json`

```json
[
  {
    "type": "amm",
    "network": "mainnet",
    "baseSymbol": "USDT",
    "quoteSymbol": "TON",
    "address": "pool-address-here",
    "fee": 0.003
  },
  {
    "type": "amm",
    "network": "mainnet",
    "baseSymbol": "USDC",
    "quoteSymbol": "TON",
    "address": "pool-address-here",
    "fee": 0.003
  }
]
```

---

## PHASE 4: Integration and Registration

### Task 4.1: Register DeDust Connectors

#### Subtask 4.1.1: Create main DeDust routes file
**File**: `src/connectors/dedust/dedust.routes.ts`

```typescript
import { Router } from 'express';
import { ammRoutes } from './amm-routes/amm.routes';
import { routerRoutes } from './router-routes/router.routes';

export const dedustRoutes = Router();

dedustRoutes.use('/amm', ammRoutes);
dedustRoutes.use('/router', routerRoutes);
```

#### Subtask 4.1.2: Create AMM routes aggregator
**File**: `src/connectors/dedust/amm-routes/amm.routes.ts`

```typescript
import { Router } from 'express';
import { poolInfoRoutes } from './pool-info.route';
import { addLiquidityRoutes } from './add-liquidity.route';
import { removeLiquidityRoutes } from './remove-liquidity.route';
import { positionInfoRoutes } from './position-info.route';
import { quoteLiquidityRoutes } from './quote-liquidity.route';

export const ammRoutes = Router();

ammRoutes.use('/pool-info', poolInfoRoutes);
ammRoutes.use('/add-liquidity', addLiquidityRoutes);
ammRoutes.use('/remove-liquidity', removeLiquidityRoutes);
ammRoutes.use('/position-info', positionInfoRoutes);
ammRoutes.use('/quote-liquidity', quoteLiquidityRoutes);
```

#### Subtask 4.1.3: Create Router routes aggregator
**File**: `src/connectors/dedust/router-routes/router.routes.ts`

```typescript
import { Router } from 'express';
import { quoteSwapRoutes } from './quote-swap.route';
import { executeSwapRoutes } from './execute-swap.route';
import { executeQuoteRoutes } from './execute-quote.route';

export const routerRoutes = Router();

routerRoutes.use('/quote-swap', quoteSwapRoutes);
routerRoutes.use('/execute-swap', executeSwapRoutes);
routerRoutes.use('/execute-quote', executeQuoteRoutes);
```

#### Subtask 4.1.4: Register in main connector routes
**File**: `src/connectors/connector.routes.ts`

```typescript
import { dedustRoutes } from './dedust/dedust.routes';

// Add DeDust registration
connectorRoutes.use('/dedust', dedustRoutes);
```

### Task 4.2: Update Configuration Management

#### Subtask 4.2.1: Add TON to supported chains
**File**: `src/services/config-manager-v2.ts`

```typescript
// Register TON schemas and configurations
// Add TON to SUPPORTED_CHAINS array
// Register ton-schema.json and ton-network-schema.json
```

#### Subtask 4.2.2: Add DeDust to supported connectors
**File**: `src/services/config-manager-v2.ts`

```typescript
// Register DeDust schema and configuration
// Add DeDust to SUPPORTED_CONNECTORS array
// Register dedust-schema.json
```

#### Subtask 4.2.3: Update root configuration template
**File**: `src/templates/root.yml`

```yaml
# Add TON and DeDust namespace definitions
$namespace ton:
  configurationPath: ton.yml
  schemaPath: ton-schema.json

$namespace dedust:
  configurationPath: dedust.yml
  schemaPath: dedust-schema.json
```

---

## PHASE 5: Testing Implementation

### Task 5.1: TON Chain Tests

#### Subtask 5.1.1: Create TON chain unit tests
**File**: `test/chains/ton.test.ts`

```typescript
import { Ton } from '../../src/chains/ton/ton';

describe('TON Chain', () => {
  let ton: Ton;

  beforeEach(() => {
    ton = Ton.getInstance('mainnet');
  });

  describe('initialization', () => {
    it('should initialize with correct network', () => {
      expect(ton.network).toBe('mainnet');
    });

    it('should be singleton', () => {
      const ton2 = Ton.getInstance('mainnet');
      expect(ton).toBe(ton2);
    });
  });

  describe('getStatus', () => {
    it('should return valid network status', async () => {
      const status = await ton.getStatus();
      expect(status.chain).toBe('ton');
      expect(status.currentBlockNumber).toBeGreaterThan(0);
    });
  });

  describe('getBalance', () => {
    it('should return balance for valid address', async () => {
      const balance = await ton.getBalance('EQDKpMC...');
      expect(balance).toBeDefined();
      expect(typeof balance).toBe('string');
    });

    it('should throw for invalid address', async () => {
      await expect(ton.getBalance('invalid')).rejects.toThrow();
    });
  });
});
```

#### Subtask 5.1.2: Create TON routes integration tests
**File**: `test/chains/ton.routes.test.ts`

```typescript
import request from 'supertest';
import { app } from '../../src/app';

describe('TON Routes', () => {
  describe('GET /chains/ton/status', () => {
    it('should return chain status', async () => {
      const response = await request(app)
        .get('/chains/ton/status')
        .query({ network: 'mainnet' });

      expect(response.status).toBe(200);
      expect(response.body.chain).toBe('ton');
      expect(response.body.network).toBe('mainnet');
    });
  });

  describe('POST /chains/ton/balances', () => {
    it('should return wallet balances', async () => {
      const response = await request(app)
        .post('/chains/ton/balances')
        .send({
          network: 'mainnet',
          address: 'EQDKpMC...',
          tokens: ['TON', 'USDT']
        });

      expect(response.status).toBe(200);
      expect(response.body.balances).toBeDefined();
    });
  });
});
```

#### Subtask 5.1.3: Create TON mock data
**File**: `test/mocks/ton/ton.mock.ts`

```typescript
export const mockTonStatus = {
  chain: 'ton',
  network: 'mainnet',
  rpcUrl: 'https://toncenter.com/api/v2',
  currentBlockNumber: 12345678,
  nativeCurrency: 'TON'
};

export const mockTonBalance = {
  TON: '1000000000', // 1 TON in nanotons
  USDT: '100000000',  // 100 USDT
  USDC: '50000000'    // 50 USDC
};

export const mockTokens = [
  {
    symbol: 'TON',
    address: 'native',
    decimals: 9,
    name: 'Toncoin'
  },
  {
    symbol: 'USDT',
    address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
    decimals: 6,
    name: 'Tether USD'
  }
];
```

### Task 5.2: DeDust Connector Tests

#### Subtask 5.2.1: Create DeDust unit tests
**File**: `test/connectors/dedust/dedust.test.ts`

```typescript
import { DeDust } from '../../../src/connectors/dedust/dedust';

describe('DeDust Connector', () => {
  let dedust: DeDust;

  beforeEach(() => {
    dedust = DeDust.getInstance('ton', 'mainnet');
  });

  describe('initialization', () => {
    it('should initialize with correct chain and network', () => {
      expect(dedust.chain).toBe('ton');
      expect(dedust.network).toBe('mainnet');
    });
  });

  describe('getPoolInfo', () => {
    it('should return pool information', async () => {
      const poolInfo = await dedust.getPoolInfo(
        mockTokens.USDT,
        mockTokens.TON
      );
      expect(poolInfo.reserves).toBeDefined();
      expect(poolInfo.fee).toBeGreaterThan(0);
    });
  });

  describe('getSwapQuote', () => {
    it('should return valid swap quote', async () => {
      const quote = await dedust.getSwapQuote({
        base: mockTokens.USDT,
        quote: mockTokens.TON,
        amount: '1000000', // 1 USDT
        side: 'SELL'
      });

      expect(quote.expectedOut).toBeDefined();
      expect(quote.priceImpact).toBeLessThan(0.1);
      expect(quote.route).toBeDefined();
    });
  });
});
```

#### Subtask 5.2.2: Create DeDust AMM route tests
**File**: `test/connectors/dedust/amm.routes.test.ts`

```typescript
import request from 'supertest';
import { app } from '../../../src/app';

describe('DeDust AMM Routes', () => {
  describe('POST /connectors/dedust/amm/pool-info', () => {
    it('should return pool information', async () => {
      const response = await request(app)
        .post('/connectors/dedust/amm/pool-info')
        .send({
          chain: 'ton',
          network: 'mainnet',
          connector: 'dedust',
          base: 'USDT',
          quote: 'TON'
        });

      expect(response.status).toBe(200);
      expect(response.body.reserves).toBeDefined();
      expect(response.body.poolAddress).toBeDefined();
    });
  });

  describe('POST /connectors/dedust/amm/add-liquidity', () => {
    it('should execute add liquidity', async () => {
      const response = await request(app)
        .post('/connectors/dedust/amm/add-liquidity')
        .send({
          chain: 'ton',
          network: 'mainnet',
          connector: 'dedust',
          address: 'EQDKpMC...',
          base: 'USDT',
          quote: 'TON',
          baseAmount: '100000000', // 100 USDT
          quoteAmount: '1000000000', // 1 TON
          slippage: 0.01
        });

      expect(response.status).toBe(200);
      expect(response.body.txHash).toBeDefined();
    });
  });
});
```

#### Subtask 5.2.3: Create DeDust Router route tests
**File**: `test/connectors/dedust/router.routes.test.ts`

```typescript
import request from 'supertest';
import { app } from '../../../src/app';

describe('DeDust Router Routes', () => {
  describe('POST /connectors/dedust/router/quote-swap', () => {
    it('should return swap quote', async () => {
      const response = await request(app)
        .post('/connectors/dedust/router/quote-swap')
        .send({
          chain: 'ton',
          network: 'mainnet',
          connector: 'dedust',
          base: 'USDT',
          quote: 'TON',
          amount: '1000000',
          side: 'SELL'
        });

      expect(response.status).toBe(200);
      expect(response.body.expectedOut).toBeDefined();
      expect(response.body.route).toBeDefined();
    });
  });

  describe('POST /connectors/dedust/router/execute-swap', () => {
    it('should execute swap', async () => {
      const response = await request(app)
        .post('/connectors/dedust/router/execute-swap')
        .send({
          chain: 'ton',
          network: 'mainnet',
          connector: 'dedust',
          address: 'EQDKpMC...',
          base: 'USDT',
          quote: 'TON',
          amount: '1000000',
          side: 'SELL',
          slippage: 0.01
        });

      expect(response.status).toBe(200);
      expect(response.body.txHash).toBeDefined();
    });
  });
});
```

#### Subtask 5.2.4: Create DeDust mock data
**File**: `test/mocks/dedust/dedust.mock.ts`

```typescript
export const mockPoolInfo = {
  reserves: ['1000000000000', '500000000000'], // Pool reserves
  fee: 0.003, // 0.3% fee
  poolShare: 0.01, // 1% of pool
  poolAddress: 'EQBfBWT7X2BHg9tXAxzhz2aKiNTU1tpt5NsiK0uSDW_YAJ67'
};

export const mockSwapQuote = {
  expectedOut: '999000000', // Expected output amount
  price: '0.999', // Price per unit
  priceImpact: 0.001, // 0.1% price impact
  route: [{
    pool: 'EQBfBWT7X2BHg9tXAxzhz2aKiNTU1tpt5NsiK0uSDW_YAJ67',
    percentage: 100
  }],
  gasEstimate: '50000000' // Gas estimate in nanotons
};

export const mockTransaction = {
  txHash: '0xabcdef1234567890abcdef1234567890abcdef12',
  gasUsed: '45000000',
  status: 'success',
  blockNumber: 12345678
};
```

### Task 5.3: Test Configuration and Coverage

#### Subtask 5.3.1: Configure Jest for TON/DeDust testing
**File**: `jest.config.js`

```javascript
module.exports = {
  testMatch: [
    '**/test/chains/ton.test.ts',
    '**/test/chains/ton.routes.test.ts',
    '**/test/connectors/dedust/**/*.test.ts'
  ],
  collectCoverageFrom: [
    'src/chains/ton/**/*.ts',
    'src/connectors/dedust/**/*.ts',
    '!**/*.test.ts',
    '!**/*.mock.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  }
};
```

#### Subtask 5.3.2: Create test running scripts
**File**: `package.json`

```json
{
  "scripts": {
    "test:ton": "GATEWAY_TEST_MODE=dev jest --runInBand test/chains/ton",
    "test:dedust": "GATEWAY_TEST_MODE=dev jest --runInBand test/connectors/dedust",
    "test:ton-dedust": "GATEWAY_TEST_MODE=dev jest --runInBand test/chains/ton test/connectors/dedust",
    "test:coverage:ton-dedust": "GATEWAY_TEST_MODE=dev jest --coverage --runInBand test/chains/ton test/connectors/dedust"
  }
}
```

---

## PHASE 6: Documentation and Examples

### Task 6.1: Create Usage Examples

#### Subtask 6.1.1: Create TON chain usage examples
**File**: `examples/ton-examples.md`

```markdown
# TON Chain Usage Examples

## Get Chain Status
```bash
curl -X GET "http://localhost:15888/chains/ton/status?network=mainnet"
```

## Get Wallet Balances
```bash
curl -X POST "http://localhost:15888/chains/ton/balances" \
  -H "Content-Type: application/json" \
  -d '{
    "network": "mainnet",
    "address": "EQDKpMC...",
    "tokens": ["TON", "USDT", "USDC"]
  }'
```
```

#### Subtask 6.1.2: Create DeDust connector usage examples
**File**: `examples/dedust-examples.md`

```markdown
# DeDust Connector Usage Examples

## Get Pool Information
```bash
curl -X POST "http://localhost:15888/connectors/dedust/amm/pool-info" \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "ton",
    "network": "mainnet",
    "base": "USDT",
    "quote": "TON"
  }'
```

## Get Swap Quote
```bash
curl -X POST "http://localhost:15888/connectors/dedust/router/quote-swap" \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "ton",
    "network": "mainnet",
    "base": "USDT",
    "quote": "TON",
    "amount": "1000000",
    "side": "SELL"
  }'
```
```

### Task 6.2: Update Main Documentation

#### Subtask 6.2.1: Update supported chains list
**File**: `README.md`

```markdown
## Supported Networks

### TON Networks
- **TON Mainnet**: Primary TON blockchain network
- **TON Testnet**: Development and testing network

## Supported DEX Connectors
- **DeDust** (TON): Native TON DEX with router v2 and AMM operations
```

#### Subtask 6.2.2: Update architecture documentation
Add TON and DeDust to architecture diagrams and descriptions in relevant documentation files.

---

## Validation Checklist

### Development Completion
- [ ] All TON chain methods implemented and tested
- [ ] All DeDust AMM operations implemented and tested
- [ ] All DeDust Router operations implemented and tested
- [ ] Configuration files created and validated
- [ ] Integration tests passing with >75% coverage
- [ ] Error handling implemented for all edge cases
- [ ] API endpoints following Gateway schema standards

### Configuration Validation
- [ ] TON chain configurations working for mainnet
- [ ] DeDust connector configurations properly loaded
- [ ] Token lists populated with real TON jettons
- [ ] Pool definitions accurate and up-to-date
- [ ] Schema validation working for all endpoints

### Testing Validation
- [ ] Unit tests covering all public methods
- [ ] Integration tests for all API endpoints
- [ ] Mock data representative of real scenarios
- [ ] Error scenarios properly tested
- [ ] Performance tests completed

### Documentation Validation
- [ ] Usage examples working with real endpoints
- [ ] Configuration documentation accurate
- [ ] API documentation updated in Swagger
- [ ] Developer guides complete and clear

## Deployment Steps

1. **Development Testing**
   - Run all TON/DeDust tests: `pnpm test:ton-dedust`
   - Verify test coverage: `pnpm test:coverage:ton-dedust`
   - Test all API endpoints manually

2. **Configuration Setup**
   - Run setup script: `pnpm run setup`
   - Verify all configuration files created
   - Test configuration loading and validation

3. **Integration Testing**
   - Start Gateway: `pnpm start --passphrase=test --dev`
   - Test TON chain endpoints
   - Test DeDust AMM endpoints
   - Test DeDust Router endpoints

4. **Documentation Review**
   - Verify Swagger docs at http://localhost:15888/docs
   - Test all usage examples
   - Review configuration documentation

This implementation plan provides a complete roadmap for adding TON blockchain support and DeDust AMM/Router v2 connectors to Hummingbot Gateway. Each task is self-contained with clear objectives and implementation details.
