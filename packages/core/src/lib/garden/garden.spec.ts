import { Garden } from './garden';
import { Network, Siwe, sleep, Url, with0x } from '@gardenfi/utils';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { describe, expect, it } from 'vitest';
import { loadTestConfig } from '../../../../../test-config-loader';
import { ChainAsset, isBitcoin, Order, Assets } from '@gardenfi/orderbook';
import { arbitrumSepolia, sepolia } from 'viem/chains';
import { DigestKey } from '@gardenfi/utils';
import { switchOrAddNetwork } from '../switchOrAddNetwork';
import { SwapParams } from './garden.types';
import { Quote } from '../quote/quote';
import { EvmRelay } from '../evm/relay/evmRelay';

describe('checking garden initialisation', async () => {
  const config = loadTestConfig();
  const pk = config.EVM_PRIVATE_KEY.replace('0x', '');
  const account = privateKeyToAccount(with0x(pk));

  const arbitrumWalletClient = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(),
  });

  // const garden = new Garden({
  //   environment: {
  //     environment: Environment.TESTNET,
  //     orderbook: 'https://testnet.api.hashira.io',
  //   },
  //   digestKey,
  //   htlc: {
  //     evm: new EvmRelay(
  //       url,
  //       arbitrumWalletClient,
  //       Siwe.fromDigestKey(new Url(authurl), digestKey),
  //     ),
  //   },
  // });
  const garden = Garden.fromWallets({
    environment: {
      network: Network.TESTNET,
      baseurl: 'https://api.garden.finance',
    },
    apiKey: config.API_KEY,
    digestKey:
      '7fb6d160fccb337904f2c630649950cc974a24a2931c3fdd652d3cd43810a857',
    wallets: {
      evm: arbitrumWalletClient,
    },
  });

  console.log('garden :', garden);
  const order = await garden.getOrder(
    'df4d18a3f4d8754d17c831b491b375f8b925625fa8b389b4b671325a66bdc176',
  );
  console.log('this is an order fetched', order.val);
});

describe('swap and execute using garden', () => {
  const config = loadTestConfig();
  const pk = config.EVM_PRIVATE_KEY.replace('0x', '');
  const account = privateKeyToAccount(with0x(pk));
  const api = 'https://orderbook-v2-staging.hashira.io';
  console.log('account :', account.address);

  const arbitrumWalletClient = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(),
  });

  const digestKey = new DigestKey(
    '7fb6d160fccb337904f2c630649950cc974a24a2931c3fdd652d3cd43810a857',
  );
  console.log('digestKey :', digestKey.userId);

  const garden = new Garden({
    environment: {
      network: Network.TESTNET,
    },
    apiKey: config.API_KEY,
    digestKey:
      '7fb6d160fccb337904f2c630649950cc974a24a2931c3fdd652d3cd43810a857',
    quote: new Quote('https://testnet.api.hashira.io'),
    htlc: {
      evm: new EvmRelay(
        api,
        arbitrumWalletClient,
        Siwe.fromDigestKey(
          new Url(api),
          DigestKey.from(
            '7fb6d160fccb337904f2c630649950cc974a24a2931c3fdd652d3cd43810a857',
          ).val!,
        ),
      ),
    },
  });

  it.skip('initialize garden from wallets', async () => {
    Garden.fromWallets({
      environment: {
        network: Network.TESTNET,
      },
      apiKey: config.API_KEY,
      digestKey:
        '7fb6d160fccb337904f2c630649950cc974a24a2931c3fdd652d3cd43810a857',
      wallets: {
        evm: arbitrumWalletClient,
      },
    });
  });

  let order: Order;

  it('should create an order', async () => {
    const orderObj = {
      fromAsset: Assets.arbitrum_sepolia.WBTC,
      toAsset: Assets.bitcoin_testnet.BTC,
      sendAmount: '10000'.toString(),
      receiveAmount: '9970'.toString(),
      additionalData: {
        strategyId: 'ambcbnyr',
        btcAddress: 'bc1qxtztdl8qn24axe7dnvp75xgcns6pl5ka0depc0',
      },
    };

    const result = await garden.createSwap(orderObj);
    if (!result.ok) {
      console.log('error while creating order ❌ :', result.error);
      throw new Error(result.error);
    }
    const orderId = result.val;

    const res = (await garden.getOrder(orderId)).val;
    if (!res) throw new Error('error getting order');
    order = res;
    console.log('orderCreated and matched ✅ ', order.order_id);
    if (!order) {
      throw new Error('Order id not found');
    }

    expect(result.error).toBeFalsy();
    expect(result.val).toBeTruthy();
  }, 60000);

  //TODO: also add bitcoin init
  it('Initiate the swap', async () => {
    if (isBitcoin(order.source_swap.chain)) {
      console.warn('Bitcoin swap, skipping initiation');
    }
    if (!garden.htlcs.evm) {
      console.warn('EVMHTLC is not initialized, skipping initiation');
      return;
    }

    const res = await garden.htlcs.evm.initiate(order);
    console.log('initiated ✅ :', res.val);
    if (!res.ok) console.log('init error ❌ :', res.error);
    expect(res.ok).toBeTruthy();
  }, 20000);

  it('EXECUTE', async () => {
    garden.on('error', (order, error) => {
      console.log(
        'error while executing ❌, orderId :',
        order.order_id,
        'error :',
        error,
      );
    });
    garden.on('success', (order, action, result) => {
      console.log(
        'executed ✅, orderId :',
        order.order_id,
        'action :',
        action,
        'result :',
        result,
      );
    });
    garden.on('log', (id, message) => {
      console.log('log :', id, message);
    });
    garden.on('onPendingOrdersChanged', (orders) => {
      console.log('pending orders :', orders.length);
      orders.forEach((order) => {
        console.log('pending order :', order.order_id);
      });
    });
    garden.on('rbf', (order, result) => {
      console.log('rbf :', order.order_id, result);
    });
    // await garden.execute();
    await sleep(1500000);
  }, 150000);
});

