import { IGardenJS, OrderWithStatus } from '@gardenfi/core';
import { OrderLifecycle } from '@gardenfi/orderbook';
import { useEffect, useState, useRef, useCallback } from 'react';

export const useOrderbook = (garden: IGardenJS | undefined) => {
  const [pendingOrders, setPendingOrders] = useState<OrderWithStatus[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPendingOrders = useCallback(async () => {
    if (!garden) return;

    try {
      const addresses: string[] = [];

      const syncAddresses = [
        garden.htlcs.evm?.htlcActorAddress,
        garden.htlcs.sui?.htlcActorAddress,
        garden.htlcs.solana?.htlcActorAddress,
        garden.htlcs.starknet?.htlcActorAddress,
        garden.htlcs.bitcoin?.htlcActorAddress,
      ].filter((addr): addr is string => !!addr && addr.length > 0);

      addresses.push(...syncAddresses.map((addr) => addr.toLowerCase()));

      if (garden.htlcs.bitcoin) {
        try {
          const btcAddress = await garden.htlcs.bitcoin.htlcActorAddress();
          if (btcAddress && btcAddress.length > 0) {
            addresses.push(btcAddress.toLowerCase());
          }
        } catch {
          // ignore missing btc
        }
      }

      if (addresses.length === 0 && garden.digestKey) {
        addresses.push(garden.digestKey.userId.toLowerCase());
      }

      const orderPromises = addresses.map(async (address) => {
        try {
          const result = await garden.orderbook.getOrders({
            from_owner: address,
            status: OrderLifecycle.inProgress,
            per_page: 500,
          });

          if (result.ok) {
            return result.val.data;
          } else {
            console.error(
              `Failed to fetch orders for address ${address}: ${result.error}`,
            );
            return [];
          }
        } catch (error) {
          console.error(
            `Failed to fetch orders for address ${address}:`,
            error,
          );
          return [];
        }
      });

      const allOrdersArrays = await Promise.all(orderPromises);

      const allOrders = allOrdersArrays.flat();
      setPendingOrders(allOrders);
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    }
  }, [garden]);

  useEffect(() => {
    if (!garden) return;

    if (garden.redeemServiceEnabled) {
      // When redeem service is enabled, fetch orders manually
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
