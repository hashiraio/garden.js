import { ChainAsset, SupportedAssets } from '@gardenfi/orderbook';
import { Environment, Network } from '@gardenfi/utils';

export type Api = {
  baseurl: string;
  auth: string;
  info: string;
  relayer: string;
};

export const API: Record<Environment, Api> = {
  mainnet: {
    baseurl: 'https://api.garden.finance',
    auth: 'https://api.garden.finance/auth',
    info: 'https://api.garden.finance/info',
    relayer: 'https://relayer.garden.finance',
  },
  testnet: {
    baseurl: 'https://testnet.api.garden.finance',
    auth: 'https://testnet.api.garden.finance/auth',
    info: 'https://testnet.api.garden.finance/info',
    relayer: 'https://testnet.api.garden.finance/relayer',
  },
  localnet: {
    baseurl: '',
    auth: '',
    info: '',
    relayer: '',
  },
} as const;

export const STARKNET_CONFIG: Record<
  Network,
  {
    chainId: string;
    nodeUrl: string;
  }
> = {
  [Network.MAINNET]: {
    chainId: '0x534e5f4d41494e',
    nodeUrl: 'https://starknet-mainnet.public.blastapi.io/rpc/v0_8',
  },
  [Network.TESTNET]: {
    chainId: '0x534e5f5345504f4c4941',
    nodeUrl: 'https://starknet-sepolia.public.blastapi.io/rpc/v0_8',
  },
  [Network.LOCALNET]: {
    chainId: '',
    nodeUrl: '',
  },
};

export const SolanaRelayerAddress: Record<Network, string> = {
  [Network.MAINNET]: '9cBuPNiHXiMNg3Fin8xLCGJQBTXjYQTFtyaFQv2uiM1H',
  [Network.TESTNET]: 'ANUVKxeqaec3bf4DVPqLTnG1PT3Fng56wPcE7LXAb46Q',
  [Network.LOCALNET]: 'AKnL4NNf3DGWZJS6cPknBuEGnVsV4A4m5tgebLHaRSZ9',
} as const;

export const solanaProgramAddress = {
  mainnet: {
    native: '2bag6xpshpvPe7SJ9nSDLHpxqhEAoHPGpEkjNSv7gxoF',
    spl: 'gdnvdMCHJgnidtU7SL8RkRshHPvDJU1pdfZEpoLvqdU',
  },
  staging: {
    native: '6eksgdCnSjUaGQWZ6iYvauv1qzvYPF33RTGTM1ZuyENx',
    spl: '2WXpY8havGjfRxme9LUxtjFHTh1EfU3ur4v6wiK4KdNC',
  },
};

// TODO: change mainnet and localnet packageIds
export const SUI_CONFIG: Record<
  Network,
  { packageId: string; moduleName: string }
> = {
  [Network.TESTNET]: {
    packageId:
      '0x99865b03dd1bc03d0a6a805c454ea257c464f7abcccae9cd4b621b91e7ca04de',
    moduleName: 'AtomicSwap',
  },
  [Network.MAINNET]: {
    packageId:
      '0xbfb5728aab0dd117747ef4574af6d3540ea6093109c22856e3ae201dfd58c0fc',
    moduleName: 'AtomicSwap',
  },
  [Network.LOCALNET]: { packageId: '', moduleName: '' },
} as const;

export const DEFAULT_AFFILIATE_ASSET = {
  asset: ChainAsset.from(SupportedAssets.mainnet.base.cBBTC),
};
