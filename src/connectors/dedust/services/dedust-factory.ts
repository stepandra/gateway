import { Factory, MAINNET_FACTORY_ADDR, TESTNET_FACTORY_ADDR, VaultNative, Asset } from '@dedust/sdk';
import { Address, TonClient } from '@ton/ton';
import { logger } from '../../../services/logger';

export interface DedustFactoryConfig {
  factoryAddress: string;
  network: 'mainnet' | 'testnet';
  tonClientEndpoint: string;
}

export interface PoolInfo {
  address: string;
  type: 'volatile' | 'stable';
  assets: Asset[];
  reserves: string[];
  totalSupply: string;
  fee: number;
}

export class DedustFactory {
  private factory: Factory;
  private tonClient: TonClient;
  private network: 'mainnet' | 'testnet';

  constructor(config: DedustFactoryConfig) {
    this.network = config.network;
    this.tonClient = new TonClient({ endpoint: config.tonClientEndpoint });

    const factoryAddress = config.network === 'mainnet'
      ? MAINNET_FACTORY_ADDR
      : TESTNET_FACTORY_ADDR;

    this.factory = this.tonClient.open(Factory.createFromAddress(factoryAddress));

    logger.info('DeDust factory initialized', {
      network: this.network,
      factoryAddress: factoryAddress.toString(),
    });
  }

  async getPool(asset0: Asset, asset1: Asset, poolType: 'volatile' | 'stable' = 'volatile'): Promise<PoolInfo | null> {
    try {
      const pool = this.tonClient.open(
        await this.factory.getPool(poolType, [asset0, asset1])
      );

      const poolAddress = pool.address;

      // Check if pool exists by getting its state
      const poolState = await this.tonClient.getContractState(poolAddress);
      if (poolState.state !== 'active') {
        logger.debug('Pool does not exist', {
          asset0: this.assetToString(asset0),
          asset1: this.assetToString(asset1),
          poolType,
        });
        return null;
      }

      // Get pool reserves and other info
      const reserves = await pool.getReserves();
      const totalSupply = await pool.getTotalSupply();

      const poolInfo: PoolInfo = {
        address: poolAddress.toString(),
        type: poolType,
        assets: [asset0, asset1],
        reserves: reserves.map(r => r.toString()),
        totalSupply: totalSupply.toString(),
        fee: this.getPoolFee(poolType),
      };

      logger.debug('Pool info retrieved', {
        poolAddress: poolInfo.address,
        poolType,
        reserves: poolInfo.reserves,
      });

      return poolInfo;
    } catch (error) {
      logger.error('Failed to get pool info', {
        asset0: this.assetToString(asset0),
        asset1: this.assetToString(asset1),
        poolType,
        error: (error as Error).message,
      });
      return null;
    }
  }

  async getAllPools(): Promise<PoolInfo[]> {
    try {
      // DeDust SDK doesn't have a direct method to get all pools
      // This would require scanning the factory events or maintaining a pool registry
      // For now, return empty array
      logger.warn('getAllPools not implemented - DeDust SDK limitation');
      return [];
    } catch (error) {
      logger.error('Failed to get all pools', {
        error: (error as Error).message,
      });
      return [];
    }
  }

  async getPoolByAddress(poolAddress: string): Promise<PoolInfo | null> {
    try {
      const address = Address.parse(poolAddress);

      // Check if pool exists
      const poolState = await this.tonClient.getContractState(address);
      if (poolState.state !== 'active') {
        return null;
      }

      // This would require more complex logic to determine pool type and assets
      // from the contract state. For now, return null.
      logger.warn('getPoolByAddress requires reverse engineering pool contract state');
      return null;
    } catch (error) {
      logger.error('Failed to get pool by address', {
        poolAddress,
        error: (error as Error).message,
      });
      return null;
    }
  }

