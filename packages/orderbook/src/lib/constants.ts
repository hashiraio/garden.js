import { Network } from '@gardenfi/utils';
import { Chain as ViemChain } from 'viem';
import { Asset } from './asset';

export enum BlockchainType {
  bitcoin = 'bitcoin',
  evm = 'evm',
  solana = 'solana',
  starknet = 'starknet',
  sui = 'sui',
}

export const ChainsConfig = {
  bitcoin: {
    type: BlockchainType.bitcoin,
    network: Network.MAINNET,
  },
  bitcoin_testnet: {
    type: BlockchainType.bitcoin,
    network: Network.TESTNET,
  },
  bitcoin_regtest: {
    type: BlockchainType.bitcoin,
    network: Network.LOCALNET,
  },
  ethereum: {
    type: BlockchainType.evm,
    network: Network.MAINNET,
  },
  base: {
    type: BlockchainType.evm,
    network: Network.MAINNET,
  },
  arbitrum: {
    type: BlockchainType.evm,
    network: Network.MAINNET,
  },
  ethereum_sepolia: {
    type: BlockchainType.evm,
    network: Network.TESTNET,
  },
  arbitrum_localnet: {
    type: BlockchainType.evm,
    network: Network.LOCALNET,
  },
  arbitrum_sepolia: {
    type: BlockchainType.evm,
    network: Network.TESTNET,
  },
  ethereum_localnet: {
    type: BlockchainType.evm,
    network: Network.LOCALNET,
  },
  base_sepolia: {
    type: BlockchainType.evm,
    network: Network.TESTNET,
  },
  solana: {
    type: BlockchainType.solana,
    network: Network.MAINNET,
  },
  solana_testnet: {
    type: BlockchainType.solana,
    network: Network.TESTNET,
  },
  solana_localnet: {
    type: BlockchainType.solana,
    network: Network.LOCALNET,
  },
  bera_testnet: {
    type: BlockchainType.evm,
    network: Network.TESTNET,
  },
  citrea_testnet: {
    type: BlockchainType.evm,
    network: Network.TESTNET,
  },
  bera: {
    type: BlockchainType.evm,
    network: Network.MAINNET,
  },
  monad_testnet: {
    type: BlockchainType.evm,
    network: Network.TESTNET,
  },
  starknet: {
    type: BlockchainType.starknet,
    network: Network.MAINNET,
  },
  starknet_sepolia: {
    type: BlockchainType.starknet,
    network: Network.TESTNET,
  },
  starknet_devnet: {
    type: BlockchainType.starknet,
    network: Network.LOCALNET,
  },
  hyperliquid_testnet: {
    type: BlockchainType.evm,
    network: Network.TESTNET,
  },
  hyperliquid: {
    type: BlockchainType.evm,
    network: Network.MAINNET,
  },
  unichain: {
    type: BlockchainType.evm,
    network: Network.MAINNET,
  },
  corn: {
    type: BlockchainType.evm,
    network: Network.MAINNET,
  },
  botanix: {
    type: BlockchainType.evm,
    network: Network.MAINNET,
  },
  bnbchain: { type: BlockchainType.evm, network: Network.MAINNET },
  bnbchain_testnet: {
    type: BlockchainType.evm,
    network: Network.TESTNET,
  },
  sui: {
    type: BlockchainType.sui,
    network: Network.MAINNET,
  },
  sui_testnet: {
    type: BlockchainType.sui,
    network: Network.TESTNET,
  },
  core: {
    type: BlockchainType.evm,
    network: Network.MAINNET,
  },
} as const;

export const Chains = Object.keys(ChainsConfig).reduce((acc, key) => {
  acc[key as Chain] = key as Chain;
  return acc;
}, {} as Record<Chain, Chain>);

export type Chain = keyof typeof ChainsConfig;

