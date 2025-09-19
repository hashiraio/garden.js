import React, { FC, useMemo } from 'react';
import { Typography } from '@gardenfi/garden-book';
import transactionHistoryStore from '../../hooks/transactionHistoryStore';
import { TransactionsSkeleton } from './TransactionSkeleton';
import { TransactionRow } from './TransactionRow';
import { OrderStatus } from '@gardenfi/orderbook';
import { getAssetFromSwap } from '../../utils/utils';
import { useAssetStore } from '../../hooks/assetStore';

export const CompletedTransactions: FC = () => {
  const { transactions, isLoading } = transactionHistoryStore();
  const { allAssets } = useAssetStore();

  const filteredTransactions = useMemo(
    () =>
      transactions.filter(
        (order) =>
          getAssetFromSwap(order.source_swap, allAssets) &&
          getAssetFromSwap(order.destination_swap, allAssets),
      ),
    [transactions, allAssets],
  );

  return (
    <div className="flex w-full flex-col overflow-y-auto scrollbar-hide">
      {isLoading ? (
        <TransactionsSkeleton />
      ) : filteredTransactions.length === 0 ? (
        <Typography size="h5" className="pb-4 text-center">
          No transactions found.
        </Typography>
      ) : (
        filteredTransactions.map((order, index) => (
          <div key={order.order_id || index} className="w-full">
            <TransactionRow
              order={order}
              status={OrderStatus.Redeemed}
              isLast={index === filteredTransactions.length - 1}
              isFirst={index === 0}
            />
          </div>
        ))
      )}
    </div>
  );
};
