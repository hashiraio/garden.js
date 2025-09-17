import { describe, expect, it } from 'vitest';
import { CreateOrderReqWithStrategyId, Orderbook } from '@gardenfi/orderbook';
import { SuiHTLC } from './suiHTLC';
import {
  ApiKey,
  DigestKey,
  Environment,
  Network,
  sleep,
  trim0x,
  Url,
} from '@gardenfi/utils';
import { Garden } from '../../garden/garden';
// import { SecretManager } from '../../secretManager/secretManager';
// import { WebCryptoSigner } from '@mysten/signers/webcrypto';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SecretManager } from '../../secretManager/secretManager';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { loadTestConfig } from '../../../../../../test-config-loader';

describe.only('sui gas budget tests', () => {
  it('should test gas budget allocations per transaction', async () => {
    const config = loadTestConfig();
    const privateKey = config.SUI_PRIVATE_KEY;

    const signer = Ed25519Keypair.fromSecretKey(privateKey);
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    const balance = await client.getBalance({
      owner: signer.toSuiAddress(),
    });
    console.log('balance', balance);
  });
});
describe.only('sui htlc init tests', () => {
  const config = loadTestConfig();
  const url = config.TEST_RELAY_URL;
  const create_order: CreateOrderReqWithStrategyId = {
    source_chain: 'sui_testnet',
    destination_chain: 'bitcoin_testnet',
    source_asset:
      '0xaab5a358b2374c63f31f9e678e7f902b6da0fa20acfc7d2258a238eb25b3e232',
    destination_asset: 'primary',
    source_amount: '3000000000',
    destination_amount: '9649',
    nonce: '1754814048068',
    initiator_source_address:
      '0x9a162c208001aa8edd11395b669d130e1b036916ecfb2d4afb1a7f23955b64d3',
    additional_data: {
      strategy_id: 'st44btyr',
      bitcoin_optional_recipient: 'tb1qsy82l6ve35r3ka6unxkjsw2xqsxzzmclcjsjn4',
    },
    affiliate_fees: [],
  };
  let garden: Garden;
  it('should initiate', async () => {
    const privateKey = config.SUI_PRIVATE_KEY;

    const signer = Ed25519Keypair.fromSecretKey(privateKey);

    const htlc = new SuiHTLC(signer, Network.TESTNET, new Url(url));
    garden = new Garden({
      auth: new ApiKey(
        'AAAAAGm47cw6Og5G37SuhX_uiXy8CYZCwx5XHgNS1DCsTi_HOzpOaAoYBPZLbGm1th0qVlom1EuaV_OtU6oJ_UIffIpsfVVDbKAc',
      ),
      orderbook: new Orderbook(new Url(url)),
      digestKey: DigestKey.generateRandom().val!,
      environment: {
        environment: Environment.TESTNET,
        evmRelay: config.TEST_ORDERBOOK_STAGE,
      },
      htlc: {
        sui: htlc,
      },
    });
    const order = await garden.orderbook.createOrder(create_order, garden.auth);
    console.log('matched order', order);
    const initRes = await htlc.initiate(order.val!);
    console.log('initRes', initRes);
    expect(initRes.ok).toBe(true);
  });
}, 95000);

