import { Garden } from '../garden';
import { AssetToken, Order, SupportedAssets } from '@gardenfi/orderbook';
import { with0x, Network, sleep } from '@gardenfi/utils';
import { RpcProvider, Account } from 'starknet';
import { describe, expect, it } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { SwapParams } from '../garden.types';
import { STARKNET_CONFIG } from './../../constants';
import * as anchor from '@coral-xyz/anchor';
import { web3 } from '@coral-xyz/anchor';
import { BitcoinProvider } from '../../bitcoin/provider/provider';
import { BitcoinWallet } from '../../bitcoin/wallet/wallet';
import { loadTestConfig } from '../../../../../../test-config-loader';

describe('StarkNet Integration Tests', () => {
  // Wallet configurations
  const config = loadTestConfig();
  const EVM_PRIVATE_KEY = config.EVM_PRIVATE_KEY;
  const STARKNET_PRIVATE_KEY = config.STARKNET_PRIVATE_KEY;
  const STARKNET_ADDRESS = config.STARKNET_ADDRESS;
  const DIGEST_KEY =
    '4b5d17d53a0d759b17ef2c186dda99e251f6b789b2d641ed296270a3840ef5b8';
  // const DIGEST_KEY = DigestKey.generateRandom().val;
  if (!DIGEST_KEY) {
    throw new Error('Digest key is not defined');
  }
  console.log('digest key', DIGEST_KEY);
  const TEST_RPC_URL = 'https://api.devnet.solana.com';
  const PRIV = config.SOLANA_PRIV;
  const connection = new web3.Connection(TEST_RPC_URL, {
    commitment: 'confirmed',
  });
  const privateKeyBytes = new Uint8Array(PRIV);
  const user = web3.Keypair.fromSecretKey(privateKeyBytes);
  const userWallet = new anchor.Wallet(user);
  console.log('Solana Wallet Address:', user.publicKey.toString());
  const userProvider = new anchor.AnchorProvider(connection, userWallet);

  // Global variables
  const evmAccount = privateKeyToAccount(with0x(EVM_PRIVATE_KEY));
  const evmWallet = createWalletClient({
    account: evmAccount,
    chain: sepolia,
    transport: http(),
  });
  console.log('EVM Wallet Address:', evmWallet.account.address);
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
  console.log('Starknet Wallet Address:', starknetWallet.address);
  const provider = new BitcoinProvider(Network.TESTNET);
  const bitcoinWallet = BitcoinWallet.fromPrivateKey(DIGEST_KEY, provider);
  const garden = Garden.fromWallets({
    environment: {
      network: Network.TESTNET,
    },
    digestKey: DIGEST_KEY!,
    apiKey: config.API_KEY,
    wallets: {
      evm: evmWallet,
      starknet: starknetWallet,
      solana: userProvider,
      bitcoin: bitcoinWallet,
    },
  }).setRedeemServiceEnabled(false);

  let matchedOrder: Order;

  //-----------------STRK-EVM SWAP-----------------

  describe.only('strk-evm swap', async () => {
    it('should create and execute a StarkNet-ETH swap', async () => {
      const from: AssetToken = {
        name: 'Wrapped Bitcoin',
        decimals: 8,
        symbol: 'SOL',
        chain: 'solana_testnet',
        logo: 'https://garden-finance.imgix.net/token-images/wbtc.svg',
        tokenAddress: '0xD8a6E3FCA403d79b6AD6216b60527F51cc967D39',
        atomicSwapAddress: '0x795Dcb58d1cd4789169D5F938Ea05E17ecEB68cA',
      };
      const to: AssetToken = {
        name: 'Starknet ETH',
        decimals: 8,
        symbol: 'BTC',
        chain: 'bitcoin_testnet',
        logo: 'https://garden-finance.imgix.net/token-images/wbtc.svg',
        tokenAddress:
          '0x496bef3ed20371382fbe0ca6a5a64252c5c848f9f1f0cccf8110fc4def912d5',
        atomicSwapAddress:
          '0x06579d255314109429a4477d89629bc2b94f529ae01979c2f8014f9246482603',
      };
      const order: SwapParams = {
        fromAsset: from,
        toAsset: to,
        sendAmount: '10000000',
        receiveAmount: '1865',
        addresses: { bitcoin: 'tb1qxtztdl8qn24axe7dnvp75xgcns6pl5ka9tzjru' },
      };
      console.log(order);
      const result = await garden.createSwap(order);
      if (!result.ok) {
        console.log('Error while creating order ❌:', result.error);
        throw new Error(result.error);
      }
      console.log('Order created and matched ✅', result.val);
      // matchedOrder = result.val;
      // expect(result.error).toBeFalsy();
      // expect(result.val).toBeTruthy();

      await sleep(1500000); // 25 minutes
    }, 1500000);
  });

  //-----------------EVM-STRK SWAP-----------------

  describe('evm-strk swap', async () => {
    it('should create order and match', async () => {
      const order = {
        fromAsset: SupportedAssets.testnet.arbitrum_sepolia.WBTC,
        toAsset: SupportedAssets.testnet.starknet_sepolia.WBTC,
        sendAmount: '500000',
        receiveAmount: '214821925172042749',
        additionalData: {},
      };

      const result = await garden.createSwap(order);
      if (!result.ok) {
        console.log('Error while creating order ❌:', result.error);
        throw new Error(result.error);
      }

      console.log('Order created and matched✅', result.val);
      const res = await garden.getOrder(result.val);
      if (!res.ok) {
        console.log('Error while getting order ❌:', res.error);
        throw new Error(res.error);
      }
      // console.log(result.val.source_swap.asset);
      matchedOrder = res.val;

      expect(result.error).toBeFalsy();
      expect(result.val).toBeTruthy();
    }, 150000);

    it('Initiate the swap', async () => {
      if (!garden.htlcs?.evm) {
        throw new Error('EVM HTLC is not initialized');
      }

      const res = await garden.htlcs.evm.initiate(matchedOrder);
      console.log('initiated ✅ :', res.val);
      if (!res.ok) console.log('init error ❌ :', res.error);
      // expect(res.ok).toBeTruthy();
      expect(res.ok).toBeTruthy();
    }, 20000);

    it('Execute', async () => {
      // setupEventListeners(garden);
      // await garden.execute();
      await sleep(150000);
    }, 150000);
  });

  describe('btc-strk swap', async () => {
    it('should create order and match', async () => {
      console.log('\n------ CREATING SWAP ORDER ------');
      const order = {
        fromAsset: SupportedAssets.testnet.bitcoin_testnet.BTC,
        toAsset: SupportedAssets.testnet.starknet_sepolia.WBTC,
        sendAmount: '10000',
        receiveAmount: '4292202826399481',
        btcAddress: 'tb1qxtztdl8qn24axe7dnvp75xgcns6pl5ka9tzjru',
      };

      const result = await garden.createSwap(order);
      if (!result.ok) {
        console.log('Error while creating order ❌:', result.error);
        throw new Error(result.error);
      }

      console.log('Order created and matched✅', result.val);
      // console.log(result.val.source_swap.asset);
      const res = await garden.getOrder(result.val);
      if (!res.ok) {
        console.log('Error while getting order ❌:', res.error);
        throw new Error(res.error);
      }
      matchedOrder = res.val;

      expect(result.error).toBeFalsy();
      expect(result.val).toBeTruthy();
    }, 150000);

    it('Initiate the swap', async () => {
      console.log('Initiate the swap: ', matchedOrder.source_swap.swap_id);
      expect(matchedOrder.source_swap.swap_id).toBeTruthy();
    }, 20000);

    it('Execute', async () => {
      // setupEventListeners(garden);
      // await garden.execute();
      await sleep(150000);
    }, 150000);
  });

  describe('strk-btc swap', async () => {
    it.skip('should create order and match', async () => {
      console.log('\n------ CREATING SWAP ORDER ------');
      const order = {
        fromAsset: SupportedAssets.testnet.starknet_sepolia.WBTC,
        toAsset: SupportedAssets.testnet.bitcoin_testnet.BTC,
        sendAmount: '10000000000000000',
        receiveAmount: '23159',
        additionalData: {
          strategyId: 'ss59btyr',
          btcAddress: 'tb1qxtztdl8qn24axe7dnvp75xgcns6pl5ka9tzjru',
        },
      };

      const result = await garden.createSwap(order);
      if (!result.ok) {
        console.log('Error while creating order ❌:', result.error);
        throw new Error(result.error);
      }

      console.log('Order created and matched✅', result.val);
      // console.log(result.val.source_swap.asset);
      const res = await garden.getOrder(result.val);
      if (!res.ok) {
        console.log('Error while getting order ❌:', res.error);
        throw new Error(res.error);
      }
      matchedOrder = res.val;

      expect(result.error).toBeFalsy();
      expect(res.val).toBeTruthy();
    }, 150000);

    it.skip('Initiate the swap', async () => {
      if (!garden.htlcs?.starknet) {
        throw new Error('Starknet HTLC is not initialized');
      }
      const res = await garden.htlcs?.starknet.initiate(matchedOrder);
      console.log('initiated ✅ :', res?.val);
      if (res?.error) console.log('init error ❌ :', res.error);
      // expect(res.ok).toBeTruthy();
      expect(res?.ok).toBeTruthy();
    }, 20000);

    // it.only('Execute', async () => {
    //   setupEventListeners(garden);
    //   await garden.execute();
    //   await sleep(150000);
    // }, 150000);
  });
});
