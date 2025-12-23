import { ConfigManagerV2 } from '../../services/config-manager-v2';
import { logger } from '../../services/logger';
import { TONProviderManager, TONProviderConfig } from './services/ton-provider-manager';
import { TONAddressUtils } from './utils/ton-address';
import { TONToken, TONTokenBuilder } from './models/ton-token';
import { TONWallet, TONWalletBuilder } from './models/ton-wallet';
import { TransactionRecord, TransactionRecordBuilder } from './models/transaction-record';

export interface TONChainConfig {
  nodeURL: string;
  drpcURL: string;
  nativeCurrencySymbol: string;
  defaultComputeUnits: number;
  confirmRetryInterval: number;
  confirmRetryCount: number;
  basePriorityFeePct: number;
  minPriorityFeePerCU: number;
  maxFee: number;
  priorityFee: number;
}

export interface TONChainStatus {
  network: string;
  isConnected: boolean;
  currentBlockNumber: number;
  provider: string;
  latency: number;
  lastSyncedAt: number;
}

export interface TONBalanceRequest {
  address: string;
  tokens?: string[];
  fetchAll?: boolean;
  network?: string;
}

export interface TONBalanceResponse {
  balances: Record<string, number>;
}

export interface TONTokensRequest {
  tokenSymbols?: string | string[];
  network?: string;
}

export interface TONTokensResponse {
  tokens: TONToken[];
}

export interface TONEstimateGasRequest {
  fromAddress: string;
  toAddress: string;
  value: string;
  token: string;
  network?: string;
}

export interface TONEstimateGasResponse {
  gasEstimate: string;
  gasCost: string;
  maxFee: string;
  priorityFee: string;
}

export interface TONPollRequest {
  txHash: string;
  network?: string;
}

export interface TONPollResponse {
  txHash: string;
  status: string;
  gasUsed: string;
  gasPrice: string;
  confirmations: number;
  blockHash: string;
  blockNumber: number;
}

export class TON {
  private static _instances: Map<string, TON> = new Map();
  private config: TONChainConfig;
  private network: string;
  private providerManager: TONProviderManager;
  private tokens: Map<string, TONToken> = new Map();

  private constructor(network: string) {
    this.network = network;
    this.config = this.loadConfig(network);
    this.providerManager = new TONProviderManager(this.createProviderConfig());
    this.loadTokens();
  }

  public static getInstance(network: string = 'mainnet'): TON {
    if (!TON._instances.has(network)) {
      TON._instances.set(network, new TON(network));
    }
    return TON._instances.get(network)!;
  }

  private loadConfig(network: string): TONChainConfig {
    const configManager = ConfigManagerV2.getInstance();
    return configManager.get(`chains.ton.networks.${network}`);
  }

  private createProviderConfig(): TONProviderConfig {
    return {
      tonCenterURL: this.config.nodeURL,
      drpcURL: this.config.drpcURL,
      healthCheckInterval: 30000, // 30 seconds
      requestTimeout: 10000, // 10 seconds
      maxRetries: 3,
      retryDelay: 1000, // 1 second
    };
  }

  private loadTokens(): void {
    try {
      const configManager = ConfigManagerV2.getInstance();
      const tokenList = configManager.get(`tokens.ton.${this.network}`);

      // Add native TON token
      const tonToken = TONTokenBuilder.createTONNative(
        this.network === 'mainnet' ? 101 : 102
      );
      this.tokens.set('TON', tonToken);

      // Add other tokens from config
      if (Array.isArray(tokenList)) {
        for (const tokenData of tokenList) {
          try {
            const token = TONTokenBuilder.create({
              symbol: tokenData.symbol,
              address: tokenData.address,
              decimals: tokenData.decimals,
              name: tokenData.name,
              chainId: this.network === 'mainnet' ? 101 : 102,
            });
            this.tokens.set(token.symbol, token);
          } catch (error) {
            logger.warn('Failed to load token', {
              symbol: tokenData.symbol,
              error: (error as Error).message,
            });
          }
        }
      }

      logger.info('TON tokens loaded', {
        network: this.network,
        tokenCount: this.tokens.size,
      });
    } catch (error) {
      logger.error('Failed to load TON tokens', {
        network: this.network,
        error: (error as Error).message,
      });
    }
  }

  async getStatus(): Promise<TONChainStatus> {
    try {
      const startTime = Date.now();
      const masterchainInfo = await this.providerManager.getMasterchainInfo();
      const latency = Date.now() - startTime;

      const providerStatus = this.providerManager.getProviderStatus();

      return {
        network: this.network,
        isConnected: true,
        currentBlockNumber: masterchainInfo.last.seqno,
        provider: providerStatus.current,
        latency,
        lastSyncedAt: Math.floor(Date.now() / 1000),
      };
    } catch (error) {
      logger.error('Failed to get TON chain status', {
        network: this.network,
        error: (error as Error).message,
      });

      return {
        network: this.network,
        isConnected: false,
        currentBlockNumber: 0,
        provider: 'unknown',
        latency: 0,
        lastSyncedAt: 0,
      };
    }
  }

