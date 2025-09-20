import React, { useMemo } from 'react';
import { useAssetStore } from '../../store/assetStore';
import transactionHistoryStore from '../../store/transactionHistoryStore';
import { getAssetFromSwap } from '../../utils/utils';
import { useGarden } from '@gardenfi/react-hooks';
import { OrderStatus } from '@gardenfi/orderbook';
import { Typography } from '@gardenfi/garden-book';
import { TransactionRow } from './TransactionRow';
import { TransactionsSkeleton } from './TransactionSkeleton';

const Transactions = () => {
  const { transactions, isLoading } = transactionHistoryStore();
  const { allAssets } = useAssetStore();
  const { pendingOrders } = useGarden();

  // Filter completed transactions
  const filteredTransactions = useMemo(
    () =>
      transactions.filter(
        (order) =>
          getAssetFromSwap(order.source_swap, allAssets) &&
          getAssetFromSwap(order.destination_swap, allAssets),
      ),
    [transactions, allAssets],
  );

  // Filter pending transactions
  const filteredPendingOrders = useMemo(
    () =>
      pendingOrders?.filter(
        (order) =>
          getAssetFromSwap(order.source_swap, allAssets) &&
          getAssetFromSwap(order.destination_swap, allAssets),
      ) ?? [],
    [pendingOrders, allAssets],
  );

  // Combine both lists, pending first, then completed
  const allTransactions = useMemo(() => {
    // Mark each transaction with its status
    const pending = filteredPendingOrders.map((order) => ({
      order,
      status: OrderStatus.Created,
    }));
    const completed = filteredTransactions.map((order) => ({
      order,
      status: OrderStatus.Redeemed,
    }));
    return [...pending, ...completed];
  }, [filteredPendingOrders, filteredTransactions]);

  return (
    <div className="flex w-full flex-col overflow-y-auto scrollbar-hide">
      {isLoading ? (
        <TransactionsSkeleton />
      ) : allTransactions.length === 0 ? (
        <Typography size="h5" className="py-4 text-center">
          No transactions found.
        </Typography>
      ) : (
        allTransactions.map(({ order, status }, index) => (
          <div key={order.order_id || index} className="w-full">
            <TransactionRow
              order={order}
              status={status}
              isLast={index === allTransactions.length - 1}
              isFirst={index === 0}
            />
          </div>
        ))
      )}
    </div>
  );
};

export default Transactions;
