# AI Agent Instructions

This file provides guidance to AI coding assistants when working with code in this repository.

## Build & Command Reference
- Build: `pnpm build`
- Start server: `pnpm start --passphrase=<PASSPHRASE>`
- Start in dev mode: `pnpm start --passphrase=<PASSPHRASE> --dev` (HTTP mode, no SSL)
- Run all tests: `pnpm test`
- Run specific test file: `GATEWAY_TEST_MODE=dev jest --runInBand path/to/file.test.ts`
- Run tests with coverage: `pnpm test:cov`
- Lint code: `pnpm lint`
- Format code: `pnpm format`
- Type check: `pnpm typecheck`
- Initial setup: `pnpm run setup` (interactive - choose which configs to update)
- Setup with defaults: `pnpm run setup:with-defaults` (updates all configs automatically)
- Clean install: `pnpm clean` (removes node_modules, coverage, logs, dist)

## TON + DeDust Integration Context

### New Technology Stack
- **TON Blockchain**: TypeScript with @ton/core, @ton/ton, @ton/crypto, @dedust/sdk, pnpm
- **Storage**: File-based configuration (YAML/JSON), in-memory caching, no persistent database
- **Testing**: Jest with coverage e75%, GATEWAY_TEST_MODE=dev, mock TON Center API/DRPC/DeDust SDK
- **Target Platform**: Linux/macOS server, Docker containers, HTTP/HTTPS REST API
- **Performance Goals**: quote-swap p95 d800ms, pool-info p95 d500ms, 100 req/min global rate limit

### Recent Feature: TON Chain + DeDust Connectors (001-feature-add-ton)
- **Purpose**: Add TON blockchain integration and DeDust DEX connectors (Router v2 and AMM) to Gateway v2.8.0
- **Key Components**: TON chain support, DeDust Router for multi-hop swaps, DeDust AMM for liquidity provision
- **API Routes**: /chains/ton/*, /connectors/dedust/router/*, /connectors/dedust/amm/*
- **Configuration**: TON mainnet/testnet support, DeDust pool management, schema compatibility
- **Testing**: TON/DeDust only (exclude Ethereum/Solana), comprehensive mocking strategy

### Important: Test Execution Constraints
- **CRITICAL**: Run tests ONLY for TON blockchain and DeDust connectors
- **FORBIDDEN**: Running tests for Ethereum, Solana, or any other blockchain/DEX in CI
- **Commands**:
  - `GATEWAY_TEST_MODE=dev jest --runInBand test/chains/ton.test.ts`
  - `GATEWAY_TEST_MODE=dev jest --runInBand test/connectors/dedust/`
- **Coverage**: e75% for TON/DeDust modules only

## Architecture Overview

### Gateway Pattern
- RESTful API gateway providing standardized endpoints for blockchain and DEX interactions
- Built with Fastify framework using TypeBox for schema validation
- Supports both HTTP (dev mode) and HTTPS (production) protocols
- Swagger documentation auto-generated at `/docs` (http://localhost:15888/docs in dev mode)
- Global rate limiting implemented (100 requests/minute) to prevent DoS attacks

### Module Organization
- **Chains**: Blockchain implementations (Ethereum, Solana, **TON**)
  - Each chain implements standard methods: balances, tokens, status, allowances (TON: balances, tokens, status)
  - Singleton pattern with network-specific instances via `getInstance()`
  - **TON-specific**: Uses TON Center API and DRPC as fallback for blockchain interactions

- **Connectors**: DEX protocol implementations (Jupiter, Meteora, Raydium, Uniswap, 0x, **DeDust**)
  - Support for three trading types:
    - **Router**: DEX aggregators that find optimal swap routes (Jupiter, 0x, Uniswap V3 SOR, **DeDust Router v2**)
    - **AMM** (Automated Market Maker): V2-style constant product pools (Raydium, Uniswap V2, **DeDust AMM**)
    - **CLMM** (Concentrated Liquidity Market Maker): V3-style concentrated liquidity (Meteora DLMM, Raydium, Uniswap V3)
  - Each connector organized into operation-specific route files by type
  - Standardized request/response schemas across all connectors
  - **DeDust-specific**: Native TON DEX with multi-hop trades, volatile/stable pools, and security focus

### API Route Structure
- Chain routes: `/chains/{chain}/{operation}`
  - Examples: `/chains/ethereum/balances`, `/chains/solana/tokens`, **`/chains/ton/balances`, `/chains/ton/tokens`**
- Connector routes: `/connectors/{dex}/{type}/{operation}`
  - Router: `/connectors/jupiter/router/quote`, `/connectors/0x/router/swap`, **`/connectors/dedust/router/quote`**
  - AMM: `/connectors/raydium/amm/addLiquidity`, `/connectors/uniswap/amm/poolInfo`, **`/connectors/dedust/amm/poolInfo`**
  - CLMM: `/connectors/meteora/clmm/openPosition`, `/connectors/uniswap/clmm/collectFees`
- Config routes: `/config/*`
- Wallet routes: `/wallet/*`

## Coding Style Guidelines
- TypeScript with ESNext target and CommonJS modules
- 2-space indentation (no tabs)
- Single quotes for strings
- Semicolons required
- Arrow functions preferred over function declarations
- Explicit typing encouraged (TypeBox for API schemas)
- Unused variables prefixed with underscore (_variable)
- Error handling: Use Fastify's httpErrors for API errors

## TON Blockchain Integration

### TON Chain Implementation Details
- **API Providers**: Uses TON Center API (primary) and DRPC (fallback) for blockchain interactions
- **Wallet Support**: TON wallets with address formats (raw, user-friendly, bounceable/non-bounceable)
- **Key Operations**:
  - `getBalances()`: Get TON and Jetton (token) balances
  - `getTokens()`: Retrieve supported Jetton information
  - `getStatus()`: Check chain connection and latest block info
- **Authentication**:
  - TON Center: `X-API-Key` header
  - DRPC: `Drpc-Key` header

### DeDust Protocol Integration

#### DeDust SDK Dependencies
```bash
# Core TON dependencies
npm install @ton/core @ton/ton @ton/crypto
# DeDust SDK
npm install @dedust/sdk
```

#### DeDust Router v2 Operations
- **Quote Swaps**: Multi-hop token swaps with optimal routing (A -> B -> C)
- **Execute Swaps**: Direct swap execution with slippage protection
- **Pool Discovery**: Automated pool finding for token pairs
- **Gas Optimization**: Efficient transaction batching for complex routes

#### DeDust AMM Operations
- **Pool Information**: Get pool details, reserves, and pricing
- **Liquidity Management**: Add/remove liquidity from pools
- **Pool Types**: Support for both volatile and stable swap pools
- **Fee Collection**: Collect earned fees from liquidity positions

## Environment Variables
- `GATEWAY_PASSPHRASE`: Set passphrase for wallet encryption
- `GATEWAY_TEST_MODE=dev`: Run tests in development mode
- `START_SERVER=true`: Required to start the server
- `DEV=true`: Run in HTTP mode (Docker)
- `TONCENTER_API_KEY`: TON Center API key (optional)
- `DRPC_API_KEY`: DRPC API key for fallback (optional)

## Current Implementation Phase
- **Branch**: 001-feature-add-ton
- **Status**: Design complete, ready for task generation
- **Next**: Execute /tasks command to generate implementation tasks
- **Artifacts**: research.md, data-model.md, contracts/, quickstart.md completed