export const StarknetLocalnet: ViemChain = {
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

export const ArbitrumLocalnet: ViemChain = {
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
export const EthereumLocalnet: ViemChain = {
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

export const SOLSolanaLocalnetAsset: Asset = {
  name: 'SOL Solana Localnet',
  decimals: 9,
  symbol: 'SOL',
  chain: Chains.solana_localnet,
  atomicSwapAddress: 'primary',
  tokenAddress: 'primary',
};
export const bitcoinRegtestAsset: Asset = {
  name: 'Bitcoin Regtest',
  decimals: 8,
  symbol: 'BTC',
  chain: Chains.bitcoin_regtest,
  atomicSwapAddress: 'primary',
  tokenAddress: 'primary',
};
export const WBTCArbitrumLocalnetAsset: Asset = {
  name: 'WBTC Arbitrum Localnet',
  decimals: 8,
  symbol: 'WBTC',
  chain: Chains.arbitrum_localnet,
  // atomicSwapAddress: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  atomicSwapAddress: '0x0165878A594ca255338adfa4d48449f69242Eb8F', //present on localnet
  tokenAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
};
export const WBTCEthereumLocalnetAsset: Asset = {
  name: 'WBTC Ethereum Localnet',
  decimals: 8,
  symbol: 'WBTC',
  chain: Chains.ethereum_localnet,
  // atomicSwapAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  atomicSwapAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', //present on localnet
  tokenAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
};
export const STRKStarknetLocalnetAsset: Asset = {
  name: 'STRK Starknet Localnet',
  decimals: 18,
  symbol: 'STRK',
  chain: Chains.starknet_devnet,
  atomicSwapAddress:
    '0x15cf8b127aa850c97ed10de6f8b300cabc4f09232a57e63667af02fdef8a55a',
  tokenAddress:
    '0x51aa025f1c9948790113e4ebea826dee24542bc50902076c05892774210e8d2',
};
export const ETHStarknetLocalnetAsset: Asset = {
  name: 'ETH Starknet Localnet',
  decimals: 18,
  symbol: 'ETH',
  chain: Chains.starknet_devnet,
  atomicSwapAddress:
    '0x1890470168440bbb9df50988748924a74ea22de10d22a081e458737b9574e75',
  tokenAddress:
    '0x51aa025f1c9948790113e4ebea826dee24542bc50902076c05892774210e8d2',
};

export const SupportedAssets = {
  localnet: {
    solana_localnet: {
      SOL: SOLSolanaLocalnetAsset,
    },
    arbitrum_localnet: {
      WBTC: WBTCArbitrumLocalnetAsset,
    },
    ethereum_localnet: {
      WBTC: WBTCEthereumLocalnetAsset,
    },
    bitcoin_regtest: {
      BTC: bitcoinRegtestAsset,
    },
    starknet_devnet: {
      STRK: STRKStarknetLocalnetAsset,
      ETH: ETHStarknetLocalnetAsset,
    },
  },
  testnet: {
    solana_testnet: {
      SOL: {
        name: 'Solana',
        decimals: 9,
        symbol: 'SOL',
        chain: Chains.solana_testnet,
        logo: 'https://garden-finance.imgix.net/chain_images/solana.png',
        tokenAddress: 'primary',
        atomicSwapAddress:
          '2bag6xpshpvPe7SJ9nSDLHpxqhEAoHPGpEkjNSv7gxoF_primary',
      },
      USDC: {
        name: 'USD Coin',
        decimals: 6,
        symbol: 'USDC',
        chain: Chains.solana_testnet,
        logo: 'https://garden.imgix.net/token-images/usdc.svg',
        tokenAddress: '5JbWjyLdYKTuykpq2itWbdRcZkhK3hs6fiH62pkmLYZi',
        atomicSwapAddress:
          'gdnvdMCHJgnidtU7SL8RkRshHPvDJU1pdfZEpoLvqdU_5JbWjyLdYKTuykpq2itWbdRcZkhK3hs6fiH62pkmLYZi',
      },
      cbBTC: {
        name: 'Coinbase Wrapped Bitcoin',
        decimals: 8,
        symbol: 'cbBTC',
        chain: Chains.solana_testnet,
        logo: 'https://garden.imgix.net/token-images/cbBTC.svg',
        tokenAddress: 'CL8C4gsaEQyWPxL4Zn7dcnZ8LKvPYqHmv4ipMax4cDUL',
        atomicSwapAddress:
          'gdnvdMCHJgnidtU7SL8RkRshHPvDJU1pdfZEpoLvqdU_CL8C4gsaEQyWPxL4Zn7dcnZ8LKvPYqHmv4ipMax4cDUL',
      },
    },
    bitcoin_testnet: {
      BTC: {
        name: 'Bitcoin',
        decimals: 8,
        symbol: 'BTC',
        chain: Chains.bitcoin_testnet,
        logo: 'https://garden.imgix.net/token-images/bitcoin.svg',
        tokenAddress: 'primary',
        atomicSwapAddress: 'primary',
      },
    },
    ethereum_sepolia: {
      WBTC: {
        name: 'Wrapped Bitcoin',
        decimals: 8,
        symbol: 'WBTC',
        chain: Chains.ethereum_sepolia,
        logo: 'https://garden.imgix.net/token-images/wbtc.svg',
        tokenAddress: '0xE918A5a47b8e0AFAC2382bC5D1e981613e63fB07',
        atomicSwapAddress: '0xd1E0Ba2b165726b3a6051b765d4564d030FDcf50',
      },
      USDC: {
        name: 'USD Coin',
        decimals: 6,
        symbol: 'USDC',
        chain: Chains.ethereum_sepolia,
        logo: 'https://garden.imgix.net/token-images/usdc.svg',
        tokenAddress: '0xadDD620EA6D20f4f9c24fff3BC039E497ceBEDc2',
        atomicSwapAddress: '0x730Be401ef981D199a0560C87DfdDaFd3EC1C493',
      },
    },
    arbitrum_sepolia: {
      iBTC: {
        name: 'iBTC',
        decimals: 8,
        symbol: 'iBTC',
        chain: Chains.arbitrum_sepolia,
        logo: 'https://garden.imgix.net/token-images/dlcBTCIcon.svg',
        atomicSwapAddress: '0x7e8c18fa79bd4014cfCf49294Bf315139eD39f45',
        tokenAddress: '0x685437f025c5f33A94818408C286bc1F023201Fc',
      },
      WBTC: {
        name: 'Wrapped Bitcoin',
        decimals: 8,
        symbol: 'WBTC',
        chain: Chains.arbitrum_sepolia,
        logo: 'https://garden.imgix.net/token-images/wbtc.svg',
        atomicSwapAddress: '0xb5AE9785349186069C48794a763DB39EC756B1cF',
        tokenAddress: '0x1c287717c886794ac9f5DF3987195431Ceb3456E',
      },
      USDC: {
        name: 'USD Coin',
        decimals: 6,
        symbol: 'USDC',
        chain: Chains.arbitrum_sepolia,
        logo: 'https://garden.imgix.net/token-images/usdc.svg',
        atomicSwapAddress: '0x8E12d730756457B99ce6E6AbFd60eBe751dA169B',
        tokenAddress: '0xC90Ad72eCc10a52a681ceDAE6EbBD3470A0c829',
      },
      SEED: {
        name: 'Seed',
        decimals: 18,
        symbol: 'SEED',
        chain: Chains.arbitrum_sepolia,
        logo: 'https://garden.imgix.net/token-images/seed.svg',
        atomicSwapAddress: '0xFBD30cB9313fe580031A7E0258693E1cec002803',
        tokenAddress: '0x432B43764548c3E47eA65aAdeB91D75C84DBcC2c',
      },
    },
    base_sepolia: {
      iBTC: {
        name: 'iBTC',
        decimals: 8,
        symbol: 'iBTC',
        chain: Chains.base_sepolia,
        logo: 'https://garden.imgix.net/token-images/dlcBTCIcon.svg',
        atomicSwapAddress: '0x46F1Ba9C9d89C34F9dbC4085F6B1f9965c589ca1',
        tokenAddress: '0x0b0D554D9573bAe1a7556d220847f45182918B28',
      },
      WBTC: {
        name: 'Wrapped Bitcoin',
        decimals: 8,
        symbol: 'WBTC',
        chain: Chains.base_sepolia,
        logo: 'https://garden.imgix.net/token-images/wbtc.svg',
        atomicSwapAddress: '0xd1E0Ba2b165726b3a6051b765d4564d030FDcf50',
        tokenAddress: '0xD8a6E3FCA403d79b6AD6216b60527F51cc967D39',
      },
      USDT: {
        name: 'Tether USD',
        decimals: 6,
        symbol: 'USDT',
        chain: Chains.base_sepolia,
        logo: 'https://garden.imgix.net/token-images/usdt.svg',
        atomicSwapAddress: '0x917cfef972d667dC0FeC76806cB5623585B81493',
        tokenAddress: '0xeaE7721d779276eb0f5837e2fE260118724a2Ba4',
      },
      USDC: {
        name: 'USD Coin',
        decimals: 6,
        symbol: 'USDC',
        chain: Chains.base_sepolia,
        logo: 'https://garden.imgix.net/token-images/usdc.svg',
        atomicSwapAddress: '0x730Be401ef981D199a0560C87DfdDaFd3EC1C493',
        tokenAddress: '0x1ac7A0ebf13a996D5915e212900bE2d074f94988',
      },
    },
    bera_testnet: {},
    citrea_testnet: {
      WCBTC: {
        name: 'Wrapped Citrea Bitcoin',
        decimals: 18,
        symbol: 'WCBTC',
        chain: Chains.citrea_testnet,
        logo: 'https://garden.imgix.net/token-images/wbtc.svg',
        atomicSwapAddress: '0xD8e99df8cf77E7383c2f2a84bC6384b2DF88CAd3',
        tokenAddress: '0x8d0c9d1c17aE5e40ffF9bE350f57840E9E66Cd93',
      },
      WBTC: {
        name: 'Wrapped Bitcoin',
        decimals: 8,
        symbol: 'WBTC',
        chain: Chains.citrea_testnet,
        logo: 'https://garden.imgix.net/token-images/wbtc.svg',
        atomicSwapAddress: '0xd1E0Ba2b165726b3a6051b765d4564d030FDcf50',
        tokenAddress: '0x3edA22460259b29433704dda71cc921F528165Ea',
      },
      CBTC: {
        name: 'Citrea Bitcoin',
        decimals: 18,
        symbol: 'CBTC',
        chain: Chains.citrea_testnet,
        logo: 'https://garden.imgix.net/token-images/bitcoin.svg',
        atomicSwapAddress: '0xE413743B51f3cC8b3ac24addf50D18fa138cB0Bb',
        tokenAddress: 'primary',
      },
      CBBTC: {
        name: 'Citrea Bridged Bitcoin',
        decimals: 8,
        symbol: 'CBBTC',
        chain: Chains.citrea_testnet,
        logo: 'https://garden.imgix.net/token-images/bitcoin.svg',
        atomicSwapAddress: '0x8656d38352CD90ca55881eBd0AF6822839b435A8',
        tokenAddress: '0xeAa998aF280a62Ae08BaE4f9fa59C9b30e6BD306',
      },
      USDC: {
        name: 'USD Coin',
        decimals: 6,
        symbol: 'USDC',
        chain: Chains.citrea_testnet,
        logo: 'https://garden.imgix.net/token-images/usdc.svg',
        atomicSwapAddress: '0x730Be401ef981D199a0560C87DfdDaFd3EC1C493',
        tokenAddress: '0xCdA8661fDA031deFCc9BdD88C0e12669Cac47Fb0',
      },
      USDT: {
        name: 'Tether USD',
        decimals: 6,
        symbol: 'USDT',
        chain: Chains.citrea_testnet,
        logo: 'https://garden.imgix.net/token-images/usdt.svg',
        atomicSwapAddress: '0x917cfef972d667dC0FeC76806cB5623585B81493',
        tokenAddress: '0xF5cFE09b852Ddb164cF6Db419B9c11aAb5F30cb6',
      },
    },
    monad_testnet: {
      cbBTC: {
        name: 'Coinbase Wrapped Bitcoin',
        decimals: 8,
        symbol: 'cbBTC',
        chain: Chains.monad_testnet,
        logo: 'https://garden.imgix.net/token-images/cbBTC.svg',
        atomicSwapAddress: '0x8656d38352CD90ca55881eBd0AF6822839b435A8',
        tokenAddress: '0x6b6303fAb8eC7232b4f2a7b9fa58E5216F608fcb',
      },
      USDC: {
        name: 'USD Coin',
        decimals: 6,
        symbol: 'USDC',
        chain: Chains.monad_testnet,
        logo: 'https://garden.imgix.net/token-images/usdc.svg',
        atomicSwapAddress: '0x730Be401ef981D199a0560C87DfdDaFd3EC1C493',
        tokenAddress: '0xf817257fed379853cde0fa4f97ab987181b1e5ea',
      },
    },
    starknet_sepolia: {
      WBTC: {
        name: 'Wrapped Bitcoin',
        decimals: 8,
        symbol: 'WBTC',
        chain: Chains.starknet_sepolia,
        logo: 'https://garden.imgix.net/token-images/wbtc.svg',
        atomicSwapAddress:
          '0x06579d255314109429a4477d89629bc2b94f529ae01979c2f8014f9246482603',
        tokenAddress:
          '0x496bef3ed20371382fbe0ca6a5a64252c5c848f9f1f0cccf8110fc4def912d5',
      },
    },
    sui_testnet: {
      SUI: {
        name: 'SUI',
        decimals: 9,
        symbol: 'SUI',
        chain: Chains.sui_testnet,
        logo: 'https://garden-finance.imgix.net/chain_images/sui.svg',
        tokenAddress: '0x2::sui::SUI',
        atomicSwapAddress:
          '0x5c438715b7dcc02d12ab92449153a1e5ade2301620d5bf60aa748f006726d369',
      },
    },
    hyperliquid_testnet: {},
    bnbchain_testnet: {
      WBTC: {
        name: 'Wrapped Bitcoin',
        decimals: 8,
        symbol: 'WBTC',
        chain: Chains.bnbchain_testnet,
        logo: 'https://garden.imgix.net/token-images/wbtc.svg',
        atomicSwapAddress: '0xd1E0Ba2b165726b3a6051b765d4564d030FDcf50',
        tokenAddress: '0x39f3294352208905fc6ebf033954E6c6455CdB4C',
      },
    },
  },
  mainnet: {
    bitcoin: {
      BTC: {
        name: 'Bitcoin',
        decimals: 8,
        symbol: 'BTC',
        chain: Chains.bitcoin,
        logo: 'https://garden.imgix.net/token-images/bitcoin.svg',
        atomicSwapAddress: 'primary',
        tokenAddress: 'primary',
      },
    },
    base: {
      USDC: {
        name: 'USD Coin',
        decimals: 6,
        symbol: 'USDC',
        chain: Chains.base,
        logo: 'https://garden.imgix.net/token-images/usdc.svg',
        atomicSwapAddress: '0x5fA58e4E89c85B8d678Ade970bD6afD4311aF17E',
        tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      },
      cBBTC: {
        name: 'Coinbase Wrapped BTC',
        decimals: 8,
        symbol: 'cBBTC',
        chain: Chains.base,
        logo: 'https://coin-images.coingecko.com/coins/images/51336/large/cbbtc.png?1730814747',
        atomicSwapAddress: '0xe35d025d0f0d9492db4700FE8646f7F89150eC04',
        tokenAddress: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
      },
    },
    arbitrum: {
      WBTC: {
        name: 'Wrapped Bitcoin',
        decimals: 8,
        symbol: 'WBTC',
        chain: Chains.arbitrum,
        logo: 'https://garden.imgix.net/token-images/wbtc.svg',
        atomicSwapAddress: '0xb5AE9785349186069C48794a763DB39EC756B1cF',
        tokenAddress: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
      },
      USDC: {
        name: 'USD Coin',
        decimals: 6,
        symbol: 'USDC',
        chain: Chains.arbitrum,
        logo: 'https://garden.imgix.net/token-images/usdc.svg',
        atomicSwapAddress: '0x8E12d730756457B99ce6E6AbFd60eBe751dA169B',
        tokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      },
      iBTC: {
        name: 'iBTC',
        decimals: 8,
        symbol: 'iBTC',
        chain: Chains.arbitrum,
        logo: 'https://garden.imgix.net/token-images/iBTC.png',
        atomicSwapAddress: '0x7e8c18fa79bd4014cfCf49294Bf315139eD39f45',
        tokenAddress: '0x050C24dBf1eEc17babE5fc585F06116A259CC77A',
      },
      SEED: {
        name: 'Seed Token',
        decimals: 18,
        symbol: 'SEED',
        chain: Chains.arbitrum,
        logo: 'https://garden.imgix.net/token-images/seed.svg',
        atomicSwapAddress: '0xFBD30cB9313fe580031A7E0258693E1cec002803',
        tokenAddress: '0x86f65121804D2Cdbef79F9f072D4e0c2eEbABC08',
      },
    },
    ethereum: {
      ETH: {
        name: 'Ethereum',
        decimals: 18,
        symbol: 'ETH',
        chain: Chains.ethereum,
        logo: 'https://garden.imgix.net/chain_images/ethereum.svg',
        atomicSwapAddress: '0xE413743B51f3cC8b3ac24addf50D18fa138cB0Bb',
        tokenAddress: 'primary',
      },
      USDC: {
        name: 'USD Coin',
        decimals: 6,
        symbol: 'USDC',
        chain: Chains.ethereum,
        logo: 'https://garden.imgix.net/token-images/usdc.svg',
        atomicSwapAddress: '0x5fA58e4E89c85B8d678Ade970bD6afD4311aF17E',
        tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      },
      WBTC: {
        name: 'Wrapped Bitcoin',
        decimals: 8,
        symbol: 'WBTC',
        chain: Chains.ethereum,
        logo: 'https://garden.imgix.net/token-images/wbtc.svg',
        atomicSwapAddress: '0xD781a2abB3FCB9fC0D1Dd85697c237d06b75fe95',
        tokenAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      },
      cBBTC: {
        name: 'Coinbase Wrapped BTC',
        decimals: 8,
        symbol: 'cBBTC',
        chain: Chains.ethereum,
        logo: 'https://garden.imgix.net/token-images/cbBTC.svg',
        atomicSwapAddress: '0xe35d025d0f0d9492db4700FE8646f7F89150eC04',
        tokenAddress: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
      },
      iBTC: {
        name: 'iBTC',
        decimals: 8,
        symbol: 'iBTC',
        chain: Chains.ethereum,
        logo: 'https://garden.imgix.net/token-images/iBTC.png',
        atomicSwapAddress: '0x3aebBC6Dd1d024BE1C579E18e2EB92667B6f3579',
        tokenAddress: '0x20157DBAbb84e3BBFE68C349d0d44E48AE7B5AD2',
      },
      SEED: {
        name: 'Seed Token',
        decimals: 18,
        symbol: 'SEED',
        chain: Chains.ethereum,
        logo: 'https://garden.imgix.net/token-images/seed.svg',
        atomicSwapAddress: '0xCE511De667885f92B8c36fcfC79C3B5bEb875463',
        tokenAddress: '0x5eed99d066a8CaF10f3E4327c1b3D8b673485eED',
      },
    },
    solana: {
      SOL: {
        name: 'Solana',
        decimals: 9,
        symbol: 'SOL',
        chain: Chains.solana,
        logo: 'https://garden-finance.imgix.net/chain_images/solana.png',
        atomicSwapAddress: '2bag6xpshpvPe7SJ9nSDLHpxqhEAoHPGpEkjNSv7gxoF',
        tokenAddress: 'primary',
      },
      USDC: {
        name: 'USD Coin',
        decimals: 6,
        symbol: 'USDC',
        chain: Chains.solana,
        logo: 'https://garden.imgix.net/token-images/usdc.svg',
        atomicSwapAddress: 'gdnvdMCHJgnidtU7SL8RkRshHPvDJU1pdfZEpoLvqdU',
        tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      },
      cBBTC: {
        name: 'Coinbase Wrapped BTC',
        decimals: 8,
        symbol: 'cBBTC',
        chain: Chains.solana,
        logo: 'https://garden.imgix.net/token-images/cbBTC.svg',
        atomicSwapAddress: 'gdnvdMCHJgnidtU7SL8RkRshHPvDJU1pdfZEpoLvqdU',
        tokenAddress: 'cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij',
      },
    },
    bera: {
      LBTC: {
        name: 'Lombard BTC',
        decimals: 8,
        symbol: 'LBTC',
        chain: Chains.bera,
        logo: 'https://garden.imgix.net/token-images/LBTC.svg',
        atomicSwapAddress: '0x84A396920d8B8CA2e69bD9503Bc1B2f73f1b8b33',
        tokenAddress: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
      },
    },
    starknet: {
      WBTC: {
        name: 'Wrapped Bitcoin',
        decimals: 8,
        symbol: 'WBTC',
        chain: Chains.starknet,
        logo: 'https://garden.imgix.net/token-images/wbtc.svg',
        atomicSwapAddress:
          '0x7defd8eb3b770005ab1ca5f89ad31f98fb5bc3c52deaeafd130be3b49f967b4',
        tokenAddress:
          '0x3fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac',
      },
    },
    sui: {
      SUI: {
        name: 'Sui',
        decimals: 9,
        symbol: 'SUI',
        chain: Chains.sui,
        logo: 'https://garden-finance.imgix.net/chain_images/sui.svg',
        atomicSwapAddress:
          '0xa4f4e653547e98d4b541378e14db2393a09aff4b829f158b133d2eb3c3a942b5',
        tokenAddress: '0x2::sui::SUI',
      },
    },
    hyperliquid: {
      uBTC: {
        name: 'uBTC',
        decimals: 8,
        symbol: 'uBTC',
        chain: Chains.hyperliquid,
        logo: 'https://garden.imgix.net/token-images/bitcoin.svg',
        atomicSwapAddress: '0xDC74a45e86DEdf1fF7c6dac77e0c2F082f9E4F72',
        tokenAddress: '0x9FDBdA0A5e284c32744D2f17Ee5c74B284993463',
      },
    },
    unichain: {
      WBTC: {
        name: 'Wrapped Bitcoin',
        decimals: 8,
        symbol: 'WBTC',
        chain: Chains.unichain,
        logo: 'https://garden.imgix.net/token-images/wbtc.svg',
        atomicSwapAddress: '0xD781a2abB3FCB9fC0D1Dd85697c237d06b75fe95',
        tokenAddress: '0x927B51f251480a681271180DA4de28D44EC4AfB8',
      },
      USDC: {
        name: 'USD Coin',
        decimals: 6,
        symbol: 'USDC',
        chain: Chains.unichain,
        logo: 'https://garden.imgix.net/token-images/usdc.svg',
        atomicSwapAddress: '0x5fA58e4E89c85B8d678Ade970bD6afD4311aF17E',
        tokenAddress: '0x078D782b760474a361dDA0AF3839290b0EF57AD6',
      },
    },
    corn: {
      BTCN: {
        name: 'Bitcorn',
        decimals: 18,
        symbol: 'BTCN',
        chain: Chains.corn,
        logo: 'https://garden.imgix.net/token-images/bitcorn.svg',
        atomicSwapAddress: '0xE413743B51f3cC8b3ac24addf50D18fa138cB0Bb',
        tokenAddress: 'primary',
      },
    },
    botanix: {
      BTC: {
        name: 'Botanix Bitcoin',
        decimals: 18,
        symbol: 'BTC',
        chain: Chains.botanix,
        logo: 'https://garden.imgix.net/token-images/bitcoin.svg',
        atomicSwapAddress: '0xE413743B51f3cC8b3ac24addf50D18fa138cB0Bb',
        tokenAddress: 'primary',
      },
    },
    bnbchain: {
      BTCB: {
        name: 'BTCB',
        decimals: 18,
        symbol: 'BTCB',
        chain: Chains.bnbchain,
        logo: 'https://garden.imgix.net/token-images/bitcoin.svg',
        atomicSwapAddress: '0xe74784E5A45528fDEcB257477DD6bd31c8ef0761',
        tokenAddress: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
      },
      USDC: {
        name: 'USD Coin',
        decimals: 18,
        symbol: 'USDC',
        chain: Chains.bnbchain,
        logo: 'https://garden.imgix.net/token-images/usdc.svg',
        atomicSwapAddress: '0x5fA58e4E89c85B8d678Ade970bD6afD4311aF17E',
        tokenAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      },
    },
    core: {
      WBTC: {
        name: 'Wrapped Bitcoin',
        decimals: 8,
        symbol: 'WBTC',
        chain: Chains.core,
        logo: 'https://garden.imgix.net/token-images/wbtc.svg',
        atomicSwapAddress: '0xD781a2abB3FCB9fC0D1Dd85697c237d06b75fe95',
        tokenAddress: '0x5832f53d147b3d6Cd4578B9CBD62425C7ea9d0Bd',
      },
    },
  },
} as const;

export const Assets = SupportedAssets.mainnet;
