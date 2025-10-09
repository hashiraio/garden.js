import { Network } from '@gardenfi/utils';
import { BlockchainType, Chain, ChainsByBlockchainType } from './asset.types';
import {
  SOLSolanaLocalnetAsset,
  WBTCArbitrumLocalnetAsset,
  WBTCEthereumLocalnetAsset,
  bitcoinRegtestAsset,
  STRKStarknetLocalnetAsset,
  ETHStarknetLocalnetAsset,
} from './localnetConstants';
import { buildAssetsWithChain } from './utils';
import { ChainAsset } from '../chainAsset/chainAsset';

export enum OrderStatus {
  Created = 'Created',
  InitiateDetected = 'Initiate Detected',
  Initiated = 'Initiated',
  AwaitingRedeem = 'Awaiting Redeem',
  RedeemDetected = 'Redeem Detected',
  Redeemed = 'Redeemed',
  AwaitingRefund = 'Awaiting Refund',
  RefundDetected = 'Refund Detected',
  Refunded = 'Refunded',
  Expired = 'Expired',
}

export enum OrderLifecycle {
  refunded = 'refunded',
  expired = 'expired',
  completed = 'completed',
  inProgress = 'in-progress',
  notInitiated = 'not-initiated',
  all = 'all',
  pending = 'pending',
  fulfilled = 'fulfilled',
}

