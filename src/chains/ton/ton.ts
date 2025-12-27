import crypto from 'crypto';

import { beginCell, external, internal, SendMode, storeMessage } from '@ton/core';
import { KeyPair, mnemonicToWalletKey, mnemonicValidate } from '@ton/crypto';
import { WalletContractV5R1 } from '@ton/ton';
import fse from 'fs-extra';

import { ConfigManagerCertPassphrase } from '../../services/config-manager-cert-passphrase';
import { ConfigManagerV2 } from '../../services/config-manager-v2';
import { logger } from '../../services/logger';
import { TokenService } from '../../services/token-service';
import { VaultService } from '../../services/vault-service';
import { TokenInfo } from '../../tokens/types';
import { walletPath, sanitizePathComponent } from '../../wallet/utils';

import { TonNetworkConfig, getTonNetworkConfig } from './ton.config';
import { PollResponseType } from './ton.schema';
import { validateAddress } from './ton.utils';
import { ToncenterService } from './toncenter-service';

export class TonWallet {
  constructor(
    public readonly address: string,
    public readonly keyPair: KeyPair,
    public readonly contract: WalletContractV5R1,
  ) {}

  async signMessage(message: string): Promise<string> {
    const signature = crypto
      .createHmac('sha256', this.keyPair.secretKey as any)
      .update(message)
      .digest('hex');
    return signature;
  }
}

export class Ton {
  private static _instances: { [name: string]: Ton } = {};
  private _initialized: boolean = false;
  public network: string;
  public chainId: number;
  public nativeTokenSymbol: string;
  public config: TonNetworkConfig;
  public rpcProvider: ToncenterService;
  public tokenList: TokenInfo[] = [];

  private constructor(network: string) {
    this.network = network;
    this.config = getTonNetworkConfig(network);
    this.chainId = this.config.chainID;
    this.nativeTokenSymbol = this.config.nativeCurrencySymbol;

    this.rpcProvider = new ToncenterService(this.config.nodeURL, '');
  }

  private async getApiKey(): Promise<string> {
    const vault = VaultService.getInstance();
    if (vault.enabled) {
      const vaultKey = await vault.getApiKey('toncenter');
      if (vaultKey) {
        logger.info('🔐 Using Toncenter API key from Vault');
        return vaultKey;
      }
    }
    return ConfigManagerV2.getInstance().get('apiKeys.toncenter') || '';
  }

  public static getInstance(network: string): Ton {
    if (Ton._instances[network] === undefined) {
      Ton._instances[network] = new Ton(network);
    }
    return Ton._instances[network];
  }

  public static validateAddress(address: string): string {
    return validateAddress(address);
  }

  public get initialized(): boolean {
    return this._initialized;
  }

  public async init() {
    if (this._initialized) return;

    const apiKey = await this.getApiKey();
    this.rpcProvider = new ToncenterService(this.config.nodeURL, apiKey);

    this.tokenList = (await TokenService.getInstance().loadTokenList('ton', this.network)) as any;

    this._initialized = true;
    logger.info(`✅ TON chain ${this.network} initialized.`);
  }

  async encrypt(secret: string, password: string): Promise<string> {
    const algorithm = 'aes-256-ctr';
    const iv = crypto.randomBytes(16);
    const salt = crypto.randomBytes(32);
    const key = crypto.pbkdf2Sync(password, new Uint8Array(salt), 5000, 32, 'sha512');
    const cipher = crypto.createCipheriv(algorithm, new Uint8Array(key), new Uint8Array(iv));

    const encryptedBuffers = [
      new Uint8Array(cipher.update(new Uint8Array(Buffer.from(secret)))),
      new Uint8Array(cipher.final()),
    ];
    const encrypted = Buffer.concat(encryptedBuffers);

    return JSON.stringify({
      algorithm,
      iv: iv.toJSON(),
      salt: salt.toJSON(),
      encrypted: encrypted.toJSON(),
    });
  }

