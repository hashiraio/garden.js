import { useGarden } from '@gardenfi/react-hooks';

export const useWallets = () => {
  const { garden } = useGarden();
  const evmAddress = garden?.htlcs.evm?.htlcActorAddress;
  const starknetAddress = garden?.htlcs.starknet?.htlcActorAddress;
  const solanaAddress = garden?.htlcs.solana?.htlcActorAddress;
  const suiAddress =
    '0xd001293f1f1f179ef1b4e34db109d008e62fb7e9a0fe98b74b001ec89578c072';
  const bitcoinAddress = garden?.htlcs.bitcoin?.htlcActorAddress;
  return {
    evmAddress,
    starknetAddress,
    solanaAddress,
    suiAddress,
    bitcoinAddress,
  };
};
