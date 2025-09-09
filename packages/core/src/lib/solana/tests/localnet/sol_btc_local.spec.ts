import * as anchor from '@coral-xyz/anchor';
import { Environment, Network, Url } from '@gardenfi/utils';
import { beforeAll, describe, expect, it, beforeEach } from 'vitest';
import { Order, Orderbook, SupportedAssets } from '@gardenfi/orderbook';
import { web3 } from '@coral-xyz/anchor';
import { BitcoinNetwork, BitcoinProvider, BitcoinWallet } from '@gardenfi/core';
import { SolanaHTLC } from '../../htlc/solanaHTLC';
import { Garden } from '../../../garden/garden';
import { BlockNumberFetcher } from '../../../blockNumberFetcher/blockNumber';
import { Quote } from '../../../quote/quote';

// Shared constants
const TEST_RPC_URL = 'http://localhost:8899';
const TEST_SWAPPER_RELAYER = 'http://localhost:4426';
const TEST_BLOCKFETCHER_URL = 'http://localhost:3008';

// Timeout constants
const EXECUTE_TIMEOUT = 90000;
const CREATE_ORDER_TIMEOUT = 30000;

/**
 * Helper function to setup garden instance
 */
function setupGarden(
  digestKey: string,
  solanaProvider: anchor.AnchorProvider,
  btcWallet: BitcoinWallet,
): Garden {
  return new Garden({
    environment: {
      network: Network.TESTNET,
    },
    digestKey,
    htlc: {
      solana: new SolanaHTLC(solanaProvider),
    },
    apiKey: '',
    orderbook: new Orderbook(new Url(TEST_SWAPPER_RELAYER)),
    quote: new Quote('http://localhost:6969'),
  });
}

/**
 * Configure event listeners for garden instance and resolve the promise when successful
 */
// function setupGardenListeners(
//   garden: Garden,
//   resolver: () => void,
//   orderId?: string,
// ): void {
//   garden.on('error', (order: Order, error: string) => {
//     console.log(`❌ Error executing order ${order.order_id}: ${error}`);
//   });

//   garden.on('success', (order: Order, action: string) => {
//     console.log(
//       `✅ Successfully executed ${action} for order ${order.order_id}`,
//     );
//     // If this is the order we're waiting for, or if we're not looking for a specific order
//     if (!orderId || order.order_id === orderId) {
//       resolver(); // Resolve the promise to end the test early
//     }
//   });

//   garden.on('log', (id: string, message: string) => {
//     console.log(`📝 Log [${id}]: ${message}`);
//   });

//   garden.on('onPendingOrdersChanged', (orders: Order[]) => {
//     console.log(`⏳Pending orders: ${orders.length}`);
//     orders.forEach((order) => {
//       console.log(`Pending order: ${order.order_id}`);
//     });
//   });

//   garden.on('rbf', (order: Order, result: unknown) => {
//     console.log(
//       `🔄 RBF for order ${order.order_id}: ${JSON.stringify(result)}`,
//     );
//   });
// }

// async function executeWithTimeout(
//   garden: Garden,
//   orderId?: string,
//   timeoutMs: number = EXECUTE_TIMEOUT,
// ): Promise<void> {
//   return new Promise<void>((resolve) => {
//     let resolved = false;

//     // Backup resolver that will prevent the test from running indefinetly
//     const resolveOnce = () => {
//       if (!resolved) {
//         resolved = true;
//         resolve();
//       }
//     };

//     // Setup the event listerns
//     setupGardenListeners(garden, resolve, orderId);

//     // Stop the test after timeout
//     const timeout = setTimeout(() => {
//       console.log('Test execution timed out but continuing...');
//       resolveOnce();
//     }, timeoutMs);

//     // Calling exectue method
//     // garden.execute().catch((error: any) => {
//     //   console.error('Error during garden execution:', error);
//     //   clearTimeout(timeout);
//     //   resolveOnce();
//     // });
//   });
// }

// Helper methods
const fundSolWallet = async (
  connection: web3.Connection,
  userProvider: anchor.AnchorProvider,
) => {
  console.log('Airdropping 10 SOL to the user for testing');
  const signature = await connection.requestAirdrop(
    userProvider.publicKey,
    web3.LAMPORTS_PER_SOL * 10,
  );
  await connection.confirmTransaction({
    signature,
    ...(await connection.getLatestBlockhash()),
  });
  console.log('Airdrop Success');
};

