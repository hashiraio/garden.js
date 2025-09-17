import {
  initEccLib,
  networks,
  payments,
  Transaction,
  script as bitcoinjsScript,
  Psbt,
} from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { IBitcoinProvider, Urgency } from '../provider/provider.interface';
import { AddressType } from '../interface';
import { AbstractBitcoinWallet } from './abstractWallet';
import { ECPairFactory, ECPairInterface } from 'ecpair';
import { getBitcoinNetwork, mnemonicToPrivateKey } from '../utils';
import { BitcoinPaths } from '../paths';
import { BitcoinWalletConfig } from './wallet.interface';
import { AddSignature } from '../sig';
import { BWErrors } from '../errors';
import { ScriptType } from '../script';
import { reversify } from '../../../lib/utils';

export type BitcoinWalletOpts = {
  privateKey: string;
  provider: IBitcoinProvider;
  pkPath: string;
  pkType: AddressType;
};

initEccLib(ecc);
export class BitcoinWallet extends AbstractBitcoinWallet {
  private readonly provider: IBitcoinProvider;
  private signer: ECPairInterface;
  private readonly minAmt = 1000;
  private readonly network: networks.Network;
  private pkType: AddressType;
  private readonly path: string;

  /**
   * @constructor
   * @param {BitcoinWalletOpts} opts
   * @param {string} opts.privateKey
   * @param {IBitcoinProvider} opts.provider
   * @param {number} opts.pkIndex - The address_index as per BIP44
   */
  constructor({ privateKey, provider, pkPath, pkType }: BitcoinWalletOpts) {
    const ECPair = ECPairFactory(ecc);
    const network = getBitcoinNetwork(provider.getNetwork());
    const buf = Buffer.from(privateKey, 'hex');
    if (buf.length === 0) {
      throw new Error('invalid private key');
    }
    super();
    this.path = pkPath || '';
    this.pkType = pkType;
    this.signer = ECPair.fromPrivateKey(buf, {
      network: network,
    });
    this.provider = provider;
    this.network = network;
  }

  /**
   * @deprecated
   * Switch to `fromPrivateKey` if you have the private key
   * else use multi-key wallet's `fromMnemonic`
   */
  static fromMnemonic(
    mnemonic: string,
    provider: IBitcoinProvider,
    opts?: {
      index: number;
    },
  ): BitcoinWallet {
    const path = BitcoinPaths.bip84(provider.getNetwork(), opts?.index);
    const privateKey = mnemonicToPrivateKey(mnemonic, provider.getNetwork(), {
      path,
    });
    return new BitcoinWallet({
      privateKey,
      provider,
      pkType: AddressType.p2wpkh,
      pkPath: path,
    });
  }

  /**
   * Initiates a Bitcoin wallet from a private key
   *
   * @param {string} privateKey - The private key
   * @param {IBitcoinProvider} provider - The Bitcoin provider
   *
   * Note: Make sure to pass the pkType if you want to use a specific address type (p2wpkh(segwit), p2sh-p2wpkh, p2pkh(legacy))
   */
  static fromPrivateKey(
    privateKey: string,
    provider: IBitcoinProvider,
    opts?: {
      /**
       * The address type - p2wpkh (segwit), p2sh-p2wpkh, p2pkh(legacy)
       */
      pkType?: AddressType;
      pkPath?: string;
    },
  ): BitcoinWallet {
    return new BitcoinWallet({
      privateKey,
      provider,
      pkType: opts?.pkType ?? AddressType.p2wpkh,
      pkPath: opts?.pkPath ?? 'unknown',
    });
  }

  /**
   * Creates a random Bitcoin wallet
   */
  static createRandom(provider: IBitcoinProvider): BitcoinWallet {
    const ECPair = ECPairFactory(ecc);
    const network = getBitcoinNetwork(provider.getNetwork());
    const keyPair = ECPair.makeRandom({ network });
    if (!keyPair.privateKey) throw new Error('Failed to create random key');
    return new BitcoinWallet({
      privateKey: keyPair.privateKey.toString('hex'),
      provider,
      pkType: AddressType.p2wpkh,
      pkPath: 'unknown',
    });
  }

  static fromWIF(
    wif: string,
    provider: IBitcoinProvider,
    opts?: { pkType?: AddressType; pkPath?: string },
  ): BitcoinWallet {
    const ECPair = ECPairFactory(ecc);
    const network = getBitcoinNetwork(provider.getNetwork());
    const keyPair = ECPair.fromWIF(wif, network);
    if (!keyPair.privateKey) {
      throw new Error('Invalid WIF');
    }

    return BitcoinWallet.fromPrivateKey(
      keyPair.privateKey.toString('hex'),
      provider,
      opts,
    );
  }

