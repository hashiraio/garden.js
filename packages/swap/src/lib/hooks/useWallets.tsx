import { useGarden } from '@gardenfi/react-hooks';
import { useEffect, useState } from 'react';

export const useWallets = () => {
  const { garden } = useGarden();
  const [provider, setProvider] = useState<any>(null);

  const evmAddress = garden?.htlcs.evm?.htlcActorAddress;
  const starknetAddress = garden?.htlcs.starknet?.htlcActorAddress;
  const solanaAddress = garden?.htlcs.solana?.htlcActorAddress;
  const suiAddress = garden?.htlcs.sui?.htlcActorAddress;
  const bitcoinAddress = garden?.htlcs.bitcoin?.htlcActorAddress;

  useEffect(() => {
    let isMounted = true;
    const fetchProvider = async () => {
      if (garden?.htlcs.bitcoin) {
        const prov = await garden.htlcs.bitcoin.getProvider();
        console.log('prov', prov);
        if (isMounted) setProvider(prov);
      }
    };
    fetchProvider();
    return () => {
      isMounted = false;
    };
  }, [garden]);

  return {
    evmAddress,
    starknetAddress,
    solanaAddress,
    suiAddress,
    bitcoinAddress,
    bitcoinProvider: provider,
  };
};
