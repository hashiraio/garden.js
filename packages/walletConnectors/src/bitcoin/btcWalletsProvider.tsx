import React, {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { Connect, IInjectedBitcoinProvider } from './bitcoin.types';
import { OKXProvider } from './providers/okx/provider';
import { OKXBitcoinProvider } from './providers/okx/okx.types';
import { UnisatBitcoinProvider } from './providers/unisat/unisat.types';
import { XVerseBitcoinProvider } from './providers/xverse/xverse.types';
import { XdefiBitcoinProvider } from './providers/xdefi/xdefi.types';
import { PhantomBitcoinProvider } from './providers/phantom/phantom.types';
import { KeplrBitcoinProvider } from './providers/keplr/keplr.types';
import { UnisatProvider } from './providers/unisat/provider';
import { PhantomProvider } from './providers/phantom/provider';
import { XverseProvider } from './providers/xverse/provider';
import { KeplrProvider } from './providers/keplr/provider';
// import { XdefiProvider } from './providers/xdefi/provider';
import {
  AvailableWallets,
  BTCWalletProviderContextType,
  BTCWalletProviderProps,
} from './btcWalletsProvider.types';
import { Err, Network, Ok, Void } from '@gardenfi/utils';
import { StandardProvider } from './providers/standard/provider';

declare global {
  interface Window {
    okxwallet?: {
      bitcoin?: OKXBitcoinProvider;
      bitcoinTestnet?: OKXBitcoinProvider;
    };
    XverseProviders?: {
      BitcoinProvider: XVerseBitcoinProvider;
    };
    unisat?: UnisatBitcoinProvider;
    xfi?: {
      bitcoin: XdefiBitcoinProvider;
    };
    phantom?: {
      bitcoin: PhantomBitcoinProvider;
    };
    keplr?: {
      bitcoin: KeplrBitcoinProvider;
    };
  }
}

const BTCWalletProviderContext = createContext<
  BTCWalletProviderContextType | undefined
>(undefined);

export const BTCWalletProvider = ({
  children,
  network,
  store,
  standardWalletConfig,
}: BTCWalletProviderProps) => {
  const [provider, setProvider] = useState<IInjectedBitcoinProvider>();
  const [account, setAccount] = useState<string>();
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [availableWallets, setAvailableWallets] = useState<AvailableWallets>(
    {},
  );

  const isConnected = useMemo(
    () => !!provider && !!account,
    [provider, account],
  );

  //connect to the specified wallet and set the provider and account
  const connect = async (bitcoinWallet: IInjectedBitcoinProvider) => {
    setIsConnecting(true);
    const res = await bitcoinWallet.connect(network);
    if (!res.ok) {
      setIsConnecting(false);
      return Err(res.error);
    }

    if (res.val.network !== network) {
      setIsConnecting(false);
      return Err('Network mismatch');
    }

    setProvider(res.val.provider);
    setAccount(res.val.address);

    store.setItem('bitcoinWallet', JSON.stringify(res.val));

    setIsConnecting(false);
    return Ok(Void);
  };

  const disconnect = () => {
    if (!provider) return Err('No provider to disconnect');
    provider.disconnect();
    setProvider(undefined);
    setAccount(undefined);

    store.removeItem('bitcoinWallet');

    return Ok(Void);
  };

  const updateAccount = useCallback(async () => {
    if (!provider) return;

    const accounts = await provider.getAccounts();
    if (!accounts.ok) {
      console.error('Error getting accounts:', accounts.error);
      return;
    }

    setAccount(accounts.val[0]);

    const network = await provider.getNetwork();
    if (network.error) {
      console.error('Error getting network:', network.error);
      return;
    }
  }, [provider]);

  //adds wallet to the available wallet list
  const addToWalletList = (wallet: IInjectedBitcoinProvider) => {
    setAvailableWallets((p) => ({
      ...p,
      [wallet.id]: wallet,
    }));
  };

  const updateWalletList = async () => {
    if (
      window.okxwallet &&
      window.okxwallet.bitcoin &&
      window.okxwallet.bitcoinTestnet
    ) {
      const okxProvider = new OKXProvider(
        network === Network.MAINNET
          ? window.okxwallet.bitcoin
          : window.okxwallet.bitcoinTestnet,
        network,
      );
      addToWalletList(okxProvider);
    }
    if (
      network === Network.MAINNET &&
      window.phantom &&
      window.phantom.bitcoin
    ) {
      const phantomProvider = new PhantomProvider(window.phantom.bitcoin);
      addToWalletList(phantomProvider);
    }
    if (window.unisat) {
      const uniProvider = new UnisatProvider(window.unisat, network);
      addToWalletList(uniProvider);
    }
    if (window.XverseProviders && window.XverseProviders.BitcoinProvider) {
      const xverseProvider = new XverseProvider(
        window.XverseProviders.BitcoinProvider,
      );
      addToWalletList(xverseProvider);
    }
    if (network === Network.MAINNET && window.keplr && window.keplr.bitcoin) {
      const keplrProvider = new KeplrProvider(window.keplr.bitcoin);
      addToWalletList(keplrProvider);
    }
    if (standardWalletConfig) {
      const standardProvider = new StandardProvider(standardWalletConfig);
      addToWalletList(standardProvider);
    }
    // if (window.xfi && window.xfi.bitcoin) {
    //   const xdefiProvider = new XdefiProvider(window.xfi.bitcoin);
    //   addToWalletList(BitcoinWallets.XDEFI, xdefiProvider);
    //   const res = await xdefiProvider.getAccounts();
    //   setAccount(res.val[0]);
    // }
  };

  const initializeProviderAndAccount = async () => {
    const previousConnectedData = store.getItem('bitcoinWallet');
    if (previousConnectedData) {
      const isAlreadyConnected: Connect = JSON.parse(previousConnectedData);
      const _provider = availableWallets[isAlreadyConnected.id];
      if (_provider) {
        const addresses = await _provider.getAccounts();
        if (!addresses.ok || !addresses.val[0]) return;

        const currentNetwork = await _provider.getNetwork();
        if (currentNetwork.error) return;
        if (currentNetwork.val !== network) return;

        setProvider(_provider);
        setAccount(addresses.val[0]);
      }
    }
  };

  //updates the available wallets list
  useEffect(() => {
    updateWalletList();
  }, []);

  // if the wallet is already connected then set the provider and account
  useEffect(() => {
    if (!availableWallets) return;
    initializeProviderAndAccount();
  }, [availableWallets]);

  useEffect(() => {
    if (!provider) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) return;
      setAccount(accounts[0]);
    };
    provider.on('accountsChanged', handleAccountsChanged);

    return () => {
      provider.off('accountsChanged', handleAccountsChanged);
    };
  }, [provider]);

  return (
    <BTCWalletProviderContext.Provider
      value={{
        availableWallets,
        connect,
        provider,
        account,
        network,
        isConnecting,
        updateAccount,
        disconnect,
        isConnected,
      }}
    >
      {children}
    </BTCWalletProviderContext.Provider>
  );
};

export const useBitcoinWallet = () => {
  const context = useContext(BTCWalletProviderContext);
  if (!context) {
    throw new Error('useBitcoinWallet must be used within BTCWalletProvider');
  }
  return context;
};

//I will give network I want all the wallets to connect the given network