  async getTokens(request: TONTokensRequest): Promise<TONTokensResponse> {
    try {
      let tokens: TONToken[] = [];

      if (request.tokenSymbols) {
        const symbols = Array.isArray(request.tokenSymbols)
          ? request.tokenSymbols
          : [request.tokenSymbols];

        for (const symbol of symbols) {
          const token = this.tokens.get(symbol);
          if (!token) {
            throw new Error(`Token ${symbol} not found`);
          }
          tokens.push(token);
        }
      } else {
        tokens = Array.from(this.tokens.values());
      }

      logger.info('TON tokens retrieved', {
        network: this.network,
        requestedTokens: request.tokenSymbols,
        returnedCount: tokens.length,
      });

      return { tokens };
    } catch (error) {
      logger.error('Failed to get TON tokens', {
        network: this.network,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async getBalances(request: TONBalanceRequest): Promise<TONBalanceResponse> {
    try {
      if (!TONAddressUtils.isValidWalletAddress(request.address)) {
        throw new Error('Invalid wallet address');
      }

      const balances: Record<string, number> = {};

      if (request.fetchAll) {
        // Get all token balances
        for (const [symbol, token] of this.tokens) {
          const balance = await this.getTokenBalance(request.address, token);
          balances[symbol] = balance;
        }
      } else if (request.tokens) {
        // Get specific token balances
        for (const symbol of request.tokens) {
          const token = this.tokens.get(symbol);
          if (!token) {
            throw new Error(`Token ${symbol} not found`);
          }
          const balance = await this.getTokenBalance(request.address, token);
          balances[symbol] = balance;
        }
      } else {
        // Get TON balance only
        const tonToken = this.tokens.get('TON')!;
        const balance = await this.getTokenBalance(request.address, tonToken);
        balances['TON'] = balance;
      }

      logger.info('TON balances retrieved', {
        network: this.network,
        address: TONAddressUtils.formatForDisplay(request.address),
        tokenCount: Object.keys(balances).length,
      });

      return { balances };
    } catch (error) {
      logger.error('Failed to get TON balances', {
        network: this.network,
        address: request.address,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  private async getTokenBalance(address: string, token: TONToken): Promise<number> {
    try {
      if (token.symbol === 'TON') {
        // Get native TON balance
        const addressInfo = await this.providerManager.getAddressInformation(address);
        const balance = addressInfo.balance || '0';
        return parseFloat(TONWalletBuilder.formatBalance(balance, token.decimals));
      } else {
        // Get Jetton balance
        // This would require additional implementation for Jetton wallet contracts
        // For now, return 0 for Jettons
        return 0;
      }
    } catch (error) {
      logger.warn('Failed to get token balance', {
        address: TONAddressUtils.formatForDisplay(address),
        token: token.symbol,
        error: (error as Error).message,
      });
      return 0;
    }
  }

  async estimateGas(request: TONEstimateGasRequest): Promise<TONEstimateGasResponse> {
    try {
      if (!TONAddressUtils.isValidAddress(request.fromAddress)) {
        throw new Error('Invalid fromAddress');
      }
      if (!TONAddressUtils.isValidAddress(request.toAddress)) {
        throw new Error('Invalid toAddress');
      }

      const token = this.tokens.get(request.token);
      if (!token) {
        throw new Error(`Token ${request.token} not found`);
      }

      // Parse the amount
      const amount = TONWalletBuilder.parseAmount(request.value, token.decimals);

      // Create a mock transaction body for estimation
      const mockBody = 'te6ccgEBAQEAJAAAQ4AUUWyGw1BCgUoYJlQjEAOC4MKNcL/JWXUeUF9Iq0ujhXEsqA==';

      // Estimate fee using the provider
      const feeEstimate = await this.providerManager.estimateFee(
        request.fromAddress,
        mockBody
      );

      const gasEstimate = this.config.defaultComputeUnits.toString();
      const gasCost = feeEstimate.source_fees?.gas_fee || this.config.priorityFee;
      const maxFee = this.config.maxFee;
      const priorityFee = this.config.priorityFee;

      logger.info('TON gas estimated', {
        network: this.network,
        fromAddress: TONAddressUtils.formatForDisplay(request.fromAddress),
        toAddress: TONAddressUtils.formatForDisplay(request.toAddress),
        token: request.token,
        value: request.value,
        gasEstimate,
      });

      return {
        gasEstimate,
        gasCost: gasCost.toString(),
        maxFee: maxFee.toString(),
        priorityFee: priorityFee.toString(),
      };
    } catch (error) {
      logger.error('Failed to estimate TON gas', {
        network: this.network,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async poll(request: TONPollRequest): Promise<TONPollResponse> {
    try {
      // In TON, transaction hashes are base64 encoded
      if (!/^[A-Za-z0-9+/=]{43,44}$/.test(request.txHash)) {
        throw new Error('Invalid transaction hash format');
      }

      // Get transaction details
      // Note: This is simplified - real implementation would need to query by hash
      // TON Center API doesn't have direct hash lookup, would need to search transactions

      // For now, return a mock response indicating the transaction was not found
      throw new Error('Transaction not found');

    } catch (error) {
      if ((error as Error).message === 'Transaction not found') {
        logger.warn('Transaction not found', {
          network: this.network,
          txHash: request.txHash,
        });
        throw error;
      }

      logger.error('Failed to poll TON transaction', {
        network: this.network,
        txHash: request.txHash,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  getTokenBySymbol(symbol: string): TONToken | undefined {
    return this.tokens.get(symbol);
  }

  getTokenByAddress(address: string): TONToken | undefined {
    for (const token of this.tokens.values()) {
      if (TONAddressUtils.areEqual(token.address, address)) {
        return token;
      }
    }
    return undefined;
  }

  getAllTokens(): TONToken[] {
    return Array.from(this.tokens.values());
  }

  getNetwork(): string {
    return this.network;
  }

  getConfig(): TONChainConfig {
    return { ...this.config };
  }

  async destroy(): Promise<void> {
    this.providerManager.destroy();
    logger.info('TON chain instance destroyed', { network: this.network });
  }
}