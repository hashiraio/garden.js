import { describe, it, expect } from 'vitest';
import {
    ParseOrderStatus,
    isDeadlinePassed,
    isCompleted,
    OrderAction,
    parseAction,
} from './orderStatus';
import { Order, Swap } from '../orderbook/orderbook.types';
import { OrderStatus } from '../constants/asset';

const createSwap = (overrides: Partial<Swap> = {}): Swap => ({
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    swap_id: 'swap-id',
    chain: 'ethereum',
    asset: 'ethereum:wbtc',
    initiator: '0xinitiator',
    redeemer: '0xredeemer',
    timelock: 0,
    filled_amount: '0',
    amount: '0',
    secret_hash: 'secret-hash',
    secret: '',
    initiate_tx_hash: '',
    redeem_tx_hash: '',
    refund_tx_hash: '',
    initiate_block_number: null,
    redeem_block_number: null,
    refund_block_number: null,
    required_confirmations: 1,
    delegate: '0xdelegate',
    asset_price: 0,
    instant_refund_tx: '',
    initiate_timestamp: new Date().toISOString(),
    redeem_timestamp: new Date().toISOString(),
    refund_timestamp: new Date().toISOString(),
    current_confirmations: 0,
    ...overrides,
});

const createOrder = (overrides: Partial<Order> = {}): Order => ({
    order_id: 'order-id',
    created_at: new Date().toISOString(),
    source_swap: createSwap(),
    destination_swap: createSwap(),
    slippage: 0,
    nonce: '0',
    affiliate_fees: [],
    integrator: 'test',
    version: '1',
    ...overrides,
});

describe('ParseOrderStatus', () => {
    it('returns Redeemed when destination redeem tx is confirmed', () => {
        const order = createOrder({
            destination_swap: createSwap({
                redeem_tx_hash: '0xredeem',
                redeem_block_number: '123',
            }),
        });

        expect(ParseOrderStatus(order as Order)).toBe(OrderStatus.Redeemed);
    });

    it('returns Redeemed when destination chain is bitcoin and redeem tx exists', () => {
        const order = createOrder({
            destination_swap: createSwap({
                chain: 'bitcoin',
                asset: 'bitcoin:btc',
                redeem_tx_hash: '0xredeem',
                redeem_block_number: null,
            }),
        });

        expect(ParseOrderStatus(order as Order)).toBe(OrderStatus.Redeemed);
    });

    it('returns RedeemDetected when redeem tx hash exists but not confirmed', () => {
        const order = createOrder({
            destination_swap: createSwap({
                redeem_tx_hash: '0xredeem',
                redeem_block_number: null,
            }),
        });

        expect(ParseOrderStatus(order as Order)).toBe(OrderStatus.RedeemDetected);
    });

    it('returns Redeemed when source redeem tx exists and destination chain is bitcoin', () => {
        const order = createOrder({
            source_swap: createSwap({ redeem_tx_hash: '0xredeem-source' }),
            destination_swap: createSwap({ chain: 'bitcoin', asset: 'bitcoin:btc' }),
        });

        expect(ParseOrderStatus(order as Order)).toBe(OrderStatus.Redeemed);
    });

    it('returns Refunded when source refund tx is confirmed', () => {
        const order = createOrder({
            source_swap: createSwap({
                refund_tx_hash: '0xrefund',
                refund_block_number: '45',
            }),
        });

        expect(ParseOrderStatus(order as Order)).toBe(OrderStatus.Refunded);
    });

    it('returns RefundDetected when source refund tx pending', () => {
        const order = createOrder({
            source_swap: createSwap({
                refund_tx_hash: '0xrefund',
                refund_block_number: null,
            }),
        });

        expect(ParseOrderStatus(order as Order)).toBe(OrderStatus.RefundDetected);
    });

    it('returns AwaitingRefund when destination refund tx exists', () => {
        const order = createOrder({
            destination_swap: createSwap({ refund_tx_hash: '0xdest-refund' }),
        });

        expect(ParseOrderStatus(order as Order)).toBe(OrderStatus.AwaitingRefund);
    });

    it('returns AwaitingRedeem when destination initiate tx exists', () => {
        const order = createOrder({
            destination_swap: createSwap({ initiate_tx_hash: '0xinitiate-dest' }),
        });

        expect(ParseOrderStatus(order as Order)).toBe(OrderStatus.AwaitingRedeem);
    });

    it('returns AwaitingRefund when source initiate expired', () => {
        const createdAt = new Date();
        createdAt.setHours(createdAt.getHours() - 2);

        const order = createOrder({
            created_at: createdAt.toISOString(),
            source_swap: createSwap({ initiate_tx_hash: '0xinitiate-src' }),
        });

        expect(ParseOrderStatus(order as Order)).toBe(OrderStatus.AwaitingRefund);
    });

    it('returns Initiated when source initiate confirmed before deadline', () => {
        const order = createOrder({
            source_swap: createSwap({
                initiate_tx_hash: '0xinitiate-src',
                initiate_block_number: '1234',
            }),
        });

        expect(ParseOrderStatus(order as Order)).toBe(OrderStatus.Initiated);
    });

    it('returns InitiateDetected when source initiate pending', () => {
        const recentDate = new Date();
        recentDate.setMinutes(recentDate.getMinutes() - 5);

        const order = createOrder({
            created_at: recentDate.toISOString(),
            source_swap: createSwap({ initiate_tx_hash: '0xinitiate-src' }),
        });

        expect(ParseOrderStatus(order as Order)).toBe(OrderStatus.InitiateDetected);
    });

    it('returns Expired when deadline passed without initiates', () => {
        const createdAt = new Date();
        createdAt.setHours(createdAt.getHours() - 2);

        const order = createOrder({ created_at: createdAt.toISOString() });

        expect(ParseOrderStatus(order as Order)).toBe(OrderStatus.Expired);
    });

    it('returns Created when no other status applies', () => {
        const recentDate = new Date();
        recentDate.setMinutes(recentDate.getMinutes() - 10);

        const order = createOrder({ created_at: recentDate.toISOString() });

        expect(ParseOrderStatus(order as Order)).toBe(OrderStatus.Created);
    });
});

