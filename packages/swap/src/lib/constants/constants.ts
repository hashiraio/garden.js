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
