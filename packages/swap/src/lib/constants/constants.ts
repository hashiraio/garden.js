import {
  Asset,
  Chain,
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
} as const;

export enum IOType {
  input = 'input',
  output = 'output',
}

export const API_ENDPOINTS: Record<Network, string> = {
  [Network.MAINNET]: 'https://api.garden.finance',
  [Network.TESTNET]: 'https://testnet.api.garden.finance',
  [Network.LOCALNET]: '',
};

export const DEFAULT_NETWORK = Network.TESTNET;

export const getApiEndpoint = (network: Network): string => {
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
