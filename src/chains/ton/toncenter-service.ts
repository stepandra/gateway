import axios, { AxiosInstance } from 'axios';
import { Address, Cell, beginCell, ContractProvider, TupleReader } from '@ton/core';
import { logger } from '../../services/logger';

export interface ToncenterMessageResponse {
  message_hash: string;
  message_hash_norm: string;
}

export class ToncenterService {
  private readonly axios: AxiosInstance;

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
      return {
        message_hash: response.data.message_hash,
        message_hash_norm: response.data.message_hash_norm,
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
        params: { address },
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
        address,
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
    const owner = Address.parse(ownerAddress);
    const stack = [{ type: 'slice', value: beginCell().storeAddress(owner).endCell().toBoc().toString('base64') }];
    const result = await this.runGetMethod(masterAddress, 'get_wallet_address', stack);

    const sliceBoc = result.stack[0].value;
    const address = Cell.fromBase64(sliceBoc).beginParse().loadAddress();
    return address.toString();
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
        const result = await this.runGetMethod(address.toString(), name.toString(), stack);
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
        const state = await this.getAccountState(address.toString());
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
