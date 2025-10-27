import * as anchor from '@coral-xyz/anchor';
import { DigestKey, Network, Siwe, Url } from '@gardenfi/utils';
import { beforeAll, describe, expect, it, beforeEach } from 'vitest';
import { SupportedAssets, Order } from '@gardenfi/orderbook';
import { web3 } from '@coral-xyz/anchor';
import { BitcoinNetwork, BitcoinProvider, BitcoinWallet } from '@gardenfi/core';
import { Garden } from '../../../garden/garden';
import { SolanaRelay } from '../../relayer/solanaRelay';
import { API, SolanaRelayerAddress } from '../../../constants';
import { skip } from 'node:test';
import { loadTestConfig } from '../../../../../../../test-config-loader';

// Shared constants Testnet
const TEST_RPC_URL = 'https://api.devnet.solana.com';
const TEST_ORDERBOOK_STAGE = 'https://testnet.api.hashira.io';
const TEST_STAGE_AUTH = 'https://testnet.api.hashira.io/auth';
const TEST_BLOCKFETCHER_URL = 'https://info-stage.hashira.io';
const TEST_STAGE_QUOTE = 'https://testnet.api.hashira.io/quote';

const config = loadTestConfig();
const PRIV = config.SOLANA_PRIV;

// Timeout constants
const EXECUTE_TIMEOUT = 90 * 60 * 1000; //90 minutes
const CREATE_ORDER_TIMEOUT = 30000;

/**
 * Helper function to setup garden instance via custom htlc?
 */
function setupGarden(
  solanaProvider: anchor.AnchorProvider,
  btcWallet: BitcoinWallet,
): Garden {
  const digestKey = DigestKey.generateRandom();
  const auth = Siwe.fromDigestKey(new Url(TEST_STAGE_AUTH), digestKey.val!);

  return new Garden({
    environment: {
      network: Network.TESTNET,
    },
    apiKey: config.API_KEY,
    htlc: {
      solana: new SolanaRelay(
        solanaProvider,
        new Url(API.testnet.evmRelay),
        '6eksgdCnSjUaGQWZ6iYvauv1qzvYPF33RTGTM1ZuyENx',
        {
          native: '6eksgdCnSjUaGQWZ6iYvauv1qzvYPF33RTGTM1ZuyENx',
          spl: '2WXpY8havGjfRxme9LUxtjFHTh1EfU3ur4v6wiK4KdNC',
        },
        auth,
      ),
    },
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
  garden.on('error', (order: Order, error: string) => {
    console.log(`❌ Error executing order ${order.order_id}: ${error}`);
  });

  garden.on('success', (order: Order, action: string) => {
    console.log(
      `✅ Successfully executed ${action} for order ${order.order_id}`,
    );
    // If this is the order we're waiting for, or if we're not looking for a specific order
    if (!orderId || order.order_id === orderId) {
      resolver(); // Resolve the promise to end the test early
    }
  });

  garden.on('log', (id: string, message: string) => {
    console.log(`📝 Log [${id}]: ${message}`);
  });

  garden.on('onPendingOrdersChanged', (orders: Order[]) => {
    console.log(`⏳Pending orders: ${orders.length}`);
    orders.forEach((order) => {
      console.log(`Pending order: ${order.order_id}`);
    });
  });

  garden.on('rbf', (order: Order, result: unknown) => {
    console.log(
      `🔄 RBF for order ${order.order_id}: ${JSON.stringify(result)}`,
    );
  });
}

async function executeWithTimeout(
  garden: Garden,
  orderId?: string,
  timeoutMs: number = EXECUTE_TIMEOUT,
): Promise<void> {
  return new Promise<void>((resolve) => {
    let resolved = false;

    // Backup resolver that will prevent the test from running indefinetly
    const resolveOnce = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    // Setup the event listerns
    setupGardenListeners(garden, resolve, orderId);
  });
}

describe('==========SOL <--> BTC===========', () => {
  // Solana setup
  let connection: web3.Connection;
  let userWallet: anchor.Wallet;
  let userProvider: anchor.AnchorProvider;

  // Bitcoin Setup
  let btcWallet: BitcoinWallet;
  let BTC_ADDRESS: string;
  let bitcoinProvider: BitcoinProvider;

  beforeAll(async () => {
    const privateKeyBytes = new Uint8Array(PRIV);
    const user = web3.Keypair.fromSecretKey(privateKeyBytes);
    connection = new web3.Connection(TEST_RPC_URL, { commitment: 'confirmed' });
    userWallet = new anchor.Wallet(user);
    userProvider = new anchor.AnchorProvider(connection, userWallet);

    // Bitcoin Initialization
    bitcoinProvider = new BitcoinProvider(
      BitcoinNetwork.Testnet,
      'https://mempool.space/testnet4/api/',
    );
    btcWallet = BitcoinWallet.fromPrivateKey(
      '02438b87e7153f29c954b21d9019118fc40d88a51943a7b5e19e82a32a308206',
      bitcoinProvider,
    );
    BTC_ADDRESS = await btcWallet.getAddress();
  });

  skip('SOL -> BTC Swap', () => {
    let garden: Garden;
    let order: Order;

    const digestKeyRes = DigestKey.generateRandom();

    if (digestKeyRes.error) throw new Error("Can't generate digest key");

    beforeEach(async () => {
      garden = setupGarden(userProvider, btcWallet);
    });

    it(
      'should create and execute SOL -> BTC swap order',
      async () => {
        //TODO: Get the exact amount and set to recieve amout
        // 1. Create Order
        const orderObj = {
          fromAsset: SupportedAssets.testnet.solana_testnet.SOL,
          toAsset: SupportedAssets.testnet.bitcoin_testnet.BTC,
          sendAmount: '59337016',
          receiveAmount: '8000',
          additionalData: {
            strategyId: 'strybtry',
            btcAddress: BTC_ADDRESS,
          },
          minDestinationConfirmations: 1,
        };

        const result = await garden.swap(orderObj);
        expect(result.error).toBeFalsy();
        expect(result.val).toBeTruthy();

        // order = result.val!;
        console.log('✅ Order created:', result.val);

        // 2. Execute order
        await executeWithTimeout(garden, result.val);
      },
      CREATE_ORDER_TIMEOUT + EXECUTE_TIMEOUT,
    );
  });

  describe('BTC -> SOL Swap', () => {
    let garden: Garden;
    let order: Order;

    const digestKeyRes = DigestKey.generateRandom();

    if (digestKeyRes.error) throw new Error("Can't generate digest key");

    beforeEach(async () => {
      garden = setupGarden(userProvider, btcWallet);
    });

    it(
      'Should create, match and execute BTC -> SOL swap',
      async () => {
        const orderObj = {
          fromAsset: SupportedAssets.testnet.bitcoin_testnet.BTC,
          toAsset: SupportedAssets.testnet.solana_testnet.SOL,
          sendAmount: '10000',
          receiveAmount: '10000',
          additionalData: {
            strategyId: 'btrystry',
            btcAddress: BTC_ADDRESS,
          },
          minDestinationConfirmations: 1,
        };

        const result = await garden.swap(orderObj);
        expect(result.error).toBeFalsy();
        expect(result.val).toBeTruthy();

        // order = result.val!;
        console.log('Order created successfully:: ', result.val);

        await executeWithTimeout(garden, result.val);
      },
      CREATE_ORDER_TIMEOUT + EXECUTE_TIMEOUT,
    );
  });
});
