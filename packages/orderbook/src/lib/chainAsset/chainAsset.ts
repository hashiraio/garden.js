import { Network } from '@gardenfi/utils';
import { Asset, BlockchainType, Chain } from '../constants/asset.types';
import { Assets, Chains, Config, getBlockchainType } from '../constants/asset';

export type ChainAssetString = `${Chain}:${string}`;

export type AssetLike = Asset | ChainAssetString | ChainAsset | string;

export class ChainAsset {
  public chain: Chain;
  public symbol: string;
  public blockchainType: BlockchainType;
  public formatted: ChainAssetString;
  public network: Network;
  public asset: Asset;

  constructor(chain: Chain, symbol: string) {
    this.chain = chain;
    this.symbol = symbol;
    this.blockchainType = getBlockchainType(chain);
    this.formatted =
      `${chain.toLowerCase()}:${symbol.toLowerCase()}` as ChainAssetString;
    this.network = Config[chain].network;
    this.asset = Assets[chain as Chain][symbol as keyof (typeof Assets)[Chain]];
  }

  /* ---------------- factories ---------------- */
  static from(asset: AssetLike): ChainAsset {
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

  toString(): string {
    return this.formatted;
  }
}
