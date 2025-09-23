import { useGarden } from '@gardenfi/react-hooks';

export const useWallets = () => {
  const { garden } = useGarden();
  const evmAddress = garden?.htlcs.evm?.htlcActorAddress;
  const starknetAddress = garden?.htlcs.starknet?.htlcActorAddress;
  const solanaAddress = garden?.htlcs.solana?.htlcActorAddress;
  const suiAddress = garden?.htlcs.sui?.htlcActorAddress;
  const bitcoinAddress = garden?.htlcs.bitcoin?.htlcActorAddress;
  return {
    evmAddress,
    starknetAddress,
    solanaAddress,
    suiAddress,
    bitcoinAddress,
  };
};