  async decrypt(encryptedSecret: string, password: string): Promise<string> {
    const hash = JSON.parse(encryptedSecret);
    const salt = Buffer.from(hash.salt);
    const iv = Buffer.from(hash.iv);
    const key = crypto.pbkdf2Sync(password, new Uint8Array(salt), 5000, 32, 'sha512');
    const decipher = crypto.createDecipheriv(hash.algorithm, new Uint8Array(key), new Uint8Array(iv));

    const decryptedBuffers = [
      new Uint8Array(decipher.update(new Uint8Array(Buffer.from(hash.encrypted, 'hex')))),
      new Uint8Array(decipher.final()),
    ];
    const decrypted = Buffer.concat(decryptedBuffers);
    return decrypted.toString();
  }

  public async getWalletFromPrivateKey(privateKey: string): Promise<TonWallet> {
    let keyPair: KeyPair;

    const words = privateKey.trim().split(/\s+/);
    if (words.length >= 12) {
      if (!(await mnemonicValidate(words))) {
        throw new Error('Invalid mnemonic');
      }
      keyPair = await mnemonicToWalletKey(words);
    } else {
      const secretKey = Buffer.from(privateKey, 'hex');
      if (secretKey.length === 32) {
        throw new Error('Hex private key support not fully implemented, please use mnemonic');
      } else if (secretKey.length === 64) {
        keyPair = {
          secretKey,
          publicKey: secretKey.subarray(32),
        };
      } else {
        throw new Error('Invalid private key length');
      }
    }

    const walletContract = WalletContractV5R1.create({
      publicKey: keyPair.publicKey,
      workchain: 0,
    });

    return new TonWallet(walletContract.address.toString(), keyPair, walletContract);
  }

