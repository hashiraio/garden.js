import { isBitcoin, OrderStatus } from '../asset';
import { Order } from '../orderbook/orderbook.types';

export const ParseOrderStatus = (order: Order) => {
  const { created_at, source_swap, destination_swap } = order;

  // ---------------------- REDEEM CASE ----------------------
  if (destination_swap.redeem_tx_hash) {
    if (Number(destination_swap.redeem_block_number))
      return OrderStatus.Redeemed;
    // We don't wait bitcoin redeem txs to be confirmed.
    return isBitcoin(destination_swap.chain)
      ? OrderStatus.Redeemed
      : OrderStatus.RedeemDetected;
  }
  // if BTC in output asset, then there is a chance that the redeem tx gets dropped and the BE does a RBF.
  if (
    isBitcoin(destination_swap.chain) &&
    source_swap.redeem_tx_hash &&
    !destination_swap.redeem_tx_hash
  )
    return OrderStatus.Redeemed;

  // ---------------------- REFUND CASE ----------------------
  if (source_swap.refund_tx_hash) {
    if (Number(source_swap.refund_block_number)) return OrderStatus.Refunded;
    return OrderStatus.RefundDetected;
  }
  if (destination_swap.refund_tx_hash) return OrderStatus.AwaitingRefund;

  const _isExpired = isBitcoin(source_swap.chain)
    ? isDeadlinePassed(new Date(created_at), 6)
    : isDeadlinePassed(new Date(created_at), 1);

  // ---------------------- INITIATE CASE ----------------------
  if (destination_swap.initiate_tx_hash) return OrderStatus.AwaitingRedeem;
  if (source_swap.initiate_tx_hash) {
    // Initiate should be confirmed before the deadline, if not, then it will be refunded.
    if (_isExpired) return OrderStatus.AwaitingRefund;
    if (Number(source_swap.initiate_block_number)) return OrderStatus.Initiated;
    return OrderStatus.InitiateDetected;
  }

  // ---------------------- EXPIRY CASE ----------------------
  if (_isExpired) return OrderStatus.Expired;

  return OrderStatus.Created;
};

export const isDeadlinePassed = (date: Date, tillHours = 1) => {
  const now = new Date();
  const dateToCheck = new Date(date);
  dateToCheck.setHours(dateToCheck.getHours() + tillHours);
  return now > dateToCheck;
};

export const isCompleted = (order: Order) => {
  const status = ParseOrderStatus(order);
  return (
    status === OrderStatus.Redeemed ||
    status === OrderStatus.Refunded ||
    status === OrderStatus.Expired
  );
};

export enum OrderAction {
  Initiate = 'Initiate',
  PostRefundSACP = 'PostRefundSACP',
  Redeem = 'Redeem',
  Refund = 'Refund',
  Idle = 'Idle',
}

export const parseAction = (order: Order) => {
  const { source_swap, destination_swap } = order;

  // Already redeemed or refunded
  if (
    (destination_swap.redeem_tx_hash &&
      Number(destination_swap.redeem_block_number)) ||
    (source_swap.refund_tx_hash && Number(source_swap.refund_block_number))
  )
    return OrderAction.Idle;

  // Solver initiated and isn't refunded, user can now redeem
  if (!destination_swap.refund_tx_hash && destination_swap.initiate_tx_hash)
    return OrderAction.Redeem;

  //TODO: also handle refund cases using current block number, if not instant refunded.
  return OrderAction.Idle;
};
