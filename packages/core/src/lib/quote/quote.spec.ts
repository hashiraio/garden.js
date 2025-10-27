import { Assets } from '@gardenfi/orderbook';
import { Quote } from './quote';
import { describe, expect, it } from 'vitest';

describe('quote', () => {
  const quoteUrl = 'https://api.garden.finance';
  const quote = new Quote(quoteUrl);

  it('should get quote for evm-strk', async () => {
    const res = await quote.getQuote('ethereum:wbtc', 'unichain:usdc', 500000);
    console.log('quote :', res.val?.[0].source);
    console.log('quote error :', res.error);
    expect(res.error).toBeUndefined();
    expect(res.val).toBeTruthy();
  });

  it('should get quote for strk-btc', async () => {
    const res = await quote.getQuote(
      'starknet:wbtc',
      'bitcoin:btc',
      500000,
      true,
    );
    console.log('quote :', res.val);
    console.log('quote error :', res.error);
    expect(res.error).toBeUndefined();
    expect(res.val).toBeTruthy();
  });

  it('should get quote for strk-evm', async () => {
    const res = await quote.getQuote(
      'starknet:wbtc',
      'bitcoin:btc',
      500000,
      false,
      {
        affiliateFee: 1000,
      },
    );
    console.log('quote :', res.val);
    console.log('quote error :', res.error);
    expect(res.error).toBeUndefined();
    expect(res.val).toBeTruthy();
  });

  it('get quote ƒrom assets', async () => {
    const res = await quote.getQuoteFromAssets({
      fromAsset: Assets.arbitrum_sepolia.WBTC,
      toAsset: Assets.bitcoin_testnet.BTC,
      amount: 100000,
      isExactOut: true,
    });
    console.log('quote :', res.val);
    expect(res.ok).toBeTruthy();
    expect(res.val).toBeTruthy();

    if (!res.ok) return;
  });

  // it('test', async () => {
  //   const res = await quote.getAttestedQuote({
  //     source_chain: 'arbitrum_localnet',
  //     destination_chain: 'ethereum_localnet',
  //     source_asset: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  //     destination_asset: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  //     initiator_source_address: '0x52FE8afbbB800a33edcbDB1ea87be2547EB30000',
  //     initiator_destination_address:
  //       '0x52FE8afbbB800a33edcbDB1ea87be2547EB30000',
  //     source_amount: '100000',
  //     destination_amount: '99990',
  //     fee: '1',
  //     nonce: '1',
  //     timelock: 14400,
  //     secret_hash:
  //       '0x7f769a74a0d00749b3995993aaa1312be285a4a2c8fa7f3d0a58f575be0cc62e',
  //     min_destination_confirmations: 3,
  //     additional_data: {
  //       strategy_id: 'alel12',
  //     },
  //   });
  //   console.log('attested quote :', res.val);
  //   if (res.error) console.log('error :', res.error);
  //   expect(res.error).toBeUndefined();
  //   expect(res.val).toBeTruthy();
  // }, 30000);

  // it('should get strategies', async () => {
  //   const res = await quote.getStrategies();
  //   console.log('strategies :', res.val);
  //   expect(res.error).toBeUndefined();
  //   expect(res.val).toBeTruthy();
  // });
});
