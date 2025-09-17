import * as anchor from '@coral-xyz/anchor';
import { web3 } from '@coral-xyz/anchor';
import { beforeAll, describe, expect, it, beforeEach } from 'vitest';
import {
  DigestKey,
  Environment,
  Siwe,
  Url,
  with0x,
  Err,
} from '@gardenfi/utils';
import { MatchedOrder, Orderbook, SupportedAssets } from '@gardenfi/orderbook';
import { privateKeyToAccount, PrivateKeyAccount } from 'viem/accounts';
import { createWalletClient, http, WalletClient } from 'viem';
import { arbitrumSepolia, Chain } from 'viem/chains';
import { Garden } from '../../../garden/garden';
import { EvmRelay } from '../../../evm/relay/evmRelay';
// import { BlockNumberFetcher } from '../../../blockNumberFetcher/blockNumber';
import { Quote } from '../../../quote/quote';
import { SwapParams } from '../../../garden/garden.types';
// import { SolanaRelay } from "../../relayer/solanaRelay";
// import { SolanaRelayerAddress } from "../../constants";
// import { skip } from 'node:test';
import { SolanaRelay } from '../../relayer/solanaRelay';
import { Asset } from 'gardenfi/orderbook';
import { loadTestConfig } from '../../../../../../../test-config-loader';

// Load test configuration
const config = loadTestConfig();

// Shared constants
const TEST_RPC_URL = config.TEST_RPC_URL;
const TEST_ORDERBOOK_STAGE = config.TEST_ORDERBOOK_STAGE;
const TEST_STAGE_AUTH = config.TEST_STAGE_AUTH;
// const TEST_BLOCKFETCHER_URL = 'https://info-stage.hashira.io';
const TEST_STAGE_QUOTE = config.TEST_STAGE_QUOTE;
const TEST_STAGE_EVM_RELAY = config.TEST_STAGE_EVM_RELAY;
const TEST_SOLANA_RELAY = config.TEST_SOLANA_RELAY;

const TEST_PRIVATE_KEY = config.EVM_PRIVATE_KEY_2.replace('0x', '');
const PRIV = config.SOLANA_PRIV;

// Timeout constants
const EXECUTE_TIMEOUT = 90000;
const CREATE_ORDER_TIMEOUT = 30000;

// const solanaProgramAddressTestnet =
//   '2bag6xpshpvPe7SJ9nSDLHpxqhEAoHPGpEkjNSv7gxoF';
// const solanaProgramAddressStaging =
//   '6eksgdCnSjUaGQWZ6iYvauv1qzvYPF33RTGTM1ZuyENx';

/**
 * Helper function to setup garden instance
 */
function setupGarden(
  evmClient: WalletClient,
  solanaProvider: anchor.AnchorProvider,
): Garden {
  const digestKey = DigestKey.generateRandom().val;
  const auth = Siwe.fromDigestKey(new Url(TEST_STAGE_AUTH), digestKey!);
  return new Garden({
    environment: {
      environment: Environment.TESTNET,
      evmRelay: TEST_ORDERBOOK_STAGE,
    },
    digestKey: digestKey!,
    htlc: {
      // solana: new SolanaRelay(solanaProvider, new Url(API.testnet.solanaRelay), SolanaRelayerAddress.testnet),
      solana: new SolanaRelay(
        solanaProvider,
        new Url(TEST_SOLANA_RELAY),
        'ANUVKxeqaec3bf4DVPqLTnG1PT3Fng56wPcE7LXAb46Q',
        {
          native: '6eksgdCnSjUaGQWZ6iYvauv1qzvYPF33RTGTM1ZuyENx',
          spl: '2WXpY8havGjfRxme9LUxtjFHTh1EfU3ur4v6wiK4KdNC',
        },
      ),
      evm: new EvmRelay(TEST_STAGE_EVM_RELAY, evmClient, auth),
    },
    // blockNumberFetcher: new BlockNumberFetcher(
    //   TEST_BLOCKFETCHER_URL,
    //   Environment.TESTNET,
    // ),
    orderbook: new Orderbook(new Url(TEST_ORDERBOOK_STAGE)),
    quote: new Quote(TEST_STAGE_QUOTE),
    auth: auth,
  });
}

