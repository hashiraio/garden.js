import React, { useMemo } from 'react';
import { assetInfoStore } from '../../store/assetStore';
import transactionHistoryStore from '../../store/transactionHistoryStore';
import { getAssetFromSwap } from '../../utils/utils';
import { useGarden } from '@gardenfi/react-hooks';
import { Typography } from '@gardenfi/garden-book';
import { TransactionRow } from './TransactionRow';
import { TransactionsSkeleton } from './TransactionSkeleton';
import { AnimatePresence, motion } from 'framer-motion';

const Transactions = () => {
  const { transactions, isLoading } = transactionHistoryStore();
  const { allAssets } = assetInfoStore();
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

  const allTransactions = useMemo(() => {
    return [...filteredPendingOrders, ...filteredTransactions];
  }, [filteredPendingOrders, filteredTransactions]);

  return (
    <AnimatePresence mode="wait">
      <motion.div className="flex w-full flex-col overflow-y-auto scrollbar-hide">
        {isLoading ? (
          <TransactionsSkeleton />
        ) : allTransactions.length === 0 ? (
          <Typography size="h5" className="py-4 text-center">
            No transactions found.
          </Typography>
        ) : (
          allTransactions.map((order, index) => (
            <div key={order.order_id || index} className="w-full">
              <TransactionRow
                order={order}
                status={order.status}
                isLast={index === allTransactions.length - 1}
                isFirst={index === 0}
              />
            </div>
          ))
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default Transactions;
