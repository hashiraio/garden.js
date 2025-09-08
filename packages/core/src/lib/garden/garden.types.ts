import {
  AffiliateFee,
  Asset,
  ChainAsset,
  ChainAssetString,
  IOrderbook,
  Order,
} from '@gardenfi/orderbook';
import { OrderAction, OrderStatus } from '../orderStatus/orderStatus';
import {
  ApiKey,
  AsyncResult,
  EventBroker,
  IAuth,
  Network,
} from '@gardenfi/utils';
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
   * Additional data for the order.
   */
  additionalData: {
    /**
     * Provide btcAddress if the destination or source chain is bitcoin. This address is used as refund address if source chain is bitcoin, and as redeem address if destination chain is bitcoin.
     */
    btcAddress?: string;
  };
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

export type EventCallback = (...args: any[]) => void;

/**
 * Interface representing the GardenJS library.
 */
export interface IGardenJS extends EventBroker<GardenEvents> {
  /**
   * Create Order
   * @param {SwapParams} params - The parameters for creating the order.
   * @returns {AsyncResult<string, string>} The result of the swap operation.
   */
  swap(params: SwapParams): AsyncResult<string, string>;

  // /**
  //  * Execute an action.
  //  * @returns {Promise<() => void>} A promise that resolves to a function to cancel the execution.
  //  */
  // execute(): Promise<() => void>;

  /**
   * The EVM relay.
   * @readonly
   */
  get evmHTLC(): IEVMHTLC | undefined;

  /**
   * The Starknet relay.
   * @readonly
   */
  get starknetHTLC(): IStarknetHTLC | undefined;

  /**
   * The Solana relay.
   * @readonly
   */
  get solanaHTLC(): ISolanaHTLC | undefined;

  /**
   * The Sui relay.
   * @readonly
   */
  get suiHTLC(): ISuiHTLC | undefined;

  /**
   * The current quote.
   * @readonly
   */
  get quote(): IQuote;

  /**
   * The BTC wallet.
   * @readonly
   */
  get btcHTLC(): IBitcoinHTLC | undefined;

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
  blockNumberFetcher?: IBlockNumberFetcher;
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
  wallets: GardenWalletModules;
};
export type GardenConfigWithHTLCs = GardenCoreConfig & {
  htlc: GardenHTLCModules;
};
