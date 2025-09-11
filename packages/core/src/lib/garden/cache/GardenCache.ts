import NodeCache from 'node-cache';
import { Order, OrderAction } from '@gardenfi/orderbook';

// Cache types for different purposes
export enum CacheType {
  OrderExecutor = 'orderExecutor',
  BitcoinRedeem = 'bitcoinRedeem',
  RefundSacp = 'refundSacp',
}

// Value types for each cache
export type OrderExecutorCacheValue = {
  txHash: string;
  timeStamp: number;
  btcRedeemUTXO?: string;
};

export type RefundSacpCacheValue = {
  initTxHash: string;
};

export type BitcoinRedeemCacheValue = {
  redeemedFromUTXO: string;
  redeemedAt: number;
  redeemTxHash: string;
};

interface CacheOptions {
  max?: number;
  ttl?: number;
}

export class GardenCache {
  private cache: NodeCache;

  constructor(options: CacheOptions = {}) {
    const defaultOptions = {
      stdTTL: options.ttl ? options.ttl / 1000 : 60 * 60, // default 1 hour
      checkperiod: 10 * 60,
    };

    this.cache = new NodeCache(defaultOptions);
  }

  private makeKey(type: CacheType, key: string): string {
    return `${type}:${key}`;
  }

  set<T>(type: CacheType, key: string, value: T, ttl?: number): void {
    const namespacedKey = this.makeKey(type, key);
    if (ttl) {
      this.cache.set(namespacedKey, value, ttl / 1000);
    } else {
      this.cache.set(namespacedKey, value);
    }
  }

  get<T>(type: CacheType, key: string): T | undefined {
    const namespacedKey = this.makeKey(type, key);
    return this.cache.get(namespacedKey) as T | undefined;
  }

  remove(type: CacheType, key: string): void {
    const namespacedKey = this.makeKey(type, key);
    this.cache.del(namespacedKey);
  }

  clear(type?: CacheType): void {
    if (type) {
      const keys = this.cache.keys().filter((k) => k.startsWith(`${type}:`));
      this.cache.del(keys);
    } else {
      this.cache.flushAll();
    }
  }

  // Bitcoin redeem cache
  setBitcoinRedeem(
    orderId: string,
    data: BitcoinRedeemCacheValue,
    ttl?: number,
  ): void {
    this.set(CacheType.BitcoinRedeem, orderId, data, ttl);
  }

  getBitcoinRedeem(orderId: string): BitcoinRedeemCacheValue | undefined {
    return this.get(CacheType.BitcoinRedeem, orderId);
  }

  // OrderExecutor cache
  setOrderExecution(
    order: Order,
    action: OrderAction | string,
    txHash: string,
    utxo?: string,
    ttl?: number,
  ): void {
    const key = this.makeOrderKey(order, action);
    const value: OrderExecutorCacheValue = {
      txHash,
      timeStamp: Date.now(),
      btcRedeemUTXO: utxo,
    };
    this.set(CacheType.OrderExecutor, key, value, ttl);
  }

  getOrderExecution(
    order: Order,
    action: OrderAction | string,
  ): OrderExecutorCacheValue | undefined {
    const key = this.makeOrderKey(order, action);
    return this.get(CacheType.OrderExecutor, key);
  }

  removeOrderExecution(order: Order, action: OrderAction | string): void {
    const key = this.makeOrderKey(order, action);
    this.remove(CacheType.OrderExecutor, key);
  }

  private makeOrderKey(order: Order, action: OrderAction | string): string {
    return `${action}_${(order as any).order_id ?? (order as any).created_at}`;
  }

  // RefundSacp cache
  setSacpCache(
    orderId: string,
    data: RefundSacpCacheValue,
    ttl?: number,
  ): void {
    this.set(CacheType.RefundSacp, orderId, data, ttl);
  }

  getSacpCache(orderId: string): RefundSacpCacheValue | undefined {
    return this.get(CacheType.RefundSacp, orderId);
  }

  // Utilities
  has(type: CacheType, key: string): boolean {
    const namespacedKey = this.makeKey(type, key);
    return this.cache.has(namespacedKey);
  }

  peek<T>(type: CacheType, key: string): T | undefined {
    return this.get(type, key);
  }

  getRemainingTTL(type: CacheType, key: string): number {
    const namespacedKey = this.makeKey(type, key);
    const ttl = this.cache.getTtl(namespacedKey);
    if (ttl === undefined) return -1;
    const now = Date.now();
    return Math.max(0, ttl - now);
  }
}
