import { Network } from '@gardenfi/utils';

//TODO: do we need to verify the APIs?
export const verifyAPIs = (APIs: string[]): string[] => {
  return APIs.map((API) => API);
};

export const getAPIs = (network: Network): string[] => {
  if (network === Network.TESTNET) {
    return RPC_URLS_TESTNET;
  } else if (network === Network.MAINNET) {
    return RPC_URLS_MAINNET;
  }

  throw new Error('Invalid network');
};

export const RPC_URLS_TESTNET = ['https://mempool.space/testnet4/api'];

export const RPC_URLS_MAINNET = [
  'https://mempool.space/api',
  'https://blockstream.info/api',
];
