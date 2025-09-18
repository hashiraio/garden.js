import { hyperliquid } from '@gardenfi/core';
import { http, createConfig } from 'wagmi';
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
  corn,
  bscTestnet,
} from 'wagmi/chains';

import { injected, metaMask, coinbaseWallet } from 'wagmi/connectors';

declare global {
  interface Window {
    leap?: {
      ethereum?: any;
    };
    keplr?: {
      ethereum?: any;
    };
  }
}

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
  hyperliquid,
  corn,
  bscTestnet,
] as const;

export const leapConnector = injected({
  target() {
    return {
      id: 'leap',
      name: 'Leap Wallet',
      provider:
        typeof window !== 'undefined' ? window.leap?.ethereum : undefined,
    };
  },
});

export const KeplrConnector = injected({
  target() {
    return {
      id: 'keplr',
      name: 'Keplr',
      provider:
        typeof window !== 'undefined' ? window.keplr?.ethereum : undefined,
    };
  },
});

export const config = createConfig({
  chains: SupportedChains,
  connectors: [
    injected(),
    metaMask(),
    coinbaseWallet({
      appName: 'Garden Finance',
      appLogoUrl: 'https://garden-finance.imgix.net/token-images/seed.svg',
    }),
    leapConnector,
    KeplrConnector,
  ],
  transports: {
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [bsc.id]: http(),
    [avalanche.id]: http(),
    [arbitrumSepolia.id]: http(),
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
    [base.id]: http(),
    [berachainTestnetbArtio.id]: http(),
    [berachain.id]: http(),
    [citreaTestnet.id]: http(),
    [monadTestnet.id]: http(),
    [hyperliquid.id]: http(),
    [corn.id]: http(),
    [bscTestnet.id]: http(),
  },
});