const mineBtcBlocks = async (address: string) => {
  const body = {
    jsonrpc: '1.0',
    id: 'mine',
    method: 'generatetoaddress',
    params: [3, address],
  };

  console.log('Mining blocks:: ', address);

  const auth = Buffer.from('admin1:123').toString('base64');

  try {
    const response = await fetch('http://localhost:18443/', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
};

async function fundBTC(to: string): Promise<void> {
  const payload = JSON.stringify({
    address: to,
  });

  const res = await fetch('http://127.0.0.1:3000/faucet', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: payload,
  });

  const data = await res.text();

  if (!res.ok) {
    throw new Error(data);
  }

  const dat: { txId?: string } = JSON.parse(data);

  if (!dat.txId) {
    throw new Error('Not successful');
  }
}

describe('==========SOL <--> BTC===========', () => {
  // Solana setup
  let connection: web3.Connection;
  let user: web3.Keypair;
  let userWallet: anchor.Wallet;
  let userProvider: anchor.AnchorProvider;

  // Bitcoin Setup
  let btcWallet: BitcoinWallet;
  let BTC_ADDRESS: string;
  let bitcoinProvider: BitcoinProvider;

  beforeAll(async () => {
    // Solana Initialization
    user = new web3.Keypair();
    connection = new web3.Connection(TEST_RPC_URL, { commitment: 'confirmed' });
    userWallet = new anchor.Wallet(user);
    userProvider = new anchor.AnchorProvider(connection, userWallet);

    // Bitcoin Initialization
    console.log('Geting bitcoin address');
    bitcoinProvider = new BitcoinProvider(
      BitcoinNetwork.Regtest,
      'http://localhost:30000',
    );
    btcWallet = BitcoinWallet.createRandom(bitcoinProvider);
    BTC_ADDRESS = await btcWallet.getAddress();
  });

  describe('SOL -> BTC Swap', () => {
    let garden: Garden;
    let order: MatchedOrder;
    const digestKey = DigestKey.generateRandom().val.digestKey;
    beforeEach(async () => {
      garden = setupGarden(digestKey, userProvider, btcWallet);

      await fundSolWallet(connection, userProvider);
      await fundBTC(BTC_ADDRESS);
    });

    it(
      'should create and execute SOL -> BTC swap order',
      async () => {
        // 1. Create Order
        const orderObj = {
          fromAsset: SupportedAssets.localnet.solana_localnet_SOL,
          toAsset: SupportedAssets.localnet.bitcoin_regtest_BTC,
          sendAmount: '20010',
          receiveAmount: '2000',
          additionalData: {
            strategyId: 'sl4sbrbc',
            btcAddress: BTC_ADDRESS,
          },
          minDestinationConfirmations: 3,
        };

        const result = await garden.swap(orderObj);

        expect(result.error).toBeFalsy();
        expect(result.val).toBeTruthy();

        order = result.val;
        console.log('✅ Order created:', order.create_order.create_id);

        // 2. Execute order
        await executeWithTimeout(garden, order.create_order.create_id);
      },
      CREATE_ORDER_TIMEOUT + EXECUTE_TIMEOUT,
    );
  });

  describe('BTC -> SOL Swap', () => {
    let garden: Garden;
    let order: MatchedOrder;
    const digestKey = DigestKey.generateRandom().val.digestKey;

    beforeEach(async () => {
      garden = setupGarden(digestKey, userProvider, btcWallet);

      await fundSolWallet(connection, userProvider);
      const btcAddress = await btcWallet.getAddress();
      await fundBTC(btcAddress);
    });

    it(
      'Should create, match and execute BTC -> SOL swap',
      async () => {
        const orderObj = {
          fromAsset: SupportedAssets.localnet.bitcoin_regtest_BTC,
          toAsset: SupportedAssets.localnet.solana_localnet_SOL,
          sendAmount: '10000',
          receiveAmount: '10000',
          additionalData: {
            strategyId: 'brbcsl4s',
            btcAddress: BTC_ADDRESS,
          },
          minDestinationConfirmations: 3,
        };

        const result = await garden.swap(orderObj);
        expect(result.error).toBeFalsy();
        expect(result.val).toBeTruthy();

        order = result.val;

        // Fund HTLC and mine for confirmation
        await btcWallet.send(
          order.source_swap.swap_id,
          +order.source_swap.amount,
        );
        console.log('HTLC Funded Successfully');
        await mineBtcBlocks(BTC_ADDRESS);
        console.log('3 Blocks mined');

        await executeWithTimeout(garden, order.create_order.create_id);
      },
      CREATE_ORDER_TIMEOUT + EXECUTE_TIMEOUT,
    );
  });
});
