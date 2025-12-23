# Data Model: TON Chain + DeDust Integration

## Core Entities

### TON Token
**Purpose**: Represents native TON and Jetton tokens with metadata and balance information

**Fields**:
- `symbol`: string - Token symbol (e.g., "TON", "USDT")
- `address`: string - Token contract address (user-friendly bounceable format)
- `decimals`: number - Token decimal places
- `name`: string - Full token name
- `chainId`: number - TON network identifier (101 for mainnet)

**Validation Rules**:
- `symbol`: Required, 1-20 characters, alphanumeric + underscore
- `address`: Required, valid TON address format
- `decimals`: Required, 0-18 range
- `name`: Required, 1-100 characters
- `chainId`: Required, must match network configuration

**Relationships**:
- Referenced by DeDust Pool for base/quote tokens
- Used in balance queries and swap operations

### DeDust Pool
**Purpose**: Represents liquidity pools with reserves, fees, and trading pair information

**Fields**:
- `address`: string - Pool contract address
- `baseSymbol`: string - Base token symbol
- `quoteSymbol`: string - Quote token symbol
- `baseReserve`: string - Base token reserve amount
- `quoteReserve`: string - Quote token reserve amount
- `fee`: number - Pool fee percentage (e.g., 0.3 for 0.3%)
- `totalSupply`: string - Total LP token supply
- `type`: string - Pool type ("volatile" | "stable")
- `network`: string - Network identifier

**Validation Rules**:
- `address`: Required, valid TON address
- `baseSymbol`/`quoteSymbol`: Required, must exist in token registry
- `baseReserve`/`quoteReserve`: Required, positive BigNumber strings
- `fee`: Required, 0-10 range
- `totalSupply`: Required, positive BigNumber string
- `type`: Required, must be "volatile" or "stable"
- `network`: Required, must match supported networks

**Relationships**:
- Contains TON Tokens as base/quote pair
- Referenced by Liquidity Positions
- Used in Router quotes and AMM operations

### TON Wallet
**Purpose**: Represents user wallet addresses with balance tracking and transaction capabilities

**Fields**:
- `address`: string - Wallet address (user-friendly bounceable)
- `type`: string - Wallet type ("v3r1", "v3r2", "v4", "v5")
- `seqno`: number - Current sequence number
- `balance`: string - Native TON balance in nanotons
- `isActive`: boolean - Whether wallet is initialized
- `publicKey`: string - Wallet public key (optional)

**Validation Rules**:
- `address`: Required, valid TON wallet address
- `type`: Required, must be supported wallet version
- `seqno`: Required, non-negative integer
- `balance`: Required, non-negative BigNumber string
- `isActive`: Required boolean
- `publicKey`: Optional, valid hex string

**Relationships**:
- Owns Liquidity Positions
- Initiates Swap Quotes and transactions
- Target of balance queries

### Swap Quote
**Purpose**: Contains pricing information, slippage calculations, and routing data for token exchanges

**Fields**:
- `route`: Route[] - Array of routing steps
- `amountIn`: string - Input token amount
- `amountOut`: string - Expected output amount
- `amountOutMin`: string - Minimum output after slippage
- `priceImpact`: number - Price impact percentage
- `gasEstimate`: string - Estimated gas cost
- `ttl`: number - Quote expiration timestamp
- `slippage`: number - Applied slippage percentage

**Validation Rules**:
- `route`: Required, non-empty array of valid routes
- `amountIn`/`amountOut`/`amountOutMin`: Required, positive BigNumber strings
- `priceImpact`: Required, 0-100 percentage
- `gasEstimate`: Required, positive BigNumber string
- `ttl`: Required, future timestamp
- `slippage`: Required, 0-50 percentage

**Relationships**:
- Contains Route steps
- References source TON Wallet
- Used by swap execution operations

### Route
**Purpose**: Individual routing step in multi-hop swaps

**Fields**:
- `pool`: string - Pool address for this hop
- `tokenIn`: string - Input token address
- `tokenOut`: string - Output token address
- `amountIn`: string - Input amount for this hop
- `amountOut`: string - Output amount for this hop
- `poolType`: string - Pool type ("volatile" | "stable")

**Validation Rules**:
- `pool`: Required, valid pool address
- `tokenIn`/`tokenOut`: Required, valid token addresses
- `amountIn`/`amountOut`: Required, positive BigNumber strings
- `poolType`: Required, must match pool configuration

**Relationships**:
- Part of Swap Quote routing
- References DeDust Pool
- References TON Tokens

### Liquidity Position
**Purpose**: Tracks user's share in DeDust pools including deposited amounts and claimable fees

**Fields**:
- `positionId`: string - Unique position identifier
- `poolAddress`: string - Associated pool address
- `owner`: string - Wallet address owning position
- `lpTokens`: string - LP token amount owned
- `baseAmount`: string - Base token deposited
- `quoteAmount`: string - Quote token deposited
- `claimableFees`: ClaimableFees - Accumulated fees
- `createdAt`: number - Position creation timestamp
- `lastUpdated`: number - Last update timestamp

