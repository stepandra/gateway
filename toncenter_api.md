# TON Center API Documentation

This document provides comprehensive documentation for TON Center APIs (v2 and v3) for use by AI agents and developers working with the TON blockchain.

## Overview

TON Center provides two main API versions:
- **API v2**: Traditional HTTP API for basic blockchain operations
- **API v3**: Advanced indexed API with PostgreSQL backend for complex queries

Both APIs provide access to TON blockchain data including accounts, transactions, blocks, smart contracts, and more.

## Base URLs

- **API v2**: `https://toncenter.com/api/v2`
- **API v3**: `https://toncenter.com/api/v3`
- **DRPC v2**: `https://ton.drpc.org/rest` (TON Center v2 compatible)

## Authentication

### TON Center APIs
Both v2 and v3 APIs support authentication via:
- **Header**: `X-API-Key: YOUR_API_KEY`
- **Query Parameter**: `?api_key=YOUR_API_KEY`

### DRPC API
DRPC uses its own authentication:
- **Header**: `Drpc-Key: YOUR_DRPC_API_KEY`

## Endpoint Configuration Examples

### TON Center v2 JSON-RPC
```javascript
const TONCENTER_RPC = 'https://toncenter.com/api/v2/jsonRPC';
headers['X-API-Key'] = env.TONCENTER_API_KEY;
```

### DRPC (TON Center v2 Compatible)
```javascript
const DRPC_RPC = 'https://ton.drpc.org/rest';
headers['Drpc-Key'] = env.DRPC_API_KEY;
```

**Note**: DRPC implements TON Center v2 API compatibility but does not support the full v3 feature set. Use DRPC as a fallback or alternative provider for v2 operations.

## API v2 (Traditional HTTP API)

### Response Format

All v2 responses follow this structure:
```json
{
  "ok": boolean,
  "result": any,
  "error": string,
  "code": integer
}
```

### Account Operations

#### Get Address Information
```
GET /getAddressInformation?address={address}&seqno={seqno}
```
Get basic account information including balance, code, data, and last transaction.

**Parameters:**
- `address` (required): Account address in any form
- `seqno` (optional): Masterchain block seqno for historical data

#### Get Extended Address Information
```
GET /getExtendedAddressInformation?address={address}&seqno={seqno}
```
Enhanced version with parsed contract information for known contract types.

#### Get Wallet Information
```
GET /getWalletInformation?address={address}&seqno={seqno}
```
Specialized for wallet contracts (v1-v5). Returns wallet-specific data like seqno, wallet type.

#### Get Address Balance
```
GET /getAddressBalance?address={address}&seqno={seqno}
```
Returns account balance in nanotons.

#### Get Address State
```
GET /getAddressState?address={address}&seqno={seqno}
```
Returns account state: `uninitialized`, `active`, or `frozen`.

#### Get Transactions
```
GET /getTransactions?address={address}&limit={limit}&lt={lt}&hash={hash}&to_lt={to_lt}&archival={archival}
```
Get transaction history for an address.

**Parameters:**
- `address` (required): Account address
- `limit` (optional): Max transactions (1-100, default 10)
- `lt` (optional): Logical time to start from (with hash)
- `hash` (optional): Transaction hash to start from (with lt)
- `to_lt` (optional): End logical time
- `archival` (optional): Use archival nodes for full history

#### Address Utilities
```
GET /packAddress?address={raw_address}
GET /unpackAddress?address={user_friendly_address}
GET /detectAddress?address={address}
```

### Block Operations

#### Get Masterchain Info
```
GET /getMasterchainInfo
```
Current masterchain state and latest block information.

#### Get Masterchain Block Signatures
```
GET /getMasterchainBlockSignatures?seqno={seqno}
```

#### Lookup Block
```
GET /lookupBlock?workchain={workchain}&shard={shard}&seqno={seqno}&lt={lt}&unixtime={unixtime}
```
Find block by seqno, logical time, or unix timestamp.

#### Get Shards
```
GET /shards?seqno={seqno}
```
Get shard information for a masterchain block.

#### Get Block Transactions
```
GET /getBlockTransactions?workchain={workchain}&shard={shard}&seqno={seqno}&count={count}
GET /getBlockTransactionsExt?workchain={workchain}&shard={shard}&seqno={seqno}&count={count}
```

#### Get Block Header
```
GET /getBlockHeader?workchain={workchain}&shard={shard}&seqno={seqno}
```

### Configuration

#### Get Config Parameter
```
GET /getConfigParam?config_id={id}&seqno={seqno}
```

#### Get All Config
```
GET /getConfigAll?seqno={seqno}
```

### Transaction Operations

#### Locate Transactions
```
GET /tryLocateTx?source={source}&destination={destination}&created_lt={created_lt}
GET /tryLocateResultTx?source={source}&destination={destination}&created_lt={created_lt}
GET /tryLocateSourceTx?source={source}&destination={destination}&created_lt={created_lt}
```

### Smart Contracts

