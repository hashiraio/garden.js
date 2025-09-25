import { hyperliquid } from '@gardenfi/core';
import { BlogIcon, SwapHorizontalIcon } from '@gardenfi/garden-book';
import {
  Asset,
  isBitcoin,
  isEVM,
  isSolana,
  isStarknet,
  isSui,
} from '@gardenfi/orderbook';
import { Network } from '@gardenfi/utils';
import { botanix, citreaTestnet } from 'viem/chains';

export type ErrorFormat =
  | `Minimum amount is ${string} ${string}`
  | `Maximum amount is ${string} ${string}`
  | 'Output amount too high'
  | 'Output amount too less'
  | 'Invalid From Asset'
  | 'Invalid To Asset'
  | true
  | '';

export const Errors = {
  minError: (amount: string, asset: string): ErrorFormat =>
    `Minimum amount is ${amount} ${asset}`,
  maxError: (amount: string, asset: string): ErrorFormat =>
    `Maximum amount is ${amount} ${asset}`,
  outHigh: 'Output amount too high' as const,
  outLow: 'Output amount too less' as const,
  insufficientLiquidity: true,
  insufficientBalance: true,
  none: '' as const,
  invalidFomAssset: 'Invalid From Asset' as const,
  invalidToAsset: 'Invalid To Asset' as const,
} as const;

export enum IOType {
  input = 'input',
  output = 'output',
}

export const API_ENDPOINTS: Record<Network, { api: string; explorer: string }> =
  {
    [Network.MAINNET]: {
      api: 'https://api.garden.finance',
      explorer: 'https://explorer.garden.finance',
    },
    [Network.TESTNET]: {
      api: 'https://testnet.api.garden.finance',
      explorer: 'https://testnet-explorer.garden.finance',
    },
    [Network.LOCALNET]: {
      api: '',
      explorer: '',
    },
  };

export const DEFAULT_NETWORK = Network.TESTNET;

export const getApiEndpoint = (
  network: Network,
): { api: string; explorer: string } => {
  return API_ENDPOINTS[network];
};

export const getTimeEstimates = (inputAsset: Asset) => {
  if (
    isEVM(inputAsset.chain) ||
    isSolana(inputAsset.chain) ||
    isStarknet(inputAsset.chain) ||
    isSui(inputAsset.chain)
  ) {
    return '~30s';
  }
  if (isBitcoin(inputAsset.chain)) {
    return '~10m';
  }

  return '';
};

export const tabs = {
  swap: {
    id: 'swap',
    label: 'Swap',
    index: 0,
    Icon: SwapHorizontalIcon,
  },
  history: {
    id: 'history',
    label: 'History',
    index: 1,
    Icon: BlogIcon,
  },
} as const;

export const MULTICALL_CONTRACT_ADDRESSES: Record<number, string> = {
  [hyperliquid.id]: '0xcA11bde05977b3631167028862bE2a173976CA11',
  [citreaTestnet.id]: '0x8470Ee1FCD47e7F9B90486bB5D142430e5C1f409',
  [botanix.id]: '0xeaE7721d779276eb0f5837e2fE260118724a2Ba4',
};

export const HEIGHTS = {
  small: 348,
  medium: 408,
  large: 496,
};

export const BUFFER_HEIGHT = {
  small: 88,
  medium: 116,
  large: 216,
};
