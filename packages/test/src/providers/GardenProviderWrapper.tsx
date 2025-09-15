'use client';

import { GardenProvider } from '@gardenfi/react-hooks';
import { Network } from '@gardenfi/utils';
import { useWalletClient } from 'wagmi';

const getStorage = (): Storage => {
  if (typeof window !== 'undefined') {
    return localStorage;
  }
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  };
};

function GardenProviderWrapper({ children }: { children: React.ReactNode }) {
  const { data: walletClient } = useWalletClient();

  return (
    <GardenProvider
      config={{
        store: getStorage(),
        environment: {
          network: Network.MAINNET,
        },
        walletClient: walletClient,
      }}
    >
      {children}
    </GardenProvider>
  );
}

export default GardenProviderWrapper;
