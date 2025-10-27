import { Asset } from './asset.types';

/** Strip meta keys network & type from a chain object */
type StripMeta<T> = Omit<T, 'network' | 'type'>;

type ChainKeyOf<T extends Record<string, any>> = Extract<keyof T, string>;

type TokenNoChain = Omit<Asset, 'chain'>;

/** For a chain object T[C], produce a token map where each token is Asset<C> */
type WithChainForChainObj<ChainObj extends Record<string, TokenNoChain>> = {
  readonly [TokenKey in keyof ChainObj]: Asset;
};

export type AssetsType<T extends Record<string, any>> = {
  readonly [C in ChainKeyOf<T>]: WithChainForChainObj<StripMeta<T[C]>>;
};

export function buildAssetsWithChain<T extends Record<string, any>>(
  cfg: T,
): AssetsType<T> {
  const out: Record<string, Record<string, Asset>> = {};

  for (const chainKey of Object.keys(cfg)) {
    const chainObj = cfg[chainKey] as Record<string, TokenNoChain>;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { network: _n, type: _t, ...tokens } = chainObj;

    const tokenOut: Record<string, Asset> = {};
    for (const tokenKey of Object.keys(tokens)) {
      const tokenVal = tokens[tokenKey] as TokenNoChain;

      tokenOut[tokenKey] = {
        ...tokenVal,
        chain: chainKey,
      } as Asset;
    }

    out[chainKey as string] = tokenOut;
  }

  return out as AssetsType<T>;
}
