import { Address, beginCell, Cell } from '@ton/core';

const BLANK_CODE = Cell.fromBase64(
  'te6ccgEBBAEAlgABFP8A9KQT9LzyyAsBAgJwAwIACb8pMvg8APXeA6DprkP0gGBB2onai9qPHDK3AgFA4LEAIZGWCgOeLAP0BQDXnoGSA/YB2s/ay9rI4v/aIxx72omh9IGmDqJljgvlwgcIHgmmPgMEITZ1R/V0K+XoB6Z+AmGpph4CA6hD9ghDodo92qYgjCCLBAHKTdqHsdqD2+ID5f8=',
);

const TYPE_VAULT = 1;
const TYPE_POOL = 2;

export class DeDustAsset {
  public readonly isNative: boolean;
  public readonly address: Address | null;

  private constructor(isNative: boolean, address: Address | null) {
    this.isNative = isNative;
    this.address = address;
  }

  static native(): DeDustAsset {
    return new DeDustAsset(true, null);
  }

  static jetton(address: Address): DeDustAsset {
    return new DeDustAsset(false, address);
  }

  static fromCell(cell: Cell): DeDustAsset {
    const s = cell.beginParse();

    // CPMM v3 uses MsgAddress directly (TLB: _#_ value:MsgAddress = Asset)
    // Try to load as MsgAddress first
    const address = s.loadMaybeAddress();

    if (address === null) {
      // addr_none (00) = native TON
      return DeDustAsset.native();
    }

    // External address check (addr_extern = 01)
    // For now treat as jetton
    return DeDustAsset.jetton(address);
  }

  toAddressString(): string {
    return this.isNative ? 'native' : this.address!.toString();
  }

  toString(): string {
    return this.isNative ? 'native' : `jetton:${this.address!.toString()}`;
  }

  toCell(): Cell {
    const b = beginCell();
    if (this.isNative) {
      b.storeUint(0, 4);
    } else {
      b.storeUint(1, 4);
      b.storeInt(this.address!.workChain, 8);
      b.storeBuffer(this.address!.hash);
    }
    return b.endCell();
  }

  compare(other: DeDustAsset): number {
    if (this.isNative && other.isNative) return 0;
    if (this.isNative) return -1; // Native < Jetton
    if (other.isNative) return 1; // Jetton > Native

    // Compare workchains
    if (this.address!.workChain !== other.address!.workChain) {
      return this.address!.workChain < other.address!.workChain ? -1 : 1;
    }

    // Compare address hashes (bytes)
    const hashA = this.address!.hash;
    const hashB = other.address!.hash;
    for (let i = 0; i < hashA.length; i++) {
      if (hashA[i] < hashB[i]) return -1;
      if (hashA[i] > hashB[i]) return 1;
    }
    return 0;
  }
}

export class DeDustAddressUtils {
  static getVaultAddress(factory: Address, asset: DeDustAsset): Address {
    const assetCell = asset.toCell();

    // Vault params: just the asset slice
    const params = beginCell().storeSlice(assetCell.beginParse());

    return this.createAddress(factory, TYPE_VAULT, params);
  }

  static getPoolAddress(factory: Address, assetA: DeDustAsset, assetB: DeDustAsset): Address {
    const [asset0, asset1] = assetA.compare(assetB) < 0 ? [assetA, assetB] : [assetB, assetA];

    const asset0Cell = asset0.toCell();
    const asset1Cell = asset1.toCell();

    const params = beginCell()
      .storeBit(false) // isStable = false (Assuming volatile for now as per CPMM)
      .storeSlice(asset0Cell.beginParse())
      .storeSlice(asset1Cell.beginParse());

    return this.createAddress(factory, TYPE_POOL, params);
  }

  private static createAddress(factory: Address, contractType: number, params: any): Address {
    const dataCell = beginCell().storeAddress(factory).storeUint(contractType, 8).storeBuilder(params).endCell();

    // StateInit: code + data + library(null)
    // defined in address.go as: MustStoreUInt(0, 2) . StoreMaybeRef(code) . StoreMaybeRef(data) . StoreDict(nil)
    const stateInit = beginCell()
      .storeUint(0, 2)
      .storeMaybeRef(BLANK_CODE)
      .storeMaybeRef(dataCell)
      .storeUint(0, 1) // Dictionary(nil) -> 0 bit
      .endCell();

    return new Address(0, stateInit.hash());
  }
}
