import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { WagmiProvider } from 'wagmi';
import { config } from './config/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@gardenfi/garden-book/style.css';
import '@gardenfi/swap/style.css';
import { SolanaProvider } from './layout/solana/SolanaProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={new QueryClient()}>
        <SolanaProvider>
          <App />
        </SolanaProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
