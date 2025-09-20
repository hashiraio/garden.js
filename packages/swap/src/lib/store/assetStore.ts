import { create } from 'zustand';
import {
  ChainsApiResponse,
  ChainInfo,
  Asset,
  ParsedChainInfo,
  ParsedAsset,
} from '../types/assetTypes';
import { ChainAsset } from '@gardenfi/orderbook';
import { getApiEndpoint, IOType } from '../constants/constants';
import { Network } from '@gardenfi/utils';

type AssetStoreState = {
  filter: string;
  chains: ParsedChainInfo[];
  allAssets: ParsedAsset[];
  isLoading: boolean;
  error: string | null;
  currentNetwork: Network;
  openAssetModal: () => void;
  closeAssetModal: () => void;
  modalOpenFor: IOType | null;
  isAssetModalOpen: boolean;
  openModal: (side: IOType) => void;
  closeModal: () => void;
  setFilter: (filter: string) => void;
  fetchAssets: (network?: Network) => Promise<void>;
  getAssetsByChain: (chainKey: string) => ParsedAsset[];
  getChainByKey: (chainKey: string) => ParsedChainInfo | undefined;
  getAssetById: (assetId: string) => ParsedAsset | undefined;
  setCurrentNetwork: (network: Network) => void;
};

// Helper function to parse chain info
const parseChainInfo = (chainInfo: ChainInfo): ParsedChainInfo => {
  const { chainName } = parseChainName(chainInfo.chain);

  return {
    chainName,
    chainKey: chainInfo.chain,
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
  const { chainName } = parseChainName(parent.chain);
  const { symbol, name } = parseAssetId(asset.id);

  return {
    asset: ChainAsset.from(asset.id),
    assetName: name,
    chainName,
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
const parseChainName = (chainId: string): { chainName: string } => {
  return {
    chainName: chainId
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase()),
  };
};

// Helper function to parse asset ID
// Symbol to name mapping
const SYMBOL_NAME_MAP: Record<string, string> = {
  wbtc: 'Wrapped Bitcoin',
  sol: 'Solana',
  usdc: 'USD Coin',
  usdt: 'Tether USD',
  btc: 'Bitcoin',
  cbbtc: 'Coinbase Wrapped Bitcoin',
  wcbtc: 'Wrapped Citrea Bitcoin',
};

const parseAssetId = (assetId: string): { symbol: string; name: string } => {
  const parts = assetId.split(':');
  let symbol: string;
  if (parts.length < 2) {
    symbol = assetId.toUpperCase();
  } else {
    symbol = parts[parts.length - 1].toUpperCase();
  }
  // Lookup in map (case-insensitive)
  const name = SYMBOL_NAME_MAP[symbol.toLowerCase()] ?? symbol;
  return { symbol, name };
};

export const useAssetStore = create<AssetStoreState>((set, get) => ({
  chains: [],
  allAssets: [],
  isLoading: false,
  error: null,
  currentNetwork: Network.TESTNET,
  modalOpenFor: null,
  isAssetModalOpen: false,
  filter: '',

  fetchAssets: async (network?: Network) => {
    const targetNetwork = network || get().currentNetwork;
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(
        `${getApiEndpoint(targetNetwork).api}/v2/chains`,
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

      set({
        chains: parsedChains,
        allAssets,
        isLoading: false,
        error: null,
        currentNetwork: targetNetwork,
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

  setCurrentNetwork: (network: Network) => {
    set({ currentNetwork: network });
  },

  openModal: (side: IOType) => set({ modalOpenFor: side }),
  closeModal: () => set({ modalOpenFor: null }),
  openAssetModal: () => set({ isAssetModalOpen: true }),
  closeAssetModal: () => set({ isAssetModalOpen: false, filter: '' }),
  setFilter: (filter) => set({ filter }),
}));
