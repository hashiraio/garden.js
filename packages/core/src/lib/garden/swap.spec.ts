import { Garden } from './garden';
import { ChainAsset, Assets } from '@gardenfi/orderbook';
import { with0x, Network, sleep } from '@gardenfi/utils';
import { RpcProvider, Account } from 'starknet';
import { describe, it } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import * as anchor from '@coral-xyz/anchor';
import { web3 } from '@coral-xyz/anchor';
import { STARKNET_CONFIG } from '../constants';
import { BitcoinProvider } from '../bitcoin/provider/provider';
import { BitcoinWallet } from '../bitcoin/wallet/wallet';
import { SwapParams } from './garden.types';
import { loadTestConfig } from '../../../../../test-config-loader';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { TronWeb } from 'tronweb';

describe('Garden swap tests', () => {
  const config = loadTestConfig();
  // Wallet configurations
  const EVM_PRIVATE_KEY = config.EVM_PRIVATE_KEY_2;
  const STARKNET_PRIVATE_KEY = config.STARKNET_PRIVATE_KEY;
  const STARKNET_ADDRESS = config.STARKNET_ADDRESS;
  const SOLANA_PRIV = config.SOLANA_PRIV;
  const TRON_PRIVATE_KEY = config.TRON_PRIVATE_KEY;
  const DIGEST_KEY =
    '4b5d17d53a0d759b17ef2c186dda99e251f6b789b2d641ed296270a3840ef5b8';
  // const DIGEST_KEY = DigestKey.generateRandom().val;
  if (!DIGEST_KEY) {
    throw new Error('Digest key is not defined');
  }
  const TEST_RPC_URL = config.TEST_RPC_URL;

  const connection = new web3.Connection(TEST_RPC_URL, {
    commitment: 'confirmed',
  });
  const privateKeyBytes = new Uint8Array(SOLANA_PRIV);
  const user = web3.Keypair.fromSecretKey(privateKeyBytes);
  const userWallet = new anchor.Wallet(user);
  const userProvider = new anchor.AnchorProvider(connection, userWallet);
  // Global variables
  const evmAccount = privateKeyToAccount(with0x(EVM_PRIVATE_KEY));
  const evmWallet = createWalletClient({
    account: evmAccount,
    chain: sepolia,
    transport: http(),
  });
  const snProvider = new RpcProvider({
    nodeUrl: STARKNET_CONFIG[Network.TESTNET].nodeUrl,
  });
  const starknetWallet = new Account(
    snProvider,
    STARKNET_ADDRESS,
    STARKNET_PRIVATE_KEY,
    '1',
    '0x3',
  );
  const tronWallet = new TronWeb({
    fullHost: 'https://api.shasta.trongrid.io',
    privateKey: TRON_PRIVATE_KEY,
  });

  const provider = new BitcoinProvider(Network.TESTNET);
  const bitcoinWallet = BitcoinWallet.fromPrivateKey(DIGEST_KEY, provider);

  const suiSigner = Ed25519Keypair.fromSecretKey(config.SUI_PRIVATE_KEY);

  console.log(
    `
======= Wallet Addresses =======
Digest Key:              ${DIGEST_KEY}
EVM Wallet Address:      ${evmWallet.account.address}
Solana Wallet Address:   ${user.publicKey.toString()}
Starknet Wallet Address: ${starknetWallet.address}
Bitcoin Wallet Address:  ${bitcoinWallet.getAddress()}
Sui Wallet Address:      ${suiSigner.toSuiAddress()}
Tron Wallet Address:     ${tronWallet.defaultAddress?.base58}
===============================
    `,
  );

  const garden = Garden.fromWallets({
    environment: {
      network: Network.TESTNET,
      baseurl: 'https://testnet.api.hashira.io',
      auth: 'https://testnet.api.hashira.io',
      relayer: 'https://testnet.api.hashira.io',
    },
    digestKey: DIGEST_KEY!,
    apiKey: config.STAGING_API_KEY,
    wallets: {
      evm: evmWallet,
      starknet: starknetWallet,
      solana: userProvider,
      bitcoin: bitcoinWallet,
      sui: suiSigner,
      tron: TRON_PRIVATE_KEY,
    },
  }).setRedeemServiceEnabled(true);

  const setupEventListeners = (garden: Garden) => {
    garden?.on('error', (order, error) => {
      console.log(
        'error while executing ❌, orderId :',
        order.order_id,
        'error :',
        error,
      );
    });
    garden?.on('success', (order, action, result) => {
      console.log(
        'executed ✅, orderId :',
        order.order_id,
        'action :',
        action,
        'result :',
        result,
      );
    });
    garden?.on('log', (id, message) => {
      console.log('log :', id, message);
    });
    garden?.on('onPendingOrdersChanged', (orders) => {
      console.log('pending orders :', orders.length);
      orders.forEach((order) => {
        console.log('orderId :', order.order_id, 'status :', order.status);
      });
    });
    garden?.on('rbf', (order, result) => {
      console.log('rbf :', order.order_id, result);
    });
  };

  // let matchedOrder: Order;

  describe.only('Should perform a swap', async () => {
    it.only('should create and execute a swap', async () => {
      setupEventListeners(garden);
      const from = ChainAsset.from('tron_shasta:usdt');
      const to = ChainAsset.from('arbitrum_sepolia:WBTC');
      const sendAmount = 10000000;
      const quote = await garden.quote.getQuote(from, to, sendAmount, false);

      const recieveAmount = quote.val?.[0].destination.amount;
      if (!recieveAmount) console.log('error fetching quote');
      const order: SwapParams = {
        fromAsset: from.toString(),
        toAsset: to.toString(),
        sendAmount: sendAmount.toString(),
        receiveAmount: recieveAmount ? recieveAmount : '',
        addresses: {
          bitcoin: 'tb1qxtztdl8qn24axe7dnvp75xgcns6pl5ka9tzjru',
        },
      };
      console.log(order);
      console.log(garden.digestKey?.userId);
      const result = await garden.createSwap(order);
      if (!result.ok) {
        console.log('Error while creating order ❌:', result.error);
        throw new Error(result.error);
      }
      console.log('Order created and initiated ✅', result.val);
      // expect(result.error).toBeFalsy();
      // expect(result.val).toBeTruthy();
      await sleep(1500000); // 25 minutes
    }, 1500000);

    it.skip('should create order without HTLCs when addresses are provided', async () => {
      const gardenWithoutHTLCs = Garden.fromWallets({
        environment: {
          network: Network.TESTNET,
        },
        apiKey: config.API_KEY,
        wallets: {
          evm: evmWallet,
        },
      });
      const from = ChainAsset.from(Assets.arbitrum_sepolia.WBTC);

      const to = ChainAsset.from(Assets.bitcoin_testnet.BTC);
      const sendAmount = 50000;
      const quote = await gardenWithoutHTLCs.quote.getQuote(
        from,
        to,
        sendAmount,
        false,
        {},
      );

      const recieveAmount = quote.val?.[0].destination.amount;

      const swapParams: SwapParams = {
        fromAsset: from,
        toAsset: to,
        sendAmount: sendAmount.toString(),
        receiveAmount: recieveAmount ? recieveAmount : '',
        addresses: {
          bitcoin: 'tb1qxtztdl8qn24axe7dnvp75xgcns6pl5ka9tzjru',
        },
      };
      console.log(swapParams);
      const result = await gardenWithoutHTLCs.createOrder(swapParams);
      if (!result.ok) {
        console.log('Error while creating order ❌:', result.error);
        throw new Error(result.error);
      }
      console.log('Order created and initiated ✅', result.val);
    }, 1500000);

    it.skip('should fail createSwap without HTLCs even when addresses are provided', async () => {
      const gardenWithoutHTLCs = Garden.fromWallets({
        environment: {
          network: Network.TESTNET,
        },
        apiKey: config.API_KEY,
        wallets: {
          evm: evmWallet,
          solana: userProvider,
        },
      });

      const from = ChainAsset.from(Assets.arbitrum_sepolia.WBTC);

      const to = ChainAsset.from(Assets.solana_testnet.cbBTC);
      const sendAmount = 50000;
      const quote = await gardenWithoutHTLCs.quote.getQuote(
        from,
        to,
        sendAmount,
        false,
        {},
      );

      const recieveAmount = quote.val?.[0].destination.amount;

      const swapParams: SwapParams = {
        fromAsset: to,
        toAsset: from,
        sendAmount: sendAmount.toString(),
        receiveAmount: recieveAmount?.toString() ?? '',
        addresses: {
          bitcoin: 'tb1qxtztdl8qn24axe7dnvp75xgcns6pl5ka9tzjru',
        },
      };
      console.log(swapParams);
      const result = await gardenWithoutHTLCs.createSwap(swapParams);
      if (!result.ok) {
        console.log('Error while creating order ❌:', result.error);
        throw new Error(result.error);
      }
      console.log('Order created and initiated ✅', result.val);
    }, 1500000);
  });
});