describe('isDeadlinePassed', () => {
    it('returns false when deadline not passed', () => {
        const now = new Date();
        const future = new Date(now);
        future.setMinutes(now.getMinutes() - 30);

        expect(isDeadlinePassed(future, 1)).toBe(false);
    });

    it('returns true when deadline passed', () => {
        const now = new Date();
        const past = new Date(now);
        past.setHours(now.getHours() - 2);

        expect(isDeadlinePassed(past, 1)).toBe(true);
    });
});

describe('isCompleted', () => {
    it('returns true when order is redeemed', () => {
        const order = createOrder({
            destination_swap: createSwap({
                redeem_tx_hash: '0xredeem',
                redeem_block_number: '1',
            }),
        });

        expect(isCompleted(order as Order)).toBe(true);
    });

    it('returns true when order is refunded', () => {
        const order = createOrder({
            source_swap: createSwap({
                refund_tx_hash: '0xrefund',
                refund_block_number: '1',
            }),
        });

        expect(isCompleted(order as Order)).toBe(true);
    });

    it('returns true when order expired', () => {
        const createdAt = new Date();
        createdAt.setHours(createdAt.getHours() - 2);

        const order = createOrder({ created_at: createdAt.toISOString() });

        expect(isCompleted(order as Order)).toBe(true);
    });

    it('returns false for active orders', () => {
        const order = createOrder();

        expect(isCompleted(order as Order)).toBe(false);
    });
});

describe('parseAction', () => {
    it('returns Idle when order already redeemed', () => {
        const order = createOrder({
            destination_swap: createSwap({
                redeem_tx_hash: '0xredeem',
                redeem_block_number: '10',
            }),
        });

        expect(parseAction(order as Order)).toBe(OrderAction.Idle);
    });

    it('returns Idle when order refunded', () => {
        const order = createOrder({
            source_swap: createSwap({
                refund_tx_hash: '0xrefund',
                refund_block_number: '2',
            }),
        });

        expect(parseAction(order as Order)).toBe(OrderAction.Idle);
    });

    it('returns Redeem when solver initiated and not refunded', () => {
        const order = createOrder({
            destination_swap: createSwap({
                initiate_tx_hash: '0xinitiate',
                refund_tx_hash: '',
            }),
        });

        expect(parseAction(order as Order)).toBe(OrderAction.Redeem);
    });

    it('returns Idle when no action required', () => {
        const order = createOrder();

        expect(parseAction(order as Order)).toBe(OrderAction.Idle);
    });
});
