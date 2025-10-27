import { EvmRelay } from './evmRelay';
import { privateKeyToAccount } from 'viem/accounts';
import { describe, expect, it } from 'vitest';
import { createWalletClient, http } from 'viem';
import { DigestKey, Siwe, Url, with0x } from '@gardenfi/utils';
import { citreaTestnet } from 'viem/chains';
import { loadTestConfig } from '../../../../../../test-config-loader';

describe('evmRelay', () => {
  const config = loadTestConfig();
  const privKey = config.EVM_PRIVATE_KEY;
  const digestKey = new DigestKey(
    '7fb6d160fccb337904f2c630649950cc974a24a2931c3fdd652d3cd43810a857',
  );

  const account = privateKeyToAccount(with0x(privKey));
  const citreaWalletClient = createWalletClient({
    account,
    chain: citreaTestnet,
    transport: http(),
  });

  const relayer = new EvmRelay(
    'https://testnet.api.hashira.io',
    citreaWalletClient,
    Siwe.fromDigestKey(
      new Url('https://testnet.api.hashira.io/auth'),
      digestKey,
    ),
  );

  it('should initiate on native HTLC', async () => {
    const order = {
      created_at: '2025-08-29T11:18:18.985298Z',
      source_swap: {
        created_at: '2025-08-29T11:18:18.985298Z',
        swap_id:
          '02e26f65220535847c116ab28f955cefcc31e83c5434e2a079395471fbd59a61',
        chain: 'arbitrum_sepolia',
        asset: 'arbitrum_sepolia:wbtc',
        initiator: '0xA39ABb978cfd2ba459163ad1EaB6E8940Fbf4359',
        redeemer: '0x661bA32eb5f86CaB358DDbB7F264b10c5825e2dd',
        timelock: 432000,
        filled_amount: '50000',
        asset_price: 110175.6,
        amount: '50000',
        secret_hash:
          'd2b7ef5712fe175bec366989eb4a087b00969764ddd3e12b21a76e9c2d821827',
        secret: '',
        initiate_tx_hash:
          '0xbcce3ad031f39d81228d32dc032365a57ef67aeebcfecfae2654ec811d4f4cf0',
        redeem_tx_hash: '',
        refund_tx_hash:
          '0x24ba0fb82296ca897eb271396be6ede95ad05f4781d0ea23ab15e7faa0ce96d8',
        initiate_block_number: '188831444',
        redeem_block_number: '0',
        refund_block_number: '188862158',
        required_confirmations: 1,
        current_confirmations: 1,
        initiate_timestamp: '2025-08-29T11:18:26Z',
        redeem_timestamp: null,
        refund_timestamp: '2025-08-29T13:35:55Z',
      },
      destination_swap: {
        created_at: '2025-08-29T11:18:18.985298Z',
        swap_id:
          'tb1pm6njjsyj9qdgx4rtj3qta4ru25afevc7gj6fpnl7c8xl380struquwgs9q',
        chain: 'bitcoin_testnet',
        asset: 'bitcoin_testnet:btc',
        initiator:
          '460f2e8ff81fc4e0a8e6ce7796704e3829e3e3eedb8db9390bdc51f4f04cf0a6',
        redeemer: 'tb1ql3k43gu0lj4392glvmflq9rcgfrqtx8s7thdfy',
        delegate:
          '727dde7d4e0726212ccbd76e6ed71f1bceb957082023c39be18cb93ff93773fa',
        timelock: 12,
        filled_amount: '49850',
        asset_price: 110175.6,
        amount: '49850',
        secret_hash:
          'd2b7ef5712fe175bec366989eb4a087b00969764ddd3e12b21a76e9c2d821827',
        secret: '',
        initiate_tx_hash:
          '087ad8bc77ff77d0046de51a4da0c1f08a6535ff4faa9e2c4c6a631cddf1cee8:99624',
        redeem_tx_hash: '',
        refund_tx_hash:
          '9fd97ac3a6f986cd6c795ce934d632f7fac81966fe928e8e48aab1e4e607bd3d',
        initiate_block_number: '99624',
        redeem_block_number: '0',
        refund_block_number: '99637',
        required_confirmations: 0,
        current_confirmations: 0,
        initiate_timestamp: '2025-08-29T11:31:12Z',
        redeem_timestamp: null,
        refund_timestamp: '2025-08-29T13:51:20Z',
      },
      nonce: '1756466295149',
      order_id:
        '1922bb9657818cc82931bb8de4fd3cc11c646faf9df9cf7dd436bd4af174ca38',
      affiliate_fees: [],
      version: 'v3',
    } as any;

    const res = await relayer.initiate(order);
    console.log('res :', res.val);
    if (res.error) console.log('res.error :', res.error);
    expect(res.ok).toBeTruthy();
  });
});
