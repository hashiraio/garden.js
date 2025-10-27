import { BitcoinWallet } from './wallet';
import * as bitcoin from 'bitcoinjs-lib';
import { mnemonicToPrivateKey } from '../utils';
import { generateMnemonic } from 'bip39';
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { sha256 } from 'viem';
import { describe } from 'node:test';
import { expect, it } from 'vitest';
import { BitcoinNetwork } from '../provider/provider.interface';
import { BitcoinProvider } from '../provider/provider';
import { BitcoinPaths } from '../paths';
import { getScript, getSignerFromPk, regTestUtils } from '../../testUtils';
import { BWErrors } from '../errors';
import { loadTestConfig } from '../../../../../../test-config-loader';

describe.only('BitcoinWallet', () => {
  console.log(
    'TO RUN THIS TEST SUITE, YOU MUST HAVE A REGTEST INDEXER RUNNING ON PORT 30000',
  );
  const config = loadTestConfig();
  const mnemonic = config.BITCOIN_MNEMONIC || generateMnemonic();
  const network = BitcoinNetwork.Regtest;
  const provider = new BitcoinProvider(network, 'http://localhost:30000');
  const bitcoinWallet = BitcoinWallet.fromMnemonic(mnemonic, provider);

  const privateKey = config.BITCOIN_PRIVATE_KEY;

  const randomAddress = 'bcrt1qgq57nkntck34snuwlxj7fffyutezuuz7xr56rq';

  it('generate unsigned psbt', async () => {
    try {
      const _provider = await provider.getBalance(
        'bc1qgyq7vfqc8wg855qey5mar3d0zkz27p43zklp54',
      );
      console.log('_provider :', _provider);
    } catch (error) {
      console.log('error :', error);
    }
    const psbt = await BitcoinWallet.generateUnsignedPSBT(
      provider,
      bitcoin.networks.bitcoin,
      'bc1qgyq7vfqc8wg855qey5mar3d0zkz27p43zklp54',
      'bc1pqx4petqw4gfrzs7qfcyle95xsn7w39ukmtyy95zfytcldjztf0tqhe7rsj',
      1234,
    );
    console.log('psbt :', psbt);
  });

  it(
    'send funds via p2pkh address',
    async () => {
      const p2pkhWallet = BitcoinWallet.fromPrivateKey(privateKey, provider, {
        pkType: 'p2pkh',
        pkPath: BitcoinPaths.bip44(network),
      });

      const address = await p2pkhWallet.getAddress();
      await regTestUtils.fund(address, provider);

      const balance = await p2pkhWallet.getBalance();
      expect(balance).toBeGreaterThan(0);

      const sendAmount = 10000;
      const fee = 5000;

      const txHash = await p2pkhWallet.send(address, sendAmount, fee);
      expect(txHash).toBeDefined();

      const tx = await provider.getTransaction(txHash);
      expect(tx).toBeDefined();
      expect(tx.vout[0].value).toEqual(sendAmount);
      expect(tx.vout[0].scriptpubkey_address).toEqual(address);
    },
    10 * 1000,
  );

  it(
    'send funds via p2wpkh address',
    async () => {
      const p2wpkhWallet = BitcoinWallet.fromPrivateKey(privateKey, provider, {
        pkType: 'p2wpkh',
        pkPath: BitcoinPaths.bip84(network),
      });

      const address = await p2wpkhWallet.getAddress();
      await regTestUtils.fund(address, provider);

      const balance = await p2wpkhWallet.getBalance();
      expect(balance).toBeGreaterThan(0);

      const sendAmount = 10000;
      const fee = 5000;

      const txHash = await p2wpkhWallet.send(address, sendAmount, fee);
      expect(txHash).toBeDefined();

      const tx = await provider.getTransaction(txHash);
      expect(tx).toBeDefined();
      expect(tx.vout[0].value).toEqual(sendAmount);
      expect(tx.vout[0].scriptpubkey_address).toEqual(address);
    },
    10 * 1000,
  );

  it(
    'send funds via p2wpkh-p2sh address',
    async () => {
      const p2wpkhP2sh = BitcoinWallet.fromPrivateKey(privateKey, provider, {
        pkType: 'p2wpkh-p2sh',
        pkPath: BitcoinPaths.bip49(network),
      });

      const address = await p2wpkhP2sh.getAddress();

      await regTestUtils.fund(address, provider);

      const balance = await p2wpkhP2sh.getBalance();
      expect(balance).toBeGreaterThan(0);

      const sendAmount = 10000;
      const fee = 5000;

      const txHash = await p2wpkhP2sh.send(address, sendAmount, fee);
      expect(txHash).toBeDefined();
      const tx = await provider.getTransaction(txHash);
      expect(tx).toBeDefined();
      expect(tx.vout[0].value).toEqual(sendAmount);
      expect(tx.vout[0].scriptpubkey_address).toEqual(address);
    },
    10 * 1000,
  );

  it('should be able to get the address', async () => {
    const address = await bitcoinWallet.getAddress();
    expect(address).toBeDefined();
    expect(address.startsWith('bc')).toBeTruthy();
  });

  it('should be able to get the provider network', async () => {
    const provider = await bitcoinWallet.getNetwork();
    expect(provider).toEqual(bitcoin.networks.regtest);
  });

  it('should be able to return the correct signer', async () => {
    const pk = mnemonicToPrivateKey(mnemonic, network, {
      path: `m/84'/1'/0'/0/1`,
    });
    const newBitcoinOTA = BitcoinWallet.fromMnemonic(mnemonic, provider, {
      index: 1,
    });
    const signer = await getSignerFromPk(pk, bitcoin.networks.regtest);
    const msg = sha256('0xabcd');

    const signedMessage = await newBitcoinOTA.sign(msg);

    expect(signedMessage).toEqual(
      signer.sign(Buffer.from(msg.slice(2), 'hex')).toString('hex'),
    );
  });

  it('should be able to return the public key', async () => {
    const pubkey = await bitcoinWallet.getPublicKey();

    expect(pubkey.length).toEqual(66);
  });

  it(
    'should not send funds if fee is greater than the amount to be sent',
    async () => {
      await regTestUtils.fund(
        await bitcoinWallet.getAddress(),
        await bitcoinWallet.getProvider(),
      );

      expect(async () =>
        bitcoinWallet.send(randomAddress, 1000),
      ).rejects.toThrow();
    },
    10 * 1000,
  );

  it(
    'should not sends if fee is less than the minimum amount (1000 sats)',
    async () => {
      await regTestUtils.fund(
        await bitcoinWallet.getAddress(),
        await bitcoinWallet.getProvider(),
      );
      expect(async () =>
        bitcoinWallet.send(randomAddress, 999, 1),
      ).rejects.toThrow(BWErrors.MIN_AMOUNT(1000));
    },
    10 * 1000,
  );

  it(
    'should be able to spend from a script(p2wsh & p2sh)',
    async () => {
      const wallet = BitcoinWallet.fromPrivateKey(privateKey, provider, {
        pkType: 'p2pkh',
        pkPath: BitcoinPaths.bip44(network),
      });

      await regTestUtils.fund(await wallet.getAddress(), provider);
      const sendAmount = 15000;
      const fee = 5000;
      const { script, address } = getScript(bitcoin.networks.regtest, 'p2wsh');
      const balance = await provider.getBalance(address);

      if (balance < sendAmount) {
        const tx = await wallet.send(address, sendAmount);
        expect(tx).toBeDefined();
        await regTestUtils.mine(10, provider);
      }
      const tx = await wallet.spend(script, address, {
        witness: [
          wallet.addSignatureSegwitV0(),
          Buffer.from(await wallet.getPublicKey(), 'hex'),
          bitcoin.script.number.encode(1),
          bitcoin.script.number.encode(3),
          script,
        ],
        toAddress: randomAddress,
        fee,
      });
      expect(tx).toBeDefined();
      await regTestUtils.mine(1, provider);

      const txDetails = await provider.getTransaction(tx);
      expect(txDetails).toBeDefined();
      expect(txDetails.vout[0].value).toEqual(sendAmount - fee);
      expect(txDetails.vout[0].scriptpubkey_address).toEqual(randomAddress);
      // p2sh
      {
        const { script, address } = getScript(bitcoin.networks.regtest, 'p2sh');

        const balance = await provider.getBalance(address);
        if (balance < sendAmount) {
          const tx = await wallet.send(address, sendAmount);
          expect(tx).toBeDefined();
          await regTestUtils.mine(1, provider);
        }

        const tx = await wallet.spend(script, address, {
          toAddress: randomAddress,
          unlockScript: [
            wallet.addSignatureP2sh(),
            Buffer.from(await wallet.getPublicKey(), 'hex'),
            bitcoin.script.number.encode(1),
            bitcoin.script.number.encode(3),
            script,
          ],
          fee,
        });
        expect(tx).toBeDefined();

        await regTestUtils.mine(1, provider);

        const txDetails = await provider.getTransaction(tx);
        expect(txDetails).toBeDefined();
        expect(txDetails.vout[0].value).toEqual(sendAmount - fee);
        expect(txDetails.vout[0].scriptpubkey_address).toEqual(randomAddress);
      }
    },
    30 * 1000,
  );

  it('should be able to create wallet from wif', async () => {
    const signer = ECPairFactory(ecc).fromPrivateKey(
      Buffer.from(privateKey, 'hex'),
      {
        network: await bitcoinWallet.getNetwork(),
      },
    );
    const wif = signer.toWIF();
    const walletFromWif = BitcoinWallet.fromWIF(wif, provider);
    const address = await walletFromWif.getAddress();

    expect(address).toBeDefined();

    const walletFromPk = BitcoinWallet.fromPrivateKey(privateKey, provider);
    expect(await walletFromPk.getAddress()).toEqual(address);
  });

  it('should be able to create a random wallet', async () => {
    const randomWallet = BitcoinWallet.createRandom(provider);
    const address = await randomWallet.getAddress();
    expect(address).toBeDefined();
  });

  it('should throw an error if the script is not funded', async () => {
    const { script, address } = getScript(bitcoin.networks.regtest, 'p2wsh');

    expect(
      async () =>
        await bitcoinWallet.spend(script, address, {
          witness: [
            bitcoin.script.number.encode(1),
            bitcoin.script.number.encode(3),
            script,
          ],
          toAddress: randomAddress,
        }),
    ).rejects.toThrow(BWErrors.SCRIPT_NOT_FUNDED);
  });
});
