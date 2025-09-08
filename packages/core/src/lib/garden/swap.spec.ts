import { Garden } from './garden';
import { ChainAsset, SupportedAssets } from '@gardenfi/orderbook';
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
import { getBitcoinNetworkFromEnvironment } from '../utils';
import { BitcoinWallet } from '../bitcoin/wallet/wallet';
import { SwapParams } from './garden.types';
import { loadTestConfig } from '../../../../../test-config-loader';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

describe('StarkNet Integration Tests', () => {
  const config = loadTestConfig();
  // Wallet configurations
  const EVM_PRIVATE_KEY = config.EVM_PRIVATE_KEY_2;
  const STARKNET_PRIVATE_KEY = config.STARKNET_PRIVATE_KEY;
  const STARKNET_ADDRESS = config.STARKNET_ADDRESS;
  const SOLANA_PRIV = config.SOLANA_PRIV;
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
  console.log(
    'Solana Wallet PublicKey:',
    userProvider.wallet.publicKey.toString(),
  );

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
  const provider = new BitcoinProvider(
    getBitcoinNetworkFromEnvironment(Network.TESTNET),
  );
  const bitcoinWallet = BitcoinWallet.fromPrivateKey(DIGEST_KEY, provider);

  const suiSigner = Ed25519Keypair.fromSecretKey(config.SUI_PRIVATE_KEY);

  console.log(
    `
==== Wallet Addresses ====
Digest Key:              ${DIGEST_KEY}
EVM Wallet Address:      ${evmWallet.account.address}
Solana Wallet Address:   ${user.publicKey.toString()}
Starknet Wallet Address: ${starknetWallet.address}
Bitcoin Wallet Address:  ${bitcoinWallet.getAddress()}
Sui Wallet Address:      ${suiSigner.toSuiAddress()}
=========================
    `,
  );

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
      sui: suiSigner,
    },
  });

  // let matchedOrder: Order;

  describe.only('Should perform a swap', async () => {
    it('should create and execute a swap', async () => {
      const from = ChainAsset.from(
        SupportedAssets.testnet.ethereum_sepolia.WBTC,
      );
      const to = ChainAsset.from(SupportedAssets.testnet.bitcoin_testnet.BTC);
      const order: SwapParams = {
        fromAsset: from,
        toAsset: to,
        sendAmount: '50000',
        receiveAmount: '49000',
        additionalData: {
          btcAddress: 'tb1qxtztdl8qn24axe7dnvp75xgcns6pl5ka9tzjru',
        },
      };
      console.log(order);
      console.log(garden.digestKey?.userId);
      const result = await garden.swap(order);
      if (!result.ok) {
        console.log('Error while creating order ❌:', result.error);
        throw new Error(result.error);
      }
      console.log('Order created and initiated ✅', result.val);
      // expect(result.error).toBeFalsy();
      // expect(result.val).toBeTruthy();

      await sleep(1500000); // 25 minutes
    }, 1500000);
  });
});
