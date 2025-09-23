import { hyperliquid } from '@gardenfi/core';
import {
  arbitrum,
  arbitrumSepolia,
  avalanche,
  bsc,
  mainnet,
  optimism,
  polygon,
  sepolia,
  baseSepolia,
  base,
  berachainTestnetbArtio,
  berachain,
  citreaTestnet,
  monadTestnet,
  Chain,
  corn,
  bscTestnet,
} from 'viem/chains';

export const hyperliquidTestnet: Chain = {
  id: 998,
  name: 'Hyperliquid EVM Testnet',
  nativeCurrency: {
    name: 'Hyperliquid',
    symbol: 'HYPE',
    decimals: 18,
  },
  blockExplorers: {
    default: {
      name: 'Hyperliquid Explorer',
      url: 'https://testnet.purrsec.com/',
    },
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.hyperliquid-testnet.xyz/evm'],
    },
  },
};

export const botanix: Chain = {
  id: 3637,
  name: 'Botanix Mainnet',
  nativeCurrency: {
    name: 'Botanix',
    symbol: 'BTC',
    decimals: 18,
  },
  blockExplorers: {
    default: {
      name: 'Botanix Explorer',
      url: 'https://botanixscan.io/',
    },
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.botanixlabs.com/'],
    },
  },
};

export const SupportedChains = [
  mainnet,
  arbitrum,
  polygon,
  optimism,
  bsc,
  avalanche,
  arbitrumSepolia,
  sepolia,
  baseSepolia,
  base,
  berachainTestnetbArtio,
  berachain,
  citreaTestnet,
  monadTestnet,
  hyperliquidTestnet,
  hyperliquid,
  corn,
  botanix,
  bscTestnet,
] as const;
