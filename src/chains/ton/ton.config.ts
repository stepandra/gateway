import { ConfigManagerV2 } from '../../services/config-manager-v2';

export interface TonNetworkConfig {
  chainID: number;
  nodeURL: string;
  nativeCurrencySymbol: string;
  rpcProvider: string;
  commissionBuffer: number;
  txConfirmationTimeoutSeconds: number;
  txPollIntervalSeconds: number;
  useToncenterActions: boolean;
}

export interface TonChainConfig {
  defaultNetwork: string;
  rpcProvider: string;
}

export function getTonNetworkConfig(network: string): TonNetworkConfig {
  const namespaceId = `ton-${network}`;
  return {
    chainID: ConfigManagerV2.getInstance().get(namespaceId + '.chainID'),
    nodeURL: ConfigManagerV2.getInstance().get(namespaceId + '.nodeURL'),
    nativeCurrencySymbol: ConfigManagerV2.getInstance().get(namespaceId + '.nativeCurrencySymbol'),
    rpcProvider: ConfigManagerV2.getInstance().get(namespaceId + '.rpcProvider'),
    commissionBuffer: ConfigManagerV2.getInstance().get(namespaceId + '.commissionBuffer'),
    txConfirmationTimeoutSeconds:
      ConfigManagerV2.getInstance().get(namespaceId + '.txConfirmationTimeoutSeconds') ?? 15,
    txPollIntervalSeconds: ConfigManagerV2.getInstance().get(namespaceId + '.txPollIntervalSeconds') ?? 3,
    useToncenterActions: ConfigManagerV2.getInstance().get(namespaceId + '.useToncenterActions') ?? true,
  };
}

export function getTonChainConfig(): TonChainConfig {
  return {
    defaultNetwork: ConfigManagerV2.getInstance().get('ton.defaultNetwork'),
    rpcProvider: ConfigManagerV2.getInstance().get('ton.rpcProvider') || 'url',
  };
}
