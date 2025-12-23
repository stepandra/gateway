# Tasks: Add TON Chain + DeDust Connectors

**Input**: Design documents from `/specs/001-feature-add-ton/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✅ Found: TypeScript, Fastify, TypeBox, @ton/core, @dedust/sdk, Jest
   ✅ Extract: Gateway server extension, TON chain + DeDust connectors
2. Load optional design documents:
   ✅ data-model.md: 8 entities → 8 model tasks
   ✅ contracts/: 3 files → 14 contract test tasks
   ✅ research.md: Decisions → setup tasks
3. Generate tasks by category:
   ✅ Setup: dependencies, linting, configuration templates
   ✅ Tests: contract tests, integration tests
   ✅ Core: models, TON chain, DeDust connectors
   ✅ Integration: route handlers, configuration system
   ✅ Polish: CLI harness, performance tests, documentation
4. Apply task rules:
   ✅ Different files = mark [P] for parallel
   ✅ Same file = sequential (no [P])
   ✅ Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   ✅ All contracts have tests
   ✅ All entities have models
   ✅ All endpoints implemented
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Setup
- [x] T001 Install TON and DeDust dependencies (@ton/core, @ton/ton, @ton/crypto, @dedust/sdk)
- [x] T002 [P] Configure TypeScript for TON blockchain types in tsconfig.json
- [x] T003 [P] Set up Jest test configuration for TON/DeDust modules in jest.config.js
- [x] T004 [P] Create TON chain configuration templates in src/templates/chains/ton.yml and src/templates/chains/ton/mainnet.yml, src/templates/chains/ton/testnet.yml
- [x] T005 [P] Create DeDust connector configuration template in src/templates/connectors/dedust.yml
- [x] T006 [P] Create TON token lists in src/templates/tokens/ton/mainnet.json and src/templates/tokens/ton/testnet.json
- [x] T007 [P] Create DeDust pool configuration in src/templates/pools/dedust.json

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests - TON Chain API [P]
- [x] T008 [P] Contract test GET /chains/ton/status in test/contract/ton-chain-status.test.ts
- [x] T009 [P] Contract test GET /chains/ton/tokens in test/contract/ton-chain-tokens.test.ts
- [x] T010 [P] Contract test POST /chains/ton/balances in test/contract/ton-chain-balances.test.ts
- [x] T011 [P] Contract test POST /chains/ton/poll in test/contract/ton-chain-poll.test.ts
- [x] T012 [P] Contract test POST /chains/ton/estimate-gas in test/contract/ton-chain-estimate-gas.test.ts

### Contract Tests - DeDust Router API [P]
- [x] T013 [P] Contract test POST /connectors/dedust/router/quote-swap in test/contract/dedust-router-quote-swap.test.ts
- [x] T014 [P] Contract test POST /connectors/dedust/router/execute-swap in test/contract/dedust-router-execute-swap.test.ts
- [x] T015 [P] Contract test POST /connectors/dedust/router/execute-quote in test/contract/dedust-router-execute-quote.test.ts

### Contract Tests - DeDust AMM API [P]
- [x] T016 [P] Contract test GET /connectors/dedust/amm/pool-info in test/contract/dedust-amm-pool-info.test.ts
- [x] T017 [P] Contract test POST /connectors/dedust/amm/quote-liquidity in test/contract/dedust-amm-quote-liquidity.test.ts
- [x] T018 [P] Contract test POST /connectors/dedust/amm/add-liquidity in test/contract/dedust-amm-add-liquidity.test.ts
- [x] T019 [P] Contract test POST /connectors/dedust/amm/remove-liquidity in test/contract/dedust-amm-remove-liquidity.test.ts
- [x] T020 [P] Contract test GET /connectors/dedust/amm/position-info in test/contract/dedust-amm-position-info.test.ts
- [x] T021 [P] Contract test POST /connectors/dedust/amm/collect-fees in test/contract/dedust-amm-collect-fees.test.ts

### Integration Tests [P]
- [x] T022 [P] Integration test TON chain operations (status, balances, tokens) in test/integration/ton-chain-integration.test.ts
- [x] T023 [P] Integration test DeDust router swap flow in test/integration/dedust-router-integration.test.ts
- [x] T024 [P] Integration test DeDust AMM liquidity operations in test/integration/dedust-amm-integration.test.ts
- [x] T025 [P] Integration test TON provider fallback (TON Center → DRPC) in test/integration/ton-provider-fallback.test.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Data Models [P]
- [x] T026 [P] TONToken model in src/chains/ton/models/ton-token.ts
- [x] T027 [P] DedustPool model in src/connectors/dedust/models/dedust-pool.ts
- [x] T028 [P] TONWallet model in src/chains/ton/models/ton-wallet.ts
- [x] T029 [P] SwapQuote model in src/connectors/dedust/models/swap-quote.ts
- [x] T030 [P] Route model in src/connectors/dedust/models/route.ts
- [x] T031 [P] LiquidityPosition model in src/connectors/dedust/models/liquidity-position.ts
- [x] T032 [P] ClaimableFees model in src/connectors/dedust/models/claimable-fees.ts
- [x] T033 [P] TransactionRecord model in src/chains/ton/models/transaction-record.ts

### TON Chain Implementation
- [x] T034 TON provider manager (TON Center + DRPC fallback) in src/chains/ton/services/ton-provider-manager.ts
- [x] T035 TON address utilities and validation in src/chains/ton/utils/ton-address.ts
- [x] T036 TON chain service core implementation in src/chains/ton/ton.ts
- [x] T037 TON chain route handlers in src/chains/ton/routes/ton-chain.routes.ts
- [x] T038 TON chain TypeBox schemas in src/schemas/ton-chain-schema.ts

### DeDust Router Implementation
- [x] T039 DeDust factory and SDK integration in src/connectors/dedust/services/dedust-factory.ts
- [x] T040 DeDust router service for quote generation in src/connectors/dedust/services/dedust-router.ts
- [x] T041 DeDust router route handlers in src/connectors/dedust/router-routes/router.routes.ts
- [x] T042 DeDust router TypeBox schemas in src/schemas/dedust-router-schema.ts

### DeDust AMM Implementation
- [x] T043 DeDust pool service for AMM operations in src/connectors/dedust/services/dedust-pool.ts
- [x] T044 DeDust AMM liquidity operations in src/connectors/dedust/services/dedust-amm.ts
- [x] T045 DeDust AMM route handlers in src/connectors/dedust/amm-routes/amm.routes.ts
- [x] T046 DeDust AMM TypeBox schemas in src/schemas/dedust-amm-schema.ts

### Core DeDust Connector
- [x] T047 DeDust main connector class with singleton pattern in src/connectors/dedust/dedust.ts
- [x] T048 DeDust configuration and constants in src/connectors/dedust/constants/dedust-constants.ts

## Phase 3.4: Integration
- [x] T049 Register TON chain in Gateway routing system in src/chains/chain.routes.ts
- [x] T050 Register DeDust connectors in Gateway routing system in src/connectors/connector.routes.ts
- [x] T051 TON chain configuration schema validation in src/templates/namespace/ton-schema.json
- [x] T052 DeDust connector configuration schema validation in src/templates/namespace/dedust-schema.json
- [x] T053 Update configuration manager for TON/DeDust support in src/services/config-manager-v2.ts
- [x] T054 Add TON/DeDust to supported chains/connectors lists in src/services/chains-and-connectors.ts

## Phase 3.5: Polish

### CLI Harness [P]
- [ ] T055 [P] TON chain CLI tools in scripts/cli/ton/status.js, scripts/cli/ton/balances.js, scripts/cli/ton/tokens.js
- [ ] T056 [P] DeDust router CLI tools in scripts/cli/dedust/quote-swap.js, scripts/cli/dedust/execute-swap.js
- [ ] T057 [P] DeDust AMM CLI tools in scripts/cli/dedust/pool-info.js, scripts/cli/dedust/add-liquidity.js

### Unit Tests [P]
- [ ] T058 [P] Unit tests for TON address utilities in test/unit/ton-address.test.ts
- [ ] T059 [P] Unit tests for DeDust pool calculations in test/unit/dedust-pool.test.ts
- [ ] T060 [P] Unit tests for TON provider manager in test/unit/ton-provider-manager.test.ts
- [ ] T061 [P] Unit tests for DeDust router algorithms in test/unit/dedust-router.test.ts

### Performance & Documentation
- [ ] T062 Performance tests for quote-swap (p95 ≤ 800ms) and pool-info (p95 ≤ 500ms) in test/performance/ton-dedust-performance.test.ts
- [ ] T063 [P] Update Gateway documentation with TON/DeDust sections in docs/
- [ ] T064 Validate all tests pass with GATEWAY_TEST_MODE=dev jest --runInBand test/chains/ton test/connectors/dedust
- [ ] T065 [P] Create comprehensive mocks for TON Center API and DRPC in test/mocks/ton-providers.ts
- [ ] T066 [P] Create DeDust SDK mocks in test/mocks/dedust-sdk.ts

## Dependencies

### Critical Dependencies (Must Complete First)
- **Setup (T001-T007)** before all other phases
- **Contract Tests (T008-T025)** before **Core Implementation (T026-T048)**
- **Data Models (T026-T033)** before **Service Implementation (T034-T048)**

### Sequential Dependencies
- T034 (TON provider) blocks T036 (TON chain service)
- T035 (TON address utils) blocks T036 (TON chain service)
- T036 (TON chain service) blocks T037 (TON route handlers)
- T039 (DeDust factory) blocks T040, T043 (DeDust services)
- T040 (DeDust router) blocks T041 (router routes)
- T043, T044 (DeDust AMM) blocks T045 (AMM routes)
- T047 (main connector) requires T040, T043, T044 (all services)
- **Core Implementation (T026-T048)** before **Integration (T049-T054)**
- **Integration (T049-T054)** before **Polish (T055-T066)**

### Parallel Groups
- **Contract Tests**: T008-T025 can all run in parallel
- **Data Models**: T026-T033 can all run in parallel
- **CLI Tools**: T055-T057 can run in parallel
- **Unit Tests**: T058-T061 can run in parallel
- **Documentation**: T063, T065, T066 can run in parallel

## Parallel Example
```bash
# Phase 3.2: Launch all contract tests together
GATEWAY_TEST_MODE=dev jest --runInBand test/contract/ton-chain-status.test.ts &
GATEWAY_TEST_MODE=dev jest --runInBand test/contract/ton-chain-tokens.test.ts &
GATEWAY_TEST_MODE=dev jest --runInBand test/contract/dedust-router-quote-swap.test.ts &
GATEWAY_TEST_MODE=dev jest --runInBand test/contract/dedust-amm-pool-info.test.ts &
# ... all contract tests

