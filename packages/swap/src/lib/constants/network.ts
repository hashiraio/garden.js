import { Network } from '@gardenfi/utils';

export const API_ENDPOINTS: Record<Network, string> = {
  [Network.MAINNET]: 'https://api.garden.finance',
  [Network.TESTNET]: 'https://testnet.api.garden.finance',
  [Network.LOCALNET]: '',
};

export const DEFAULT_NETWORK = Network.TESTNET;

export const getApiEndpoint = (network: Network): string => {
  return API_ENDPOINTS[network];
};