  /**
   * @override
   * @returns {Promise<BitcoinWalletConfig>} Bitcoin wallet config including network, derivation path, and index
   */
  override walletConfig(): BitcoinWalletConfig {
    return {
      network: this.provider.getNetwork(),
      path: this.path,
      addressType: this.pkType,
    };
  }

  /**
   * Spends bitcoin from a script to a given address.
   *
   * @param {Buffer} script - The locking script
   * @param {string} scriptAddress - The address of the script
   * @param {Object} opts - The options
   * @param {string} [opts.toAddress] - The address of the recipient. If not provided then the wallet address is used as the recipient.
   * @param {number} [opts.fee] - The fee
   * @param {number} [opts.nSequence] - The sequence number
   * @param {Buffer[]} [opts.unlockScript] - The unlock script. Required for p2sh
   * @param {Buffer[]} [opts.witness] - The witness. Required for p2wsh, p2tr
   * @returns {Promise<string>} Transaction ID
   */
  async spend(
    script: Buffer,
    scriptAddress: string,
    {
      toAddress,
      fee,
      nSequence,
      unlockScript, // only for p2sh
      witness, // only for p2wsh, p2tr
    }: {
      toAddress?: string;
      fee?: number;
      nSequence?: number;
      witness?: (Buffer | AddSignature)[];
      unlockScript?: (payments.StackElement | AddSignature)[];
    },
  ): Promise<string> {
    const type = this.getScriptType(scriptAddress, this.network);
    const amount = await this.provider.getBalance(scriptAddress);
    if (amount === 0) {
      throw new Error(BWErrors.SCRIPT_NOT_FUNDED);
    }

    let tx = new Transaction();
    tx.version = 2;

    fee ??= await this.provider.suggestFee(scriptAddress, amount, Urgency.FAST);
    if (fee > amount) {
      throw new Error(BWErrors.FEE_EXCEEDS_AMOUNT(fee, amount));
    }

    const utxos = await this.provider.getUTXOs(scriptAddress);

    tx = await this.addAllInputs(tx, scriptAddress, this.provider, {
      nSequence,
      utxos,
    });

    tx.addOutput(
      await this.toOutputScript(toAddress ?? (await this.getAddress())),
      amount - fee,
    );

    for (let index = 0; index < tx.ins.length; index++) {
      if (type === ScriptType.P2SH) {
        if (!unlockScript) {
          throw new Error('Unlock script is required for p2sh');
        }
        const finalStackElements: payments.StackElement[] = [];
        for (const ele of unlockScript) {
          if (ele instanceof AddSignature) {
            const hashType = ele.sigHashType;
            const signatureHash = tx.hashForSignature(index, script, hashType);
            finalStackElements.push(
              bitcoinjsScript.signature.encode(
                Buffer.from(
                  await this.sign(signatureHash.toString('hex')),
                  'hex',
                ),
                hashType,
              ),
            );
          } else {
            finalStackElements.push(ele);
          }
        }

        const redeemScriptSig = payments.p2sh({
          redeem: {
            input: bitcoinjsScript.compile(finalStackElements),
            output: script,
          },
          network: this.network,
        }).redeem?.input;
        tx.setInputScript(index, redeemScriptSig!);
      } else if (type === ScriptType.P2WSH) {
        if (!witness) {
          throw new Error('Witness is required for p2wsh');
        }

        const finalWitness: Buffer[] = [];
        for (const w of witness) {
          if (w instanceof AddSignature) {
            const hashType = w.sigHashType;
            const signatureHash = tx.hashForWitnessV0(
              index,
              script,
              utxos[index].value,
              hashType,
            );
            finalWitness.push(
              bitcoinjsScript.signature.encode(
                Buffer.from(
                  await this.sign(signatureHash.toString('hex')),
                  'hex',
                ),
                hashType,
              ),
            );
          } else {
            finalWitness.push(w);
          }
        }

        tx.setWitness(index, finalWitness);
      } else {
        throw new Error('Invalid script type ' + type);
      }
    }

    return this.provider.broadcast(tx.toHex());
  }

  /**
   * Returns the address of the wallet
   * @returns {Promise<string>}
   */
  async getAddress(): Promise<string> {
    if (this.pkType === AddressType['p2wpkh-p2sh']) {
      const { address } = payments.p2sh({
        redeem: payments.p2wpkh({
          pubkey: this.signer.publicKey,
          network: this.network,
        }),
        network: this.network,
      });
      if (!address) {
        throw new Error('failed to get the p2wpkh-p2sh address');
      }
      return address;
    }

    const { address } = payments[this.pkType]({
      pubkey: this.signer.publicKey,
      network: this.network,
    });
    if (!address) {
      throw new Error('failed to get the p2wpkh address');
    }
    return address;
  }

