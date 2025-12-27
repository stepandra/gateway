import axios, { AxiosInstance } from 'axios';
import { logger } from './logger';

const VAULT_ADDR_ENV = 'VAULT_ADDR';
const VAULT_TOKEN_ENV = 'VAULT_TOKEN';
const VAULT_NAMESPACE_ENV = 'VAULT_NAMESPACE';

export interface VaultSecret {
  value: string;
  metadata?: Record<string, any>;
}

export class VaultService {
  private static _instance: VaultService | null = null;
  private client: AxiosInstance;
  private vaultAddr: string;
  private vaultToken: string;
  private namespace: string;
  private _enabled: boolean = false;

  private constructor() {
    this.vaultAddr = process.env[VAULT_ADDR_ENV] || '';
    this.vaultToken = process.env[VAULT_TOKEN_ENV] || '';
    this.namespace = process.env[VAULT_NAMESPACE_ENV] || 'gateway';

    if (this.vaultAddr && this.vaultToken) {
      this._enabled = true;
      this.client = axios.create({
        baseURL: this.vaultAddr,
        headers: {
          'X-Vault-Token': this.vaultToken,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      logger.info(`🔐 Vault service enabled: ${this.vaultAddr}`);
    } else {
      this.client = axios.create();
      logger.info('🔓 Vault service disabled (VAULT_ADDR or VAULT_TOKEN not set)');
    }
  }

  public static getInstance(): VaultService {
    if (!VaultService._instance) {
      VaultService._instance = new VaultService();
    }
    return VaultService._instance;
  }

  public get enabled(): boolean {
    return this._enabled;
  }

  async getSecret(path: string): Promise<string | null> {
    if (!this._enabled) {
      return null;
    }

    try {
      const fullPath = path.startsWith('secret/') ? path : `secret/data/${this.namespace}/${path}`;
      const response = await this.client.get(`/v1/${fullPath}`);
      return response.data?.data?.data?.value || response.data?.data?.value || null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        logger.warn(`Vault secret not found: ${path}`);
        return null;
      }
      logger.error(`Vault error fetching secret ${path}: ${error.message}`);
      throw error;
    }
  }

  async getSecretData(path: string): Promise<Record<string, any> | null> {
    if (!this._enabled) {
      return null;
    }

    try {
      const fullPath = path.startsWith('secret/') ? path : `secret/data/${this.namespace}/${path}`;
      const response = await this.client.get(`/v1/${fullPath}`);
      return response.data?.data?.data || response.data?.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      logger.error(`Vault error fetching secret data ${path}: ${error.message}`);
      throw error;
    }
  }

  async setSecret(path: string, value: string): Promise<void> {
    if (!this._enabled) {
      throw new Error('Vault service is not enabled');
    }

    try {
      const fullPath = path.startsWith('secret/') ? path : `secret/data/${this.namespace}/${path}`;
      await this.client.post(`/v1/${fullPath}`, {
        data: { value },
      });
      logger.info(`Vault secret stored: ${path}`);
    } catch (error: any) {
      logger.error(`Vault error storing secret ${path}: ${error.message}`);
      throw error;
    }
  }

  async setSecretData(path: string, data: Record<string, any>): Promise<void> {
    if (!this._enabled) {
      throw new Error('Vault service is not enabled');
    }

    try {
      const fullPath = path.startsWith('secret/') ? path : `secret/data/${this.namespace}/${path}`;
      await this.client.post(`/v1/${fullPath}`, { data });
      logger.info(`Vault secret data stored: ${path}`);
    } catch (error: any) {
      logger.error(`Vault error storing secret data ${path}: ${error.message}`);
      throw error;
    }
  }

  async deleteSecret(path: string): Promise<void> {
    if (!this._enabled) {
      throw new Error('Vault service is not enabled');
    }

    try {
      const fullPath = path.startsWith('secret/') ? path : `secret/data/${this.namespace}/${path}`;
      await this.client.delete(`/v1/${fullPath}`);
      logger.info(`Vault secret deleted: ${path}`);
    } catch (error: any) {
      logger.error(`Vault error deleting secret ${path}: ${error.message}`);
      throw error;
    }
  }

  async getApiKey(service: string): Promise<string | null> {
    return this.getSecret(`apikeys/${service}`);
  }

  async getWalletMnemonic(chain: string, address: string): Promise<string | null> {
    return this.getSecret(`wallets/${chain}/${address}`);
  }

  async storeWalletMnemonic(chain: string, address: string, mnemonic: string): Promise<void> {
    await this.setSecret(`wallets/${chain}/${address}`, mnemonic);
  }

  async healthCheck(): Promise<boolean> {
    if (!this._enabled) {
      return false;
    }

    try {
      const response = await this.client.get('/v1/sys/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