export const Config = {
  solana_localnet: {
    type: BlockchainType.solana,
    SOL: SOLSolanaLocalnetAsset,
    network: Network.LOCALNET,
  },
  arbitrum_localnet: {
    type: BlockchainType.evm,
    WBTC: WBTCArbitrumLocalnetAsset,
    network: Network.LOCALNET,
  },
  ethereum_localnet: {
    type: BlockchainType.evm,
    WBTC: WBTCEthereumLocalnetAsset,
    network: Network.LOCALNET,
  },
  bitcoin_regtest: {
    type: BlockchainType.bitcoin,
    BTC: bitcoinRegtestAsset,
    network: Network.LOCALNET,
  },
  starknet_devnet: {
    type: BlockchainType.starknet,
    STRK: STRKStarknetLocalnetAsset,
    ETH: ETHStarknetLocalnetAsset,
    network: Network.LOCALNET,
  },
  solana_testnet: {
    type: BlockchainType.solana,
    network: Network.TESTNET,
    SOL: {
      id: 'solana_testnet:sol',
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9,
      icon: 'https://garden-finance.imgix.net/chain_images/solana.png',
      chain: 'solana:103',
      htlc: {
        address: '2bag6xpshpvPe7SJ9nSDLHpxqhEAoHPGpEkjNSv7gxoF',
        schema: 'solana:htlc',
      },
      token: null,
    },
    USDC: {
      id: 'solana_testnet:usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      icon: 'https://garden.imgix.net/token-images/usdc.svg',
      chain: 'solana:103',
      htlc: {
        address: 'gdnvdMCHJgnidtU7SL8RkRshHPvDJU1pdfZEpoLvqdU',
        schema: 'solana:htlc_spltoken',
      },
      token: {
        address: '5JbWjyLdYKTuykpq2itWbdRcZkhK3hs6fiH62pkmLYZi',
        schema: null,
      },
    },
    cbBTC: {
      id: 'solana_testnet:cbbtc',
      name: 'Coinbase Wrapped Bitcoin',
      symbol: 'cbBTC',
      decimals: 8,
      icon: 'https://garden.imgix.net/token-images/cbBTC.svg',
      chain: 'solana:103',
      htlc: {
        address: 'gdnvdMCHJgnidtU7SL8RkRshHPvDJU1pdfZEpoLvqdU',
        schema: 'solana:htlc_spltoken',
      },
      token: {
        address: 'CL8C4gsaEQyWPxL4Zn7dcnZ8LKvPYqHmv4ipMax4cDUL',
        schema: null,
      },
    },
  },
  bitcoin_testnet: {
    type: BlockchainType.bitcoin,
    network: Network.TESTNET,
    BTC: {
      id: 'bitcoin_testnet:btc',
      name: 'Bitcoin',
      symbol: 'BTC',
      decimals: 8,
      icon: 'https://garden.imgix.net/token-images/bitcoin.svg',
      chain: 'bitcoin',
      htlc: null,
      token: null,
    },
  },
  ethereum_sepolia: {
    type: BlockchainType.evm,
    network: Network.TESTNET,
    WBTC: {
      id: 'ethereum_sepolia:wbtc',
      name: 'Wrapped Bitcoin',
      symbol: 'WBTC',
      decimals: 8,
      icon: 'https://garden.imgix.net/token-images/wbtc.svg',
      chain: 'evm:11155111',
      htlc: {
        address: '0xd1E0Ba2b165726b3a6051b765d4564d030FDcf50',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0xE918A5a47b8e0AFAC2382bC5D1e981613e63fB07',
        schema: 'evm:erc20',
      },
    },
    USDC: {
      id: 'ethereum_sepolia:usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      icon: 'https://garden.imgix.net/token-images/usdc.svg',
      chain: 'evm:11155111',
      htlc: {
        address: '0x730Be401ef981D199a0560C87DfdDaFd3EC1C493',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0xadDD620EA6D20f4f9c24fff3BC039E497ceBEDc2',
        schema: 'evm:erc20',
      },
    },
  },
  arbitrum_sepolia: {
    type: BlockchainType.evm,
    network: Network.TESTNET,
    iBTC: {
      id: 'arbitrum_sepolia:ibtc',
      name: 'iBTC',
      symbol: 'iBTC',
      decimals: 8,
      icon: 'https://garden.imgix.net/token-images/dlcBTCIcon.svg',
      chain: 'evm:421614',
      htlc: {
        address: '0x7e8c18fa79bd4014cfCf49294Bf315139eD39f45',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0x685437f025c5f33A94818408C286bc1F023201Fc',
        schema: 'evm:erc20',
      },
    },
    WBTC: {
      id: 'arbitrum_sepolia:wbtc',
      name: 'Wrapped Bitcoin',
      symbol: 'WBTC',
      decimals: 8,
      icon: 'https://garden.imgix.net/token-images/wbtc.svg',
      chain: 'evm:421614',
      htlc: {
        address: '0xb5AE9785349186069C48794a763DB39EC756B1cF',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0x1c287717c886794ac9f5DF3987195431Ceb3456E',
        schema: 'evm:erc20',
      },
    },
    USDC: {
      id: 'arbitrum_sepolia:usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      icon: 'https://garden.imgix.net/token-images/usdc.svg',
      chain: 'evm:421614',
      htlc: {
        address: '0x8E12d730756457B99ce6E6AbFd60eBe751dA169B',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0xC90Ad772eCc10a52a681ceDAE6EbBD3470A0c829',
        schema: 'evm:erc20',
      },
    },
    SEED: {
      id: 'arbitrum_sepolia:seed',
      name: 'Seed',
      symbol: 'SEED',
      decimals: 18,
      icon: 'https://garden.imgix.net/token-images/SEED.svg',
      chain: 'evm:421614',
      htlc: {
        address: '0xFBD30cB9313fe580031A7E0258693E1cec002803',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0x432B43764548c3E47eA65aAdeB91D75C84DBcC2c',
        schema: 'evm:erc20',
      },
    },
  },
  base_sepolia: {
    type: BlockchainType.evm,
    network: Network.TESTNET,
    iBTC: {
      id: 'base_sepolia:ibtc',
      name: 'iBTC',
      symbol: 'iBTC',
      decimals: 8,
      icon: 'https://garden.imgix.net/token-images/dlcBTCIcon.svg',
      chain: 'evm:84532',
      htlc: {
        address: '0x46F1Ba9C9d89C34F9dbC4085F6B1f9965c589ca1',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0x0b0D554D9573bAe1a7556d220847f45182918B28',
        schema: 'evm:erc20',
      },
    },
    WBTC: {
      id: 'base_sepolia:wbtc',
      name: 'Wrapped Bitcoin',
      symbol: 'WBTC',
      decimals: 8,
      icon: 'https://garden.imgix.net/token-images/wbtc.svg',
      chain: 'evm:84532',
      htlc: {
        address: '0xd1E0Ba2b165726b3a6051b765d4564d030FDcf50',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0xD8a6E3FCA403d79b6AD6216b60527F51cc967D39',
        schema: 'evm:erc20',
      },
    },
    USDT: {
      id: 'base_sepolia:usdt',
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
      icon: 'https://garden.imgix.net/token-images/usdt.svg',
      chain: 'evm:84532',
      htlc: {
        address: '0x917cfef972d667dC0FeC76806cB5623585B81493',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0xeaE7721d779276eb0f5837e2fE260118724a2Ba4',
        schema: 'evm:erc20',
      },
    },
    USDC: {
      id: 'base_sepolia:usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      icon: 'https://garden.imgix.net/token-images/usdc.svg',
      chain: 'evm:84532',
      htlc: {
        address: '0x730Be401ef981D199a0560C87DfdDaFd3EC1C493',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0x1ac7A0ebf13a996D5915e212900bE2d074f94988',
        schema: 'evm:erc20',
      },
    },
  },
  bera_testnet: {
    type: BlockchainType.evm,
    network: Network.TESTNET,
  },
  citrea_testnet: {
    type: BlockchainType.evm,
    network: Network.TESTNET,
    WCBTC: {
      id: 'citrea_testnet:wcbtc',
      name: 'Wrapped Citrea Bitcoin',
      symbol: 'WCBTC',
      decimals: 18,
      icon: 'https://garden.imgix.net/token-images/wbtc.svg',
      chain: 'evm:5115',
      htlc: {
        address: '0xD8e99df8cf77E7383c2f2a84bC6384b2DF88CAd3',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0x8d0c9d1c17aE5e40ffF9bE350f57840E9E66Cd93',
        schema: 'evm:erc20',
      },
    },
    WBTC: {
      id: 'citrea_testnet:wbtc',
      name: 'Wrapped Bitcoin',
      symbol: 'WBTC',
      decimals: 8,
      icon: 'https://garden.imgix.net/token-images/wbtc.svg',
      chain: 'evm:5115',
      htlc: {
        address: '0xd1E0Ba2b165726b3a6051b765d4564d030FDcf50',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0x3edA22460259b29433704dda71cc921F528165Ea',
        schema: 'evm:erc20',
      },
    },
    CBTC: {
      id: 'citrea_testnet:cbtc',
      name: 'Citrea Bitcoin',
      symbol: 'CBTC',
      decimals: 18,
      icon: 'https://garden.imgix.net/token-images/bitcoin.svg',
      chain: 'evm:5115',
      htlc: {
        address: '0xE413743B51f3cC8b3ac24addf50D18fa138cB0Bb',
        schema: 'evm:htlc',
      },
      token: null,
    },
    CBBTC: {
      id: 'citrea_testnet:cbbtc',
      name: 'Coinbase Wrapped Bitcoin',
      symbol: 'CBBTC',
      decimals: 8,
      icon: 'https://garden.imgix.net/token-images/bitcoin.svg',
      chain: 'evm:5115',
      htlc: {
        address: '0x8656d38352CD90ca55881eBd0AF6822839b435A8',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0xeAa998aF280a62Ae08BaE4f9fa59C9b30e6BD306',
        schema: 'evm:erc20',
      },
    },
    USDC: {
      id: 'citrea_testnet:usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      icon: 'https://garden.imgix.net/token-images/usdc.svg',
      chain: 'evm:5115',
      htlc: {
        address: '0x730Be401ef981D199a0560C87DfdDaFd3EC1C493',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0xCdA8661fDA031deFCc9BdD88C0e12669Cac47Fb0',
        schema: 'evm:erc20',
      },
    },
    USDT: {
      id: 'citrea_testnet:usdt',
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
      icon: 'https://garden.imgix.net/token-images/usdt.svg',
      chain: 'evm:5115',
      htlc: {
        address: '0x917cfef972d667dC0FeC76806cB5623585B81493',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0xF5cFE09b852Ddb164cF6Db419B9c11aAb5F30cb6',
        schema: 'evm:erc20',
      },
    },
  },
  monad_testnet: {
    type: BlockchainType.evm,
    network: Network.TESTNET,
    cBBTC: {
      id: 'monad_testnet:cbbtc',
      name: 'Coinbase Wrapped Bitcoin',
      symbol: 'cBBTC',
      decimals: 8,
      icon: 'https://garden.imgix.net/token-images/cbBTC.svg',
      chain: 'evm:10143',
      htlc: {
        address: '0x8656d38352CD90ca55881eBd0AF6822839b435A8',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0x6b6303fAb8eC7232b4f2a7b9fa58E5216F608fcb',
        schema: 'evm:erc20',
      },
    },
    USDC: {
      id: 'monad_testnet:usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      icon: 'https://garden.imgix.net/token-images/usdc.svg',
      chain: 'evm:10143',
      htlc: {
        address: '0x730Be401ef981D199a0560C87DfdDaFd3EC1C493',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0xf817257fed379853cde0fa4f97ab987181b1e5ea',
        schema: 'evm:erc20',
      },
    },
  },
  starknet_sepolia: {
    type: BlockchainType.starknet,
    network: Network.TESTNET,
    WBTC: {
      id: 'starknet_sepolia:wbtc',
      name: 'Wrapped Bitcoin',
      symbol: 'WBTC',
      decimals: 8,
      icon: 'https://garden.imgix.net/token-images/wbtc.svg',
      chain: 'starknet:393402133025997798000961',
      htlc: {
        address:
          '0x06579d255314109429a4477d89629bc2b94f529ae01979c2f8014f9246482603',
        schema: 'starknet:htlc_erc20',
      },
      token: {
        address:
          '0x496bef3ed20371382fbe0ca6a5a64252c5c848f9f1f0cccf8110fc4def912d5',
        schema: 'starknet:erc20',
      },
    },
  },
  sui_testnet: {
    type: BlockchainType.sui,
    network: Network.TESTNET,
    SUI: {
      id: 'sui_testnet:sui',
      name: 'SUI',
      symbol: 'SUI',
      decimals: 9,
      icon: 'https://garden-finance.imgix.net/chain_images/sui.svg',
      chain: 'sui',
      htlc: {
        address:
          '0x5c438715b7dcc02d12ab92449153a1e5ade2301620d5bf60aa748f006726d369',
        schema: null,
      },
      token: {
        address: '0x2::sui::SUI',
        schema: null,
      },
    },
  },
  hyperliquid_testnet: {
    type: BlockchainType.evm,
    network: Network.TESTNET,
  },
  bnbchain_testnet: {
    type: BlockchainType.evm,
    network: Network.TESTNET,
    WBTC: {
      id: 'bnbchain_testnet:wbtc',
      name: 'Wrapped Bitcoin',
      symbol: 'WBTC',
      decimals: 8,
      icon: 'https://garden.imgix.net/token-images/wbtc.svg',
      chain: 'evm:97',
      htlc: {
        address: '0xd1E0Ba2b165726b3a6051b765d4564d030FDcf50',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0x39f3294352208905fc6ebf033954E6c6455CdB4C',
        schema: 'evm:erc20',
      },
    },
  },
  bitcoin: {
    type: BlockchainType.bitcoin,
    network: Network.MAINNET,
    BTC: {
      id: 'bitcoin:btc',
      name: 'Bitcoin',
      symbol: 'BTC',
      decimals: 8,
      icon: 'https://garden.imgix.net/token-images/bitcoin.svg',
      chain: 'bitcoin',
      htlc: null,
      token: null,
    },
  },
  base: {
    type: BlockchainType.evm,
    network: Network.MAINNET,
    USDC: {
      id: 'base:usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      icon: 'https://garden.imgix.net/token-images/usdc.svg',
      chain: 'evm:8453',
      htlc: {
        address: '0x5fA58e4E89c85B8d678Ade970bD6afD4311aF17E',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        schema: 'evm:erc20',
      },
    },
    cBBTC: {
      id: 'base:cbbtc',
      name: 'Coinbase Wrapped Bitcoin',
      symbol: 'cBBTC',
      decimals: 8,
      icon: 'https://coin-images.coingecko.com/coins/images/51336/large/cbbtc.png?1730814747',
      chain: 'evm:8453',
      htlc: {
        address: '0xe35d025d0f0d9492db4700FE8646f7F89150eC04',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
        schema: 'evm:erc20',
      },
    },
  },
  arbitrum: {
    type: BlockchainType.evm,
    network: Network.MAINNET,
    WBTC: {
      id: 'arbitrum:wbtc',
      name: 'Wrapped Bitcoin',
      symbol: 'WBTC',
      decimals: 8,
      icon: 'https://garden.imgix.net/token-images/wbtc.svg',
      chain: 'evm:42161',
      htlc: {
        address: '0xb5AE9785349186069C48794a763DB39EC756B1cF',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
        schema: 'evm:erc20',
      },
    },
    USDC: {
      id: 'arbitrum:usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      icon: 'https://garden.imgix.net/token-images/usdc.svg',
      chain: 'evm:42161',
      htlc: {
        address: '0x8E12d730756457B99ce6E6AbFd60eBe751dA169B',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        schema: 'evm:erc20',
      },
    },
    SEED: {
      id: 'arbitrum:seed',
      name: 'SEED',
      symbol: 'SEED',
      decimals: 18,
      icon: 'https://garden.imgix.net/token-images/SEED.svg',
      chain: 'evm:42161',
      htlc: {
        address: '0xFBD30cB9313fe580031A7E0258693E1cec002803',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0x86f65121804D2Cdbef79F9f072D4e0c2eEbABC08',
        schema: 'evm:erc20',
      },
    },
  },
  ethereum: {
    type: BlockchainType.evm,
    network: Network.MAINNET,
    ETH: {
      id: 'ethereum:eth',
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      icon: 'https://garden.imgix.net/chain_images/ethereum.svg',
      chain: 'evm:1',
      htlc: {
        address: '0xE413743B51f3cC8b3ac24addf50D18fa138cB0Bb',
        schema: 'evm:htlc',
      },
      token: null,
    },
    USDC: {
      id: 'ethereum:usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      icon: 'https://garden.imgix.net/token-images/usdc.svg',
      chain: 'evm:1',
      htlc: {
        address: '0x5fA58e4E89c85B8d678Ade970bD6afD4311aF17E',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        schema: 'evm:erc20',
      },
    },
    WBTC: {
      id: 'ethereum:wbtc',
      name: 'Wrapped Bitcoin',
      symbol: 'WBTC',
      decimals: 8,
      icon: 'https://garden.imgix.net/token-images/wbtc.svg',
      chain: 'evm:1',
      htlc: {
        address: '0xD781a2abB3FCB9fC0D1Dd85697c237d06b75fe95',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        schema: 'evm:erc20',
      },
    },
    cBBTC: {
      id: 'ethereum:cbbtc',
      name: 'Coinbase Wrapped Bitcoin',
      symbol: 'cBBTC',
      decimals: 8,
      icon: 'https://garden.imgix.net/token-images/cbBTC.svg',
      chain: 'evm:1',
      htlc: {
        address: '0xe35d025d0f0d9492db4700FE8646f7F89150eC04',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
        schema: 'evm:erc20',
      },
    },
    SEED: {
      id: 'ethereum:seed',
      name: 'SEED',
      symbol: 'SEED',
      decimals: 18,
      icon: 'https://garden.imgix.net/token-images/SEED.svg',
      chain: 'evm:1',
      htlc: {
        address: '0xCE511De667885f92B8c36fcfC79C3B5bEb875463',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0x5eed99d066a8CaF10f3E4327c1b3D8b673485eED',
        schema: 'evm:erc20',
      },
    },
  },
  solana: {
    type: BlockchainType.solana,
    network: Network.MAINNET,
    SOL: {
      id: 'solana:sol',
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9,
      icon: 'https://garden-finance.imgix.net/chain_images/solana.png',
      chain: 'solana:101',
      htlc: {
        address: '2bag6xpshpvPe7SJ9nSDLHpxqhEAoHPGpEkjNSv7gxoF',
        schema: 'solana:htlc',
      },
      token: null,
    },
    USDC: {
      id: 'solana:usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      icon: 'https://garden.imgix.net/token-images/usdc.svg',
      chain: 'solana:101',
      htlc: {
        address: 'gdnvdMCHJgnidtU7SL8RkRshHPvDJU1pdfZEpoLvqdU',
        schema: 'solana:htlc_spltoken',
      },
      token: {
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        schema: 'primary',
      },
    },
    cBBTC: {
      id: 'solana:cbbtc',
      name: 'Coinbase Wrapped Bitcoin',
      symbol: 'cBBTC',
      decimals: 8,
      icon: 'https://garden.imgix.net/token-images/cbBTC.svg',
      chain: 'solana:101',
      htlc: {
        address: 'gdnvdMCHJgnidtU7SL8RkRshHPvDJU1pdfZEpoLvqdU',
        schema: 'solana:htlc_spltoken',
      },
      token: {
        address: 'cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij',
        schema: 'primary',
      },
    },
  },
  bera: {
    type: BlockchainType.evm,
    network: Network.MAINNET,
    LBTC: {
      id: 'bera:lbtc',
      name: 'Lombard Bitcoin',
      symbol: 'LBTC',
      decimals: 8,
      icon: 'https://garden.imgix.net/token-images/LBTC.svg',
      chain: 'evm:80094',
      htlc: {
        address: '0x84A396920d8B8CA2e69bD9503Bc1B2f73f1b8b33',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
        schema: 'evm:erc20',
      },
    },
  },
  starknet: {
    type: BlockchainType.starknet,
    network: Network.MAINNET,
    WBTC: {
      id: 'starknet:wbtc',
      name: 'Wrapped Bitcoin',
      symbol: 'WBTC',
      decimals: 8,
      icon: 'https://garden.imgix.net/token-images/wbtc.svg',
      chain: 'starknet:23448594291968334',
      htlc: {
        address:
          '0x7defd8eb3b770005ab1ca5f89ad31f98fb5bc3c52deaeafd130be3b49f967b4',
        schema: 'starknet:htlc_erc20',
      },
      token: {
        address:
          '0x3fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac',
        schema: 'starknet:erc20',
      },
    },
  },
  sui: {
    type: BlockchainType.sui,
    network: Network.MAINNET,
    SUI: {
      id: 'sui:sui',
      name: 'SUI',
      symbol: 'SUI',
      decimals: 9,
      icon: 'https://garden-finance.imgix.net/chain_images/sui.svg',
      chain: 'sui:0',
      htlc: {
        address:
          '0xa4f4e653547e98d4b541378e14db2393a09aff4b829f158b133d2eb3c3a942b5',
        schema: null,
      },
      token: {
        address: '0x2::sui::SUI',
        schema: null,
      },
    },
  },
  hyperliquid: {
    type: BlockchainType.evm,
    network: Network.MAINNET,
    uBTC: {
      id: 'hyperliquid:ubtc',
      name: 'Unit Bitcoin',
      symbol: 'uBTC',
      decimals: 8,
      icon: 'https://garden.imgix.net/token-images/bitcoin.svg',
      chain: 'evm:999',
      htlc: {
        address: '0xDC74a45e86DEdf1fF7c6dac77e0c2F082f9E4F72',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0x9FDBdA0A5e284c32744D2f17Ee5c74B284993463',
        schema: 'evm:erc20',
      },
    },
  },
  unichain: {
    type: BlockchainType.evm,
    network: Network.MAINNET,
    WBTC: {
      id: 'unichain:wbtc',
      name: 'Wrapped Bitcoin',
      symbol: 'WBTC',
      decimals: 8,
      icon: 'https://garden.imgix.net/token-images/wbtc.svg',
      chain: 'evm:130',
      htlc: {
        address: '0xD781a2abB3FCB9fC0D1Dd85697c237d06b75fe95',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0x927B51f251480a681271180DA4de28D44EC4AfB8',
        schema: 'evm:erc20',
      },
    },
    USDC: {
      id: 'unichain:usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      icon: 'https://garden.imgix.net/token-images/usdc.svg',
      chain: 'evm:130',
      htlc: {
        address: '0x5fA58e4E89c85B8d678Ade970bD6afD4311aF17E',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0x078D782b760474a361dDA0AF3839290b0EF57AD6',
        schema: 'evm:erc20',
      },
    },
  },
  corn: {
    type: BlockchainType.evm,
    network: Network.MAINNET,
    BTCN: {
      id: 'corn:btcn',
      name: 'Bitcorn',
      symbol: 'BTCN',
      decimals: 18,
      icon: 'https://garden.imgix.net/token-images/bitcorn.svg',
      chain: 'evm:21000000',
      htlc: {
        address: '0xE413743B51f3cC8b3ac24addf50D18fa138cB0Bb',
        schema: 'evm:htlc',
      },
      token: null,
    },
  },
  botanix: {
    type: BlockchainType.evm,
    network: Network.MAINNET,
    BTC: {
      id: 'botanix:btc',
      name: 'Botanix Bitcoin',
      symbol: 'BTC',
      decimals: 18,
      icon: 'https://garden.imgix.net/token-images/bitcoin.svg',
      chain: 'evm:3637',
      htlc: {
        address: '0xE413743B51f3cC8b3ac24addf50D18fa138cB0Bb',
        schema: 'evm:htlc',
      },
      token: null,
    },
  },
  bnbchain: {
    type: BlockchainType.evm,
    network: Network.MAINNET,
    BTCB: {
      id: 'bnbchain:btcb',
      name: 'Binance Bitcoin',
      symbol: 'BTCB',
      decimals: 18,
      icon: 'https://garden.imgix.net/token-images/bitcoin.svg',
      chain: 'evm:56',
      htlc: {
        address: '0xe74784E5A45528fDEcB257477DD6bd31c8ef0761',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
        schema: 'evm:erc20',
      },
    },
    USDC: {
      id: 'bnbchain:usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 18,
      icon: 'https://garden.imgix.net/token-images/usdc.svg',
      chain: 'evm:56',
      htlc: {
        address: '0x5fA58e4E89c85B8d678Ade970bD6afD4311aF17E',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        schema: 'evm:erc20',
      },
    },
    BNB: {
      id: 'bnbchain:bnb',
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
      icon: 'https://garden-finance.imgix.net/chain_images/bnb.png',
      chain: 'evm:56',
      htlc: {
        address: '0xE413743B51f3cC8b3ac24addf50D18fa138cB0Bb',
        schema: 'evm:htlc',
      },
      token: null,
    },
  },
  core: {
    type: BlockchainType.evm,
    network: Network.MAINNET,
    WBTC: {
      id: 'core:wbtc',
      name: 'Wrapped Bitcoin',
      symbol: 'WBTC',
      decimals: 8,
      icon: 'https://garden.imgix.net/token-images/wbtc.svg',
      chain: 'evm:1116',
      htlc: {
        address: '0xD781a2abB3FCB9fC0D1Dd85697c237d06b75fe95',
        schema: 'evm:htlc_erc20',
      },
      token: {
        address: '0x5832f53d147b3d6Cd4578B9CBD62425C7ea9d0Bd',
        schema: 'evm:erc20',
      },
    },
  },
} as const;