describe.only('switch network with http transport', () => {
  const evmAccount = privateKeyToAccount(
    '0xa6aef474481a516e9f24edf5e55c7a7e11ee23f785de73da2e3f1ba64faffa28',
  );

  const trade = async (garden: Garden) => {
    for (let i = 0; i < 10; i++) {
      const quote = await garden.quote.getQuote(
        ChainAsset.from(Assets.arbitrum_sepolia.WBTC),
        ChainAsset.from(Assets.base_sepolia.WBTC),
        Number('50000'),
        false,
      );
      if (!quote.ok) {
        console.log('Error getting quote', quote.error);
        continue;
      }

      const receiveAmount = quote.val[0].destination.amount;
      const swapData: SwapParams = {
        fromAsset: 'arbitrum_sepolia:wbtc',
        toAsset: 'base_sepolia:wbtc',
        sendAmount: '50000',
        receiveAmount,
      };
      const order = await garden.createSwap(swapData);
      if (!order.ok) {
        const errorMsg = `Error while creating order: ${order.error}`;
        console.log('❌', errorMsg);
        continue;
      }
      const matchedOrder = order.val;
      const res = await garden.getOrder(matchedOrder);
      if (!res.val) {
        throw new Error('order not found');
      }
      const initRes = await garden.htlcs.evm?.initiate(res.val);
      if (initRes?.error) {
        const errorMsg = `Error while initing order: ${initRes.error}`;
        console.log('❌', errorMsg);
        continue;
      }
      // await garden.execute();
      console.log('✅ Trade execution completed successfully');
    }
  };
  it('switches to a different network when not already connected', async () => {
    try {
      const client = createWalletClient({
        account: evmAccount,
        chain: sepolia,
        transport: http(),
      });
      const res = await switchOrAddNetwork('citrea_testnet', client);
      expect(res.ok).toBeTruthy();
      expect(
        res.val?.walletClient.chain?.name === 'Citrea Testnet',
      ).toBeTruthy();
    } catch (error) {
      console.error('Network switch test failed:', error);
      throw error;
    }
  }, 15000);
  it('skips switching when already connected to the target network', async () => {
    const client = createWalletClient({
      account: evmAccount,
      chain: sepolia,
      transport: http(),
    });
    const res = await switchOrAddNetwork('ethereum_sepolia', client);
    expect(res.ok).toBeTruthy();
    expect(res?.val?.message).toBe('Already on the network');
  }, 15000);
  it('should switch chain and do evm-evm trades in node environment', async () => {
    const client = createWalletClient({
      account: evmAccount,
      chain: sepolia,
      transport: http(),
    });
    const digestKey = DigestKey.generateRandom().val!;
    const garden = Garden.fromWallets({
      environment: {
        network: Network.TESTNET,
      },
      // apiKey: config.API_KEY,
      apiKey: '',
      digestKey: digestKey,
      wallets: {
        evm: client,
      },
    });
    await trade(garden);
  }, 150000);
});
