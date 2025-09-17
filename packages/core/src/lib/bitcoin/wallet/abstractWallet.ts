import {
  Network,
  payments,
  Transaction,
  address as bitcoinjsAddress,
  address,
  script,
} from 'bitcoinjs-lib';
import {
  BitcoinUTXO,
  IBitcoinProvider,
  Urgency,
} from '../provider/provider.interface';
import { AddSignature, SigHashType } from '../sig';
import { AtomicSwapConfig } from '../ASConfig';
import { IHTLCWallet } from '../../htlc.interface';
import { BitcoinHTLCErrors } from '../errors';
import { getHTLCScript } from '../htlcScript';
import { isErrorWithMessage, reversify } from '../../utils';
import { ScriptType } from '../script';
import { trim0x } from '@gardenfi/utils';
import { BitcoinWalletConfig, IBitcoinWallet } from './wallet.interface';
import { WalletChain } from './baseWallet';

export abstract class AbstractBitcoinWallet implements IBitcoinWallet {
  abstract getAddress(): Promise<string>;
  abstract getBalance(): Promise<number>;
  abstract sign(hexString: string): Promise<string>;
  abstract getPublicKey(): string;
  abstract getNetwork(): Promise<Network>;
  abstract getProvider(): Promise<IBitcoinProvider>;
  abstract send(toAddress: string, amt: number, fee?: number): Promise<string>;
  abstract spend(
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
  ): Promise<string>;
  abstract walletConfig(): BitcoinWalletConfig;
  abstract signSchnorr(buf: Buffer): Promise<Buffer>;

  addSignatureSegwitV0(type: SigHashType = SigHashType.ALL) {
    return new AddSignature('segwitV0', type);
  }

  addSignatureP2sh(type: SigHashType = SigHashType.ALL) {
    return new AddSignature('p2shSignature', type);
  }

  addSignatureSegwitV1(type: SigHashType = SigHashType.ALL) {
    return new AddSignature('segwitV1', type);
  }

  /**
   * Returns the chain of the wallet. It can be Bitcoin or EVM
   */
  chain(): WalletChain {
    return WalletChain.Bitcoin;
  }

  /**
   * Add all inputs to a transaction
   * @param {Transaction} tx
   * @param {string} address - The address whose UTXOs you want to include
   * @param {IBitcoinProvider} provider
   * @param {Object} opts - Optional
   * @param {BitcoinUTXO[]} opts.utxos - List of UTXOs to include in the transaction. Optional. If not provide then the UTXOs belong to the specified address will be used
   * @param {number} opts.nSequence - The sequence number. Optional
   *
   */
  async addAllInputs(
    tx: Transaction,
    address: string,
    provider: IBitcoinProvider,
    opts?: {
      utxos?: BitcoinUTXO[];
      nSequence?: number;
    },
  ) {
    const utxos = opts?.utxos || (await provider.getUTXOs(address));
    for (const utxo of utxos) {
      const txIndex = await provider.getTxIndex(utxo.txid, address);
      tx.addInput(reversify(utxo.txid), txIndex, opts?.nSequence);
    }
    return tx;
  }
  /**
   * Fee suggested by the provided
   *
   * @override
   * @param {number} amount - in satoshis
   * @param {Urgency} urgency - urgency of the fee
   * @returns {Promise<number>}
   *
   */
  async suggestFee(amount: number, urgency: Urgency): Promise<number> {
    const address = await this.getAddress();
    const provider = await this.getProvider();
    return provider.suggestFee(address, amount, urgency);
  }

  /**
   * Converts an address to its corresponding output script.
   *
   * @param {string} address - The address to convert.
   * @return {Promise<Buffer>} The output script corresponding to the address.
   *
   */
  async toOutputScript(address: string): Promise<Buffer> {
    return bitcoinjsAddress.toOutputScript(address, await this.getNetwork());
  }

  /**
   * Calculates the total value (balance) from an array of Bitcoin UTXOs.
   *
   * @param {BitcoinUTXO[]} utxos - The array of Bitcoin UTXOs.
   * @return {number} The total value of the UTXOs.
   *
   */
  totalValueFromUTXOs(utxos: BitcoinUTXO[]): number {
    return utxos.reduce((acc, utxo) => acc + utxo.value, 0);
  }

  /**
   * Converts a script to an p2wsh address.
   *
   * @param {Buffer} script - The script to convert.
   * @return {Promise<string>} The generated address.
   *
   */
  async scriptToAddress(script: Buffer): Promise<string> {
    const p2wsh = payments.p2wsh({
      redeem: {
        output: script,
      },
      network: await this.getNetwork(),
    });
    if (!p2wsh.address) throw new Error('Could not generate p2wsh address');
    return p2wsh.address;
  }

