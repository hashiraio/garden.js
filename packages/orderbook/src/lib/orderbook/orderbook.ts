import {
  IOrderbook,
  CreateOrderResponse,
  Order,
  PaginatedData,
  CreateOrderRequest,
  GetOrderQueryParams,
  OrderWithStatus,
} from './orderbook.types';
import {
  APIResponse,
  AsyncResult,
  Err,
  Fetcher,
  IAuth,
  Ok,
  Url,
  Request,
} from '@gardenfi/utils';
import { ConstructUrl, discriminateOrderResponse } from '../utils';
import { ParseOrderStatus } from '../orderStatus/orderStatus';
import { BlockchainType } from '../constants/asset.types';

/**
 * A class that allows you to create and manage orders with the orderbook url.
 * @class
 * @implements {IOrderbook}
 */
export class Orderbook implements IOrderbook {
  private url: Url;

  constructor(url: Url) {
    this.url = url;
  }

  async createOrder<T extends BlockchainType>(
    order: CreateOrderRequest,
    auth: IAuth,
  ): AsyncResult<CreateOrderResponse<T>, string> {
    try {
      const headers = await auth.getAuthHeaders();
      if (headers.error) {
        return Err(headers.error);
      }
      const res = await Fetcher.post<APIResponse<CreateOrderResponse<T>>>(
        this.url.endpoint('/v2/orders'),
        {
          body: JSON.stringify(order),
          headers: {
            ...headers.val,
            'Content-Type': 'application/json',
          },
        },
      );

      if (res.error) return Err(res.error);

      if (!res.result)
        return Err('CreateOrder: Unexpected error, result is undefined');

      const createOrderResponse = discriminateOrderResponse(res.result);

      if (!createOrderResponse) {
        return Err('CreateOrder: Unable to determine order type from response');
      }

      return Ok(createOrderResponse as unknown as CreateOrderResponse<T>);
    } catch (error) {
      return Err('CreateOrder Err:', String(error));
    }
  }

  async getOrder(
    id: string,
    request?: Request,
  ): AsyncResult<OrderWithStatus, string> {
    try {
      const url = this.url.endpoint(`/v2/orders`).endpoint(id);
      const res = await Fetcher.get<APIResponse<Order>>(url, { ...request });

      if (res.error) return Err(res.error);
      if (!res.result)
        return Err('GetOrder: Unexpected error, result is undefined');

      const orderWithStatus = ParseOrderStatus(res.result);

      return Ok({ ...res.result, status: orderWithStatus });
    } catch (error) {
      return Err(
        `GetOrder: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getOrders(
    queryParams: GetOrderQueryParams,
    request?: Request,
  ): AsyncResult<PaginatedData<OrderWithStatus>, string> {
    const endpoint = '/v2/orders';
    const url = ConstructUrl(this.url, endpoint, queryParams);

    try {
      const res = await Fetcher.get<APIResponse<PaginatedData<Order>>>(url, {
        ...request,
      });

      if (res.error) return Err(res.error);

      if (!res.result)
        return Err('GetAllOrders: Unexpected error, result is undefined');

      const ordersWithStatus = res.result.data.map((order) => ({
        ...order,
        status: ParseOrderStatus(order),
      }));

      return Ok({
        ...res.result,
        data: ordersWithStatus,
      });
    } catch (error) {
      return Err(
        `GetAllOrders: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Subscribe to orders
   * @param account - The account of the order
   * @param interval - The interval of the order
   * @param cb - The callback function
   * @param status - The status of the order
   * @param paginationConfig - The pagination configuration
   * @returns {Promise<() => void>} A promise that resolves to the unsubscribe function.
   */
  async subscribeOrders(
    queryParams: GetOrderQueryParams,
    cb: (orders: PaginatedData<OrderWithStatus>) => Promise<void>,
    interval?: number,
    request?: Request,
  ): Promise<() => void> {
    let isProcessing = false;

    const fetchOrders = async () => {
      if (isProcessing) return;
      isProcessing = true;

      try {
        const result = await this.getOrders(queryParams, request);
        if (result.ok) {
          await cb(result.val);
        } else {
          console.error('Error fetching orders:', result.error);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        isProcessing = false;
      }
    };

    await fetchOrders();
    const intervalId = setInterval(fetchOrders, interval);

    return () => {
      clearInterval(intervalId);
    };
  }
}