  public async getWallet(address: string): Promise<TonWallet> {
    try {
      const validatedAddress = Ton.validateAddress(address);
      let decrypted: string;

      const vault = VaultService.getInstance();
      if (vault.enabled) {
        const vaultMnemonic = await vault.getWalletMnemonic('ton', validatedAddress);
        if (vaultMnemonic) {
          logger.info(`🔐 Loading TON wallet from Vault: ${validatedAddress.slice(0, 10)}...`);
          decrypted = vaultMnemonic;
        } else {
          decrypted = await this.loadWalletFromFile(validatedAddress);
        }
      } else {
        decrypted = await this.loadWalletFromFile(validatedAddress);
      }

      let keyPair: KeyPair;
      const words = decrypted.trim().split(/\s+/);
      if (words.length >= 12) {
        keyPair = await mnemonicToWalletKey(words);
      } else {
        const secretKey = Buffer.from(decrypted, 'hex');
        if (secretKey.length === 64) {
          keyPair = {
            secretKey,
            publicKey: secretKey.subarray(32),
          };
        } else {
          throw new Error('Invalid stored private key');
        }
      }

      const walletContract = WalletContractV5R1.create({
        publicKey: keyPair.publicKey,
        workchain: 0,
      });

      return new TonWallet(validatedAddress, keyPair, walletContract);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Wallet not found for address: ${address}`);
      }
      throw error;
    }
  }

  private async loadWalletFromFile(address: string): Promise<string> {
    const safeAddress = sanitizePathComponent(address);
    const path = `${walletPath}/ton`;
    const encryptedPrivateKey = await fse.readFile(`${path}/${safeAddress}.json`, 'utf8');

    const passphrase = ConfigManagerCertPassphrase.readPassphrase();
    if (!passphrase) {
      throw new Error('Missing passphrase');
    }
    return this.decrypt(encryptedPrivateKey, passphrase);
  }

  async sendTransfer(wallet: TonWallet, internalMessages: any[]): Promise<any> {
    const seqno = await this.rpcProvider.getWalletSeqno(wallet.address);
    logger.info(`Sending TON Transfer: Address=${wallet.address}, Seqno=${seqno}, Messages=${internalMessages.length}`);

    if (internalMessages.length > 255) {
      throw new Error('Batch too large (max 255 messages)');
    }

    const transfer = wallet.contract.createTransfer({
      seqno,
      secretKey: wallet.keyPair.secretKey,
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages: internalMessages.map((msg) =>
        internal({
          to: msg.address,
          value: msg.amount,
          bounce: msg.bounce ?? true,
          body: msg.payload,
          init: msg.stateInit,
        }),
      ),
    });

    const externalMsg = external({
      to: wallet.contract.address,
      init: seqno === 0 ? wallet.contract.init : undefined,
      body: transfer,
    });

    const boc = beginCell().store(storeMessage(externalMsg)).endCell().toBoc().toString('base64');

    return await this.rpcProvider.sendMessage(boc);
  }

  async getBalances(address: string, tokens?: string[]): Promise<Record<string, number>> {
    const balances: Record<string, number> = {};

    try {
      const accountState = await this.rpcProvider.getAccountState(address);
      balances[this.nativeTokenSymbol] = Number(BigInt(accountState.balance || '0')) / 1e9;
    } catch (error) {
      logger.warn(`Failed to fetch native balance for ${address}: ${error}`);
      balances[this.nativeTokenSymbol] = 0;
    }

    if (tokens && tokens.length > 0) {
      const jettonPromises = tokens
        .filter((symbolOrAddress) => symbolOrAddress !== this.nativeTokenSymbol && symbolOrAddress !== 'native')
        .map(async (symbolOrAddress) => {
          const token = this.tokenList.find((t) => t.symbol === symbolOrAddress || t.address === symbolOrAddress);
          if (token && token.address !== 'native') {
            try {
              const jettonWalletAddress = await this.rpcProvider.getJettonWalletAddress(token.address, address);
              const jettonBalance = await this.rpcProvider.getJettonBalance(jettonWalletAddress);
              return { symbol: token.symbol, balance: Number(jettonBalance) / Math.pow(10, token.decimals) };
            } catch (error) {
              logger.warn(`Failed to fetch jetton balance for ${token.symbol} (${token.address}): ${error}`);
              return { symbol: token.symbol, balance: 0 };
            }
          }
          return null;
        });

      const results = await Promise.all(jettonPromises);
      results.forEach((result) => {
        if (result) {
          balances[result.symbol] = result.balance;
        }
      });
    }

    return balances;
  }

  getTokens(): TokenInfo[] {
    return this.tokenList;
  }

  async getTransaction(msgHash: string): Promise<any> {
    const txs = await this.rpcProvider.transactionsByMessage(msgHash);
    if (txs && txs.length > 0) {
      return txs[0];
    }
    return null;
  }

  async waitForTransactionConfirmation(msgHash: string): Promise<PollResponseType> {
    const start = Date.now();
    const timeout = this.config.txConfirmationTimeoutSeconds * 1000;
    const interval = this.config.txPollIntervalSeconds * 1000;

    const txStatus: PollResponseType = {
      network: this.network,
      txHash: msgHash,
      confirmed: false,
      success: false,
      exitCode: -1,
    };

    while (Date.now() - start < timeout) {
      if (this.config.useToncenterActions) {
        try {
          const actions = await this.rpcProvider.actionsByMessage(msgHash);
          if (actions && actions.length > 0) {
            const action = actions[0];
            // status: 'ok' | 'failed'
            const success = action.status === 'ok';
            return {
              network: this.network,
              txHash: msgHash,
              confirmed: true,
              success: success,
              exitCode: success ? 0 : -1,
              receipt: action,
            };
          }
        } catch (e) {
          logger.warn(`Error polling actions for ${msgHash}: ${e}`);
        }
      }

      try {
        const tx = await this.rpcProvider.transactionsByMessage(msgHash);
        if (tx && tx.length > 0) {
          const transaction = tx[0];
          let success = true;
          let exitCode = 0;

          if (transaction.description?.compute_ph?.exit_code !== undefined) {
            exitCode = transaction.description.compute_ph.exit_code;
            success = exitCode === 0;
          }
          if (success && transaction.description?.action_ph?.result_code !== undefined) {
            const actionCode = transaction.description.action_ph.result_code;
            if (actionCode !== 0) {
              success = false;
              exitCode = actionCode;
            }
          }

          return {
            network: this.network,
            txHash: msgHash,
            confirmed: true,
            success: success,
            exitCode: exitCode,
            receipt: transaction,
          };
        }
      } catch (e) {
        logger.warn(`Error polling transactions for ${msgHash}: ${e}`);
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    return txStatus;
  }
}
