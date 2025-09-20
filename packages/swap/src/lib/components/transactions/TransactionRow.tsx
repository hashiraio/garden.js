import React, { FC, useMemo } from 'react';
import { Typography } from '@gardenfi/garden-book';
import { SwapInfo } from './SwapInfo';
import { Order, OrderStatus } from '@gardenfi/orderbook';
import { useAssetStore } from '../../store/assetStore';
import {
  formatAmount,
  getAssetFromSwap,
  getDayDifference,
} from '../../utils/utils';
import { useSwapStore } from '../../hooks/store';
import { getApiEndpoint } from '../../constants/constants';

type TransactionProps = {
  order: Order;
  status?: OrderStatus;
  isLast: boolean;
  isFirst: boolean;
};

enum StatusLabel {
  Completed = 'Completed',
  Pending = 'In progress...',
  Expired = 'Expired',
  ShouldInitiate = 'Detecting deposit',
  InitiateDetected = 'Deposit detected (0/1)',
  Initiated = 'Deposit detected',
  Redeeming = 'Redeeming',
}

const getOrderStatusLabel = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.Created:
      return StatusLabel.ShouldInitiate;
    case OrderStatus.Expired:
      return StatusLabel.Expired;
    case OrderStatus.Initiated:
      return StatusLabel.InitiateDetected;
    case OrderStatus.InitiateDetected:
      return StatusLabel.InitiateDetected;
    case OrderStatus.AwaitingRedeem:
      return StatusLabel.Redeeming;
    case OrderStatus.Refunded:
    case OrderStatus.AwaitingRefund:
    case OrderStatus.Redeemed:
      return StatusLabel.Completed;
    default:
      return StatusLabel.Pending;
  }
};

export const TransactionRow: FC<TransactionProps> = ({
  order,
  status,
  isLast,
  isFirst,
}) => {
  const { source_swap, destination_swap } = order;
  const { allAssets } = useAssetStore();
  const { currentNetwork } = useSwapStore();
  // const { evmInitiate } = useGarden();

  const sendAsset = useMemo(
    () => getAssetFromSwap(source_swap, allAssets),
    [source_swap, allAssets],
  );
  const receiveAsset = useMemo(
    () => getAssetFromSwap(destination_swap, allAssets),
    [destination_swap, allAssets],
  );
  const statusLabel = useMemo(
    () => status && getOrderStatusLabel(status),
    [status],
  );
  const sendAmount = useMemo(
    () =>
      sendAsset &&
      formatAmount(
        source_swap.amount,
        sendAsset?.decimals ?? 0,
        Math.min(sendAsset.decimals, 8),
      ),
    [source_swap.amount, sendAsset],
  );
  const receiveAmount = useMemo(
    () =>
      receiveAsset &&
      formatAmount(
        destination_swap.amount,
        receiveAsset?.decimals ?? 0,
        Math.min(receiveAsset.decimals, 8),
      ),
    [destination_swap.amount, receiveAsset],
  );
  const dayDifference = useMemo(
    () => getDayDifference(order.created_at),
    [order.created_at],
  );

  const handleTransactionClick = () => {
    if (order.order_id) {
      const endpoint = getApiEndpoint(currentNetwork).explorer;
      window.open(`${endpoint}/order/${order.order_id}`, '_blank');
    }
  };

  if (!sendAsset || !receiveAsset) return null;

  return (
    <div>
      {!isFirst && <div className="h-px w-full bg-white/50"></div>}
      <div
        className={`flex flex-col gap-1 p-4 ${isLast ? 'rounded-b-2xl' : ''} ${
          statusLabel !== StatusLabel.Expired
            ? 'cursor-pointer hover:bg-white/50'
            : ''
        }`}
        onClick={handleTransactionClick}
      >
        <div className={`flex flex-col gap-1`}>
          {sendAmount && receiveAmount && (
            <SwapInfo
              sendAsset={sendAsset}
              receiveAsset={receiveAsset}
              sendAmount={sendAmount}
              receiveAmount={receiveAmount}
            />
          )}
          <div className="flex justify-between">
            <Typography size="h5" weight="regular">
              {statusLabel}
            </Typography>
            <Typography size="h5" weight="regular">
              {dayDifference}
            </Typography>
          </div>
        </div>
      </div>
    </div>
  );
};
