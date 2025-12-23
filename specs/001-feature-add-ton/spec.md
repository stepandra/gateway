# Feature Specification: Add TON Chain + DeDust Connectors

**Feature Branch**: `001-feature-add-ton`
**Created**: 2025-09-20
**Status**: Draft
**Input**: User description: "Feature: Add TON chain + DeDust (Router v2 and AMM) connectors to a Hummingbot Gateway fork, aligned with Gateway v2.8.0 standards.

Why:
- Enable Hummingbot strategies to trade natively on TON via standardized Gateway endpoints.
- Provide unified quotes, swaps, balances, tokens, and AMM liquidity ops with strict schema compatibility.
- Maintain parity with existing Gateway connectors so the Python client can consume them without custom code.

Primary users:
- Strategy authors running Hummingbot via Gateway.
- Arbitrage/MM bots requiring deterministic Router quotes and AMM pool data on TON.
- LP managers who need add/remove liquidity and fee collection for DeDust pools."

## Execution Flow (main)
```
1. Parse user description from Input
   ’ Feature description parsed: TON blockchain integration with DeDust DEX
2. Extract key concepts from description
   ’ Actors: Strategy authors, arbitrage bots, LP managers
   ’ Actions: Trading, quoting, liquidity management, fee collection
   ’ Data: Token balances, prices, pool states, transaction history
   ’ Constraints: Gateway v2.8.0 compatibility, schema standardization
3. For each unclear aspect:
   ’ [NEEDS CLARIFICATION: TON network types (mainnet/testnet) not specified]
   ’ [NEEDS CLARIFICATION: Rate limiting requirements for TON endpoints]
   ’ [NEEDS CLARIFICATION: Authentication method for TON wallet operations]
4. Fill User Scenarios & Testing section
   ’ User flows identified for trading, liquidity, and portfolio management
5. Generate Functional Requirements
   ’ Each requirement mapped to testable API endpoints and operations
6. Identify Key Entities
   ’ TON tokens, DeDust pools, wallet addresses, transaction records
7. Run Review Checklist
   ’ WARN "Spec has uncertainties - network configuration details needed"
8. Return: SUCCESS (spec ready for planning with clarifications needed)
```

---

## ¡ Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a Hummingbot strategy developer, I want to execute automated trading strategies on the TON blockchain through DeDust DEX using the same standardized Gateway API endpoints that work with other chains, so that I can expand my trading operations to TON without rewriting my strategy logic or learning new APIs.

### Acceptance Scenarios
1. **Given** a Hummingbot strategy is configured for TON, **When** the strategy requests a token swap quote through Gateway, **Then** it receives standardized pricing data from DeDust that matches the same response format as other DEX connectors
2. **Given** an arbitrage bot monitors multiple chains, **When** it queries TON token balances and DeDust pool states, **Then** it receives real-time data in the standard Gateway format allowing cross-chain opportunity detection
3. **Given** a liquidity provider wants to manage DeDust positions, **When** they execute add/remove liquidity operations through Gateway, **Then** the system processes the requests and returns transaction confirmations with pool share information
4. **Given** a strategy executes a swap on DeDust, **When** the transaction is submitted, **Then** the system returns a transaction hash and monitors completion status
5. **Given** an LP manager tracks their positions, **When** they request fee collection data, **Then** the system provides accumulated fees and collection transaction capabilities

### Edge Cases
- What happens when TON network connectivity is lost during transaction execution?
- How does the system handle DeDust pool liquidity shortages that prevent large swaps?
- What occurs when TON wallet has insufficient native TON for gas but sufficient tokens for trading?
- How are failed transactions handled when DeDust smart contracts reject operations?
- What happens when requested token pairs don't exist in DeDust pools?

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST provide TON chain integration supporting mainnet operations
- **FR-002**: System MUST implement DeDust Router v2 connector for aggregated swap routing and price discovery
- **FR-003**: System MUST implement DeDust AMM connector for direct pool interactions and liquidity operations
- **FR-004**: System MUST support token balance queries for TON native tokens and jettons (TON's token standard)
- **FR-005**: System MUST provide standardized quote endpoints returning the same response schema as existing Gateway DEX connectors
- **FR-006**: System MUST execute swap transactions through DeDust with transaction hash tracking and confirmation monitoring
- **FR-007**: System MUST support liquidity provision operations including add liquidity, remove liquidity, and position management
- **FR-008**: System MUST provide fee collection capabilities for liquidity providers to claim accumulated trading fees
- **FR-009**: System MUST integrate with TON wallet infrastructure for transaction signing and submission
- **FR-010**: System MUST validate all token addresses and amounts before executing any blockchain operations
- **FR-011**: System MUST provide pool information queries including reserves, fees, and available trading pairs
- **FR-012**: System MUST maintain compatibility with Gateway v2.8.0 API schemas and endpoint structures
- **FR-013**: System MUST implement rate limiting to prevent abuse of TON RPC endpoints
- **FR-014**: System MUST handle TON-specific transaction fees and gas estimation for accurate cost calculation
- **FR-015**: System MUST support network configuration for [NEEDS CLARIFICATION: TON network types not specified - mainnet only or testnet support required?]
- **FR-016**: System MUST authenticate wallet operations via [NEEDS CLARIFICATION: authentication method not specified - private keys, mnemonics, hardware wallets?]
- **FR-017**: System MUST implement rate limiting at [NEEDS CLARIFICATION: rate limits not specified for TON endpoints]

### Key Entities *(include if feature involves data)*
- **TON Token**: Represents native TON and jetton tokens with address, symbol, decimals, and balance information
- **DeDust Pool**: Represents liquidity pools with reserves, fee rates, LP token supply, and trading pair information
- **TON Wallet**: Represents user wallet addresses with balance tracking and transaction capabilities
- **Swap Quote**: Contains pricing information, slippage calculations, and routing data for token exchanges
- **Liquidity Position**: Tracks user's share in DeDust pools including deposited amounts, LP tokens, and claimable fees
- **Transaction Record**: Stores transaction hashes, status, confirmations, and execution details for audit trails

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed (pending clarifications)

---