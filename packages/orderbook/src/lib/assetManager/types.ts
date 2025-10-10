import { Asset, Chain } from '../constants/asset.types';
// ============================================
// API Response Types
// ============================================

export type BaseChainData = {
  id: string;
  chain: string | Chain;
  icon: string;
  explorer_url: string;
  confirmation_target: number;
  source_timelock: string;
  destination_timelock: string;
  supported_htlc_schemas: string[];
  supported_token_schemas: string[];
};

export type ChainData = BaseChainData & {
  chain: Chain;
  name: string;
};

export type ApiChainData = BaseChainData & {
  assets: Asset[];
};

export type ApiChainsResponse = {
  status: string;
  result: ApiChainData[];
};

export type FiatResponse = {
  status: string;
  result: Record<string, string>;
};

// ============================================
// Data Structure Types
// ============================================

export type Assets = Record<string, Asset>;
export type Chains = Partial<Record<Chain, ChainData>>;

export type AssetManagerState = {
  allChains: Chains | null;
  allAssets: Assets | null;
  assets: Assets | null;
  chains: Chains | null;
  fiatData: Record<string, number | undefined>;
  isLoading: boolean;
  error: string | null;
};
