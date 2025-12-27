import { ConfigManagerV2 } from '../../services/config-manager-v2';

export interface DeDustConfig {
  baseUrl: string;
  slippage: number;
}

export function getDeDustConfig(_network: string): DeDustConfig {
  return {
    baseUrl: ConfigManagerV2.getInstance().get('dedust.router.baseUrl'),
    slippage: ConfigManagerV2.getInstance().get('dedust.router.slippage'),
  };
}
