import { describe, expect, it } from 'vitest';
import * as anchor from '@coral-xyz/anchor';
import { ApiKey, DigestKey, Network, sleep, Url } from '@gardenfi/utils';
import { Garden } from '../../garden/garden';
import { IGardenJS, SwapParams } from '../../garden/garden.types';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiRelay } from './suiRelay';
import { SolanaRelay } from '../../solana/relayer/solanaRelay';
import { solanaProgramAddress, SolanaRelayerAddress } from '../../constants';
import { web3 } from '@coral-xyz/anchor';
import { WalletWithRequiredFeatures } from '@mysten/wallet-standard';
import { loadTestConfig } from '../../../../../../test-config-loader';

const setupEventListeners = (garden: IGardenJS) => {
  garden.on('error', (order, error) => {
    console.log(
      'Error while executing ❌, orderId:',
      order.order_id,
      'error:',
      error,
    );
  });

  garden.on('success', (order, action, result) => {
    console.log(
      'Executed ✅, orderId:',
      order.order_id,
      'action:',
      action,
      'result:',
      result,
    );
  });

  garden.on('log', (id, message) => {
    console.log('Log:', id, message);
  });

  garden.on('onPendingOrdersChanged', (orders) => {
    console.log('⏳Pending orders:', orders.length);
    orders.forEach((order) => {
      console.log('Order id :', order.order_id, 'status :', order.status);
    });
  });

  garden.on('rbf', (order, result) => {
    console.log('RBF:', order.order_id, result);
  });
};
describe.only('sui relay tests', () => {
  const config = loadTestConfig();
  const url = 'https://testnet.api.hashira.io/orders';
  const TEST_SOLANA_RELAY = 'https://solana-relay.garden.finance';
  const PRIV = config.SUI_PRIVATE_KEY;
  const create_order: SwapParams = {
    fromAsset: {
      chain: 'sui_testnet',
      atomicSwapAddress:
        '0x1b02d7acf45a93db3fa8e84e6ff5d31f305a5f2e483d437803f910389c392744',
      decimals: 9,
      name: 'SUI',
      symbol: 'SUI',
      tokenAddress: '0x2::sui::SUI',
    },
    toAsset: {
      chain: 'solana_testnet',
      atomicSwapAddress: '6eksgdCnSjUaGQWZ6iYvauv1qzvYPF33RTGTM1ZuyENx',
      decimals: 9,
      name: 'SOL',
      symbol: 'SOL',
      tokenAddress: 'primary',
    },
    sendAmount: '10000000',
    receiveAmount: '2060',
  };
  let garden: Garden;
  it('should initiate', async () => {
    const privateKey =
      'suiprivkey1qrgdeyaw552slccg8gkqzacz64q3fyh3px890ltq3qkm0f90xm22j5ddka9';

    // 303ae80d95b2c0220090e8924b6e7a55ffb35e1875bd6ad577d8a0b825045752
    // 00303ae80d95b2c0220090e8924b6e7a55ffb35e1875bd6ad577d8a0b825045752
    const signer = Ed25519Keypair.fromSecretKey(privateKey);

    const blah: any = {
      chains: ['ok:sui'],
      features: {
        'sui:signAndExecuteTransaction': {
          version: '1.0.0',
          signAndExecuteTransaction: async (tx: any) => {
            return tx;
          },
        },
      },
      accounts: [
        {
          address:
            '0x276f0daa0b360b524191208df668356ff37af0012cf4ba8cb9a457924a37054c',
          publicKey: signer.getPublicKey().toRawBytes(),
          chains: ['ok:sui'],
          features: [],
        },
      ],
      icon: 'data:image/svg+xml;base64,',
      name: '',
      version: '1.0.0',
    };
    const TEST_RPC_URL = 'https://api.devnet.solana.com';

    const privateKeyBytes = new Uint8Array(PRIV);
    const user = anchor.web3.Keypair.fromSecretKey(privateKeyBytes);
    const connection = new web3.Connection(TEST_RPC_URL, {
      commitment: 'confirmed',
    });
    const userWallet = new anchor.Wallet(user);
    const solanaProvider = new anchor.AnchorProvider(connection, userWallet, {
      commitment: 'confirmed',
      skipPreflight: true,
      preflightCommitment: 'confirmed',
    });
    const htlc = new SuiRelay(
      new Url(url),
      blah as WalletWithRequiredFeatures,
      Network.TESTNET,
    );
    const solanaHtlc = new SolanaRelay(
      solanaProvider,
      new Url(TEST_SOLANA_RELAY),
      SolanaRelayerAddress.testnet,
      solanaProgramAddress.staging,
      new ApiKey(config.API_KEY),
    );
    garden = new Garden({
      apiKey: config.API_KEY,
      digestKey: DigestKey.generateRandom().val!,
      environment: {
        network: Network.TESTNET,
      },
      htlc: {
        sui: htlc,
        solana: solanaHtlc,
      },
    }).setRedeemServiceEnabled(true);
    const order = await garden.createSwap(create_order);
    console.log('matched order', order);
    // const initRes = await htlc.initiate(order.val!);
    // console.log('initRes', initRes);
    // expect(initRes.ok).toBe(true);
    setupEventListeners(garden);
    // await garden.execute();
    await sleep(150000);
  });
}, 950000);

