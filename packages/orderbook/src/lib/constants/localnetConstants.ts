import { Chain as viemChain } from 'viem';

export const StarknetLocalnet: viemChain = {
  id: 1001,
  name: 'Starknet Localnet',
  nativeCurrency: {
    name: 'Stark Token',
    symbol: 'STRK',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8547/'],
    },
  },
  testnet: true,
};

export const ArbitrumLocalnet: viemChain = {
  id: 31338,
  name: 'Arbitrum Localnet',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['http://localhost:8546/'],
    },
  },
  testnet: true,
};
export const EthereumLocalnet: viemChain = {
  id: 31337,
  name: 'Ethereum Localnet',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['http://localhost:8545/'],
    },
  },
  testnet: true,
};

export const SOLSolanaLocalnetAsset = {
  name: 'SOL Solana Localnet',
  decimals: 9,
  symbol: 'SOL',
  atomicSwapAddress: 'primary',
  tokenAddress: 'primary',
};
export const bitcoinRegtestAsset = {
  name: 'Bitcoin Regtest',
  decimals: 8,
  symbol: 'BTC',
  atomicSwapAddress: 'primary',
  tokenAddress: 'primary',
};
export const WBTCArbitrumLocalnetAsset = {
  name: 'WBTC Arbitrum Localnet',
  decimals: 8,
  symbol: 'WBTC',
  // atomicSwapAddress: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  atomicSwapAddress: '0x0165878A594ca255338adfa4d48449f69242Eb8F', //present on localnet
  tokenAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
};
export const WBTCEthereumLocalnetAsset = {
  name: 'WBTC Ethereum Localnet',
  decimals: 8,
  symbol: 'WBTC',
  // atomicSwapAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  atomicSwapAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', //present on localnet
  tokenAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
};
export const STRKStarknetLocalnetAsset = {
  name: 'STRK Starknet Localnet',
  decimals: 18,
  symbol: 'STRK',
  atomicSwapAddress:
    '0x15cf8b127aa850c97ed10de6f8b300cabc4f09232a57e63667af02fdef8a55a',
  tokenAddress:
    '0x51aa025f1c9948790113e4ebea826dee24542bc50902076c05892774210e8d2',
};
export const ETHStarknetLocalnetAsset = {
  name: 'ETH Starknet Localnet',
  decimals: 18,
  symbol: 'ETH',
  atomicSwapAddress:
    '0x1890470168440bbb9df50988748924a74ea22de10d22a081e458737b9574e75',
  tokenAddress:
    '0x51aa025f1c9948790113e4ebea826dee24542bc50902076c05892774210e8d2',
};
