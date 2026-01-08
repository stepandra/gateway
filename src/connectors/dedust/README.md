# DeDust Connector for TON Gateway

## AMM Features (v3)

The DeDust connector supports full AMM functionality strictly following the Hummingbot AMM Schema. All operations are performed directly on-chain using the DeDust v3 protocol.

### Endpoints

- `GET /connector/dedust/amm/pool-info`: Fetch pool reserves, fees, and liquidity.
- `GET /connector/dedust/amm/position-info`: Fetch user LP balance and share of reserves.
- `GET /connector/dedust/amm/quote-liquidity`: Calculate required token amounts for adding liquidity.
- `POST /connector/dedust/amm/add-liquidity`: Add liquidity to a pool (supports TON/Jetton and Jetton/Jetton).
- `POST /connector/dedust/amm/remove-liquidity`: Remove liquidity and burn LP tokens.
- `POST /connector/dedust/amm/claim-fees`: Claim accumulated trading fees from a pool.

## Transaction Confirmation Flow

The DeDust connector implements an intelligent transaction confirmation flow for swap executions.

### How it works

When you call `/connector/dedust/swap`, the gateway performs the following steps:

1.  **Submission**: Sends the transaction to the TON network via Toncenter.
2.  **Verification**: Polls for transaction confirmation using:
    *   **Toncenter v3 Actions** (Primary): Checks for semantic success/failure of the action.
    *   **Transaction Lookup** (Fallback): Checks for transaction existence and compute phase exit codes if actions are unavailable.
3.  **Timeout**: Waits up to a configured timeout (default 15s) for the transaction to be confirmed.

### Response Status

The `status` field in the swap response indicates the result:

*   `1`: **Confirmed Success**. The transaction was included in a block and executed successfully.
*   `-1`: **Confirmed Failure**. The transaction was included but failed (e.g., non-zero exit code).
*   `0`: **Pending**. The transaction was submitted (hash provided) but not yet confirmed within the timeout period. You should continue to poll the status using `/chains/ton/poll`.

### Configuration

You can customize the confirmation behavior in your `ton.yml` or root configuration:

```yaml
# conf/root.yml (or relevant config file)
ton:
  networks:
    mainnet:
      # ... other config ...
      txConfirmationTimeoutSeconds: 15  # Time to wait for confirmation (default: 15)
      txPollIntervalSeconds: 3          # Interval between poll attempts (default: 3)
      useToncenterActions: true         # Use v3 Actions API for faster status (default: true)
```
