import { OrderStatus, ParseOrderStatus } from '@gardenfi/orderbook';
import { useGarden } from '@gardenfi/react-hooks';
import { useEffect, useMemo } from 'react';
import { assetInfoStore } from '../store/assetStore';
import { getAssetFromSwap } from '../utils/utils';
import orderInProgressStore from '../store/orderInProgressStore';
// import { Toast } from '../components/toast/Toast';

export enum SimplifiedOrderStatus {
  orderCreated = 'Order created',
  detectingDeposit = 'Detecting deposit',
  depositDetected = 'Deposit detected',
  depositConfirmed = 'Deposit confirmed',
  redeeming = 'Redeeming ',
  redeemed = 'Redeemed ',
  swapCompleted = 'Swap completed',
  Refunded = 'Refund completed',
  AwaitingRefund = 'Awaiting refund',
  Expired = 'Expired',
}

export const STATUS_MAPPING: Record<string, SimplifiedOrderStatus> = {
  RefundDetected: SimplifiedOrderStatus.Refunded,
  CounterPartyRefundDetected: SimplifiedOrderStatus.AwaitingRefund,
  CounterPartyRefunded: SimplifiedOrderStatus.AwaitingRefund,
  Refunded: SimplifiedOrderStatus.Refunded,
};

type Status = {
  title: string;
  status: 'completed' | 'inProgress' | 'pending' | 'cancel';
};

export type OrderProgress = {
  readonly [key in 1 | 2 | 3 | 4]?: Status;
};

export const useOrderStatus = () => {
  const { pendingOrders, garden } = useGarden();
  const { allAssets } = assetInfoStore();
  const { order: orderInProgress, setOrder } = orderInProgressStore();

  const outputAsset =
    orderInProgress &&
    getAssetFromSwap(orderInProgress.destination_swap, allAssets);

  const confirmationsString = useMemo(() => {
    return orderInProgress &&
      orderInProgress.status === OrderStatus.InitiateDetected
      ? '0' + '/' + '1'
      : '';
  }, [orderInProgress]);

  const viewableStatus =
    (orderInProgress?.status && STATUS_MAPPING[orderInProgress?.status]) ||
    null;

  const orderProgress: OrderProgress | undefined = useMemo(() => {
    switch (orderInProgress?.status) {
      case OrderStatus.Created:
        return {
          1: { title: SimplifiedOrderStatus.orderCreated, status: 'completed' },
          2: {
            title: SimplifiedOrderStatus.detectingDeposit,
            status: 'pending',
          },
          3: {
            title: SimplifiedOrderStatus.redeeming + outputAsset?.symbol,
            status: 'pending',
          },
          4: {
            title: SimplifiedOrderStatus.swapCompleted,
            status: 'pending',
          },
        };
      case OrderStatus.InitiateDetected:
        return {
          1: {
            title: SimplifiedOrderStatus.orderCreated,
            status: 'completed',
          },
          2: {
            title: SimplifiedOrderStatus.depositDetected,
            status: 'inProgress',
          },
          3: {
            title: SimplifiedOrderStatus.redeeming + outputAsset?.symbol,
            status: 'pending',
          },
          4: {
            title: SimplifiedOrderStatus.swapCompleted,
            status: 'pending',
          },
        };
      case OrderStatus.Initiated:
        return {
          1: {
            title: SimplifiedOrderStatus.orderCreated,
            status: 'completed',
          },
          2: {
            title: SimplifiedOrderStatus.depositConfirmed,
            status: 'completed',
          },
          3: {
            title: SimplifiedOrderStatus.redeeming + outputAsset?.symbol,
            status: 'inProgress',
          },
          4: {
            title: SimplifiedOrderStatus.swapCompleted,
            status: 'pending',
          },
        };
      case OrderStatus.RefundDetected:
      case OrderStatus.Refunded:
        return {
          1: {
            title: SimplifiedOrderStatus.orderCreated,
            status: 'completed',
          },
          2: {
            title: SimplifiedOrderStatus.depositConfirmed,
            status: 'completed',
          },
          3: {
            title: SimplifiedOrderStatus.redeeming + outputAsset?.symbol,
            status: 'cancel',
          },
          4: {
            title: SimplifiedOrderStatus.Refunded,
            status: 'completed',
          },
        };
      case OrderStatus.RedeemDetected:
      case OrderStatus.Redeemed:
        if (!orderInProgress.source_swap.refund_tx_hash) {
          return {
            1: {
              title: SimplifiedOrderStatus.orderCreated,
              status: 'completed',
            },
            2: {
              title: SimplifiedOrderStatus.depositConfirmed,
              status: 'completed',
            },
            3: {
              title: SimplifiedOrderStatus.redeemed + outputAsset?.symbol,
              status: 'completed',
            },
            4: {
              title: SimplifiedOrderStatus.swapCompleted,
              status: 'completed',
            },
          };
        } else {
          return {
            1: {
              title: SimplifiedOrderStatus.orderCreated,
              status: 'completed',
            },
            2: {
              title: SimplifiedOrderStatus.depositConfirmed,
              status: 'completed',
            },
            3: {
              title: SimplifiedOrderStatus.redeeming + outputAsset?.symbol,
              status: 'cancel',
            },
            4: {
              title: SimplifiedOrderStatus.Refunded,
              status: 'completed',
            },
          };
        }
      case OrderStatus.Expired:
        return {
          1: {
            title: SimplifiedOrderStatus.orderCreated,
            status: 'completed',
          },
          2: {
            title: SimplifiedOrderStatus.Expired,
            status: 'cancel',
          },
        };
      default:
        return undefined;
    }
  }, [orderInProgress, outputAsset?.symbol]);

  useEffect(() => {
    if (!orderInProgress || !garden) return;

    // Check if order is in pending orders
    if (pendingOrders.length) {
      const orderFromPending = pendingOrders.find(
        (o) => orderInProgress.order_id === o.order_id,
      );
      if (orderFromPending) {
        setOrder(garden, orderFromPending.order_id);
        return;
      }
    }

    // Skip fetching for completed orders
    const completedStatuses = [
      OrderStatus.RedeemDetected,
      OrderStatus.Redeemed,
      OrderStatus.RefundDetected,
      OrderStatus.Refunded,
    ];

    if (completedStatuses.includes(orderInProgress.status)) return;

    // Fetch order from orderbook
    const fetchOrder = async () => {
      if (!garden) return;

      const orderFromOrderbook = await garden.getOrder(
        orderInProgress.order_id,
      );

      if (!orderFromOrderbook.ok) return;

      const o = orderFromOrderbook.val;
      const status = ParseOrderStatus(o);

      setOrder(garden, o.order_id);

      if (completedStatuses.includes(status)) {
        const inputAsset = getAssetFromSwap(o.source_swap, allAssets);
        const outputAsset = getAssetFromSwap(o.destination_swap, allAssets);
        if (!inputAsset || !outputAsset) return;
      }
    };

    fetchOrder();
  }, [pendingOrders, orderInProgress, setOrder, garden, allAssets]);

  return {
    orderProgress,
    viewableStatus,
    confirmationsString,
  };
};