# Phase 3.3: Launch all data models together
# T026-T033: All model files are independent
Task: "TONToken model in src/chains/ton/models/ton-token.ts"
Task: "DedustPool model in src/connectors/dedust/models/dedust-pool.ts"
Task: "SwapQuote model in src/connectors/dedust/models/swap-quote.ts"
# ... all model tasks

# Phase 3.5: Launch CLI tools together
Task: "TON chain CLI tools in scripts/cli/ton/"
Task: "DeDust router CLI tools in scripts/cli/dedust/"
Task: "Unit tests for TON address utilities"
```

## Notes
- **[P] tasks** = different files, no dependencies
- **CRITICAL**: Verify all contract tests fail before implementing (TDD)
- **IMPORTANT**: Run TON/DeDust tests ONLY - exclude Ethereum/Solana
- Test command: `GATEWAY_TEST_MODE=dev jest --runInBand test/chains/ton test/connectors/dedust`
- Commit after each task completion
- Maintain Gateway v2.8.0 schema compatibility throughout

## Task Generation Rules Applied

1. **From Contracts**:
   ✅ ton-chain-api.json → 5 contract tests (T008-T012)
   ✅ dedust-router-api.json → 3 contract tests (T013-T015)
   ✅ dedust-amm-api.json → 6 contract tests (T016-T021)
   ✅ Each endpoint → corresponding implementation task

2. **From Data Model**:
   ✅ 8 entities → 8 model creation tasks [P] (T026-T033)
   ✅ Relationships → service layer tasks (T034-T048)

3. **From User Stories (Quickstart)**:
   ✅ TON chain operations → integration test (T022)
   ✅ DeDust router flow → integration test (T023)
   ✅ DeDust AMM operations → integration test (T024)
   ✅ Provider fallback → integration test (T025)

4. **Ordering Applied**:
   ✅ Setup → Tests → Models → Services → Endpoints → Polish
   ✅ Dependencies properly sequenced

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All contracts have corresponding tests (14 contract tests for 14 endpoints)
- [x] All entities have model tasks (8 entities → 8 model tasks)
- [x] All tests come before implementation (T008-T025 before T026-T048)
- [x] Parallel tasks truly independent (different files, no shared dependencies)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Constitutional compliance maintained (≥75% coverage, TON/DeDust only)
- [x] Gateway v2.8.0 schema compatibility preserved