// describe(
//   'sui htlc redeem tests',
//   () => {
//     const url = 'https://testnet.api.hashira.io/orders';
//     const create_order: CreateOrderReqWithStrategyId = {
//       source_chain: 'solana_testnet',
//       destination_chain: 'sui_testnet',
//       source_asset: '6eksgdCnSjUaGQWZ6iYvauv1qzvYPF33RTGTM1ZuyENx',
//       destination_asset:
//         '0x1b02d7acf45a93db3fa8e84e6ff5d31f305a5f2e483d437803f910389c392744',
//       source_amount: '1000',
//       destination_amount: '100',
//       nonce: '1753963050221',
//       initiator_source_address: 'YH4btvqb4JBWSEJh22MuA231ekpJ5JqbBXQY1apJtKH',
//       initiator_destination_address:
//         '276f0daa0b360b524191208df668356ff37af0012cf4ba8cb9a457924a37054c',
//       additional_data: {
//         strategy_id: 'stfost44',
//       },
//       affiliate_fees: [],
//     };
//     let garden: Garden;
//     it('should initiate and redeem', async () => {
//       // If you have a specific private key, use the import method:
//       // const privateKey = 'suiprivkey1qrgdeyaw552slccg8gkqzacz64q3fyh3px890ltq3qkm0f90xm22j5ddka9';
//       // const signer = await WebCryptoSigner.import(privateKey);

//       // For testing, generate a new signer:
//       const signer = await WebCryptoSigner.generate();

//       garden = new Garden({
//         auth: new ApiKey(
//           'AAAAAGm47cw6Og5G37SuhX_uiXy8CYZCwx5XHgNS1DCsTi_HOzpOaAoYBPZLbGm1th0qVlom1EuaV_OtU6oJ_UIffIpsfVVDbKAc',
//         ),
//         orderbook: new Orderbook(new Url(url)),
//         digestKey: DigestKey.generateRandom().val!,
//         environment: Environment.TESTNET,
//         htlc: {
//           sui: new SuiHTLC(signer, Network.TESTNET),
//         },
//       });
//       const secretManager = SecretManager.fromDigestKey(
//         garden.digestKey.digestKey,
//       );
//       const { secret, secretHash } = (
//         await secretManager.generateSecret('garden-sui1')
//       ).val!;
//       const create_order_with_secret_hash: CreateOrderReqWithStrategyId = {
//         ...create_order,
//         secret_hash: trim0x(secretHash),
//       };
//       console.log('secret', secret);
//       console.log('secretHash', secretHash);

//       const order = await garden.orderbook.createOrder(
//         create_order_with_secret_hash,
//         garden.auth,
//       );
//       console.log('matched order', order);

//       await sleep(1000 * 60 * 2);

//       const htlc = new SuiHTLC(signer, Network.TESTNET);
//       const redeemRes = await htlc.redeem(order.val!, trim0x(secret));
//       console.log('redeemRes', redeemRes);
//       expect(redeemRes.ok).toBe(true);
//     });
//   },
//   1000 * 60 * 5,
// );
// describe.skip(
//   'sui htlc refund tests',
//   () => {
//     const url = 'https://testnet.api.hashira.io/orders';
//     const create_order: CreateOrderReqWithStrategyId = {
//       source_chain: 'sui_testnet',
//       destination_chain: 'solana_testnet',
//       source_asset:
//         '0x1b02d7acf45a93db3fa8e84e6ff5d31f305a5f2e483d437803f910389c392744',
//       destination_asset: '6eksgdCnSjUaGQWZ6iYvauv1qzvYPF33RTGTM1ZuyENx',
//       source_amount: '10000000',
//       destination_amount: '206237',
//       nonce: '1753963050221',
//       initiator_source_address:
//         '276f0daa0b360b524191208df668356ff37af0012cf4ba8cb9a457924a37054c',
//       initiator_destination_address:
//         '6wpsRMVPfX8uJB9SRZF6n8HXZQ79gBrVzM5W8epTdWE5',
//       additional_data: {
//         strategy_id: 'st44stfo',
//       },
//       affiliate_fees: [],
//     };
//     let garden: Garden;
//     it('should initiate and refund', async () => {
//       //   const privateKey =
//       //     'suiprivkey1qrgdeyaw552slccg8gkqzacz64q3fyh3px890ltq3qkm0f90xm22j5ddka9';
//       // TODO: export keypair and create signer from it
//       const signer = await WebCryptoSigner.generate();
//       const htlc = new SuiHTLC(signer, Network.TESTNET);
//       garden = new Garden({
//         auth: new ApiKey(
//           'AAAAAGm47cw6Og5G37SuhX_uiXy8CYZCwx5XHgNS1DCsTi_HOzpOaAoYBPZLbGm1th0qVlom1EuaV_OtU6oJ_UIffIpsfVVDbKAc',
//         ),
//         orderbook: new Orderbook(new Url(url)),
//         digestKey: DigestKey.generateRandom().val!,
//         environment: Environment.TESTNET,
//         htlc: {
//           sui: htlc,
//         },
//       });
//       const order = (
//         await garden.orderbook.createOrder(create_order, garden.auth)
//       ).val!;
//       console.log('matched order', order);

//       const initRes = await htlc.initiate(order);
//       expect(initRes.ok).toBe(true);
//       console.log('init successfull');

//       await sleep(1000 * 30); // wait for timelock

//       const refundRes = await htlc.refund(order);
//       console.log('refundRes', refundRes);
//       expect(refundRes.ok).toBe(true);
//     });
//   },
//   1000 * 60 * 5,
// );

// phantom: d38f39f36df6d77d78f75efcd7ddb7e34d78e36df6d78ebbe75d74d76dbce76e79d7bf7de36e35d7bd7cf75d3adb5df5d7ddb5eb5eb4d7ce37ef8f3bf3
// slush: 303ae80d95b2c0220090e8924b6e7a55ffb35e1875bd6ad577d8a0b825045752
