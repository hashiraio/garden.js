import React, { FC, useMemo } from 'react';
import { Typography } from '@gardenfi/garden-book';
import { useGarden } from '@gardenfi/react-hooks';
// import { TransactionsSkeleton } from './TransactionSkeleton';
import { TransactionRow } from './TransactionRow';
import { OrderStatus } from '@gardenfi/orderbook';
import { getAssetFromSwap } from '../../utils/utils';
import { useAssetStore } from '../../hooks/assetStore';

export const PendingTransactions: FC = () => {
  const { pendingOrders } = useGarden();
  const { allAssets } = useAssetStore();

  const filteredPendingOrders = useMemo(
    () =>
      pendingOrders?.filter(
        (order) =>
          getAssetFromSwap(order.source_swap, allAssets) &&
          getAssetFromSwap(order.destination_swap, allAssets),
      ) ?? [],
    [pendingOrders, allAssets],
  );

  return (
    <div className="flex w-full flex-col overflow-y-auto scrollbar-hide">
      {filteredPendingOrders.length === 0 ? (
        <Typography size="h5" className="pb-4 text-center">
          No pending transactions.
        </Typography>
      ) : (
        filteredPendingOrders.map((order, index) => (
          <div key={order.order_id || index} className="w-full">
            <TransactionRow
              order={order}
              status={OrderStatus.Created}
              isLast={index === filteredPendingOrders.length - 1}
              isFirst={index === 0}
            />
          </div>
        ))
      )}
    </div>
  );
};