#### Get Token Data
```
GET /getTokenData?address={address}&seqno={seqno}
```
Get NFT or Jetton information.

#### Run Get Method
```
POST /runGetMethod
```
**Body:**
```json
{
  "address": "string",
  "method": "string|number",
  "stack": [["type", value], ...]
}
```

### Sending Messages

#### Send BOC
```
POST /sendBoc
POST /sendBocReturnHash
```
**Body:**
```json
{
  "boc": "base64_encoded_boc"
}
```

#### Send Query
```
POST /sendQuery
```
**Body:**
```json
{
  "address": "string",
  "body": "base64_boc",
  "init_code": "base64_boc",
  "init_data": "base64_boc"
}
```

#### Estimate Fee
```
POST /estimateFee
```
**Body:**
```json
{
  "address": "string",
  "body": "base64_boc",
  "init_code": "base64_boc",
  "init_data": "base64_boc",
  "ignore_chksig": true
}
```

### JSON-RPC
```
POST /jsonRPC
```
All methods available via JSON-RPC 2.0 protocol.

## API v3 (Indexed Database API)

### Response Format

v3 responses vary by endpoint but typically include:
```json
{
  "data": [...],
  "address_book": {...},
  "metadata": {...}
}
```

### Account Operations

#### Get Account States
```
GET /accountStates?address={addresses}&include_boc={boolean}
```
Bulk account information (up to 1000 addresses).

#### Get Wallet States
```
GET /walletStates?address={addresses}
```
Wallet-specific information for multiple addresses.

#### Get Address Book
```
GET /addressBook?address={addresses}
```
User-friendly names and domains for addresses.

#### Get Metadata
```
GET /metadata?address={addresses}
```
Token metadata and indexing status.

### Blockchain Data

#### Get Blocks
```
GET /blocks?workchain={wc}&shard={shard}&seqno={seqno}&mc_seqno={mc_seqno}&start_utime={start}&end_utime={end}&limit={limit}&offset={offset}&sort={asc|desc}
```

#### Get Transactions
```
GET /transactions?account={addresses}&workchain={wc}&shard={shard}&seqno={seqno}&hash={hash}&start_utime={start}&end_utime={end}&start_lt={start_lt}&end_lt={end_lt}&limit={limit}&offset={offset}&sort={asc|desc}
```

#### Get Messages
```
GET /messages?msg_hash={hashes}&source={address}&destination={address}&opcode={opcode}&direction={in|out}&start_utime={start}&end_utime={end}&limit={limit}&offset={offset}&sort={asc|desc}
```

### Advanced Features

#### Get Actions
```
GET /actions?account={address}&action_type={types}&start_utime={start}&end_utime={end}&include_accounts={boolean}&limit={limit}&offset={offset}&sort={asc|desc}
```
High-level blockchain actions (transfers, swaps, etc.).

**Action Types:**
- `call_contract`, `contract_deploy`, `ton_transfer`
- `jetton_transfer`, `jetton_burn`, `jetton_swap`, `jetton_mint`
- `nft_mint`, `auction_bid`, `stake_deposit`, `stake_withdrawal`
- `dex_deposit_liquidity`, `dex_withdraw_liquidity`
- `change_dns`, `delete_dns`, `renew_dns`
- `subscribe`, `unsubscribe`, `tick_tock`

#### Get Traces
```
GET /traces?account={address}&trace_id={ids}&include_actions={boolean}&start_utime={start}&end_utime={end}&limit={limit}&offset={offset}&sort={asc|desc}
```
Complete transaction traces with all related transactions.

### Jetton Operations

#### Get Jetton Masters
```
GET /jetton/masters?address={addresses}&admin_address={addresses}&limit={limit}&offset={offset}
```

#### Get Jetton Wallets
```
GET /jetton/wallets?address={addresses}&owner_address={owners}&jetton_address={jettons}&exclude_zero_balance={boolean}&limit={limit}&offset={offset}&sort={asc|desc}
```

#### Get Jetton Transfers
```
GET /jetton/transfers?owner_address={owners}&jetton_wallet={wallets}&jetton_master={master}&direction={in|out}&start_utime={start}&end_utime={end}&limit={limit}&offset={offset}&sort={asc|desc}
```

#### Get Jetton Burns
```
GET /jetton/burns?address={addresses}&jetton_wallet={wallets}&jetton_master={master}&start_utime={start}&end_utime={end}&limit={limit}&offset={offset}&sort={asc|desc}
```

### NFT Operations

#### Get NFT Collections
```
GET /nft/collections?collection_address={addresses}&owner_address={owners}&limit={limit}&offset={offset}
```

#### Get NFT Items
```
GET /nft/items?address={addresses}&owner_address={owners}&collection_address={collections}&index={indices}&sort_by_last_transaction_lt={boolean}&limit={limit}&offset={offset}
```

#### Get NFT Transfers
```
GET /nft/transfers?owner_address={owners}&item_address={items}&collection_address={collection}&direction={in|out}&start_utime={start}&end_utime={end}&limit={limit}&offset={offset}&sort={asc|desc}
```

