
# Implementation Plan: Add TON Chain + DeDust Connectors

**Branch**: `001-feature-add-ton` | **Date**: 2025-09-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-feature-add-ton/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Add TON blockchain integration and DeDust DEX connectors (Router v2 and AMM) to Hummingbot Gateway v2.8.0, enabling standardized trading and liquidity operations on TON through existing Gateway APIs. Implementation includes TON chain support with balance/token queries, DeDust Router for multi-hop swaps, and DeDust AMM for liquidity provision while maintaining schema compatibility with existing Gateway connectors.

## Technical Context
**Language/Version**: TypeScript with ESNext target and CommonJS modules (Node.js 20+)
**Primary Dependencies**: Fastify, TypeBox, @ton/core, @ton/ton, @ton/crypto, @dedust/sdk, pnpm
**Storage**: File-based configuration (YAML/JSON), in-memory caching, no persistent database
**Testing**: Jest with coverage ≥75%, GATEWAY_TEST_MODE=dev, mock TON Center API/DRPC/DeDust SDK
**Target Platform**: Linux/macOS server, Docker containers, HTTP/HTTPS REST API
**Project Type**: single (Gateway server extension following existing patterns)
**Performance Goals**: quote-swap p95 ≤800ms, pool-info p95 ≤500ms, 100 req/min global rate limit
**Constraints**: Gateway v2.8.0 schema compatibility, TON mainnet/testnet support, singleton patterns
**Scale/Scope**: 17 functional requirements, 3 API route groups (/chains/ton, /connectors/dedust/router, /connectors/dedust/amm)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. Library-First
- [x] Initial projects: `chain-ton`, `connector-dedust` as isolated modules
- [x] No shared utils needed beyond existing Gateway infrastructure
- [x] Strict boundaries maintained

### ✅ II. Contracts as Source of Truth
- [x] HTTP contracts defined via TypeBox schemas
- [x] Gateway v2.8.0 schema compatibility maintained
- [x] CLI harness required at `scripts/cli/ton/*`, `scripts/cli/dedust/*`
- [x] Swagger auto-generation at `/docs`

### ✅ III. Test-First (NON-NEGOTIABLE)
- [x] Coverage ≥75% for TON/DeDust modules
- [x] Unit/contract/integration tests planned
- [x] Ethereum/Solana test exclusion enforced

### ✅ IV. Integration Over Units
- [x] Contract and integration tests prioritized
- [x] External calls mocked (TON Center, DRPC, DeDust SDK)
- [x] Real contract format compliance

### ✅ V. Observability by Default
- [x] Structured logging with requestId, opId, chain, network, route, latencyMs
- [x] Metrics: p50/p95/p99 latency tracking planned
- [x] No secrets/wallet addresses in logs

### ✅ VI. Semver & Backward Compatibility
- [x] Schema immutability preserved
- [x] Optional fields only for extensions
- [x] Gateway v2.8.0 compatibility maintained

### ✅ VII. Simplicity > Abstractions
- [x] 2 projects (chain-ton, connector-dedust) < 3 limit
- [x] Direct SDK use (Fastify, TypeBox, @dedust/sdk)
- [x] No unnecessary wrappers

### ✅ VIII. Direct SDK/Framework Use
- [x] Fastify, TypeBox, @dedust/sdk used directly
- [x] Single money/address format per layer
- [x] Conversions only at boundaries

### ✅ IX. Security by Default
- [x] TypeBox input validation
- [x] Timeouts, retries, exponential backoff
- [x] Secrets from ENV only
- [x] External request allowlisting

**GATE STATUS**: PASS - All constitutional requirements satisfied

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 1 (Single project) - Gateway server extension following existing patterns in src/chains/ and src/connectors/

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- TON Chain contract tests → 5 contract test tasks [P] (status, tokens, balances, poll, estimate-gas)
- DeDust Router contract tests → 3 contract test tasks [P] (quote-swap, execute-swap, execute-quote)
- DeDust AMM contract tests → 6 contract test tasks [P] (pool-info, quote-liquidity, add-liquidity, remove-liquidity, position-info, collect-fees)
- Data model entities → 8 model creation tasks [P] (TONToken, DedustPool, TONWallet, SwapQuote, Route, LiquidityPosition, ClaimableFees, TransactionRecord)
- Implementation tasks for TON chain operations, DeDust connectors, configuration, CLI harness
- Integration tests for end-to-end scenarios from quickstart.md

**Ordering Strategy**:
- TDD order: Contract tests → Unit tests → Implementation → Integration tests
- Dependency order: Data models → Chain services → Connector services → Route handlers → Configuration
- Mark [P] for parallel execution (independent files)
- TON and DeDust components can be developed in parallel
- Configuration and CLI harness at end

**Estimated Output**: 35-40 numbered, ordered tasks in tasks.md
- Contract tests: 14 tasks [P]
- Data models: 8 tasks [P]
- TON chain implementation: 6-8 tasks
- DeDust implementation: 8-10 tasks
- Configuration: 3-4 tasks
- CLI harness: 2-3 tasks
- Integration tests: 3-4 tasks

**Key Dependencies**:
1. Contract tests must pass before implementation
2. Data models before services
3. Chain implementation before connector implementation
4. Configuration after core implementation
5. CLI harness and integration tests last

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS (no new violations from design)
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none needed)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
