import { Network } from '@gardenfi/utils';
import { Config } from './asset';

export enum BlockchainType {
  bitcoin = 'bitcoin',
  evm = 'evm',
  solana = 'solana',
  starknet = 'starknet',
  sui = 'sui',
}

export type AssetCommon = {
  name: string;
  decimals: number;
  symbol: string;
  chain: Chain;
  logo?: string;
  atomicSwapAddress: string;
};

export type AssetToken = AssetCommon & {
  tokenAddress: string;
  price?: number;
};

export type Asset = AssetToken;

export type Chain = keyof typeof Config;

export type ChainsByNetwork<T extends Network> = {
  [K in keyof typeof Config]: (typeof Config)[K]['network'] extends T
    ? K
    : never;
}[keyof typeof Config];
export type MainnetOnlyChains = ChainsByNetwork<Network.MAINNET>;
export type TestnetOnlyChains = ChainsByNetwork<Network.TESTNET>;
export type LocalnetOnlyChains = ChainsByNetwork<Network.LOCALNET>;

export type ChainsByBlockchainType<T extends BlockchainType> = {
  [K in keyof typeof Config]: (typeof Config)[K]['type'] extends T ? K : never;
}[keyof typeof Config];
export type EVMChains = ChainsByBlockchainType<BlockchainType.evm>;
export type BitcoinChains = ChainsByBlockchainType<BlockchainType.bitcoin>;
export type SolanaChains = ChainsByBlockchainType<BlockchainType.solana>;
export type StarknetChains = ChainsByBlockchainType<BlockchainType.starknet>;
export type SuiChains = ChainsByBlockchainType<BlockchainType.sui>;
