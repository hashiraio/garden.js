import { Asset, Chain, ChainAsset } from '@gardenfi/orderbook';
import { FC, SVGProps } from 'react';

export interface AssetFromResponse {
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
  assets: AssetFromResponse[];
}

export interface ChainsApiResponse {
  status: string;
  result: ChainInfo[];
}

// Parsed types for internal use
export interface ParsedChainInfo {
  chain: Chain;
  chainName: string;
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

export interface ParsedAsset extends Asset {
  id: ChainAsset;
  price: number;
  min_amount: string;
  max_amount: string;
}

export type Tab = {
  id: string;
  label: string;
  index: number;
  Icon: FC<SVGProps<SVGSVGElement>>;
};

import type { GardenProviderProps } from '@gardenfi/react-hooks';

export type GardenSwapWidgetStyle = {
  buttonColor?: string;
};

export type GardenSwapWidgetProps = Omit<GardenProviderProps, 'config'> & {
  config: GardenProviderProps['config'] & {
    style?: GardenSwapWidgetStyle;
  };
};
