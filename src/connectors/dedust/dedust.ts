import axios from 'axios';
import { Cell } from '@ton/core';
import { Ton } from '../../chains/ton/ton';
import { DeDustConfig, getDeDustConfig } from './dedust.config';
import { isRawAddress, validateAddress, parseUnits } from '../../chains/ton/ton.utils';
import { logger } from '../../services/logger';
import { httpErrors } from '../../services/error-handler';

export class DeDust {
  private static _instances: { [name: string]: DeDust } = {};
  public chain: Ton;
  public config: DeDustConfig;

  private constructor(network: string) {
    this.chain = Ton.getInstance(network);
    this.config = getDeDustConfig(network);
  }

  public static getInstance(network: string): DeDust {
    if (DeDust._instances[network] === undefined) {
      DeDust._instances[network] = new DeDust(network);
    }
    return DeDust._instances[network];
  }

  public getTokenAddress(symbolOrAddress: string): string {
    if (symbolOrAddress.toLowerCase() === 'native') {
      return 'native';
    }

    if (this.chain.nativeTokenSymbol && symbolOrAddress === this.chain.nativeTokenSymbol) {
      return 'native';
    }

    const token = this.chain.tokenList.find((t) => t.symbol.toLowerCase() === symbolOrAddress.toLowerCase());
    if (token) {
      return token.address;
    }

    if (isRawAddress(symbolOrAddress)) {
      return validateAddress(symbolOrAddress);
    }

    try {
      return validateAddress(symbolOrAddress);
    } catch {
    }

    throw new Error(`Token not found: ${symbolOrAddress}`);
  }

  async getQuote(tokenIn: string, tokenOut: string, amountIn: number, _slippage?: number): Promise<any> {
    const src = this.getTokenAddress(tokenIn);
    const dst = this.getTokenAddress(tokenOut);

    let decimalsIn = 9;
    if (src !== 'native') {
      const token = this.chain.tokenList.find((t) => t.address === src);
      if (token) decimalsIn = token.decimals;
    }

    const amountInBigInt = parseUnits(amountIn, decimalsIn);

    try {
      const response = await axios.post(`${this.config.baseUrl}/router/quote`, {
        in_minter: src,
        out_minter: dst,
        amount: amountInBigInt.toString(),
        swap_mode: 'exact_in',
        slippage_bps: Math.floor((_slippage || 0.5) * 100),
        max_splits: 4,
        max_length: 3,
      });

      const responseData = response.data;
      const swapData = responseData.swap_data;

      let decimalsOut = 9;
      if (dst !== 'native') {
        const token = this.chain.tokenList.find((t) => t.address === dst);
        if (token) decimalsOut = token.decimals;
      }

      const amountOut = Number(BigInt(responseData.out_amount)) / Math.pow(10, decimalsOut);

      return {
        amountOut,
        swapData,
        tokenIn: src,
        tokenOut: dst,
      };
    } catch (error: any) {
      if (error.response) {
        logger.error(`DeDust Quote error: ${error.response.status} ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async executeSwap(walletAddress: string, swapData: any, tokenIn: string, amountIn: number): Promise<any> {
    const wallet = await this.chain.getWallet(walletAddress);
    const balances = await this.chain.getBalances(walletAddress, [tokenIn]);

    const tokenAddress = this.getTokenAddress(tokenIn);
    if (tokenAddress !== 'native') {
      const tokenBalance = balances[tokenIn] || 0;
      if (tokenBalance < amountIn) {
        throw httpErrors.badRequest(
          `Insufficient ${tokenIn} balance. Required: ${amountIn}, Available: ${tokenBalance}`,
        );
      }
    }

    const response = await axios.post(`${this.config.baseUrl}/router/swap`, {
      sender_address: walletAddress,
      swap_data: swapData,
    });

    const transactions = response.data.transactions;

    if (!Array.isArray(transactions)) {
      throw new Error(`Expected array of transactions, got: ${typeof transactions}`);
    }

    let totalTonOut = 0n;

    const internalMessages = transactions.map((tx: any) => {
      const payload = tx.payload ? Cell.fromBase64(tx.payload) : undefined;
      const stateInit = tx.stateInit ? Cell.fromBase64(tx.stateInit) : undefined;
      const amount = BigInt(tx.amount);
      totalTonOut += amount;

      return {
        address: tx.address,
        amount,
        payload,
        stateInit,
        bounce: true,
      };
    });

    const bufferTON = this.chain.config.commissionBuffer || 0.3;
    const bufferNano = BigInt(Math.floor(bufferTON * 1e9));

    const tonBalance = balances[this.chain.nativeTokenSymbol] || 0;
    const tonBalanceNano = BigInt(Math.floor(tonBalance * 1e9));

    if (tonBalanceNano < totalTonOut + bufferNano) {
      throw httpErrors.badRequest(
        `Insufficient TON balance. Required: ${(Number(totalTonOut + bufferNano) / 1e9).toFixed(4)} TON, Available: ${tonBalance.toFixed(4)} TON`,
      );
    }

    const result = await this.chain.sendTransfer(wallet, internalMessages);
    const confirmation = await this.chain.waitForTransactionConfirmation(result.message_hash);
    const status = confirmation.confirmed ? (confirmation.success ? 1 : -1) : 0;

    return {
      signature: result.message_hash,
      status,
    };
  }
}
