import { create } from 'zustand';
import {
  ChainsApiResponse,
  ChainInfo,
  AssetFromResponse,
  ParsedChainInfo,
} from '../types/assetTypes';
import { Asset, Chain } from '@gardenfi/orderbook';
import { getApiEndpoint, IOType } from '../constants/constants';
import { Network } from '@gardenfi/utils';

type AssetStoreState = {
  filter: string;
  chains: ParsedChainInfo[];
  allAssets: Asset[];
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
  setCurrentNetwork: (network: Network) => void;
};

// Helper function to parse chain info
const parseChainInfo = (chainInfo: ChainInfo): ParsedChainInfo => {
  const { chain, chainName } = parseChainName(chainInfo.chain);

  return {
    chainName,
    chain: chain,
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

const parseAsset = (asset: AssetFromResponse, parent: ChainInfo): Asset => {
  const { chain } = parseChainName(parent.chain);
  const { symbol, name } = parseAssetId(asset.id);

  return {
    name: name,
    symbol: symbol,
    chain: chain,
    decimals: asset.decimals,
    tokenAddress: asset.token?.address || '',
    atomicSwapAddress: asset.htlc?.address || '',
    logo: asset.icon,
    price: asset.price,
  };
};

const parseChainName = (
  chainId: string,
): { chain: Chain; chainName: string } => {
  return {
    chain: chainId.split(':')[0] as Chain,
    chainName: chainId
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase()),
  };
};

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

  setCurrentNetwork: (network: Network) => {
    set({ currentNetwork: network });
  },

  openModal: (side: IOType) => set({ modalOpenFor: side }),
  closeModal: () => set({ modalOpenFor: null }),
  openAssetModal: () => set({ isAssetModalOpen: true }),
  closeAssetModal: () => set({ isAssetModalOpen: false, filter: '' }),
  setFilter: (filter) => set({ filter }),
}));