**Validation Rules**:
- `positionId`: Required, unique identifier
- `poolAddress`: Required, valid pool address
- `owner`: Required, valid wallet address
- `lpTokens`/`baseAmount`/`quoteAmount`: Required, non-negative BigNumber strings
- `claimableFees`: Required, valid fees object
- `createdAt`/`lastUpdated`: Required, valid timestamps

**Relationships**:
- Belongs to TON Wallet
- Associated with DeDust Pool
- Contains ClaimableFees

### ClaimableFees
**Purpose**: Represents accumulated trading fees from liquidity provision

**Fields**:
- `baseToken`: string - Base token fee amount
- `quoteToken`: string - Quote token fee amount
- `lastCollected`: number - Last fee collection timestamp

**Validation Rules**:
- `baseToken`/`quoteToken`: Required, non-negative BigNumber strings
- `lastCollected`: Required, valid timestamp

### Transaction Record
**Purpose**: Stores transaction hashes, status, confirmations, and execution details for audit trails

**Fields**:
- `hash`: string - Transaction hash
- `status`: number - Transaction status (0=pending, 1=confirmed, -1=failed)
- `type`: string - Transaction type ("swap", "addLiquidity", "removeLiquidity", "collectFees")
- `from`: string - Sender wallet address
- `gasUsed`: string - Actual gas consumed
- `fee`: string - Transaction fee paid
- `blockNumber`: number - Block containing transaction
- `timestamp`: number - Transaction timestamp
- `details`: TransactionDetails - Type-specific details

**Validation Rules**:
- `hash`: Required, valid transaction hash format
- `status`: Required, must be -1, 0, or 1
- `type`: Required, must be supported transaction type
- `from`: Required, valid wallet address
- `gasUsed`/`fee`: Required, non-negative BigNumber strings
- `blockNumber`: Required for confirmed transactions
- `timestamp`: Required, valid timestamp

**Relationships**:
- Originated by TON Wallet
- May reference Swap Quote or Liquidity Position
- Contains TransactionDetails

### TransactionDetails
**Purpose**: Type-specific transaction information

**Fields** (varies by transaction type):
- **Swap**: `tokenIn`, `tokenOut`, `amountIn`, `amountOut`, `route`
- **AddLiquidity**: `poolAddress`, `baseAmount`, `quoteAmount`, `lpTokensReceived`
- **RemoveLiquidity**: `poolAddress`, `lpTokensBurned`, `baseReceived`, `quoteReceived`
- **CollectFees**: `positionId`, `baseFeesCollected`, `quoteFeesCollected`

**Validation Rules**:
- Fields validated based on transaction type
- All amounts must be non-negative BigNumber strings
- Addresses must be valid TON format

## State Transitions

### Swap Quote Lifecycle
1. **Created** → Quote generated with TTL
2. **Valid** → Within TTL and market conditions
3. **Expired** → Past TTL, requires refresh
4. **Executed** → Successfully used for swap
5. **Failed** → Market conditions changed, execution failed

### Liquidity Position Lifecycle
1. **Created** → Position opened with initial deposits
2. **Active** → Earning fees, can add/remove liquidity
3. **Modified** → Liquidity added or removed
4. **Closed** → All liquidity removed, position ended

### Transaction Status Flow
1. **Pending** (0) → Submitted to blockchain
2. **Confirmed** (1) → Included in block and verified
3. **Failed** (-1) → Rejected by network or smart contract

## Data Relationships

```
TON Wallet 1---* Liquidity Position
TON Wallet 1---* Transaction Record
TON Wallet 1---* Swap Quote

DeDust Pool 1---* Liquidity Position
DeDust Pool *---2 TON Token (base/quote)
DeDust Pool 1---* Route

Swap Quote 1---* Route
Liquidity Position 1---1 ClaimableFees
Transaction Record 1---1 TransactionDetails

Route *---1 DeDust Pool
Route *---2 TON Token (in/out)
```

## Indexing Strategy

### Primary Indexes
- TON Token: `symbol`, `address`
- DeDust Pool: `address`, `baseSymbol+quoteSymbol`
- TON Wallet: `address`
- Liquidity Position: `positionId`, `owner`
- Transaction Record: `hash`, `from`
- Swap Quote: `ttl` (for cleanup)

### Cache Invalidation
- Token metadata: Rarely changes, 1-hour TTL
- Pool reserves: High volatility, 15-30 second TTL
- Wallet balances: On-demand refresh only
- Quotes: 2-5 second TTL
- Gas estimates: 10-second TTL

This data model provides the foundation for implementing TON chain operations and DeDust connector functionality while maintaining compatibility with Gateway v2.8.0 schemas.