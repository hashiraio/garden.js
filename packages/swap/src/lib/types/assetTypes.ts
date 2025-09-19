export interface ChainAsset {
  id: string;
  chain: string;
  icon: string;
  htlc: {
    address: string;
    schema: string;
  } | null;
  token: {
    address: string;
    schema: string | null;
  } | null;
  decimals: number;
  min_amount: string;
  max_amount: string;
  price: number;
}

export interface ChainInfo {
  chain: string;
  id: string;
  icon: string;
  explorer_url: string;
  confirmation_target: number;
  source_timelock: string;
  destination_timelock: string;
  supported_htlc_schemas: string[];
  supported_token_schemas: string[];
  assets: ChainAsset[];
}

export interface ChainsApiResponse {
  status: string;
  result: ChainInfo[];
}

// Parsed types for internal use
export interface ParsedChainInfo {
  chainKey: string;
  chainDisplayName: string;
  chainId: string;
  iconUrl: string;
  explorerUrl: string;
  confirmationTarget: number;
  sourceTimelock: number;
  destinationTimelock: number;
  supportedHtlcSchemas: string[];
  supportedTokenSchemas: string[];
  assets: ParsedAsset[];
}

export interface ParsedAsset {
  id: string;
  chainKey: string;
  chainDisplayName: string;
  chainId: string;
  symbol: string;
  iconUrl: string;
  decimals: number;
  priceUsd: number;
  minAmountRaw: string;
  maxAmountRaw: string;
  htlcAddress: string | null;
  htlcSchema: string | null;
  tokenAddress: string | null;
  tokenSchema: string | null;
}

// Legacy compatibility types
export interface ApiAsset {
  id: string;
  chain: string;
  icon: string | null;
  htlc: { address: string; schema: string } | null;
  token: { address: string; schema: string | null } | null;
  decimals: number;
  min_amount: string;
  max_amount: string;
  price: number;
}
