import { Network, payments } from 'bitcoinjs-lib';
import { IBaseWallet } from './baseWallet';
import {
  BitcoinNetwork,
  IBitcoinProvider,
  Urgency,
} from '../provider/provider.interface';
import { AddSignature, SigHashType } from '../sig';
/**
 * @interface IBitcoinWallet
 */
export interface IBitcoinWallet extends IBaseWallet {
  /**
   * @returns {Promise<number>} Balance held by the wallet in satoshis.
   */
  getBalance(): Promise<number>;
  /**
   * @returns {Promise<string>} Public key of the wallet
   */
  getPublicKey(): string;
  /**
   * @returns {Promise<Network>} Network of the wallet provided during initialization
   */
  getNetwork(): Promise<Network>;
  /**
   * @returns {Promise<IBitcoinProvider>} Provider of the wallet that gives read only access to the mempool
   */
  getProvider(): Promise<IBitcoinProvider>;
  /**
   * Fee for a transaction according to the urgency
   *
   * @param {number} amount - in satoshis
   * @param {Urgency} urgency - urgency of the fee
   * @returns {Promise<number>} Fee suggested by the provider
   */
  suggestFee(amount: number, urgency: Urgency): Promise<number>;

  signSchnorr(buf: Buffer): Promise<Buffer>;
  /**
   * Sends bitcoins to a recipient
   *
   * @param {string} toAddress - Address of the recipient
   * @param {number} amt - in satoshis
   * @param {number} [fee]
   * @returns {Promise<string>} Tx id of the sent transaction
   */
  send(toAddress: string, amt: number, fee?: number): Promise<string>;
  /**
   * Spends bitcoin from a script to a given address.
   *
   * @param {Buffer} script - The locking script
   * @param {Buffer[]} witness - The witnesses
   * @param {string} [toAddress] - The address of the recipient. If not provided then the wallet address is used as the recipient.
   * @param {number} [nSequence] - The sequence number
   * @returns {Promise<string>} Transaction ID
   */
  spend(
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

  /**
   * @returns {BitcoinWalletConfig}
   */
  walletConfig(): BitcoinWalletConfig;

  addSignatureSegwitV0(type?: SigHashType): AddSignature;

  addSignatureP2sh(type?: SigHashType): AddSignature;

  addSignatureSegwitV1(type?: SigHashType): AddSignature;
}

/**
 * @typedef {Object} BitcoinWalletConfig
 *
 * @property {Network} network - The network of the wallet
 * @property {string} path - The derivation path
 */
export type BitcoinWalletConfig = {
  network: BitcoinNetwork;
  path: string;
  //TODO: Make this required and use AddressType
  addressType?: string;
};