  /**
   * Creates an HTLC wallet.
   *
   * @param {AtomicSwapConfig} swapConfig - The swap configuration for the HTLC wallet.
   * @returns {Promise<IHTLCWallet>}
   *
   */
  async newSwap(swapConfig: AtomicSwapConfig): Promise<IHTLCWallet> {
    swapConfig.secretHash = trim0x(swapConfig.secretHash);
    if (swapConfig.secretHash.length !== 64) {
      throw new Error(BitcoinHTLCErrors.INVALID_SECRET_HASH);
    }
    const { script, address } = getHTLCScript(
      swapConfig,
      await this.getNetwork(),
    );
    return new BitcoinHTLC(this, {
      ...swapConfig,
      redeemScript: script,
      scriptAddress: address,
    });
  }
  /**
   * Given a script address and network, returns the type of the script.
   *
   * @returns {ScriptType} The type of the script (P2SH, P2WSH, P2TR)
   */
  getScriptType(scriptAddress: string, network: Network): ScriptType {
    try {
      const scriptPubkey = address.fromBase58Check(scriptAddress).version;
      if (scriptPubkey === network.scriptHash) {
        return ScriptType.P2SH;
      }
    } catch (error) {
      const data = address.fromBech32(scriptAddress);
      if (data.prefix !== network.bech32) {
        throw new Error('Invalid address');
      }

      if (data.version === 0) {
        // segwit v0
        if (data.data.length === 32) {
          return ScriptType.P2WSH;
        }
      } else if (data.version === 1 && data.data.length === 32) {
        // taproot
        return ScriptType.P2TR;
      }
    }
    throw new Error('Unsupported script type');
  }
}

type AtomicSwap = AtomicSwapConfig & {
  redeemScript: Buffer;
  scriptAddress: string;
};

export class BitcoinHTLC implements IHTLCWallet {
  private readonly wallet: IBitcoinWallet;
  private readonly swap: AtomicSwap;

  /**
   * @constructor
   * @param {IBitcoinWallet} wallet
   * @param {AtomicSwap} swap - Atomic swap config
   *
   */
  constructor(wallet: IBitcoinWallet, swap: AtomicSwap) {
    swap.secretHash = trim0x(swap.secretHash);
    if (swap.secretHash.length !== 64) {
      throw new Error(BitcoinHTLCErrors.INVALID_SECRET_HASH);
    }
    this.wallet = wallet;
    this.swap = swap;
  }

  /**
   * Returns the script address
   *
   * @returns {string}
   *
   */

  id(): string {
    return this.swap.scriptAddress;
  }

  /**
   * Initiate the HTLC by sending bitcoin to the HTLC script
   *
   * @returns {Promise<string>} Transaction ID
   *
   */
  async init(): Promise<string> {
    return this.wallet.send(
      this.swap.scriptAddress,
      +this.swap.amount.toString(),
    );
  }

  /**
   * Redeems the HTLC by spending all bitcoin from the given script.
   *
   * @param {string} secret - The secret for the atomic swap
   * @param {string} [receiver] - The address of the receiver. If not provided then the wallet address is used as the receiver.
   *
   * @returns {Promise<string>} Transaction ID
   *
   */
  async redeem(secret: string, receiver?: string): Promise<string> {
    secret = trim0x(secret);
    const witness = [
      this.wallet.addSignatureSegwitV0(),
      Buffer.from(await this.wallet.getPublicKey(), 'hex'),
      Buffer.from(secret, 'hex'),
      script.number.encode(0x01),
      this.swap.redeemScript,
    ];

    const scriptAddress = payments.p2wsh({
      redeem: {
        output: this.swap.redeemScript,
      },
      network: await this.wallet.getNetwork(),
    }).address;

    if (!scriptAddress)
      throw new Error('Could not generate p2wsh address for redeem script');

    try {
      return await this.wallet.spend(this.swap.redeemScript, scriptAddress, {
        witness,
        toAddress: receiver,
      });
    } catch (err) {
      if (isErrorWithMessage(err)) {
        if (err.message.includes('OP_EQUALVERIFY')) {
          throw new Error(BitcoinHTLCErrors.INVALID_PUBKEY_OR_SECRET);
        }
        throw new Error(err.message);
      }
      throw new Error(String(err));
    }
  }

  /**
   * Refunds the HTLC by spending all bitcoin from the given script.
   *
   * @param {string} [receiver] - The address of the receiver. If not provided then the wallet address is used as the receiver.
   * @returns {Promise<string>} Transaction ID
   *
   */
  async refund(receiver?: string): Promise<string> {
    const witness = [
      this.wallet.addSignatureSegwitV0(),
      Buffer.from(await this.wallet.getPublicKey(), 'hex'),
      script.number.encode(0), //OP_FALSE
      this.swap.redeemScript,
    ];
    try {
      const scriptAddress = payments.p2wsh({
        redeem: {
          output: this.swap.redeemScript,
        },
        network: await this.wallet.getNetwork(),
      }).address;

      if (!scriptAddress)
        throw new Error('Could not generate p2wsh address for refund script');

      return await this.wallet.spend(this.swap.redeemScript, scriptAddress, {
        toAddress: receiver,
        witness,
        nSequence: this.swap.expiryBlocks,
      });
    } catch (err) {
      if (isErrorWithMessage(err)) {
        if (err.message.includes('OP_EQUALVERIFY')) {
          throw new Error(BitcoinHTLCErrors.INVALID_PUBKEY);
        } else if (err.message.includes('BIP')) {
          throw new Error(BitcoinHTLCErrors.ORDER_NOT_EXPIRED);
        }
        throw new Error(err.message);
      }
      throw new Error(String(err));
    }
  }
}
