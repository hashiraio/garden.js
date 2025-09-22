import { hasKeys, Url } from '@gardenfi/utils';
import {
  BaseCreateOrderResponse,
  CreateOrderResponse,
  Order,
  StarknetOrderResponse,
  EvmOrderResponse,
  BitcoinOrderResponse,
  SolanaOrderResponse,
  SuiOrderResponse,
} from './orderbook/orderbook.types';
import { BlockchainType } from './constants/asset.types';

/**
 * Constructs a URL with the given base URL, endpoint and parameters (query params)
 * @param baseUrl Base URL
 * @param params Query params
 * @returns Constructed URL
 */
export const ConstructUrl = (
  baseUrl: Url,
  endPoint: string,
  params?: {
    [key: string]: string | string[] | number | boolean | undefined;
  },
): URL => {
  const url = baseUrl.endpoint(endPoint);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) url.searchParams.append(key, value.join(','));
        else url.searchParams.append(key, value.toString());
      }
    });
  }
  return url;
};

type OrderResponseTypeGuard<T> = (response: any) => response is T;

/**
 * Type guard for EVM order responses
 */
export const isEvmOrderResponse: OrderResponseTypeGuard<EvmOrderResponse> = (
  response,
): response is EvmOrderResponse => {
  return (
    hasKeys(response, ['typed_data', 'initiate_transaction']) &&
    typeof response.initiate_transaction === 'object' &&
    response.initiate_transaction &&
    hasKeys(response.initiate_transaction, [
      'to',
      'value',
      'data',
      'gas_limit',
      'chain_id',
    ])
  );
};

/**
 * Type guard for Starknet order responses
 */
export const isStarknetOrderResponse: OrderResponseTypeGuard<
  StarknetOrderResponse
> = (response): response is StarknetOrderResponse => {
  return (
    hasKeys(response, ['typed_data', 'initiate_transaction']) &&
    typeof response.initiate_transaction === 'object' &&
    response.initiate_transaction &&
    hasKeys(response.initiate_transaction, ['to', 'selector', 'calldata'])
  );
};

/**
 * Type guard for Bitcoin order responses
 */
export const isBitcoinOrderResponse: OrderResponseTypeGuard<
  BitcoinOrderResponse
> = (response): response is BitcoinOrderResponse => {
  return (
    hasKeys(response, ['to', 'amount']) &&
    typeof response.to === 'string' &&
    typeof response.amount === 'string'
  );
};

/**
 * Type guard for Solana order responses
 */
export const isSolanaOrderResponse: OrderResponseTypeGuard<
  SolanaOrderResponse
> = (response): response is SolanaOrderResponse => {
  return (
    hasKeys(response, ['versioned_tx']) &&
    typeof response.versioned_tx === 'string'
  );
};

/**
 * Type guard for Sui order responses
 */
export const isSuiOrderResponse: OrderResponseTypeGuard<SuiOrderResponse> = (
  response,
): response is SuiOrderResponse => {
  return (
    hasKeys(response, ['ptb_bytes']) &&
    Array.isArray(response.ptb_bytes) &&
    response.ptb_bytes.every((byte: number) => typeof byte === 'number')
  );
};

/**
 * Type guard for Order objects (matched orders)
 */
export const isOrder: OrderResponseTypeGuard<Order> = (
  response,
): response is Order => {
  return (
    hasKeys(response, ['source_swap', 'destination_swap']) &&
    typeof response.source_swap === 'object' &&
    typeof response.destination_swap === 'object'
  );
};

/**
 * Discriminated union type guard that determines the specific order response type
 * and returns the appropriate typed response
 */
export function discriminateOrderResponse(response: BaseCreateOrderResponse) {
  if (isEvmOrderResponse(response)) {
    return {
      type: BlockchainType.evm,
      ...response,
    } as CreateOrderResponse<BlockchainType.evm>;
  }

  if (isStarknetOrderResponse(response)) {
    return {
      type: BlockchainType.starknet,
      ...response,
    } as CreateOrderResponse<BlockchainType.starknet>;
  }

  if (isBitcoinOrderResponse(response)) {
    return {
      type: BlockchainType.bitcoin,
      ...response,
    } as CreateOrderResponse<BlockchainType.bitcoin>;
  }

  if (isSolanaOrderResponse(response)) {
    return {
      type: BlockchainType.solana,
      ...response,
    } as CreateOrderResponse<BlockchainType.solana>;
  }

  if (isSuiOrderResponse(response)) {
    return {
      type: BlockchainType.sui,
      ...response,
    } as CreateOrderResponse<BlockchainType.sui>;
  }

  return null;
}

/**
 * Utility function to get the blockchain type from an order response
 */
export function getOrderResponseType(response: any): BlockchainType | null {
  if (isEvmOrderResponse(response)) return BlockchainType.evm;
  if (isStarknetOrderResponse(response)) return BlockchainType.starknet;
  if (isBitcoinOrderResponse(response)) return BlockchainType.bitcoin;
  if (isSolanaOrderResponse(response)) return BlockchainType.solana;
  if (isSuiOrderResponse(response)) return BlockchainType.sui;
  return null;
}
