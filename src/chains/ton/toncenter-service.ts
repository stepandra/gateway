import { Address, Cell, beginCell, ContractProvider, TupleReader } from '@ton/core';
import axios, { AxiosInstance } from 'axios';

import { logger } from '../../services/logger';

export interface ToncenterMessageResponse {
  message_hash: string;
  message_hash_norm: string;
}

export class ToncenterService {
  private readonly axios: AxiosInstance;

  private normalizeRawAddress(address: string): string {
    const trimmed = address.trim();
    if (/^(-1|0|1):[a-fA-F0-9]{64}$/.test(trimmed)) {
      return trimmed;
    }
    // Support raw format without ':' (e.g. 0<64-hex> or -1<64-hex>)
    if (/^(-1|0|1)[a-fA-F0-9]{64}$/.test(trimmed)) {
      if (trimmed.startsWith('-1')) {
        return `-1:${trimmed.slice(2)}`;
      }
      return `${trimmed[0]}:${trimmed.slice(1)}`;
    }
    return trimmed;
  }

  private normalizeAddress(address: string | Address): string {
    try {
      if (typeof address === 'string') {
        return Address.parse(this.normalizeRawAddress(address)).toRawString();
      }
      return address.toRawString();
    } catch {
      const raw = typeof address === 'string' ? address : address.toString();
      throw new Error(`Invalid TON address: ${raw}`);
    }
  }

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {
    this.axios = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async sendMessage(boc: string): Promise<ToncenterMessageResponse> {
    const url = '/api/v3/message';
    try {
      const response = await this.axios.post(url, { boc });
      const data = response.data;
      // Toncenter responses have been observed in different shapes; support both.
      const message_hash = data?.message_hash ?? data?.result?.hash;
      const message_hash_norm = data?.message_hash_norm ?? data?.result?.hash_norm;

      if (!message_hash) {
        throw new Error(`Toncenter API response missing message hash: ${JSON.stringify(data)}`);
      }
      return {
        message_hash,
        message_hash_norm: message_hash_norm ?? message_hash,
      };
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Toncenter API error: ${error.response.status} ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async transactionsByMessage(msgHash: string): Promise<any[]> {
    const url = '/api/v3/transactionsByMessage';
    try {
      const response = await this.axios.get(url, {
        params: {
          msg_hash: msgHash,
          direction: 'in',
          limit: 1,
          offset: 0,
        },
      });
      return response.data.transactions;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Toncenter API error: ${error.response.status} ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async actionsByMessage(msgHash: string): Promise<any[]> {
    const url = '/api/v3/actions';
    try {
      const response = await this.axios.get(url, {
        params: {
          msg_hash: msgHash,
          limit: 1,
          offset: 0,
          include_transactions: true,
        },
      });
      const data = response.data;
      if (data?.actions && Array.isArray(data.actions)) {
        return data.actions;
      }
      return [];
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Toncenter API error: ${error.response.status} ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async pendingActionsByMessage(msgHash: string): Promise<any[]> {
    const url = '/api/v3/pendingActions';
    try {
      const response = await this.axios.get(url, {
        params: {
          msg_hash: msgHash,
          ext_msg_hash: msgHash,
          limit: 1,
          offset: 0,
          include_transactions: true,
        },
      });
      const data = response.data;
      if (data?.actions && Array.isArray(data.actions)) {
        return data.actions;
      }
      if (data?.pending_actions && Array.isArray(data.pending_actions)) {
        return data.pending_actions;
      }
      return [];
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Toncenter API error: ${error.response.status} ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async getAccountState(address: string): Promise<any> {
    const url = '/api/v3/account';
    try {
      const response = await this.axios.get(url, {
        // Toncenter API v3 is strict about address parsing; always use raw form.
        params: { address: this.normalizeAddress(address) },
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Toncenter API error: ${error.response.status} ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async getWalletSeqno(address: string): Promise<number> {
    try {
      const result = await this.runGetMethod(address, 'seqno');
      const seqnoStr = result.stack[0].value;
      return Number(seqnoStr);
    } catch (error) {
      logger.warn(`Failed to fetch seqno for ${address}: ${error}`);
      return 0;
    }
  }

  async runGetMethod(address: string, method: string, stack: any[] = []): Promise<any> {
    const url = '/api/v3/runGetMethod';
    try {
      const response = await this.axios.post(url, {
        // Toncenter API v3 expects a parseable TON address; normalize input.
        address: this.normalizeAddress(address),
        method,
        stack,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Toncenter API error: ${error.response.status} ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async getJettonWalletAddress(masterAddress: string, ownerAddress: string): Promise<string> {
    const owner = Address.parse(this.normalizeAddress(ownerAddress));
    const stack = [{ type: 'slice', value: beginCell().storeAddress(owner).endCell().toBoc().toString('base64') }];
    const result = await this.runGetMethod(this.normalizeAddress(masterAddress), 'get_wallet_address', stack);

    const sliceBoc = result.stack[0].value;
    const address = Cell.fromBase64(sliceBoc).beginParse().loadAddress();
    return address.toRawString();
  }

  async getJettonBalance(jettonWalletAddress: string): Promise<bigint> {
    const result = await this.runGetMethod(jettonWalletAddress, 'get_wallet_data', []);
    if (result.stack && result.stack.length > 0 && result.stack[0].type === 'num') {
      const balanceHex = result.stack[0].value;
      return BigInt(balanceHex);
    }
    return BigInt(0);
  }

  getProvider(address: Address): ContractProvider {
    return {
      get: async (name, args) => {
        const stack = args.map((item) => {
          if (item.type === 'int') {
            return { type: 'num', value: item.value.toString() };
          } else if (item.type === 'cell') {
            return { type: 'cell', value: item.cell.toBoc().toString('base64') };
          } else if (item.type === 'slice') {
            return { type: 'slice', value: item.cell.toBoc().toString('base64') };
          }
          throw new Error(`Unsupported type for runGetMethod: ${item.type}`);
        });
        const result = await this.runGetMethod(address.toRawString(), name.toString(), stack);
        return {
          stack: new TupleReader(
            result.stack.map((item: any) => {
              if (item.type === 'num') {
                let numValue: bigint;
                if (typeof item.value === 'string' && item.value.startsWith('-0x')) {
                  numValue = -BigInt(item.value.slice(1));
                } else {
                  numValue = BigInt(item.value);
                }
                return { type: 'int', value: numValue };
              } else if (item.type === 'cell') {
                return { type: 'cell', cell: Cell.fromBase64(item.value) };
              } else if (item.type === 'slice') {
                return { type: 'slice', cell: Cell.fromBase64(item.value) };
              } else if (item.type === 'null') {
                return { type: 'null' };
              } else if (item.type === 'list') {
                return { type: 'null' };
              } else if (item.type === 'tuple') {
                return { type: 'null' };
              }
              throw new Error(`Unsupported return type from runGetMethod: ${item.type}`);
            }),
          ),
        };
      },
      external: async (_msg) => {
        throw new Error('Method not implemented.');
      },
      internal: async (_via, _msg) => {
        throw new Error('Method not implemented.');
      },
      getState: async () => {
        const state = await this.getAccountState(address.toRawString());
        return {
          balance: BigInt(state.balance || '0'),
          last: null,
          state: { type: 'active', code: null, data: null }, // Simplified
        } as any;
      },
      getTransactions: async (_address, _lt, _hash, _limit) => {
        throw new Error('Method not implemented.');
      },
      open: (_contract) => {
        throw new Error('Method not implemented.');
      },
    };
  }
}
