import { describe, expect, it } from 'vitest';
import { generateInternalkey } from './internalKey';
import { BitcoinHTLC } from './bitcoinHtlc';
import { IBitcoinWallet } from './wallet/wallet.interface';

describe('htlc', () => {
  it('log internal pubKey', () => {
    const internalPubkey = generateInternalkey();
    console.log('internalPubkey :', internalPubkey.toString('hex'));
    expect(internalPubkey).toBeTruthy();
  });

  it('test', async () => {
    const test = await BitcoinHTLC.from(
      {} as IBitcoinWallet,
      99000,
      '3a728f1df9c9971c7fb5c586d2b919f297b21852a46f14a161c33afc4bddb0f8',
      'bcd6f4cfa96358c74dbc03fec5ba25da66bbc92a31b714ce339dd93db1a9ffac',
      'bc9a1ea94f786d05e42256eb76e24e426d8ad48ca671164ff96ac7e4c57678a7',
      5,
    );
    console.log('test.id', test.id());
    expect(true).toBe(true);
  });
});
