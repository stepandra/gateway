import { AvailableNetworks } from '../../services/base';
import { ConfigManagerV2 } from '../../services/config-manager-v2';

// TON network utility function
function getAvailableTONNetworks(): string[] {
  // For now, return the standard TON networks
  // This could be made configurable later
  return ['mainnet', 'testnet'];
}

export namespace DedustConfig {
  // Supported networks for DeDust
  export const chain = 'ton';
  export const networks = getAvailableTONNetworks();
  export type Network = string;

  // Supported trading types
  export const tradingTypes = ['router', 'amm'] as const;

  export interface RouterConfig {
    maxHops: number;
    slippageTolerance: number;
    quoteTTL: number;
    gasEstimate: string;
    cacheConfig: {
      ttl: number;
      maxSize: number;
    };
  }

  export interface AMMConfig {
    gasLimit: string;
    priorityFee: string;
    confirmationTimeout: number;
    maxRetries: number;
    cacheConfig: {
      ttl: number;
      maxSize: number;
    };
  }

  export interface LimitsConfig {
    minTonAmount: string;
    maxTonAmount: string;
    minSlippage: number;
    maxSlippage: number;
    minGas: string;
    maxGas: string;
  }

  export interface APIConfig {
    requestTimeout: number;
    retryAttempts: number;
    retryDelay: number;
    rateLimit: {
      requestsPerMinute: number;
      burstLimit: number;
    };
  }

  export interface RootConfig {
    // Available networks
    availableNetworks: Array<AvailableNetworks>;

    // Router configuration
    router: RouterConfig;

    // AMM configuration
    amm: AMMConfig;

    // Transaction limits
    limits: LimitsConfig;

    // API configuration
    api: APIConfig;
  }

  export const config: RootConfig = {
    availableNetworks: [
      {
        chain,
        networks: networks,
      },
    ],

    router: {
      maxHops: ConfigManagerV2.getInstance().get('dedust.router.maxHops') || 3,
      slippageTolerance: ConfigManagerV2.getInstance().get('dedust.router.slippageTolerance') || 1.0,
      quoteTTL: ConfigManagerV2.getInstance().get('dedust.router.quoteTTL') || 60,
      gasEstimate: ConfigManagerV2.getInstance().get('dedust.router.gasEstimate') || '0.1',
      cacheConfig: {
        ttl: ConfigManagerV2.getInstance().get('dedust.router.cacheConfig.ttl') || 30000,
        maxSize: ConfigManagerV2.getInstance().get('dedust.router.cacheConfig.maxSize') || 500,
      },
    },

    amm: {
      gasLimit: ConfigManagerV2.getInstance().get('dedust.amm.gasLimit') || '100000',
      priorityFee: ConfigManagerV2.getInstance().get('dedust.amm.priorityFee') || '0.01',
      confirmationTimeout: ConfigManagerV2.getInstance().get('dedust.amm.confirmationTimeout') || 30000,
      maxRetries: ConfigManagerV2.getInstance().get('dedust.amm.maxRetries') || 3,
      cacheConfig: {
        ttl: ConfigManagerV2.getInstance().get('dedust.amm.cacheConfig.ttl') || 30000,
        maxSize: ConfigManagerV2.getInstance().get('dedust.amm.cacheConfig.maxSize') || 200,
      },
    },

    limits: {
      minTonAmount: ConfigManagerV2.getInstance().get('dedust.limits.minTonAmount') || '0.01',
      maxTonAmount: ConfigManagerV2.getInstance().get('dedust.limits.maxTonAmount') || '1000000',
      minSlippage: ConfigManagerV2.getInstance().get('dedust.limits.minSlippage') || 0,
      maxSlippage: ConfigManagerV2.getInstance().get('dedust.limits.maxSlippage') || 50,
      minGas: ConfigManagerV2.getInstance().get('dedust.limits.minGas') || '0.001',
      maxGas: ConfigManagerV2.getInstance().get('dedust.limits.maxGas') || '1.0',
    },

    api: {
      requestTimeout: ConfigManagerV2.getInstance().get('dedust.api.requestTimeout') || 30000,
      retryAttempts: ConfigManagerV2.getInstance().get('dedust.api.retryAttempts') || 3,
      retryDelay: ConfigManagerV2.getInstance().get('dedust.api.retryDelay') || 1000,
      rateLimit: {
        requestsPerMinute: ConfigManagerV2.getInstance().get('dedust.api.rateLimit.requestsPerMinute') || 100,
        burstLimit: ConfigManagerV2.getInstance().get('dedust.api.rateLimit.burstLimit') || 10,
      },
    },
  };
}