import { useAccount, useConnect, useDisconnect, useWalletClient } from 'wagmi';
import { useChainId } from 'wagmi';

export const clearLocalStorageExcept = (keysToKeep: string[]) => {
  const preservedData: Record<string, string | null> = {};

  keysToKeep.forEach((key) => {
    preservedData[key] = localStorage.getItem(key);
  });

  localStorage.clear();

  keysToKeep.forEach((key) => {
    if (preservedData[key] !== null) {
      localStorage.setItem(key, preservedData[key] as string);
    }
  });
};

export const LOCAL_STORAGE_KEYS = {
  notification: 'notificationId',
  deletedOrders: 'deleted_orders',
};

export const useEVMWallet = () => {
  const { data: walletClient } = useWalletClient();
  const { address, isConnected, connector } = useAccount();
  const { disconnect: disconnectWallet } = useDisconnect();
  const { status, connectors, isPending, connectAsync } = useConnect();
  const chainId = useChainId();

  const disconnect = () => {
    disconnectWallet();
    clearLocalStorageExcept([
      LOCAL_STORAGE_KEYS.notification,
      LOCAL_STORAGE_KEYS.deletedOrders,
    ]);
  };

  return {
    walletClient,
    address,
    connectors,
    isPending,
    connector,
    isConnected,
    status,
    disconnect,
    connectAsync,
    chainId,
  };
};
