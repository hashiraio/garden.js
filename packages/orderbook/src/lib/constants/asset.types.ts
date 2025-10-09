import { Network } from '@gardenfi/utils';
import { Config } from './asset';
import { ChainAsset } from '../chainAsset/chainAsset';

export enum BlockchainType {
  bitcoin = 'bitcoin',
  evm = 'evm',
  solana = 'solana',
  starknet = 'starknet',
  sui = 'sui',
}

export type AddressSchema = {
  address: string;
  schema: string | null;
};

export type Asset = {
  id: ChainAsset;
  name: string;
  chain: Chain;
  symbol: string;
  icon?: string;
  htlc: AddressSchema | null;
  token: AddressSchema | null;
  decimals: number;
  min_amount?: string;
  max_amount?: string;
  price?: number;
};

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