  createAssetFromToken(tokenAddress: string): Asset {
    try {
      if (tokenAddress === 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c' ||
          tokenAddress === 'TON' ||
          tokenAddress === 'native') {
        // Native TON
        return Asset.native();
      } else {
        // Jetton
        return Asset.jetton(Address.parse(tokenAddress));
      }
    } catch (error) {
      logger.error('Failed to create asset from token', {
        tokenAddress,
        error: (error as Error).message,
      });
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }
  }

  createNativeVault(): VaultNative {
    return this.tonClient.open(VaultNative.createFromAddress(this.factory.address));
  }

  private assetToString(asset: Asset): string {
    if (asset.type === 'native') {
      return 'TON';
    } else if (asset.type === 'jetton') {
      return asset.address.toString();
    }
    return 'unknown';
  }

  private getPoolFee(poolType: 'volatile' | 'stable'): number {
    // DeDust typical fees
    switch (poolType) {
      case 'volatile':
        return 0.3; // 0.3%
      case 'stable':
        return 0.05; // 0.05%
      default:
        return 0.3;
    }
  }

  async getVaultAddress(asset: Asset): Promise<Address> {
    try {
      return await this.factory.getVaultAddress(asset);
    } catch (error) {
      logger.error('Failed to get vault address', {
        asset: this.assetToString(asset),
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async getLpAccountAddress(owner: Address, poolAddress: Address): Promise<Address> {
    try {
      const pool = this.tonClient.open(
        Factory.createFromAddress(poolAddress)
      );
      // This would need to be implemented based on DeDust LP account structure
      throw new Error('getLpAccountAddress not implemented');
    } catch (error) {
      logger.error('Failed to get LP account address', {
        owner: owner.toString(),
        poolAddress: poolAddress.toString(),
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async estimateSwap(
    assetIn: Asset,
    assetOut: Asset,
    amountIn: bigint,
    poolType: 'volatile' | 'stable' = 'volatile'
  ): Promise<{ amountOut: bigint; priceImpact: number } | null> {
    try {
      const poolInfo = await this.getPool(assetIn, assetOut, poolType);
      if (!poolInfo) {
        return null;
      }

      // Get pool contract and estimate swap
      const pool = this.tonClient.open(
        await this.factory.getPool(poolType, [assetIn, assetOut])
      );

      const swapEstimate = await pool.getEstimatedSwapOut(assetIn, amountIn);

      // Calculate price impact
      const priceImpact = this.calculatePriceImpact(
        amountIn,
        swapEstimate.amountOut,
        BigInt(poolInfo.reserves[0]),
        BigInt(poolInfo.reserves[1])
      );

      return {
        amountOut: swapEstimate.amountOut,
        priceImpact,
      };
    } catch (error) {
      logger.error('Failed to estimate swap', {
        assetIn: this.assetToString(assetIn),
        assetOut: this.assetToString(assetOut),
        amountIn: amountIn.toString(),
        poolType,
        error: (error as Error).message,
      });
      return null;
    }
  }

  private calculatePriceImpact(
    amountIn: bigint,
    amountOut: bigint,
    reserve0: bigint,
    reserve1: bigint
  ): number {
    try {
      // Simplified price impact calculation
      // Price before = reserve1 / reserve0
      // Price after = (reserve1 - amountOut) / (reserve0 + amountIn)
      // Impact = (priceBefore - priceAfter) / priceBefore * 100

      if (reserve0 === 0n || reserve1 === 0n) {
        return 0;
      }

      const priceBefore = Number(reserve1) / Number(reserve0);
      const priceAfter = Number(reserve1 - amountOut) / Number(reserve0 + amountIn);

      const impact = Math.abs((priceBefore - priceAfter) / priceBefore) * 100;

      return Math.min(impact, 100); // Cap at 100%
    } catch {
      return 0;
    }
  }

  getFactoryAddress(): Address {
    return this.factory.address;
  }

  getNetwork(): string {
    return this.network;
  }

  getTonClient(): TonClient {
    return this.tonClient;
  }
}