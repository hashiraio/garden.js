import { AsyncResult, IAuth, Request } from '@gardenfi/utils';
import { BlockchainType, Chain, OrderLifecycle } from '../asset';
import type { Calldata, RawArgs, TypedData } from 'starknet';
import { ChainAsset } from '../chainAsset/chainAsset';

export interface IOrderbook {
  /**
   * Creates an order
   * @param {CreateOrderRequest} order - The configuration for the creating the order.
   * @param {IAuth} auth - The auth object.
   * @returns {CreateOrderResponse} The create order ID.
   */
  createOrder(
    order: CreateOrderRequest,
    auth: IAuth,
  ): AsyncResult<CreateOrderResponse, string>;

  /**
   * Get the order from orderbook based on provided Id.
   * @param id - The create Id of the order
   * @returns {AsyncResult<Order, string>} A promise that resolves to the order.
   */
  getOrder(id: string, request?: Request): AsyncResult<Order, string>;

  /**
   * Get all orders from the orderbook based on the provided filters.
   * @param {GetOrdersFilters} filters - Object containing filter parameters like: `address`, `tx_hash`, `from_chain`, `to_chain`, `status` and any additional key-value pairs for query parameters.
   * @param paginationConfig - The configuration for the pagination.
   * @returns {AsyncResult<PaginatedData<Order>, string>} A promise that resolves to the orders.
   */
  getOrders(
    queryParams: GetOrderQueryParams,
    request?: Request,
  ): AsyncResult<PaginatedData<Order>, string>;

  /**
   * A wrapper around getOrders that polls for every provided interval and returns orders based on the provided filters.
   * @param {GetOrdersFilters} filters - The filters to get the orders for.
   * @param {function} cb - The callback to be called when the orders are updated.
   * @param {number} interval - The interval to poll for updates. Default is 5000ms.
   * @param {PaginationConfig} paginationConfig - The configuration for the pagination.
   * @returns {Promise<() => void>} A promise that resolves to a function to unsubscribe from the orders.
   */
  subscribeOrders(
    queryParams: GetOrderQueryParams,
    cb: (orders: PaginatedData<Order>) => Promise<void>,
    interval?: number,
    request?: Request,
  ): Promise<() => void>;
}

export type GetOrdersFilters = {
  address?: string;
  tx_hash?: string;
  from_chain?: Chain;
  to_chain?: Chain;
  status?: OrderLifecycle | OrderLifecycle[];
  [key: string]: string | string[] | number | undefined;
};

export type GetOrderQueryParams = GetOrdersFilters & PaginationConfig;

// export type ChainAsset = `${Chain}:${string}`;

export type CreateOrderRequest = {
  source: {
    asset: ChainAsset;
    owner: string;
    delegate: string | null;
    amount: string;
  };
  destination: {
    asset: ChainAsset;
    owner: string;
    delegate: string | null;
    amount: string;
  };
  slippage?: number;
  secret_hash?: string;
  nonce: number;
  affiliate_fees?: AffiliateFee[];
};

export type Swap = {
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  swap_id: string;
  chain: Chain;
  asset: string;
  initiator: string;
  redeemer: string;
  timelock: number;
  filled_amount: string;
  amount: string;
  secret_hash: string;
  secret: string;
  initiate_tx_hash: string;
  redeem_tx_hash: string;
  refund_tx_hash: string;
  initiate_block_number: string | null;
  redeem_block_number: string | null;
  refund_block_number: string | null;
  required_confirmations: number;
  delegate: string;
  asset_price: number;
  instant_refund_tx: string;
  initiate_timestamp: string;
  redeem_timestamp: string;
  refund_timestamp: string;
  current_confirmations: number;
};

export type Order = {
  order_id: string;
  created_at: string;
  source_swap: Swap;
  destination_swap: Swap;
  slippage: number;
  nonce: string;
  affiliate_fees: AffiliateFee[];
  integrator: string;
  version: string;
};

export type AssetHTLCInfo = {
  id: string;
  htlc: { address: string; schema: string } | null;
  token: { address: string; schema: string } | null;
  decimals: number;
  min_amount: string;
  max_amount: string;
  price: number;
};

export type PaginatedData<T> = {
  data: T[];
  page: number;
  total_pages: number;
  total_items: number;
  per_page: number;
};

export type PaginationConfig = {
  page?: number;
  per_page?: number;
};
// ------------------------------------------------------------
// Affiliate Fees
// ------------------------------------------------------------

export type AffiliateFee = {
  address: string;
  asset: ChainAsset;
  fee: number; // fee in bps
};

export type AffiliateFeeWithAmount = AffiliateFee & {
  amount: string;
};

export type AffiliateFeeList<T extends AffiliateFee | AffiliateFeeWithAmount> =
  {
    affiliate_fees?: T[];
  };

export type AffiliateFeeOptionalAsset = Omit<AffiliateFee, 'asset'> &
  Partial<Pick<AffiliateFee, 'asset'>>;

// ------------------------------------------------------------
// Order Response
// ------------------------------------------------------------

export type EVMTransaction = {
  to: string;
  value: string;
  data: string;
  gas_limit: string;
  chain_id: number;
};

export type StarknetCall = {
  to: string;
  calldata?: RawArgs | Calldata;
  selector?: string;
};

export type BaseCreateOrderResponse = {
  order_id: string;
};

export type BitcoinOrderResponse = BaseCreateOrderResponse & {
  to: string;
  amount: number;
};

type WithTypedData<T, D> = T & { typed_data: D | null };

type EvmTypedData = {
  domain: Record<string, unknown>;
  types: Record<string, unknown>;
  primaryType: string;
  message: Record<string, unknown>;
};

export type EvmOrderResponse = WithTypedData<
  BaseCreateOrderResponse & {
    approval_transaction: EVMTransaction | null;
    initiate_transaction: EVMTransaction;
  },
  EvmTypedData
>;

export type StarknetOrderResponse = WithTypedData<
  BaseCreateOrderResponse & {
    approval_transaction: StarknetCall;
    initiate_transaction: StarknetCall;
  },
  TypedData
>;

export type SolanaOrderResponse = BaseCreateOrderResponse & {
  versioned_tx: string;
};

export type SuiOrderResponse = BaseCreateOrderResponse & {
  ptb_bytes: number[];
};

export type CreateOrderResponse =
  | ({ type: BlockchainType.evm } & EvmOrderResponse)
  | ({ type: BlockchainType.bitcoin } & BitcoinOrderResponse)
  | ({ type: BlockchainType.starknet } & StarknetOrderResponse)
  | ({ type: BlockchainType.solana } & SolanaOrderResponse)
  | ({ type: BlockchainType.sui } & SuiOrderResponse);
