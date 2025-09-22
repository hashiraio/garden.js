import { type FC, type ReactNode } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
// import { Network } from '@gardenfi/utils';

interface SolanaProviderProps {
  children: ReactNode;
  // network: Network;
}

export const SolanaProvider: FC<SolanaProviderProps> = ({
  children,
  // network,
}) => {
  // const rpcEndpoint =
  //   network === Network.MAINNET
  //     ? 'https://solana-rpc.publicnode.com'
  //     : 'https://api.devnet.solana.com';
  const rpcEndpoint = 'https://api.devnet.solana.com';

  return (
    <ConnectionProvider endpoint={rpcEndpoint}>
      <WalletProvider wallets={[]} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
};