export const Chains: Record<Chain, Chain> = Object.keys(Config).reduce(
  (acc, chain) => {
    acc[chain as Chain] = chain as Chain;
    return acc;
  },
  {} as Record<Chain, Chain>,
);

export const Assets = buildAssetsWithChain(Config);

export const isMainnet = (chain: Chain) =>
  Config[chain].network === Network.MAINNET;

export function is<T extends BlockchainType>(
  type: T,
): (chain: Chain) => chain is Extract<Chain, ChainsByBlockchainType<T>> {
  return (chain: Chain): chain is Extract<Chain, ChainsByBlockchainType<T>> => {
    return Config[chain].type === type;
  };
}

export const isEVM = is(BlockchainType.evm);
export const isBitcoin = is(BlockchainType.bitcoin);
export const isSolana = is(BlockchainType.solana);
export const isStarknet = is(BlockchainType.starknet);
export const isSui = is(BlockchainType.sui);

export const getBlockchainType = (chain: Chain) => Config[chain].type;

export const NATIVE_TOKENS = {
  [BlockchainType.evm]: 'eth',
  [BlockchainType.solana]: 'sol',
  [BlockchainType.sui]: 'sui',
};

export const isEvmNativeToken = (chain: Chain, tokenAddress: string) => {
  return (
    isEVM(chain) &&
    tokenAddress.toLowerCase() === NATIVE_TOKENS[BlockchainType.evm]
  );
};

export const isSolanaNativeToken = (chain: Chain, tokenAddress: string) => {
  return (
    isSolana(chain) &&
    tokenAddress.toLowerCase() === NATIVE_TOKENS[BlockchainType.solana]
  );
};

export const isSuiNativeToken = (chain: Chain, tokenAddress: string) => {
  return (
    isSui(chain) &&
    tokenAddress.toLowerCase() === NATIVE_TOKENS[BlockchainType.sui]
  );
};

export const isNativeToken = (asset: ChainAsset) => {
  const chain = asset.chain;
  const tokenAddress = asset.symbol;
  return (
    isEvmNativeToken(chain, tokenAddress) ||
    isSolanaNativeToken(chain, tokenAddress) ||
    isBitcoin(chain) ||
    isSuiNativeToken(chain, tokenAddress) ||
    // Starknet doesn't have a native token
    !isStarknet(chain)
  );
};
