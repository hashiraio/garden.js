import { create } from 'zustand';
import {
  ChainsApiResponse,
  ChainInfo,
  Asset,
  ParsedChainInfo,
  ParsedAsset,
} from '../types/assetTypes';
import { ChainAsset } from '@gardenfi/orderbook';

type AssetStoreState = {
  chains: ParsedChainInfo[];
  allAssets: ParsedAsset[];
  isLoading: boolean;
  error: string | null;
  fetchAssets: () => Promise<void>;
  getAssetsByChain: (chainKey: string) => ParsedAsset[];
  getChainByKey: (chainKey: string) => ParsedChainInfo | undefined;
  getAssetById: (assetId: string) => ParsedAsset | undefined;
};

// Helper function to parse chain info
const parseChainInfo = (chainInfo: ChainInfo): ParsedChainInfo => {
  const { chainKey, chainDisplayName } = parseChainId(chainInfo.chain);

  return {
    chainKey,
    chainDisplayName,
    chainId: chainInfo.id,
    iconUrl: chainInfo.icon,
    explorerUrl: chainInfo.explorer_url,
    confirmationTarget: chainInfo.confirmation_target,
    sourceTimelock: parseInt(chainInfo.source_timelock),
    destinationTimelock: parseInt(chainInfo.destination_timelock),
    supportedHtlcSchemas: chainInfo.supported_htlc_schemas,
    supportedTokenSchemas: chainInfo.supported_token_schemas,
    assets: chainInfo.assets.map((asset) => parseAsset(asset, chainInfo)),
  };
};

// Helper function to parse asset, inheriting chain display name and id from parent
const parseAsset = (asset: Asset, parent: ChainInfo): ParsedAsset => {
  const { chainDisplayName } = parseChainId(parent.chain);
  const { symbol } = parseAssetId(asset.id);

  return {
    asset: ChainAsset.from(asset.id),
    chainDisplayName,
    chainId: parent.id,
    symbol,
    iconUrl: asset.icon,
    decimals: asset.decimals,
    priceUsd: asset.price,
    minAmountRaw: asset.min_amount,
    maxAmountRaw: asset.max_amount,
    htlcAddress: asset.htlc?.address || null,
    htlcSchema: asset.htlc?.schema || null,
    tokenAddress: asset.token?.address || null,
    tokenSchema: asset.token?.schema || null,
  };
};

// Helper function to parse chain ID
const parseChainId = (
  chainId: string,
): { chainKey: string; chainDisplayName: string } => {
  return {
    chainKey: chainId,
    chainDisplayName: chainId
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase()),
  };
};

// Helper function to parse asset ID
const parseAssetId = (assetId: string): { symbol: string } => {
  const parts = assetId.split(':');
  if (parts.length < 2) {
    return { symbol: assetId.toUpperCase() };
  }
  const symbol = parts[parts.length - 1].toUpperCase();
  return { symbol };
};

export const useAssetStore = create<AssetStoreState>((set, get) => ({
  chains: [],
  allAssets: [],
  isLoading: false,
  error: null,

  fetchAssets: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(
        'https://testnet.api.garden.finance/v2/chains',
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: ChainsApiResponse = await response.json();

      if (data.status !== 'Ok') {
        throw new Error('API returned error status');
      }

      const parsedChains = data.result.map(parseChainInfo);
      const allAssets = parsedChains.flatMap((chain) => chain.assets);
      console.log('allAssets', allAssets);
      console.log('parsedChains', parsedChains);
      set({
        chains: parsedChains,
        allAssets,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        error: error?.message ?? 'Failed to load assets',
        isLoading: false,
      });
    }
  },

  getAssetsByChain: (chainKey: string) => {
    const { chains } = get();
    const chain = chains.find((c) => c.chainKey === chainKey);
    return chain?.assets || [];
  },

  getChainByKey: (chainKey: string) => {
    const { chains } = get();
    return chains.find((c) => c.chainKey === chainKey);
  },

  getAssetById: (assetId: string) => {
    const { allAssets } = get();
    return allAssets.find((asset) => asset.asset.toString() === assetId);
  },
}));
