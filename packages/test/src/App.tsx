import { Network } from '@gardenfi/utils';
import { GardenComponent } from '@gardenfi/swap';
import Navbar from './components/Navbar';
import { useEVMWallet } from '../hooks/useEVMWallet';

const App = () => {
  const { walletClient } = useEVMWallet();
  return (
    <div className="bg-[url('/flowerbackground.png')] bg-cover bg-center flex items-center justify-center h-screen flex-col">
      <Navbar />
      <div>
        <GardenComponent
          config={{
            environment: Network.TESTNET,
            apiKey:
              'f242ea49332293424c96c562a6ef575a819908c878134dcb4fce424dc84ec796',
            wallets: {
              evm: walletClient,
            },
          }}
          store={localStorage}
        />
      </div>
    </div>
  );
};

export default App;
