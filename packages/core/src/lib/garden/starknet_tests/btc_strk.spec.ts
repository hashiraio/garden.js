import { Garden } from '../garden';
import { EthereumLocalnet, SupportedAssets } from '@gardenfi/orderbook';
import { Environment, sleep, with0x } from '@gardenfi/utils';
import { RpcProvider, Account } from 'starknet';
import { beforeAll, describe, expect, it } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http, WalletClient } from 'viem';
import { Quote } from '@gardenfi/core';
import { StarknetRelay } from '../../starknet/relay/starknetRelay';
import { BitcoinNetwork } from '../../bitcoin/provider/provider.interface';
import { BitcoinWallet } from '../../bitcoin/wallet/wallet';
import { BitcoinProvider } from '../../bitcoin/provider/provider';
import { loadTestConfig } from '../../../../../../test-config-loader';
// import axios from 'axios';
// import { promisify } from 'util';
// import { exec } from 'child_process';

// const execAsync = promisify(exec);

// const RPC_USER = 'admin1';
// const RPC_PASSWORD = '123';

// async function mineBlock(addr: string, count: number): Promise<void> {
//   try {
//     const { data: mineData } = await axios.post(
//       'http://localhost:18443',
//       {
//         jsonrpc: '1.0',
//         id: 'generatetoaddress',
//         method: 'generatetoaddress',
//         params: [count, addr],
//       },
//       {
//         auth: {
//           username: RPC_USER,
//           password: RPC_PASSWORD,
//         },
//       },
//     );
//     return mineData;
//   } catch (error) {
//     console.log('Mining failed : ', error);
//   }
// }

// async function fund(addr: string): Promise<void> {
//   try {
//     await execAsync(`merry faucet --to ${addr}`);
//   } catch (error) {
//     console.log('Funding failed : ', error);
//   }
// }

