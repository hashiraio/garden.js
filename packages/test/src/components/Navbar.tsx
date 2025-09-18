import { useState } from 'react';
import { useEVMWallet } from '../../hooks/useEVMWallet';
import { GardenFullLogo } from '@gardenfi/garden-book';

const Navbar = () => {
  const {
    connectors,
    connectAsync,
    isConnected,
    address,
    disconnect,
    isPending,
  } = useEVMWallet();

  const [showWallets, setShowWallets] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

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

  const handleDisconnect = () => {
    disconnect();
    setShowWallets(false);
  };

  return (
    <nav className="flex items-center fixed top-0 left-0 w-screen justify-between px-6 py-3 border-b border-white/70 bg-white/20 shadow backdrop-blur-xl">
      {/* Left: Logo */}
      <div className="flex items-center">
        <GardenFullLogo />
      </div>
      {/* Right: Wallet Connect */}
      <div className="relative">
        {!isConnected ? (
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            onClick={() => setShowWallets((s) => !s)}
          >
            Connect Wallet
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
        {/* Wallets Dropdown */}
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
    </nav>
  );
};

export default Navbar;
