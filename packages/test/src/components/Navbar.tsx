import { useState } from 'react';
import { useEVMWallet } from '../hooks/useEVMWallet';
import { GardenFullLogo } from '@gardenfi/garden-book';
import { useSolanaWallet } from '../hooks/useSolanaWallet';

const Navbar = () => {
  // EVM wallet hooks
  const {
    connectors,
    connectAsync,
    isConnected,
    address,
    disconnect,
    isPending,
  } = useEVMWallet();

  // Solana wallet hooks
  const {
    solanaWallets,
    solanaConnecting,
    solanaConnect,
    solanaAddress,
    solanaConnected,
    solanaDisconnect,
  } = useSolanaWallet();

  // Dropdown state for EVM wallets
  const [showWallets, setShowWallets] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  // Dropdown state for Solana wallets
  const [showSolanaWallets, setShowSolanaWallets] = useState(false);
  const [solanaConnectingId, setSolanaConnectingId] = useState<string | null>(
    null,
  );

  // EVM connect handler
  const handleConnect = async (connector: any) => {
    setConnectingId(connector.id);
    try {
      await connectAsync({ connector });
      setShowWallets(false);
    } catch (e) {
      // handle error if needed
    } finally {
      setConnectingId(null);
    }
  };

  // EVM disconnect handler
  const handleDisconnect = () => {
    disconnect();
    setShowWallets(false);
  };

  // Solana connect handler
  const handleSolanaConnect = async (wallet: any) => {
    setSolanaConnectingId(wallet.adapter.name);
    try {
      await solanaConnect(wallet.adapter.name);
      setShowSolanaWallets(false);
    } catch (e) {
      // handle error if needed
    } finally {
      setSolanaConnectingId(null);
    }
  };

  // Solana disconnect handler
  const handleSolanaDisconnect = async () => {
    await solanaDisconnect();
    setShowSolanaWallets(false);
  };

  return (
    <nav className="flex items-center fixed top-0 left-0 w-screen justify-between px-6 py-3 border-b border-white/70 bg-white/20 shadow backdrop-blur-xl">
      {/* Left: Logo */}
      <div className="flex items-center">
        <GardenFullLogo />
      </div>
      {/* Right: Wallet Connect */}
      <div className="flex gap-4 relative">
        {/* EVM Wallet Button */}
        <div className="relative">
          {!isConnected ? (
            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              onClick={() => setShowWallets((s) => !s)}
            >
              Connect EVM Wallet
            </button>
          ) : (
            <button
              className="px-4 py-2 bg-gray-200 text-green-700 rounded hover:bg-gray-300 transition font-mono"
              onClick={handleDisconnect}
              title={address}
            >
              {address
                ? address.slice(0, 6) + '...' + address.slice(-4)
                : 'Connected'}
            </button>
          )}
          {/* EVM Wallets Dropdown */}
          {showWallets && !isConnected && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded shadow-lg z-10">
              <ul>
                {connectors.map((connector: any) => (
                  <li key={connector.id}>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center disabled:opacity-50"
                      onClick={() => handleConnect(connector)}
                      disabled={isPending || connectingId === connector.id}
                    >
                      {connector.icon && (
                        <img
                          src={connector.icon}
                          alt={connector.name}
                          className="w-5 h-5 mr-2"
                        />
                      )}
                      <span>
                        {connector.name}
                        {connectingId === connector.id && ' (connecting...)'}
                      </span>
                    </button>
                  </li>
                ))}
                {connectors.length === 0 && (
                  <li>
                    <span className="block px-4 py-2 text-gray-500">
                      No wallets found
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
        {/* Solana Wallet Button */}
        <div className="relative">
          {!solanaConnected ? (
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              onClick={() => setShowSolanaWallets((s) => !s)}
            >
              Connect Solana Wallet
            </button>
          ) : (
            <button
              className="px-4 py-2 bg-gray-200 text-blue-700 rounded hover:bg-gray-300 transition font-mono"
              onClick={handleSolanaDisconnect}
              title={solanaAddress}
            >
              {solanaAddress
                ? solanaAddress.slice(0, 6) + '...' + solanaAddress.slice(-4)
                : 'Connected'}
            </button>
          )}
          {/* Solana Wallets Dropdown */}
          {showSolanaWallets && !solanaConnected && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded shadow-lg z-10">
              <ul>
                {solanaWallets.map((wallet: any) => (
                  <li key={wallet.adapter.name}>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center disabled:opacity-50"
                      onClick={() => handleSolanaConnect(wallet)}
                      disabled={
                        solanaConnecting ||
                        solanaConnectingId === wallet.adapter.name
                      }
                    >
                      {wallet.adapter.icon && (
                        <img
                          src={wallet.adapter.icon}
                          alt={wallet.adapter.name}
                          className="w-5 h-5 mr-2"
                        />
                      )}
                      <span>
                        {wallet.adapter.name}
                        {solanaConnectingId === wallet.adapter.name &&
                          ' (connecting...)'}
                      </span>
                    </button>
                  </li>
                ))}
                {solanaWallets.length === 0 && (
                  <li>
                    <span className="block px-4 py-2 text-gray-500">
                      No Solana wallets found
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