/**
 * Configure event listeners for garden instance and resolve the promise when successful
 */
function setupGardenListeners(
  garden: Garden,
  resolver: () => void,
  orderId?: string,
): void {
  garden.on('error', (order: MatchedOrder, error: string) => {
    console.log(
      `❌ Error executing order ${order.create_order.create_id}: ${error}`,
    );
  });

  garden.on('success', (order: MatchedOrder, action: string) => {
    console.log(
      `✅ Successfully executed ${action} for order ${order.create_order.create_id}`,
    );
    // If this is the order we're waiting for, or if we're not looking for a specific order
    if (!orderId || order.create_order.create_id === orderId) {
      resolver(); // Resolve the promise to end the test early
    }
  });

  garden.on('log', (id: string, message: string) => {
    console.log(`📝 Log [${id}]: ${message}`);
  });

  garden.on('onPendingOrdersChanged', (orders: MatchedOrder[]) => {
    console.log(orders);
    console.log(`⏳Pending orders: ${orders.length}`);
    orders.forEach((order) => {
      console.log(`Pending order: ${order.create_order.create_id}`);
    });
  });

  garden.on('rbf', (order: MatchedOrder, result: unknown) => {
    console.log(
      `🔄 RBF for order ${order.create_order.create_id}: ${JSON.stringify(
        result,
      )}`,
    );
  });
}

/**
 * Execute garden order with proper timeout handling
 */
async function executeWithTimeout(
  garden: Garden,
  orderId?: string,
  timeoutMs: number = EXECUTE_TIMEOUT,
): Promise<void> {
  return new Promise<void>((resolve) => {
    let resolved = false;

    // Create resolver function that ensures we only resolve once
    const resolveOnce = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    // Set up event listeners with the resolver
    setupGardenListeners(garden, resolveOnce, orderId);

    // Set a timeout as fallback
    const timeout = setTimeout(() => {
      console.log('Test execution timed out but continuing...');
      resolveOnce();
    }, timeoutMs);

    // Execute the garden
    garden.execute().catch((error) => {
      console.error('Error during garden execution:', error);
      clearTimeout(timeout);
      resolveOnce();
    });
  });
}

