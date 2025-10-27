import {
  useWallet,
  useAnchorWallet,
  useConnection,
} from '@solana/wallet-adapter-react';
import { useCallback, useEffect, useState } from 'react';
import { AnchorProvider } from '@coral-xyz/anchor';
import type { WalletName } from '@solana/wallet-adapter-base';

export const useSolanaWallet = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [pendingConnect, setPendingConnect] = useState<(() => void) | null>(
    null,
  );

  const {
    select,
    wallets,
    wallet: selectedWallet,
    disconnect,
    connecting,
    connected,
    connect,
  } = useWallet();
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  const [provider, setProvider] = useState<AnchorProvider | null>(null);
  const [solanaAddress, setSolanaAddress] = useState<string | undefined>(
    undefined,
  );
  useEffect(() => {
    if (anchorWallet) {
      const newProvider = new AnchorProvider(connection, anchorWallet, {});
      setProvider(newProvider);
      setSolanaAddress(anchorWallet.publicKey?.toBase58());
    } else {
      setProvider(null);
      setSolanaAddress(undefined);
    }
  }, [connection, anchorWallet, select]);

  const handleWalletClick = useCallback(
    async (walletName: WalletName) => {
      setIsConnecting(true);
      try {
        select(walletName);
        await connect();
        setIsConnecting(false);
        return true;
      } catch (error) {
        console.error('failed to connect solana ❌', error);
        setIsConnecting(false);
        return false;
      }
    },
    [select, connect],
  );

  const solanaDisconnect = useCallback(async () => {
    try {
      await disconnect();
      return true;
    } catch (error) {
      console.error('failed to disconnect solana ❌', error);
      return false;
    }
  }, [disconnect]);

  useEffect(() => {
    if (connected && pendingConnect) {
      pendingConnect();
      setPendingConnect(null);
      setIsConnecting(false);
    }
  }, [connected, pendingConnect]);

  return {
    solanaWallet: anchorWallet,
    solanaConnect: handleWalletClick,
    solanaWallets: wallets,
    solanaSelectedWallet: selectedWallet,
    solanaDisconnect,
    solanaConnecting: isConnecting || connecting,
    solanaConnected: connected,
    solanaAddress: solanaAddress,
    solanaAnchorProvider: provider,
    connection,
  };
};
