import { Network } from '@gardenfi/utils';
import { GardenSwapWidget } from '@gardenfi/swap';
import Navbar from './components/Navbar';
import { useEVMWallet } from './hooks/useEVMWallet';
import { useSolanaWallet } from './hooks/useSolanaWallet';

const App = () => {
  const { walletClient } = useEVMWallet();
  const { solanaAnchorProvider } = useSolanaWallet();

  return (
    <div className="bg-[url('/flowerbackground.png')] bg-cover bg-center flex items-center justify-center h-screen flex-col">
      <Navbar />
      <div>
        <GardenSwapWidget
          config={{
            environment: Network.TESTNET,
            apiKey:
              'f242ea49332293424c96c562a6ef575a819908c878134dcb4fce424dc84ec796',
            wallets: {
              evm: walletClient!,
              solana: solanaAnchorProvider!,
            },
          }}
          store={localStorage}
        />
      </div>
    </div>
  );
};

export default App;
