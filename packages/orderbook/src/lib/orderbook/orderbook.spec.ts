import { describe, expect, expectTypeOf, test } from 'vitest';
import { DigestKey, Siwe, Url } from '@gardenfi/utils';
import { Orderbook } from './orderbook';
import { CreateOrderRequest, OrderWithStatus } from './orderbook.types';
import { ChainAsset } from '../chainAsset/chainAsset';
// import { Order } from './orderbook.types';s
// import {
//   // CreateOrderConfig,
//   // CreateOrderRequestWithAdditionalData,
//   Order,
//   OrderResult,
// } from './orderbook.types';

describe('orders provider', async () => {
  const orderbookApi = 'https://testnet.api.garden.finance';
  const authUrl = 'https://testnet.api.garden.finance/auth';
  const address = '0xdF4E5212cC36428504712d7E75a9922762FeD28A';
  const id = '3b8f735673ee94822c4fa0f2265e90f105349cf2ef8d0cc854f5b7192ffa3b7b';

  const orderbook = new Orderbook(new Url(orderbookApi));
  const auth = Siwe.fromDigestKey(
    new Url(authUrl),
    DigestKey.generateRandom().val!,
  );
  test('should get order', async () => {
    const order = await orderbook.getOrder(id);
    console.log('order.error :', order.error);
    console.log('order.val :', order.val);
    expect(order.error).toBeUndefined();
    if (order.val) {
      expect(order.val.order_id).toEqual(id);
      expectTypeOf(order.val).toEqualTypeOf<OrderWithStatus>();
    }
  });

  test('should get orders of a address', async () => {
    const orders = await orderbook.getOrders({});
    console.log('orders.error :', orders.error);
    console.log('orders.val :', orders.val);
    expect(orders.error).toBeUndefined();
    if (orders.val) {
      expect(orders.val.data.length).toBeGreaterThan(0);
      expectTypeOf(orders.val.data).toEqualTypeOf<OrderWithStatus[]>();
    }
  });

  test('should get all orders', async () => {
    const orders = await orderbook.getOrders({});
    expect(orders.error).toBeUndefined();
    console.log('all orders here orders.val :', orders.val);
    console.log('orders.val.data :', orders.val?.data);
    if (orders.val) {
      expect(orders.val.data.length).toBeGreaterThan(0);
      expectTypeOf(orders.val.data).toEqualTypeOf<OrderWithStatus[]>();
    }
  });

  test('should subscribe to orders', async () => {
    const unsubscribe = await orderbook.subscribeOrders(
      { address },
      async (orders) => {
        console.log('subscribe orders :', orders);
        expect(orders.data.length).toBeGreaterThan(0);
        expectTypeOf(orders.data).toEqualTypeOf<OrderWithStatus[]>();
      },
      1000,
    );
    expectTypeOf(unsubscribe).toEqualTypeOf<() => void>();
  }, 10000);

  test('should create an order', async () => {
    const CreateOrderRequest: CreateOrderRequest = {
      source: {
        asset: ChainAsset.from('arbitrum:wbtc'),
        owner: '0xdF4E5212cC36428504712d7E75a9922762FeD28A',
        delegate: null,
        amount: '50000',
      },
      destination: {
        asset: ChainAsset.from('unichain:usdc'),
        owner: '0xdF4E5212cC36428504712d7E75a9922762FeD28A',
        delegate: null,
        amount: '58727337',
      },
      slippage: 50,
      secret_hash:
        '037ff5cacab1d35df04e6e9d349f0d8dd92e87b989244b934d9b09bc97fc4169',
      nonce: 250,
      affiliate_fees: [],
    };
    // console.log('CreateOrderRequest :', JSON.stringify(CreateOrderRequest));
    const order = await orderbook.createOrder(CreateOrderRequest, auth);
    console.log('order :', order.val);
  }, 5000000);
});

test('should search orders', async () => {
  const orderbookApi = 'https://testnet.api.garden.finance/orders';
  const orderbook = new Orderbook(new Url(orderbookApi));
  const controller = new AbortController();
  const signal = controller.signal;
  const now = performance.now();
  setTimeout(() => {
    controller.abort();
    console.log('aborted');
  }, 1000);

  const result = await orderbook.getOrders(
    {
      address: '0xccF3d872b01762ABA74b41B1958A9A86EE8f34A3',
      page: 1,
      per_page: 10,
      retryCount: 0,
    },
    { signal },
  );

  console.log('time taken :', performance.now() - now);
  console.log('result :', result);
  return {
    type: 'none',
    orders: [],
  };
}, 10000);