describe('Bitcoin to StarkNet Integration Tests', () => {
  // Constants
  //   const RELAYER_URL = 'http://localhost:4426';
  //   const STARKNET_NODE_URL = 'http://localhost:8547/rpc';
  //   const QUOTE_SERVER_URL = 'http://localhost:6969';
  //   const STARKNET_RELAY_URL = 'http://localhost:4436';
  const config = loadTestConfig();
  const RELAYER_URL = 'https://orderbook-stage.hashira.io';
  const STARKNET_NODE_URL = 'https://starknet-mainnet.public.blastapi.io';
  const QUOTE_SERVER_URL = 'https://quote-staging.hashira.io';
  const STARKNET_RELAY_URL = 'https://starknet-relayer.hashira.io';
  // Wallet configurations
  const EVM_PRIVATE_KEY = config.EVM_PRIVATE_KEY;
  //testnet
  const STARKNET_PRIVATE_KEY = config.STARKNET_PRIVATE_KEY;
  const STARKNET_ADDRESS = config.STARKNET_ADDRESS;

  // Global variables
  let garden: Garden;
  let evmWallet: WalletClient;
  let starknetWallet: Account;
  let btcWallet: BitcoinWallet;
  let btcAddress: string;

  beforeAll(async () => {
    console.log('\n------ INITIALIZING WALLETS ------');

    // Initialize EVM wallet
    const evmAccount = privateKeyToAccount(with0x(EVM_PRIVATE_KEY));
    console.log('Ethereum Account:', evmAccount.address);
    evmWallet = createWalletClient({
      account: evmAccount,
      chain: EthereumLocalnet,
      transport: http(),
    });
    console.log('Ethereum Wallet:', evmWallet.account?.address);

    // Initialize StarkNet wallet
    const snProvider = new RpcProvider({ nodeUrl: STARKNET_NODE_URL });
    starknetWallet = new Account(
      snProvider,
      STARKNET_ADDRESS,
      STARKNET_PRIVATE_KEY,
    );
    console.log('StarkNet Account:', starknetWallet.address);

    // Initialize Bitcoin wallet
    // const bitcoinProvider = new BitcoinProvider(
    //   BitcoinNetwork.Regtest,
    //   'http://localhost:30000',
    // );
    const bitcoinProvider = new BitcoinProvider(
      BitcoinNetwork.Testnet,
      'https://48.217.250.147:18443',
    );
    btcWallet = BitcoinWallet.fromPrivateKey(
      config.BITCOIN_PRIVATE_KEY,
      bitcoinProvider,
      { pkType: 'p2wpkh', pkPath: "m/84'/0'/0'/0/0" },
    );
    btcAddress = await btcWallet.getAddress();
    console.log('Bitcoin Address:', btcAddress);

    // Initialize Garden
    // garden = new Garden({
    //   environment: Environment.TESTNET,
    //   evmWallet,
    //   starknetWallet,
    //   orderbookURl: RELAYER_URL,
    //   quote: new Quote(QUOTE_SERVER_URL),
    //   apiKey: API_KEY,
    //   starknetRelayUrl: STARKNET_RELAY_URL,
    //   btcWallet,
    // });
    garden = new Garden({
      api: RELAYER_URL,
      environment: Environment.TESTNET,
      digestKey:
        '7fb6d160fccb337904f2c630649950cc974a24a2931c3fdd652d3cd43810a857',
      quote: new Quote(QUOTE_SERVER_URL),
      htlc: {
        starknet: new StarknetRelay(
          STARKNET_RELAY_URL,
          starknetWallet,
          'http://localhost:8547/rpc',
        ),
      },
    });
    console.log('------ INITIALIZATION COMPLETE ------\n');
  }, 5000000);

  const setupEventListeners = () => {
    garden.on('error', (order, error) => {
      console.log(
        'error while executing ❌, orderId :',
        order.create_order.create_id,
        'error :',
        error,
      );
    });
    garden.on('success', (order, action, result) => {
      console.log(
        'executed ✅, orderId :',
        order.create_order.create_id,
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
        console.log('pending order :', order.create_order.create_id);
      });
    });
    garden.on('rbf', (order, result) => {
      console.log('rbf :', order.create_order.create_id, result);
    });
  };
  it('should create and execute a BTC-Starknet swap', async () => {
    console.log('\n------ CREATING SWAP ORDER ------');
    const order = {
      fromAsset: SupportedAssets.testnet.bitcoin_testnet_BTC,
      toAsset: SupportedAssets.testnet.starknet_testnet_ETH,
      sendAmount: '10000',
      receiveAmount: '23380000000000',
      additionalData: {
        strategyId: 'btyrssab',
        btcAddress: btcAddress,
      },
      minDestinationConfirmations: 1,
    };
    // console.log('Order Parameters:', JSON.stringify(order, null, 2));

    const result = await garden.swap(order);
    if (!result.ok) {
      console.log('\n------ SWAP ERROR ------');
      console.log('Error:', result.error);
      console.log('------------------------');
      throw new Error(result.error);
    }

    // console.log('\n------ SWAP ORDER CREATED ------');
    // console.log('Order Details:');
    // console.log('- Order ID:', result.val.create_order.create_id);
    // console.log('- Source Asset:', result.val.source_swap.asset);
    // console.log('- Source Amount:', result.val.source_swap.amount);
    // console.log('- Destination Asset:', result.val.destination_swap.asset);
    // console.log('- Destination Amount:', result.val.destination_swap.amount);
    // console.log('--------------------------------');

    // console.log('\n------ ADDING FUNDS TO BTC WALLET------');
    // await fund(await btcWallet.getAddress());

    expect(result.error).toBeFalsy();
    expect(result.val).toBeTruthy();

    console.log('\n------ FUNDING BITCOIN ------');
    try {
      console.log('Bitcoin Address:', await btcWallet.getAddress());

      // First, mine enough blocks to mature the coins and wait for them
      console.log('Mining initial blocks to mature coins...');
      //   await mineBlock(await btcWallet.getAddress(), 101);
      await sleep(2000); // Wait for blocks to be processed

      // Fund the wallet and wait for confirmation
      console.log('\n------ ADDING FUNDS TO BTC WALLET------');
      //   await fund(await btcWallet.getAddress());
      await sleep(2000); // Wait for funding to complete

      // Mine additional blocks to ensure funding is mature
      console.log('Mining additional blocks to mature funded coins...');
      //   await mineBlock(await btcWallet.getAddress(), 101);
      await sleep(2000); // Wait for blocks to be processed

      console.log('Coins matured successfully');

      // Now proceed with the send
      console.log('Sending BTC to HTLC...');
      await btcWallet.send(
        result.val.source_swap.swap_id,
        +result.val.source_swap.amount,
      );

      // Mine confirmation blocks
      console.log('Mining confirmation blocks...');
      //   await mineBlock(await btcWallet.getAddress(), 6);
      await sleep(2000); // Wait for confirmations

      console.log('HTLC Funding Success');
      console.log('Swap ID:', result.val.source_swap.swap_id);
      console.log('--------------------------------');
    } catch (error) {
      console.log('\n------ HTLC FUNDING ERROR ------');
      console.log('Error:', error);
      console.log('--------------------------------');
      throw error;
    }
  }, 120000); // Increased timeout to 120 seconds

  it('Execute orders', async () => {
    console.log('\n------ EXECUTING ORDERS ------');

    // Create a promise that resolves when redemption is successful
    const redemptionPromise = new Promise((resolve) => {
      garden.on('success', (order, action, result) => {
        if (action === 'Redeem') {
          console.log('\n------ REDEMPTION SUCCESSFUL ------');
          console.log('Order ID:', order.create_order.create_id);
          console.log('Transaction Hash:', result);
          console.log('----------------------------------\n');
          resolve(true);
        }
      });
    });

    // Setup other event listeners
    setupEventListeners();

    // Start execution
    await garden.execute();

    // Wait for redemption to complete or timeout after 150 seconds
    await Promise.race([
      redemptionPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redemption timeout')), 150000),
      ),
    ]);

    console.log('------ EXECUTION COMPLETE ------\n');
  }, 150000);
});