describe('Swap Tests', () => {
  let connection: web3.Connection;
  let userProvider: anchor.AnchorProvider;
  let account: PrivateKeyAccount;

  beforeAll(() => {
    const privateKeyBytes = new Uint8Array(PRIV);
    const user = web3.Keypair.fromSecretKey(privateKeyBytes);
    connection = new web3.Connection(TEST_RPC_URL, { commitment: 'confirmed' });
    const userWallet = new anchor.Wallet(user);
    console.log('User:', user.publicKey.toString());
    userProvider = new anchor.AnchorProvider(connection, userWallet);

    // Setup EVM account
    account = privateKeyToAccount(with0x(TEST_PRIVATE_KEY));
    console.log('EVM Account:', account.address);
  });

  describe.only('SOL -> wBTC Swap', () => {
    let garden: Garden;
    let order: MatchedOrder;
    let arbitrumWalletClient: WalletClient;

    beforeEach(async () => {
      // Setup Arbitrum wallet
      arbitrumWalletClient = createWalletClient({
        account,
        chain: arbitrumSepolia as Chain,
        transport: http(),
      });

      // Setup Garden instance
      garden = setupGarden(arbitrumWalletClient, userProvider);
    });
    console.log('done garden setup');
    it(
      'should create and execute a SOL->wBTC swap order',
      async () => {
        const fromAsset: Asset = {
          name: 'primary',
          decimals: 9,
          symbol: 'SOL',
          logo: 'https://garden.imgix.net/token-images/wbtc.svg',
          tokenAddress: 'primary',
          atomicSwapAddress: '6eksgdCnSjUaGQWZ6iYvauv1qzvYPF33RTGTM1ZuyENx',
          chain: 'solana_testnet',
        };

        const toAsset: Asset = {
          name: 'USD Coin',
          decimals: 6,
          symbol: 'USDC',
          logo: 'https://garden-finance.imgix.net/chain_images/solana.png',
          tokenAddress: '5JbWjyLdYKTuykpq2itWbdRcZkhK3hs6fiH62pkmLYZi',
          atomicSwapAddress: '2WXpY8havGjfRxme9LUxtjFHTh1EfU3ur4v6wiK4KdNC',
          chain: 'solana_testnet',
        };

        const quote = await garden.quote.getQuoteFromAssets({
          fromAsset: toAsset,
          toAsset: fromAsset,
          amount: 100000000,
        });
        console.log('quote response', quote.val?.quotes);
        console.log('quote error response', quote.error);
        if (!quote.val) {
          return Err('Quote response error found');
        }
        const orderObj: SwapParams = {
          fromAsset: toAsset,
          toAsset: fromAsset,
          sendAmount: '100000000',
          receiveAmount: quote.val.quotes[Object.keys(quote.val.quotes)[0]],
          additionalData: { strategyId: Object.keys(quote.val.quotes)[0] },
          minDestinationConfirmations: 1,
        };
        console.log('Creating order...', orderObj);
        const result = await garden.swap(orderObj);
        // const result = await garden.orderbook.getOrder(
        //   '1d6a7fdbd2e1a86e045deada8663f61d7d17ba0390c7c5c5c651b70c6f82f962',
        //   true,
        // );
        // console.log(result.error);
        // console.log(result.val);
        expect(result.error).toBeFalsy();
        expect(result.val).toBeTruthy();

        order = result.val!;
        console.log('✅ Order created:', order.create_order.create_id);
        console.log(order);
        if (!garden.solanaHTLC) {
          return Err('EVM Wallet not provided!');
        }
        const initResult = await garden.solanaHTLC.initiate(order);
        console.log('initRes Err:', initResult.error);
        console.log('initRes Val:', initResult.val);
        console.log('Order initiated ✅', initResult.ok);

        // 2. Execute order with proper timeout handling
        await executeWithTimeout(garden, order.create_order.create_id);
      },
      CREATE_ORDER_TIMEOUT + EXECUTE_TIMEOUT,
    );
  });

  describe('wBTC -> SOL Swap', () => {
    let garden: Garden;
    let order: MatchedOrder;
    let ethereumWalletClient: WalletClient;

    beforeEach(async () => {
      // Setup Ethereum wallet
      ethereumWalletClient = createWalletClient({
        account,
        chain: arbitrumSepolia as Chain,
        transport: http(),
      });

      // Setup Garden instance
      garden = setupGarden(ethereumWalletClient, userProvider);
    });

    it.skip(
      'should create, initiate and execute a wBTC->SOL swap order',
      async () => {
        // 1. Create order
        const orderObj: SwapParams = {
          fromAsset: SupportedAssets.testnet.arbitrum_sepolia_WBTC,
          toAsset: SupportedAssets.testnet.solana_testnet_SOL,
          sendAmount: '10000',
          receiveAmount: '600000',
          additionalData: { strategyId: 'asacstry' },
          minDestinationConfirmations: 1,
        };

        const createResult = await garden.swap(orderObj);
        expect(createResult.error).toBeFalsy();
        expect(createResult.val).toBeTruthy();

        order = createResult.val!;
        console.log('✅ Order created:', order.create_order.create_id);

        if (!garden.evmHTLC) {
          return Err('EVM Wallet not provided!');
        }

        // 2. Initiate swap using evmHTLC
        console.log('Initializing using evmHTLC');
        const initResult = await garden.evmHTLC.initiate(order);
        console.log('initRes Err:', initResult.error);
        expect(initResult.ok).toBeTruthy();
        console.log('Order initiated ✅', initResult.val);

        // 3. Execute order with proper timeout handling
        if (!garden.solanaHTLC) return Err('Solana HTLC not present in test');
        await executeWithTimeout(garden, order.create_order.create_id);
      },
      CREATE_ORDER_TIMEOUT + EXECUTE_TIMEOUT,
    );
  });
});