// describe('orderbook', async () => {
//   const OrderbookApi = 'orderbook.garden.finance';

//   const pk =
//     '0x8fe869193b5010d1ee36e557478b43f2ade908f23cac40f024d4aa1cd1578a61';
//   const account = privateKeyToAccount(with0x(pk));
//   const walletClient = createWalletClient({
//     account,
//     chain: sepolia,
//     transport: http(),
//   });
//   const bitcoinTestnetAddress = 'tb1qxtztdl8qn24axe7dnvp75xgcns6pl5ka9tzjru';
//   const sepoliaAddress = walletClient.account.address;

//   const auth = new Siwe(new Url('http://' + OrderbookApi + '/'), walletClient);

//   const orderbook = new Orderbook(new Url('http://' + OrderbookApi + '/'));

//   const createOrderIds: string[] = [];

//   const bitcoinAsset: Asset = {
//     name: 'Bitcoin Regtest',
//     decimals: 8,
//     symbol: 'BTC',
//     chain: Chains.bitcoin_regtest,
//     atomicSwapAddress: 'primary',
//     tokenAddress: 'primary',
//   };
//   const WBTCArbitrumLocalnetAsset: Asset = {
//     name: 'WBTC Arbitrum Localnet',
//     decimals: 8,
//     symbol: 'WBTC',
//     chain: Chains.arbitrum_localnet,
//     atomicSwapAddress: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
//     tokenAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
//   };
//   const WBTCEthereumLocalnetAsset: Asset = {
//     name: 'WBTC Ethereum Localnet',
//     decimals: 8,
//     symbol: 'WBTC',
//     chain: Chains.ethereum_localnet,
//     atomicSwapAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
//     tokenAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
//   };

//   const createOrderConfigs: CreateOrderRequestWithAdditionalData[] = [
//     {
//       source_chain: WBTCEthereumLocalnetAsset.chain,
//       destination_chain: WBTCArbitrumLocalnetAsset.chain,
//       source_asset: WBTCEthereumLocalnetAsset.atomicSwapAddress,
//       destination_asset: WBTCArbitrumLocalnetAsset.atomicSwapAddress,
//       initiator_source_address: sepoliaAddress,
//       initiator_destination_address: sepoliaAddress,
//       source_amount: '100000',
//       destination_amount: '99000',
//       fee: '1',
//       nonce: '1',
//       timelock: 246,
//       secret_hash: sha256(randomBytes(32)),
//       min_destination_confirmations: 3,
//       additional_data: {
//         strategy_id: '1',
//       },
//     },
//     {
//       fromAsset: WBTCArbitrumLocalnetAsset,
//       toAsset: bitcoinAsset,
//       sendAddress: bitcoinTestnetAddress,
//       receiveAddress: sepoliaAddress,
//       sendAmount: '100000',
//       receiveAmount: '99000',
//       secretHash: sha256(randomBytes(32)),
//       nonce: '1',
//       timelock: 246,
//       minDestinationConfirmations: 3,
//       btcInputAddress: bitcoinTestnetAddress,
//     },
//     // {
//     //   fromAsset: WBTCEthereumLocalnetAsset,
//     //   toAsset: bitcoinAsset,
//     //   sendAddress: sepoliaAddress,
//     //   receiveAddress: bitcoinTestnetAddress,
//     //   sendAmount: '100000',
//     //   receiveAmount: '99000',
//     //   secretHash: sha256(randomBytes(32)),
//     //   nonce: '1',
//     //   timelock: 246,
//     //   minDestinationConfirmations: 3,
//     //   btcInputAddress: bitcoinTestnetAddress,
//     // },
//   ];

//   test('creates 3 orders', async () => {
//     for (const createOrder of createOrderConfigs) {
//       const response = await orderbook.createOrder(createOrder, auth);
//       console.log('response :', response.val);
//       if (response.error) {
//         console.log('response.error :', response.error);
//       }
//       createOrderIds.push(response.val);
//       expect(response.ok).toBeTruthy();
//     }
//   });

//   test('get the above created order after 5 sec of waiting', async () => {
//     // wait for the created order to be matched
//     await sleep(5000);
//     const orderId = createOrderIds[0];
//     const result = await orderbook.getOrder(orderId, true);
//     expectTypeOf(result.val).toEqualTypeOf<Order>();
//     expect(result.ok).toBeTruthy();
//     expect(result.val).toBeTruthy();
//     expect(result.val.create_order.create_id).toEqual(orderId);
//   }, 10000);
// });
