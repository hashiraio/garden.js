import { IGardenJS, OrderWithStatus } from '@gardenfi/core';
import { OrderStatus } from '@gardenfi/orderbook';
import { IStore } from '@gardenfi/utils';
import { useEffect, useState, useRef, useCallback } from 'react';
import { PENDING_ORDERS_STORE } from '../constants';

export const useOrderbook = (garden: IGardenJS | undefined, store: IStore) => {
  const [pendingOrders, setPendingOrders] = useState<OrderWithStatus[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPendingOrders = useCallback(async () => {
    if (!garden) return;

    try {
      const existing = store.getItem(PENDING_ORDERS_STORE);
      const ids: string[] = existing ? JSON.parse(existing) : [];

      if (ids.length === 0) {
        setPendingOrders([]);
        return;
      }

      const results = await Promise.all(
        ids.map((id) => garden.orderbook.getOrder(id)),
      );

      const orders: OrderWithStatus[] = [];
      const remainingIds: string[] = [];

      results.forEach((res, idx) => {
        if (!res.ok) {
          remainingIds.push(ids[idx]);
          return;
        }

        const order = res.val;
        const isCompleted =
          order.status === OrderStatus.Redeemed ||
          order.status === OrderStatus.Refunded ||
          order.status === OrderStatus.Expired;
        if (isCompleted) {
          return;
        }

        orders.push(order);
        remainingIds.push(ids[idx]);
      });

      try {
        store.setItem(PENDING_ORDERS_STORE, JSON.stringify(remainingIds));
      } catch (e) {
        console.error('Error persisting remaining pending order ids', e);
      }

      setPendingOrders(orders);
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    }
  }, [garden, store]);

  useEffect(() => {
    if (!garden) return;

    if (garden.redeemServiceEnabled) {
      fetchPendingOrders();

      intervalRef.current = setInterval(fetchPendingOrders, 5000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      // When redeem service is disabled, use events
      const handlePendingOrdersChange = (orders: OrderWithStatus[]) =>
        setPendingOrders(orders);

      garden.on('onPendingOrdersChanged', handlePendingOrdersChange);

      return () => {
        garden.off('onPendingOrdersChanged', handlePendingOrdersChange);
      };
    }
  }, [garden, fetchPendingOrders]);

  return { pendingOrders };
};
