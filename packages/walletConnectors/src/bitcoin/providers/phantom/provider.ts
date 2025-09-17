import { Connect, IInjectedBitcoinProvider } from '../../bitcoin.types';
import { PhantomBitcoinProvider } from './phantom.types';
import * as bitcoin from 'bitcoinjs-lib';
import { initEccLib } from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import {
  AsyncResult,
  Err,
  executeWithTryCatch,
  Network,
  Ok,
} from '@gardenfi/utils';
import { WALLET_CONFIG } from './../../constants';
import { BitcoinProvider, BitcoinWallet } from '@gardenfi/core';
import { getBalance } from '../../utils';

initEccLib(ecc);

export class PhantomProvider implements IInjectedBitcoinProvider {
  #phantomProvider: PhantomBitcoinProvider;
  public address: string = '';
  public id = WALLET_CONFIG.Phantom.id;
  public name = WALLET_CONFIG.Phantom.name;
  public icon = WALLET_CONFIG.Phantom.icon;

  constructor(phantomProvider: PhantomBitcoinProvider) {
    this.#phantomProvider = phantomProvider;
  }

  async connect(network?: Network): AsyncResult<Connect, string> {
    if (!network) network = Network.MAINNET;
    if (network === Network.TESTNET)
      return Err('Phantom wallet does not support testnet');

    try {
      const accounts = await this.#phantomProvider.requestAccounts();
      for (const account of accounts) {
        if (account.purpose === 'payment') this.address = account.address;
      }
      if (this.address === '')
        return Err('Could not connect to Phantom bitcoin payment account');

      return Ok({
        address: this.address,
        provider: this,
        network: network,
        id: WALLET_CONFIG.Phantom.id,
      });
    } catch (error) {
      return Err('Error while connecting to Phantom wallet: ' + error);
    }
  }

  async requestAccounts() {
    return await executeWithTryCatch(async () => {
      const accounts = await this.#phantomProvider.requestAccounts();
      if (accounts.length > 0) {
        this.address = accounts[0].address;
      }
      return accounts.map((account) => account.address);
    }, 'Error while requesting accounts from Phantom wallet');
  }

  async getAccounts(): AsyncResult<string[], string> {
    return this.requestAccounts();
  }

  // bitcoin testnet is not supported in Phantom wallet
  async getNetwork() {
    return Ok(Network.MAINNET);
  }

  async switchNetwork(): AsyncResult<Network, string> {
    return Err('Phantom wallet does not support testnet');
  }

  async getBalance(): AsyncResult<
    { confirmed: number; unconfirmed: number; total: number },
    string
  > {
    return await executeWithTryCatch(async () => {
      const balance = await getBalance(this.address, Network.MAINNET);
      if (balance.ok && balance.val) {
        return balance.val;
      }
      throw new Error(balance.error);
    }, 'Error while getting balance from Phantom wallet');
  }

  async sendBitcoin(
    toAddress: string,
    satoshis: number,
  ): AsyncResult<string, string> {
    return await executeWithTryCatch(async () => {
      //considering only mainnet because phantom doesn't support testnet
      const network = bitcoin.networks.bitcoin;

      const provider = new BitcoinProvider(Network.MAINNET);
      try {
        const { txHex, utxoCount } = await BitcoinWallet.generateUnsignedPSBT(
          provider,
          network,
          this.address,
          toAddress,
          satoshis,
        );

        const signedPsbtBytes = await this.#phantomProvider.signPSBT(
          this.fromHexString(txHex),
          {
            inputsToSign: [
              {
                address: this.address,
                signingIndexes: Array.from({ length: utxoCount }, (_, i) => i),
                sigHash: bitcoin.Transaction.SIGHASH_ALL,
              },
            ],
          },
        );
        const signedPsbt = bitcoin.Psbt.fromBuffer(
          Buffer.from(signedPsbtBytes),
        );
        signedPsbt.finalizeAllInputs();
        const tx = signedPsbt.extractTransaction();
        console.log('tx', tx);
        const txId = tx.getId();

        await provider.broadcast(tx.toHex());

        return txId;
      } catch (error) {
        throw new Error(`Failed to send bitcoin: ${error}`);
      }
    }, 'Error while sending bitcoin from Phantom wallet');
  }

  private fromHexString(hexString: string): Uint8Array {
    return Uint8Array.from(
      hexString.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
    );
  }

  on(event: string, callback: (data: any) => void): void {
    this.#phantomProvider.on(event, callback);
  }

  off(event: string, callback: (data: any) => void): void {
    this.#phantomProvider.off(event, callback);
  }

  disconnect = (): AsyncResult<string, string> => {
    this.address = '';
    return Promise.resolve(Ok('Disconnected Phantom wallet'));
  };
}