  override getProvider(): Promise<IBitcoinProvider> {
    return Promise.resolve(this.provider);
  }

  async getBalance(): Promise<number> {
    return this.provider.getBalance(await this.getAddress());
  }

  getPublicKey(): string {
    return this.signer.publicKey.toString('hex');
  }

  override getNetwork(): Promise<networks.Network> {
    return Promise.resolve(this.network);
  }

  static async generateUnsignedPSBT(
    provider: IBitcoinProvider,
    network: networks.Network,
    fromAddress: string,
    toAddress: string,
    amt: number,
    fee?: number,
  ) {
    if (!fee) fee = await provider.suggestFee(fromAddress, amt, Urgency.FAST);
    if (fee > amt) throw new Error(BWErrors.FEE_EXCEEDS_AMOUNT(fee, amt));

    const utxos = await provider.getUTXOs(fromAddress, amt + fee);

    const totalUTXOValue = utxos.reduce((acc, utxo) => acc + utxo.value, 0);

    if (totalUTXOValue < amt + fee)
      throw new Error(BWErrors.INSUFFICIENT_FUNDS(totalUTXOValue, amt + fee));

    const psbt = new Psbt({ network });
    for (const utxo of utxos) {
      const hex = await provider.getTransactionHex(utxo.txid);

      psbt.addInput({
        hash: reversify(utxo.txid),
        index: utxo.vout,
        nonWitnessUtxo: Buffer.from(hex, 'hex'),
      });
    }
    const change = totalUTXOValue - amt - fee;
    psbt.addOutput({
      address: toAddress,
      value: amt,
    });

    // ignore change if it is less than 546 satoshis (dust)
    if (change > 546) {
      psbt.addOutput({
        address: fromAddress,
        value: change,
      });
    }

    return { txHex: psbt.toHex(), utxoCount: utxos.length };
  }

  private async _send(toAddress: string, amt: number, fee?: number) {
    if (!fee) {
      fee = await this.provider.suggestFee(
        await this.getAddress(),
        amt,
        Urgency.FAST,
      );
    }
    if (fee > amt) throw new Error(BWErrors.FEE_EXCEEDS_AMOUNT(fee, amt));
    else if (amt < this.minAmt) {
      throw new Error(BWErrors.MIN_AMOUNT(this.minAmt));
    }

    const fromAddress = await this.getAddress();
    const utxos = await this.provider.getUTXOs(fromAddress, amt + fee);

    const totalUTXOValue = utxos.reduce((acc, utxo) => acc + utxo.value, 0);

    const psbt = new Psbt({ network: this.network });
    for (const utxo of utxos) {
      const hex = await this.provider.getTransactionHex(utxo.txid);
      const txDetail = await this.provider.getTransaction(utxo.txid);

      let props: any;
      if (this.pkType === AddressType['p2wpkh-p2sh']) {
        props = {
          witnessUtxo: {
            script: Buffer.from(txDetail.vout[utxo.vout].scriptpubkey, 'hex'),
            value: utxo.value,
          },
          redeemScript: payments.p2sh({
            redeem: payments.p2wpkh({
              pubkey: this.signer.publicKey,
              network: this.network,
            }),
            network: this.network,
          }).redeem?.output,
        };
      }

      psbt.addInput({
        hash: reversify(utxo.txid),
        index: utxo.vout,
        nonWitnessUtxo: Buffer.from(hex, 'hex'),
        ...props,
      });
    }
    const change = totalUTXOValue - amt - fee;
    psbt.addOutput({
      address: toAddress,
      value: amt,
    });

    if (change > 0) {
      psbt.addOutput({
        address: fromAddress,
        value: change,
      });
    }
    psbt.signAllInputs(this.signer).finalizeAllInputs();
    return psbt.extractTransaction().toHex();
  }

  async send(toAddress: string, amt: number, fee?: number): Promise<string> {
    const tx = await this._send(toAddress, amt, fee);
    return this.provider.broadcast(tx);
  }

  async sign(hexMsg: string): Promise<string> {
    hexMsg = hexMsg.startsWith('0x') ? hexMsg.slice(2) : hexMsg;
    return this.signer.sign(Buffer.from(hexMsg, 'hex')).toString('hex');
  }

  override async signSchnorr(buf: Buffer): Promise<Buffer> {
    return this.signer.signSchnorr(buf);
  }
}
