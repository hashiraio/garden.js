import { Network } from '@gardenfi/utils';
import {
  Asset,
  BlockchainType,
  Chain,
  Chains,
  ChainsConfig,
  getBlockchainType,
} from '../asset';
import { SupportedAssets } from '../constants';

export type ChainAssetString = `${Chain}:${string}`;

export class ChainAsset extends String {
  constructor(chain: Chain, symbol: string) {
    const formatted =
      `${chain.toLowerCase()}:${symbol.toLowerCase()}` as ChainAssetString;
    super(formatted);

    // guard for broken transpilers/bundlers that don't preserve subclassing of builtins
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, new.target.prototype);
    }
  }

  /* ---------------- factories ---------------- */
  static from(
    asset: Asset | ChainAssetString | ChainAsset | string,
  ): ChainAsset {
    if (asset instanceof ChainAsset) return asset;
    if (typeof asset === 'string') return ChainAsset.fromString(asset);
    return ChainAsset.fromAsset(asset);
  }

  static fromChainAndSymbol(chain: Chain, symbol: string): ChainAsset {
    return new ChainAsset(chain, symbol);
  }

  static fromString(formatted: ChainAssetString | string): ChainAsset {
    const [chain, symbol] = formatted.split(':');
    if (!(chain in Chains)) {
      throw new Error(`Invalid chain in asset string: ${chain}`);
    }
    return new ChainAsset(chain as Chain, symbol);
  }

  static fromAsset(asset: Asset): ChainAsset {
    return new ChainAsset(asset.chain, asset.symbol);
  }

  /* ---------------- getters (use inherited string content) ---------------- */
  getChain(): Chain {
    return this.toString().split(':')[0] as Chain;
  }

  getSymbol(): string {
    return this.toString().split(':')[1];
  }

  getNetwork(): Network {
    return ChainsConfig[this.getChain()].network;
  }

  getBlockchainType(): BlockchainType {
    return getBlockchainType(this.getChain());
  }

  getAsset(): Asset {
    return SupportedAssets[this.getNetwork()][
      this.getChain() as keyof (typeof SupportedAssets)[Network]
    ][this.getSymbol()];
  }

  /* ---------------- ensure primitive-like behavior ---------------- */

  // Return primitive string for toString()
  override toString(): string {
    // call String.prototype.toString so it works with boxed internals reliably
    return String.prototype.toString.call(this);
  }

  override valueOf(): string {
    return String.prototype.valueOf.call(this);
  }

  toJSON(): string {
    return this.toString();
  }

  // ensure template literals / String(...) / + coercion behave like string
  [Symbol.toPrimitive](_hint: 'string' | 'number' | 'default') {
    if (_hint === 'number') return NaN;
    return this.toString();
  }

  [Symbol.for('nodejs.util.inspect.custom')]() {
    return this.toString();
  }
}
