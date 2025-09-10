import {
  AffiliateFee,
  Asset,
  BlockchainType,
  ChainAsset,
  ChainAssetString,
  IOrderbook,
  Order,
} from '@gardenfi/orderbook';
import { OrderAction, OrderStatus } from '../orderStatus/orderStatus';
import { ApiKey, AsyncResult, IAuth, Network } from '@gardenfi/utils';
import { ISecretManager } from '../secretManager/secretManager.types';
import { IQuote } from '../quote/quote.types';
import { IBlockNumberFetcher } from '../blockNumberFetcher/blockNumber';

import { IEVMHTLC } from '../evm/htlc.types';
import { IStarknetHTLC } from '../starknet/starknetHTLC.types';
import { DigestKey } from '@gardenfi/utils';
import { AccountInterface } from 'starknet';
import { WalletClient } from 'viem';
import { IBitcoinWallet } from '../bitcoin/wallet/wallet.interface';
import { ISolanaHTLC } from '../solana/htlc/ISolanaHTLC';
import { AnchorProvider } from '@coral-xyz/anchor';
import { Api } from '../constants';
import { ISuiHTLC } from '../sui/suiHTLC.types';
import { WalletWithRequiredFeatures } from '@mysten/wallet-standard';
import { IBitcoinHTLC } from '../bitcoin/bitcoinhtlc.types';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

export type SwapParams = {
  /**
   * Asset to be sent.
   */
  fromAsset: Asset | ChainAsset | ChainAssetString;
  /**
   * Asset to be received.
   */
  toAsset: Asset | ChainAsset | ChainAssetString;
  /**
   * Amount in lowest denomination of the sendAsset.
   */
  sendAmount: string;
  /**
   * Amount in lowest denomination of the toAsset.
   */
  receiveAmount: string;
  /**
   * Slippage for the order.
   */
  slippage?: number;
  /**
   * Addresses for the order.
   */
  addresses?: Partial<Record<BlockchainType, string>>;
  /**
   * Integrator fee for the order.
   */
  affiliateFee?: AffiliateFee[];
};

export type OrderWithStatus = Order & {
  status: OrderStatus;
};

export type GardenEvents = {
  error: (order: Order, error: string) => void;
  success: (order: Order, action: OrderAction, result: string) => void;
  onPendingOrdersChanged: (orders: OrderWithStatus[]) => void;
  log: (id: string, message: string) => void;
  rbf: (order: Order, result: string) => void;
};

export type GardenEventEmitter = {
  emit: <K extends keyof GardenEvents>(
    event: K,
    ...args: Parameters<GardenEvents[K]>
  ) => void;
};

export type EventCallback = (...args: any[]) => void;

/**
 * Interface representing the GardenJS library.
 */
export interface IGardenJS extends IOrderbook {
  /**
   * Create Order
   * @param {SwapParams} params - The parameters for creating the order.
   * @returns {AsyncResult<string, string>} The result of the swap operation.
   */
  createSwap(params: SwapParams): AsyncResult<string, string>;

  /**
   * The current quote.
   * @readonly
   */
  get quote(): IQuote;

  /**
   * All HTLC modules at once.
   * @readonly
   */
  get htlcs(): GardenHTLCModules;

  /**
   * The orderbook.
   * @readonly
   */
  get orderbook(): IOrderbook;

  /**
   * The secret manager.
   * @readonly
   */
  get secretManager(): ISecretManager;

  /**
   * The auth.
   * @readonly
   */
  get auth(): IAuth;

  /**
   * The digest key.
   * @readonly
   */
  get digestKey(): DigestKey | undefined;

  /**
   * The events.
   */
  on<K extends keyof GardenEvents>(event: K, listener: GardenEvents[K]): this;

  /**
   * The events.
   */
  off<K extends keyof GardenEvents>(event: K, listener: GardenEvents[K]): this;
}

export type OrderCacheValue = {
  txHash: string;
  timeStamp: number;
  btcRedeemUTXO?: string;
};

export interface IOrderExecutorCache {
  set(order: Order, action: OrderAction, txHash: string, utxo?: string): void;
  get(order: Order, action: OrderAction): OrderCacheValue | null;
  remove(order: Order, action: OrderAction): void;
}

export type ApiConfig = Network | (Partial<Api> & { network: Network });

export type GardenCoreConfig = {
  environment: ApiConfig;
  apiKey: string | ApiKey;
  digestKey?: string | DigestKey;
  secretManager?: ISecretManager;
  auth?: IAuth;
  orderbook?: IOrderbook;
  quote?: IQuote;
  solanaProgramAddress?: {
    native?: string;
    spl?: string;
  };
};

export type GardenHTLCModules = {
  evm?: IEVMHTLC;
  starknet?: IStarknetHTLC;
  solana?: ISolanaHTLC;
  sui?: ISuiHTLC;
  bitcoin?: IBitcoinHTLC;
};

export type GardenWalletModules = {
  evm?: WalletClient;
  starknet?: AccountInterface;
  solana?: AnchorProvider;
  sui?: WalletWithRequiredFeatures | Ed25519Keypair;
  bitcoin?: IBitcoinWallet;
};

export type GardenConfigWithWallets = GardenCoreConfig & {
  wallets?: GardenWalletModules;
};
export type GardenConfigWithHTLCs = GardenCoreConfig & {
  htlc?: GardenHTLCModules;
};
