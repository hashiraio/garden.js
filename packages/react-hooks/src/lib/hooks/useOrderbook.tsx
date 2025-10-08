import { IGardenJS, OrderWithStatus } from '@gardenfi/core';
import { OrderStatus, OrderLifecycle } from '@gardenfi/orderbook';
import { IStore } from '@gardenfi/utils';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { PENDING_ORDERS_STORE } from '../constants';

export const useOrderbook = (garden: IGardenJS | undefined, store: IStore) => {
  const [pendingOrders, setPendingOrders] = useState<OrderWithStatus[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef<boolean>(false);
  const initialFetchDoneRef = useRef<boolean>(false);
  const FETCH_DELAY = 5000; // 5 seconds

  const getAddressesFromHTLCs = useCallback((): string[] => {
    if (!garden) return [];

    const addressSet = new Set<string>();

    try {
      const syncAddresses = [
        garden.htlcs?.evm?.htlcActorAddress,
        garden.htlcs?.sui?.htlcActorAddress,
        garden.htlcs?.solana?.htlcActorAddress,
        garden.htlcs?.starknet?.htlcActorAddress,
        garden.htlcs?.bitcoin?.htlcActorAddress,
      ].filter((addr): addr is string => !!addr && addr.length > 0);

      syncAddresses.forEach((addr) => addressSet.add(addr.toLowerCase()));
    } catch (error) {
      console.error('Error getting HTLC addresses:', error);
    }

    return Array.from(addressSet);
  }, [garden]);

  const fetchInitialPendingOrders = useCallback(async () => {
    if (!garden) return;

    try {
      const addresses = getAddressesFromHTLCs();

      if (addresses.length === 0) {
        console.log('No HTLC addresses found for initial pending orders fetch');
        return;
      }

      // Fetch pending orders from all addresses
      const orderPromises = addresses.map(async (address) => {
        try {
          const result = await garden.getOrders({
            address: address,
            status: OrderLifecycle.pending,
            per_page: 500,
          });

          if (result.ok) {
            return result.val.data;
          } else {
            console.error(
              `Failed to fetch orders for address ${address}:`,
              result.error,
            );
            return [];
          }
        } catch (error) {
          console.error(`Error fetching orders for address ${address}:`, error);
          return [];
        }
      });

      // Wait for all order fetches to complete
      const allOrdersArrays = await Promise.all(orderPromises);
      const allOrders = allOrdersArrays.flat();

      // Extract order IDs and save to localStorage
      const orderIds = allOrders.map((order) => order.order_id);

      if (orderIds.length > 0) {
        try {
          store.setItem(PENDING_ORDERS_STORE, JSON.stringify(orderIds));
        } catch (e) {
          console.error(
            'Error saving initial pending order IDs to localStorage',
            e,
          );
        }
      }
    } catch (error) {
      console.error('Error fetching initial pending orders:', error);
    }
  }, [garden, store, getAddressesFromHTLCs]);

  const fetchPendingOrders = useCallback(async () => {
    if (!garden) return;

    try {
      const existing = store.getItem(PENDING_ORDERS_STORE);
      const ids: string[] = existing ? JSON.parse(existing) : [];

      if (ids.length === 0) {
        setPendingOrders([]);
        return;
      }

      const results = await Promise.all(ids.map((id) => garden.getOrder(id)));

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

  // Get all HTLC addresses to track changes - using useMemo to prevent re-computation on every render
  const htlcAddresses = useMemo(() => {
    try {
      return getAddressesFromHTLCs().join(',');
    } catch (error) {
      console.error('Error computing HTLC addresses:', error);
      return '';
    }
  }, [getAddressesFromHTLCs]);

  const previousAddressesRef = useRef<string>('');

  // Initial fetch - runs when addresses are first available or when they change
  useEffect(() => {
    if (!garden || !garden.redeemServiceEnabled || !htlcAddresses) return;

    // Check if addresses have changed
    const addressesChanged = previousAddressesRef.current !== htlcAddresses;

    if (addressesChanged) {
      // Reset the initial fetch flag when addresses change
      initialFetchDoneRef.current = false;
      previousAddressesRef.current = htlcAddresses;
    }

    if (!initialFetchDoneRef.current) {
      fetchInitialPendingOrders();
      initialFetchDoneRef.current = true;
    }
  }, [garden, htlcAddresses, fetchInitialPendingOrders]);

  useEffect(() => {
    if (!garden) return;

    if (garden.redeemServiceEnabled) {
      let stopped = false;

      const scheduleNext = () => {
        if (stopped) return;
        timeoutRef.current = setTimeout(run, FETCH_DELAY);
      };

      const run = async () => {
        if (stopped) return;
        if (isFetchingRef.current) {
          scheduleNext();
          return;
        }
        isFetchingRef.current = true;
        try {
          await fetchPendingOrders();
        } finally {
          isFetchingRef.current = false;
        }
        scheduleNext();
      };

      run();

      return () => {
        stopped = true;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
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
