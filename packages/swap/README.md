# @gardenfi/swap

[**Demo**](https://jwcgcg0804ocowwoogs4o8cc.staging.btcfi.wtf/)

A drop-in cross-chain Swap Widget for React apps. It bundles `GardenProvider` and renders a full swap UI with quotes, order creation, and in-flight order handling.

## Install

```bash
yarn add @gardenfi/swap
```

## Quick start

1. Import the widget and its styles

```tsx
import '@gardenfi/garden-book/style.css';
import '@gardenfi/swap/style.css';
import { GardenSwapWidget } from '@gardenfi/swap';
```

2. Render it with a minimal config

```tsx
import React from 'react';
import '@gardenfi/swap/style.css';
import '@gardenfi/garden-book/style.css';
import { GardenSwapWidget } from '@gardenfi/swap';
import { Network } from '@gardenfi/utils';
import { useWalletClient } from 'wagmi';

export default function App() {
  const { data: walletClient } = useWalletClient();
  return (
    <GardenSwapWidget
      config={{
        // Environment controls which Garden endpoints to use Network.MAINNET or Network.TESTNET
        environment: Network.MAINNET,

        // Required persistent store (used to track pending orders)
        // Provide a Web Storage-like interface (localStorage works in browsers)
        store: window.localStorage,

        // Optional: enable/disable redeem/persistence service (defaults true)
        setRedeemServiceEnabled: true,

        // Optional: UI style overrides
        styles: {
          buttonColor: '#4F46E5',
        },

        // One of the following connection approaches is required:
        // 1) Wallet-driven (preferred)
        // wallets: { evm: <EvmWallet>, solana: <SolanaWallet>, ... }

        // 2) HTLC actors pre-provisioned (advanced)
        // htlc: { evm: {...}, solana: {...}, bitcoin: {...}, sui: {...}, starknet: {...} }
        wallets: {
          evm: walletClient,
        },
      }}
    />
  );
}
```

That’s it. The widget fetches assets, quotes, validates inputs, and creates orders.

## Props

- `config` (required): Merges provider config with widget options
  - `environment` (required): `Network.MAINNET | Network.TESTNET | { api?: { baseurl: string }, environment?: Network.MAINNET }`
  - `store` (required): Persistent key–value store used by the provider (e.g., `window.localStorage`)
  - `setRedeemServiceEnabled` (optional): `boolean` to enable in-flight order persistence and redeem service (default: `true`)
  - `styles` (optional): `{ buttonColor?: string }` basic UI overrides
  - Wallet or HTLC connectivity (one is required):
    - `wallets` (preferred): Provide connected wallets. The provider will initialize `Garden` via `Garden.fromWallets(...)`.
    - `htlc`: Provide HTLC actor configuration for chains you want to support. The provider will initialize `Garden` directly.