### DNS Operations

#### Get DNS Records
```
GET /dns/records?wallet={address}&limit={limit}&offset={offset}
```
DNS records (.ton, .t.me) associated with a wallet.

### Specialized Features

#### Get Multisig Wallets
```
GET /multisig/wallets?address={addresses}&wallet_address={signers}&include_orders={boolean}&limit={limit}&offset={offset}&sort={asc|desc}
```

#### Get Multisig Orders
```
GET /multisig/orders?address={addresses}&multisig_address={multisigs}&parse_actions={boolean}&limit={limit}&offset={offset}&sort={asc|desc}
```

#### Get Vesting Contracts
```
GET /vesting?contract_address={addresses}&wallet_address={wallets}&check_whitelist={boolean}&limit={limit}&offset={offset}
```

### Statistics

#### Get Top Accounts by Balance
```
GET /topAccountsByBalance?limit={limit}&offset={offset}
```

### Pending Data

For real-time data that hasn't been fully processed:

```
GET /pendingTransactions?account={addresses}&trace_id={ids}
GET /pendingActions?account={address}&ext_msg_hash={hashes}
GET /pendingTraces?account={address}&ext_msg_hash={hashes}
```

### Compatibility Endpoints

v3 includes compatibility endpoints that mirror v2 functionality:

```
GET /addressInformation?address={address}&use_v2={boolean}
GET /walletInformation?address={address}&use_v2={boolean}
POST /runGetMethod
POST /estimateFee
POST /message
```

## Common Parameters

### Address Format
Addresses can be provided in multiple formats:
- Raw: `0:83DFD552E63729B472FCBCC8C45EBCC6691702558B68EC7527E1BA403A0F31A8`
- User-friendly: `EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N`
- Base64/Base64URL encoded

### Time Parameters
- `start_utime`/`end_utime`: Unix timestamps
- `start_lt`/`end_lt`: Logical time values
- `seqno`: Block sequence numbers

### Pagination
- `limit`: Number of results (typically 1-1000, default 10)
- `offset`: Skip first N results
- `sort`: `asc` or `desc` (default `desc`)

## Error Handling

### v2 Errors
```json
{
  "ok": false,
  "error": "Error description",
  "code": 400
}
```

### v3 Errors
```json
{
  "error": "Error description",
  "code": 400
}
```

### Common Error Codes
- `400`: Bad Request (invalid parameters)
- `422`: Validation Error
- `504`: Lite Server Timeout

## Rate Limits

Both APIs implement rate limiting. Check response headers for current limits and usage.

## Best Practices

1. **Use v3 for Complex Queries**: v3 provides indexed data and better performance for complex filtering
2. **DRPC as Fallback**: Use DRPC endpoints as a fallback for v2 operations when TON Center is unavailable
3. **Batch Requests**: Use bulk endpoints when querying multiple addresses
4. **Pagination**: Use limit/offset for large datasets
5. **Caching**: Cache responses when appropriate, especially for historical data
6. **Error Handling**: Always check the `ok` field in v2 responses
7. **Address Format**: Use raw format for better performance when possible
8. **Provider Selection**: Choose between TON Center and DRPC based on availability and performance requirements

## Example Usage

### Get Account Balance (v2)

**TON Center:**
```bash
curl "https://toncenter.com/api/v2/getAddressBalance?address=EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N" \
  -H "X-API-Key: YOUR_API_KEY"
```

**DRPC:**
```bash
curl "https://ton.drpc.org/rest/getAddressBalance?address=EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N" \
  -H "Drpc-Key: YOUR_DRPC_API_KEY"
```

### Get Multiple Account States (v3)
```bash
curl "https://toncenter.com/api/v3/accountStates?address=addr1&address=addr2" \
  -H "X-API-Key: YOUR_API_KEY"
```

### Get Jetton Transfers (v3)
```bash
curl "https://toncenter.com/api/v3/jetton/transfers?owner_address=EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N&limit=50" \
  -H "X-API-Key: YOUR_API_KEY"
```

### Run Smart Contract Method (v2)

**TON Center:**
```bash
curl -X POST "https://toncenter.com/api/v2/runGetMethod" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "EQD...",
    "method": "get_balance",
    "stack": []
  }'
```

**DRPC:**
```bash
curl -X POST "https://ton.drpc.org/rest/runGetMethod" \
  -H "Drpc-Key: YOUR_DRPC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "EQD...",
    "method": "get_balance",
    "stack": []
  }'
```

### JSON-RPC Examples

**TON Center JSON-RPC:**
```bash
curl -X POST "https://toncenter.com/api/v2/jsonRPC" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "getAddressBalance",
    "params": {"address": "EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N"},
    "id": "1",
    "jsonrpc": "2.0"
  }'
```

This documentation covers both TON Center API versions and DRPC integration comprehensively. Use v2 for simple operations, v3 for advanced querying and analytics, and DRPC as a reliable fallback provider.