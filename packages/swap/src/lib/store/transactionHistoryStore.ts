import {
  BlockchainType,
  OrderLifecycle,
  OrderWithStatus,
} from '@gardenfi/orderbook';
import { create } from 'zustand';
import { IGardenJS } from '@gardenfi/core';

type TransactionHistoryStoreState = {
  transactions: OrderWithStatus[];
  isLoading: boolean;
  perPage: number;
  totalItems: number;
  fetchTransactions: (
    garden: IGardenJS,
    connectedWallets: {
      [key in BlockchainType]: string;
    },
    append?: boolean,
  ) => Promise<void>;
  loadMore: (
    garden: IGardenJS,
    connectedWallets: {
      [key in BlockchainType]: string;
    },
  ) => Promise<void>;
};

const transactionHistoryStore = create<TransactionHistoryStoreState>(
  (set, get) => ({
    transactions: [],
    isLoading: false,
    perPage: 4,
    totalItems: 0,

    fetchTransactions: async (
      garden: IGardenJS,
      connectedWallets: {
        [key in BlockchainType]: string;
      },
    ) => {
      set({ isLoading: true });
      try {
        const perPage = get().perPage;
        const addresses = Object.values(connectedWallets).filter(
          (addr) => addr !== '',
        );

        // Use Promise.all to fetch all orders for each address in parallel
        const orderPromises = addresses.map(async (address) => {
          try {
            // getOrders returns an AsyncResult, so we await it directly
            const result = await garden.getOrders({
              from_owner: address,
              per_page: perPage,
              status: OrderLifecycle.fulfilled,
            });

            if (result.ok) {
              // result.val.data is the array of orders
              return {
                orders: result.val.data,
                totalItems: result.val.total_items ?? 0,
              };
            } else {
              console.error(
                `Failed to fetch transactions for address ${address}: ${result.error}`,
              );
              return { orders: [], totalItems: 0 };
            }
          } catch (error) {
            console.error(
              `Failed to fetch transactions for address ${address}: ${error}`,
            );
            return { orders: [], totalItems: 0 };
          }
        });

        const results = await Promise.all(orderPromises);

        const newTransactions: OrderWithStatus[] = [];
        let totalItems = 0;
        const seenOrderIds = new Set<string>();

        for (const txns of results) {
          if (txns.orders.length === 0) {
            console.error('failed to fetch transactions ❌', txns.orders);
            continue;
          }
          totalItems += txns.totalItems;
          for (const order of txns.orders ?? []) {
            const uniqueId =
              order.order_id ?? order.order_id ?? JSON.stringify(order);
            if (!seenOrderIds.has(uniqueId)) {
              seenOrderIds.add(uniqueId);
              newTransactions.push(order);
            }
          }
        }

        newTransactions.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

        set({
          transactions: newTransactions,
          totalItems,
        });
      } catch (err) {
        console.error('Unexpected error in fetchTransactions', err);
      } finally {
        set({ isLoading: false });
      }
    },

    loadMore: async (
      garden: IGardenJS,
      connectedWallets: {
        [key in BlockchainType]: string;
      },
    ) => {
      set((state) => ({ perPage: state.perPage + 4 }));
      await get().fetchTransactions(garden, connectedWallets);
    },
  }),
);

export default transactionHistoryStore;
