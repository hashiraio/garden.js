import { describe, expect, it } from 'vitest';
import { isExpired, ParseOrderStatus } from './orderStatusParser';
import { OrdersProvider } from '@gardenfi/orderbook';
import { BlockNumberFetcher } from '../blockNumberFetcher/blockNumber';
import { Environment } from 'gardenfi/utils';

describe('orderStatus', () => {
  it('test IsExpired', async () => {
    const res1 = isExpired(Date.now(), 1);
    const res2 = isExpired(1729608769, 1);
    expect(res1).toBe(false);
    expect(res2).toBe(true);
  });
  it('status', async () => {
    const blockNumberFetcher = new BlockNumberFetcher(
      'https://prod-mainnet-virtual-balance-pr-5.onrender.com/',
      Environment.TESTNET,
    );
    const blockNumbers = await blockNumberFetcher.fetchBlockNumbers();
    console.log('blockNumbers :', blockNumbers.val);
    if (!blockNumbers.ok) {
      throw new Error(blockNumbers.error);
    }

    const ordersProvider = new OrdersProvider(
      'https://evm-swapper-relay.onrender.com/',
    );
    const order = await ordersProvider.getOrder(
      '0ae630a570f8dacca370ee267123846e17ccec7b3ca0f33ec23a17f8b56ed032',
      true,
    );
    if (!order.ok) {
      throw new Error(order.error);
    }

    const status = ParseOrderStatus(
      order.val,
      blockNumbers.val[order.val.source_swap.chain],
      blockNumbers.val[order.val.destination_swap.chain],
    );
    console.log('status :', status);
  });
});
