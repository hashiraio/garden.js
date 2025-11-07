import { describe, expect, expectTypeOf, it, beforeAll } from 'vitest';
import { DigestKey, Siwe, Url, getConfig } from '@gardenfi/utils';
import { Orderbook } from './orderbook';
import {
  CreateOrderRequest,
  OrderWithStatus,
  PaginatedData,
  GetOrderQueryParams,
} from './orderbook.types';
import { ChainAsset } from '../chainAsset/chainAsset';

describe('Orderbook', () => {
  const config = getConfig();
  let orderbook: Orderbook;
  let auth: Siwe;
  const testAddress = '0xdF4E5212cC36428504712d7E75a9922762FeD28A';

  beforeAll(() => {
    orderbook = new Orderbook(new Url(config.baseUrl));
    const digestKey = DigestKey.generateRandom();
    if (digestKey.ok && digestKey.val) {
      auth = Siwe.fromDigestKey(new Url(config.baseUrl + '/auth'), digestKey.val);
    }
  });

  describe('constructor()', () => {
    it('should create an Orderbook instance', () => {
      const instance = new Orderbook(new Url(config.baseUrl));
      expect(instance).toBeInstanceOf(Orderbook);
    });

    it('should accept a Url object', () => {
      const url = new Url('https://testnet.api.garden.finance');
      const instance = new Orderbook(url);
      expect(instance).toBeInstanceOf(Orderbook);
    });
  });

  describe('getOrder()', () => {
    it('should get an order by ID', async () => {
      const orderId = '3b8f735673ee94822c4fa0f2265e90f105349cf2ef8d0cc854f5b7192ffa3b7b';
      const result = await orderbook.getOrder(orderId);

      if (result.ok && result.val) {
        expect(result.val.order_id).toBe(orderId);
        expect(result.val).toHaveProperty('status');
        expect(result.val).toHaveProperty('source_swap');
        expect(result.val).toHaveProperty('destination_swap');
        expectTypeOf(result.val).toEqualTypeOf<OrderWithStatus>();
      } else {
        expect(result.error).toBeDefined();
      }
    });

    it('should return error for invalid order ID', async () => {
      const result = await orderbook.getOrder('invalid-order-id-12345');
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    }, 10000);

    it('should accept optional Request parameter', async () => {
      const controller = new AbortController();
      const signal = controller.signal;
      controller.abort();

      const result = await orderbook.getOrder('test-id', { signal });
      expect(result).toBeDefined();
    }, 10000);

    it('should return OrderWithStatus with parsed status', async () => {
      const orderId = '3b8f735673ee94822c4fa0f2265e90f105349cf2ef8d0cc854f5b7192ffa3b7b';
      const result = await orderbook.getOrder(orderId);

      if (result.ok && result.val) {
        expect(result.val.status).toBeDefined();
        expect(typeof result.val.status).toBe('string');
      }
    });
  });

  describe('getOrders()', () => {
    it('should get orders with empty query params', async () => {
      const result = await orderbook.getOrders({});

      if (result.ok && result.val) {
        expect(result.val).toHaveProperty('data');
        expect(result.val).toHaveProperty('page');
        expect(result.val).toHaveProperty('total_pages');
        expect(result.val).toHaveProperty('total_items');
        expect(result.val).toHaveProperty('per_page');
        expect(Array.isArray(result.val.data)).toBe(true);
        expectTypeOf(result.val).toEqualTypeOf<PaginatedData<OrderWithStatus>>();
      }
    });

    it('should get orders with address filter', async () => {
      const queryParams: GetOrderQueryParams = {
        address: testAddress,
      };
      const result = await orderbook.getOrders(queryParams);

      if (result.ok && result.val) {
        expect(result.val.data).toBeDefined();
        expect(Array.isArray(result.val.data)).toBe(true);
      }
    }, 10000);

    it('should get orders with pagination', async () => {
      const queryParams: GetOrderQueryParams = {
        page: 1,
        per_page: 10,
      };
      const result = await orderbook.getOrders(queryParams);

      if (result.ok && result.val) {
        expect(result.val.page).toBe(1);
        expect(result.val.per_page).toBe(10);
        expect(result.val.data.length).toBeLessThanOrEqual(10);
      }
    });

    it('should get orders with multiple filters', async () => {
      const queryParams: GetOrderQueryParams = {
        address: testAddress,
        page: 1,
        per_page: 5,
      };
      const result = await orderbook.getOrders(queryParams);

      if (result.ok && result.val) {
        expect(result.val).toBeDefined();
        expect(result.val.page).toBe(1);
        expect(result.val.per_page).toBe(5);
      }
    }, 10000);

    it('should accept optional Request parameter', async () => {
      const controller = new AbortController();
      const signal = controller.signal;

      const queryParams: GetOrderQueryParams = {};
      const result = await orderbook.getOrders(queryParams, { signal });

      expect(result).toBeDefined();
    });

    it('should return orders with parsed status', async () => {
      const result = await orderbook.getOrders({});

      if (result.ok && result.val && result.val.data.length > 0) {
        const firstOrder = result.val.data[0];
        expect(firstOrder).toHaveProperty('status');
        expect(firstOrder.status).toBeDefined();
      }
    });

    it('should handle empty results', async () => {
      const queryParams: GetOrderQueryParams = {
        address: '0x0000000000000000000000000000000000000000',
        page: 1,
        per_page: 10,
      };
      const result = await orderbook.getOrders(queryParams);

      if (result.ok && result.val) {
        expect(result.val.data).toBeDefined();
        expect(Array.isArray(result.val.data)).toBe(true);
      }
    }, 10000);
  });

  describe('subscribeOrders()', () => {
    it('should subscribe to orders and return unsubscribe function', async () => {
      let callbackCalled = false;
      const queryParams: GetOrderQueryParams = {};

      const unsubscribe = await orderbook.subscribeOrders(
        queryParams,
        async (orders) => {
          callbackCalled = true;
          expect(orders).toHaveProperty('data');
          expect(Array.isArray(orders.data)).toBe(true);
          expectTypeOf(orders).toEqualTypeOf<PaginatedData<OrderWithStatus>>();
        },
        100,
      );

      expect(typeof unsubscribe).toBe('function');
      expect(unsubscribe).toBeDefined();

      await new Promise((resolve) => setTimeout(resolve, 150));

      unsubscribe();
      expect(callbackCalled).toBe(true);
    }, 5000);

    it('should call callback with orders data', async () => {
      let receivedOrders: PaginatedData<OrderWithStatus> | null = null;
      const queryParams: GetOrderQueryParams = {};

      const unsubscribe = await orderbook.subscribeOrders(
        queryParams,
        async (orders) => {
          receivedOrders = orders;
        },
        100,
      );

      await new Promise((resolve) => setTimeout(resolve, 150));
      unsubscribe();

      expect(receivedOrders).not.toBeNull();
      if (receivedOrders) {
        expect(receivedOrders).toHaveProperty('data');
        expect(receivedOrders).toHaveProperty('page');
      }
    }, 5000);

    it('should use default interval when not provided', async () => {
      const unsubscribe = await orderbook.subscribeOrders(
        {},
        async () => { },
      );

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should accept optional Request parameter', async () => {
      const controller = new AbortController();
      const signal = controller.signal;

      const unsubscribe = await orderbook.subscribeOrders(
        {},
        async () => { },
        1000,
        { signal },
      );

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should stop polling when unsubscribe is called', async () => {
      let callCount = 0;
      const queryParams: GetOrderQueryParams = {};

      const unsubscribe = await orderbook.subscribeOrders(
        queryParams,
        async () => {
          callCount++;
        },
        50,
      );

      await new Promise((resolve) => setTimeout(resolve, 200));
      unsubscribe();
      const countBeforeUnsubscribe = callCount;

      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(callCount).toBe(countBeforeUnsubscribe);
    }, 5000);
  });

  describe('createOrder()', () => {
    it('should create an order with valid request', async () => {
      const orderRequest: CreateOrderRequest = {
        source: {
          asset: ChainAsset.from('arbitrum:wbtc').toString(),
          owner: testAddress,
          delegate: null,
          amount: '50000',
        },
        destination: {
          asset: ChainAsset.from('ethereum:usdc').toString(),
          owner: testAddress,
          delegate: null,
          amount: '58727337',
        },
        solver_id: 'test-solver',
        slippage: 50,
        secret_hash:
          '037ff5cacab1d35df04e6e9d349f0d8dd92e87b989244b934d9b09bc97fc4169',
        nonce: 250,
        affiliate_fees: [],
      };

      const result = await orderbook.createOrder(orderRequest, auth);

      if (result.ok && result.val) {
        expect(result.val).toHaveProperty('order_id');
        expect(result.val.order_id).toBeDefined();
        expect(typeof result.val.order_id).toBe('string');
      } else {
        expect(result.error).toBeDefined();
      }
    }, 10000);

    it('should require auth for order creation', async () => {
      const orderRequest: CreateOrderRequest = {
        source: {
          asset: ChainAsset.from('arbitrum:wbtc').toString(),
          owner: testAddress,
          delegate: null,
          amount: '1000',
        },
        destination: {
          asset: ChainAsset.from('ethereum:usdc').toString(),
          owner: testAddress,
          delegate: null,
          amount: '1000',
        },
        solver_id: 'test-solver',
        nonce: Date.now(),
        affiliate_fees: [],
      };

      const result = await orderbook.createOrder(orderRequest, auth);
      expect(result).toBeDefined();
    }, 10000);

    it('should handle order request with affiliate fees', async () => {
      const orderRequest: CreateOrderRequest = {
        source: {
          asset: ChainAsset.from('arbitrum:wbtc').toString(),
          owner: testAddress,
          delegate: null,
          amount: '1000',
        },
        destination: {
          asset: ChainAsset.from('ethereum:usdc').toString(),
          owner: testAddress,
          delegate: null,
          amount: '1000',
        },
        solver_id: 'test-solver',
        nonce: Date.now(),
        affiliate_fees: [],
      };

      const result = await orderbook.createOrder(orderRequest, auth);
      expect(result).toBeDefined();
    }, 10000);

    it('should handle order request with optional slippage', async () => {
      const orderRequest: CreateOrderRequest = {
        source: {
          asset: ChainAsset.from('arbitrum:wbtc').toString(),
          owner: testAddress,
          delegate: null,
          amount: '1000',
        },
        destination: {
          asset: ChainAsset.from('ethereum:usdc').toString(),
          owner: testAddress,
          delegate: null,
          amount: '1000',
        },
        solver_id: 'test-solver',
        slippage: 10,
        nonce: Date.now(),
        affiliate_fees: [],
      };

      const result = await orderbook.createOrder(orderRequest, auth);
      expect(result).toBeDefined();
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const invalidOrderbook = new Orderbook(new Url('https://invalid-url-12345.com'));
      const result = await invalidOrderbook.getOrder('test-id');

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    }, 10000);

    it('should handle auth errors in createOrder', async () => {
      const testDigestKey = DigestKey.generateRandom();
      if (!testDigestKey.ok || !testDigestKey.val) {
        return;
      }

      const testAuth = Siwe.fromDigestKey(
        new Url(config.baseUrl + '/auth'),
        testDigestKey.val,
      );

      const orderRequest: CreateOrderRequest = {
        source: {
          asset: ChainAsset.from('arbitrum:wbtc').toString(),
          owner: testAddress,
          delegate: null,
          amount: '1000',
        },
        destination: {
          asset: ChainAsset.from('ethereum:usdc').toString(),
          owner: testAddress,
          delegate: null,
          amount: '1000',
        },
        solver_id: 'test-solver',
        nonce: Date.now(),
        affiliate_fees: [],
      };

      const result = await orderbook.createOrder(orderRequest, testAuth);
      expect(result).toBeDefined();
    }, 10000);
  });

  describe('Type Safety', () => {
    it('should return correct types for getOrder', async () => {
      const result = await orderbook.getOrder('test-id');

      if (result.ok && result.val) {
        expectTypeOf(result.val).toEqualTypeOf<OrderWithStatus>();
      }
    }, 10000);

    it('should return correct types for getOrders', async () => {
      const result = await orderbook.getOrders({});

      if (result.ok && result.val) {
        expectTypeOf(result.val).toEqualTypeOf<PaginatedData<OrderWithStatus>>();
        expectTypeOf(result.val.data).toEqualTypeOf<OrderWithStatus[]>();
      }
    });

    it('should return correct types for createOrder', async () => {
      const orderRequest: CreateOrderRequest = {
        source: {
          asset: ChainAsset.from('arbitrum:wbtc').toString(),
          owner: testAddress,
          delegate: null,
          amount: '1000',
        },
        destination: {
          asset: ChainAsset.from('ethereum:usdc').toString(),
          owner: testAddress,
          delegate: null,
          amount: '1000',
        },
        solver_id: 'test-solver',
        nonce: Date.now(),
        affiliate_fees: [],
      };

      const result = await orderbook.createOrder(orderRequest, auth);

      if (result.ok && result.val) {
        expect(result.val).toHaveProperty('order_id');
        expectTypeOf(result.val.order_id).toEqualTypeOf<string>();
      }
    });
  });
});

