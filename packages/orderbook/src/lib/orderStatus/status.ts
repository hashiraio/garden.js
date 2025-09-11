/**
 * Order statuses
 */
export enum OrderStatus {
  /**
   * - Order is created
   * - Waiting for match
   */
  Created = 'Created',
  /**
   * - Order is matched
   * - User has to initiate
   */
  Matched = 'Matched',
  /**
   * - User initiate tx detected on-chain but not confirmed
   */
  InitiateDetected = 'InitiateDetected',
  /**
   * - User initiated
   * - Waiting for counter party to initiate
   */
  Initiated = 'Initiated',
  /**
   * - Counter party initiate tx detected on-chain but not confirmed
   */
  CounterPartyInitiateDetected = 'CounterPartyInitiateDetected',
  /**
   * - Counter party initiated
   * - User has to redeem
   */
  CounterPartyInitiated = 'CounterPartyInitiated',
  /**
   * - User redeem tx detected on-chain but not confirmed
   */
  RedeemDetected = 'RedeemDetected',
  /**
   * - User redeemed
   * - Counter party has to redeem
   * - We also consider user redemption as completed order.
   */
  Redeemed = 'Redeemed',
  /**
   * - Counter party redeem tx detected on-chain but not confirmed
   */
  CounterPartyRedeemDetected = 'CounterPartyRedeemDetected',
  /**
   * - Counter party redeemed
   * - Order is completed
   */
  CounterPartyRedeemed = 'CounterPartyRedeemed',
  /**
   * - Counter party redeemed
   * - Order is completed
   */
  Completed = 'Completed',
  /**
   * - The counterparty's swap has expired, and they will refund their funds.
   * - The user can no longer redeem the funds. The user must wait for their swap to expire and then refund their funds.
   * - Typically, in our system, the counterparty's swap expires in 24 hours, and the user's swap expires in 48 hours.
   */
  CounterPartySwapExpired = 'CounterPartySwapExpired',
  /**
   * - The user's swap has expired, and they have to refund their funds.
   * - The user's expiry only happens after counterparty's expiry.
   * - Typically, in our system, the counterparty's swap expires in 24 hours, and the user's swap expires in 48 hours.
   */
  Expired = 'Expired',
  /**
   * - User refund tx detected on-chain but not confirmed
   */
  RefundDetected = 'RefundDetected',
  /**
   * - User refunded
   * - User can only refund if their swap has expired
   */
  Refunded = 'Refunded',
  /**
   * - Counter party refund tx detected on-chain but not confirmed
   */
  CounterPartyRefundDetected = 'CounterPartyRefundDetected',
  /**
   * - Counter party refunded
   */
  CounterPartyRefunded = 'CounterPartyRefunded',
  /**
   * - Order is cancelled
   */
  Cancelled = 'Cancelled',
  /**
   * - DeadLine exceeded
   * - Initiate not detected before 1 hour of deadline or initiate not confirmed before 12 hours of deadline
   */
  DeadLineExceeded = 'DeadLineExceeded',
}

export enum SwapStatus {
  /**
   * - Swap is idle
   */
  Idle = 'Idle',
  /**
   * - Initiate tx detected on-chain but not confirmed
   */
  InitiateDetected = 'InitiateDetected',
  /**
   * - Swap is initiated
   */
  Initiated = 'Initiated',
  /**
   * - Redeem tx detected on-chain but not confirmed
   */
  RedeemDetected = 'RedeemDetected',
  /**
   * - Redeemed
   */
  Redeemed = 'Redeemed',
  /**
   * - Refund tx detected on-chain but not confirmed
   */
  RefundDetected = 'RefundDetected',
  /**
   * - Refunded
   */
  Refunded = 'Refunded',
  /**
   * - Swap is expired.
   * - Should refund.
   */
  Expired = 'Expired',
}