describe(
  'sui htlc redeem tests',
  () => {
    const config = loadTestConfig();
    const url = config.TEST_RELAY_URL;
    const create_order: CreateOrderReqWithStrategyId = {
      source_chain: 'solana_testnet',
      destination_chain: 'sui_testnet',
      source_asset: '6eksgdCnSjUaGQWZ6iYvauv1qzvYPF33RTGTM1ZuyENx',
      destination_asset:
        '0x1b02d7acf45a93db3fa8e84e6ff5d31f305a5f2e483d437803f910389c392744',
      source_amount: '1000',
      destination_amount: '100',
      nonce: '1753963050221',
      initiator_source_address: 'YH4btvqb4JBWSEJh22MuA231ekpJ5JqbBXQY1apJtKH',
      initiator_destination_address:
        '276f0daa0b360b524191208df668356ff37af0012cf4ba8cb9a457924a37054c',
      additional_data: {
        strategy_id: 'stfost44',
      },
      affiliate_fees: [],
    };
    let garden: Garden;
    it('should initiate and redeem', async () => {
      // If you have a specific private key, use the import method:
      // const privateKey = config.SUI_PRIVATE_KEY;
      // const signer = await WebCryptoSigner.import(privateKey);

      // For testing, generate a new signer:
      const privateKey = config.SUI_PRIVATE_KEY;

      const signer = Ed25519Keypair.fromSecretKey(privateKey);

      garden = new Garden({
        auth: new ApiKey(
          'AAAAAGm47cw6Og5G37SuhX_uiXy8CYZCwx5XHgNS1DCsTi_HOzpOaAoYBPZLbGm1th0qVlom1EuaV_OtU6oJ_UIffIpsfVVDbKAc',
        ),
        orderbook: new Orderbook(new Url(url)),
        digestKey: DigestKey.generateRandom().val!,
        environment: Environment.TESTNET,
        htlc: {
          sui: new SuiHTLC(signer, Network.TESTNET, new Url(url)),
        },
      });
      const secretManager = SecretManager.fromDigestKey(
        garden.digestKey.digestKey,
      );
      const { secret, secretHash } = (
        await secretManager.generateSecret('garden-sui1')
      ).val!;
      const create_order_with_secret_hash: CreateOrderReqWithStrategyId = {
        ...create_order,
        secret_hash: trim0x(secretHash),
      };
      console.log('secret', secret);
      console.log('secretHash', secretHash);

      const order = await garden.orderbook.createOrder(
        create_order_with_secret_hash,
        garden.auth,
      );
      console.log('matched order', order);

      await sleep(1000 * 60 * 2);

      const htlc = new SuiHTLC(signer, Network.TESTNET);
      const redeemRes = await htlc.redeem(order.val!, trim0x(secret));
      console.log('redeemRes', redeemRes);
      expect(redeemRes.ok).toBe(true);
    });
  },
  1000 * 60 * 5,
);
describe.skip(
  'sui htlc refund tests',
  () => {
    const url = 'https://testnet.api.hashira.io/orders';
    const create_order: CreateOrderReqWithStrategyId = {
      source_chain: 'sui_testnet',
      destination_chain: 'solana_testnet',
      source_asset:
        '0x1b02d7acf45a93db3fa8e84e6ff5d31f305a5f2e483d437803f910389c392744',
      destination_asset: '6eksgdCnSjUaGQWZ6iYvauv1qzvYPF33RTGTM1ZuyENx',
      source_amount: '10000000',
      destination_amount: '206237',
      nonce: '1753963050221',
      initiator_source_address:
        '276f0daa0b360b524191208df668356ff37af0012cf4ba8cb9a457924a37054c',
      initiator_destination_address:
        '6wpsRMVPfX8uJB9SRZF6n8HXZQ79gBrVzM5W8epTdWE5',
      additional_data: {
        strategy_id: 'st44stfo',
      },
      affiliate_fees: [],
    };
    let garden: Garden;
    it('should initiate and refund', async () => {
      //   const privateKey =
      //     'suiprivkey1qrgdeyaw552slccg8gkqzacz64q3fyh3px890ltq3qkm0f90xm22j5ddka9';
      // TODO: export keypair and create signer from it
      const privateKey =
        'suiprivkey1qrgdeyaw552slccg8gkqzacz64q3fyh3px890ltq3qkm0f90xm22j5ddka9';

      const signer = Ed25519Keypair.fromSecretKey(privateKey);
      const htlc = new SuiHTLC(signer, Network.TESTNET);
      garden = new Garden({
        auth: new ApiKey(
          'AAAAAGm47cw6Og5G37SuhX_uiXy8CYZCwx5XHgNS1DCsTi_HOzpOaAoYBPZLbGm1th0qVlom1EuaV_OtU6oJ_UIffIpsfVVDbKAc',
        ),
        orderbook: new Orderbook(new Url(url)),
        digestKey: DigestKey.generateRandom().val!,
        environment: Environment.TESTNET,
        htlc: {
          sui: htlc,
        },
      });
      const order = (
        await garden.orderbook.createOrder(create_order, garden.auth)
      ).val!;
      console.log('matched order', order);

      const initRes = await htlc.initiate(order);
      expect(initRes.ok).toBe(true);
      console.log('init successfull');

      await sleep(1000 * 30); // wait for timelock

      const refundRes = await htlc.refund(order);
      console.log('refundRes', refundRes);
      expect(refundRes.ok).toBe(true);
    });
  },
  1000 * 60 * 5,
);
