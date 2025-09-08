import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { generateInternalkey } from './internalKey';
import { Taptree } from 'bitcoinjs-lib/src/types';
import { serializeTaprootSignature } from 'bitcoinjs-lib/src/psbt/bip371';
import { assert, generateOutputs, toXOnly } from '../utils';
import { serializeScript, sortLeaves } from '../utils';
import { htlcErrors } from '../errors';
import { BitcoinUTXO, IBitcoinProvider } from './provider/provider.interface';
import { Urgency } from './provider/provider.interface';
import { IBitcoinWallet } from './wallet/wallet.interface';
import { IBitcoinHTLC } from './bitcoinhtlc.types';
import {
  BitcoinOrderResponse,
  isBitcoin,
  isOrder,
  Order,
} from '@gardenfi/orderbook';
import { AsyncResult, Err, Ok, trim0x } from '@gardenfi/utils';

export enum Leaf {
  REFUND,
  REDEEM,
  INSTANT_REFUND,
}

export type TxType = 'redeem' | 'refund' | 'instantRefund';

export type LeafScript = {
  version: number;
  output: Buffer;
};

export type LeafTree = LeafScript | [LeafScript, LeafScript];

const LEAF_VERSION = 0xc0;

bitcoin.initEccLib(ecc);

export class BitcoinHTLC implements IBitcoinHTLC {
  /**
   * Signer of the HTLC can be either the initiator or the redeemer
   */
  private signer: IBitcoinWallet;
  private internalPubkey: Buffer;
  private network: bitcoin.networks.Network;

  /**
   * Note: redeemerAddress and initiatorAddress should be x-only public key without 02 or 03 prefix
   */
  constructor(signer: IBitcoinWallet, network: bitcoin.networks.Network) {
    this.signer = signer;
    this.internalPubkey = generateInternalkey();
    this.network = network;
  }

  /**
   * Creates a BitcoinHTLC instance
   * @param signer Bitcoin wallet of the initiator or redeemer
   * @returns Promise<BitcoinHTLC> instance
   *
   * Note: When the signer is the initiator, only refund and instant refund can be done
   * When the signer is the redeemer, only redeem can be done
   */
  static async from(signer: IBitcoinWallet): Promise<BitcoinHTLC> {
    const network = await signer.getNetwork();
    return new BitcoinHTLC(signer, network);
  }

  /**
   * Generates a taproot address for receiving the funds
   * @param order The order object
   * @param type The type of address to generate ('redeem' | 'refund' | 'instantRefund')
   *   - 'redeem': uses destination_swap parameters (default)
   *   - 'refund': uses source_swap parameters
   *   - 'instantRefund': uses source_swap parameters with redeemer
   */
  address(order: Order, type: TxType) {
    const leaves = this.generateLeaves(order, type);
    const { address } = bitcoin.payments.p2tr({
      internalPubkey: this.internalPubkey,
      network: this.network,
      scriptTree: leaves as Taptree,
    });
    if (!address) throw new Error(htlcErrors.htlcAddressGenerationFailed);
    return address;
  }

  private async _buildRawTx(
    order: Order,
    receiver: string,
    addressType?: TxType,
    options?: {
      fee?: number;
      vSize?: number;
    },
    utxoHashes?: string[],
  ) {
    const tx = new bitcoin.Transaction();
    tx.version = 2;

    const address = this.address(order, addressType || 'redeem');
    const provider = await this.getProvider();

    let utxos: BitcoinUTXO[] = [];
    if (utxoHashes && utxoHashes.length > 0) {
      for (const utxoHash of utxoHashes) {
        const tx = await provider.getTransaction(utxoHash);
        for (let i = 0; i < tx.vout.length; i++) {
          const vout = tx.vout[i];
          if (vout.scriptpubkey_address === address) {
            utxos.push({
              txid: tx.txid,
              vout: i,
              value: vout.value,
              status: { confirmed: false },
            });
          }
        }
      }
    } else {
      utxos = await provider.getUTXOs(address);
    }

    const balance = utxos.reduce((acc, utxo) => acc + utxo.value, 0);
    if (balance === 0) throw new Error(`${address} ${htlcErrors.notFunded}`);

    for (let i = 0; i < utxos.length; i++) {
      tx.addInput(Buffer.from(utxos[i].txid, 'hex').reverse(), utxos[i].vout);
    }

    if (options?.vSize) {
      // calculate fees based on vSize
      const feeRate = await provider.getFeeRates();
      const fees = Math.ceil(feeRate.hourFee * options.vSize);
      const amountAfterFees = balance - fees;

      tx.addOutput(
        bitcoin.address.toOutputScript(receiver, this.network),
        amountAfterFees,
      );

      return { tx, usedUtxos: utxos };
    }

    const fee =
      options?.fee ??
      (await provider.suggestFee(address, balance, Urgency.MEDIUM));
    tx.addOutput(
      bitcoin.address.toOutputScript(receiver, this.network),
      balance - fee,
    );

    return { tx, usedUtxos: utxos, fee, balance };
  }

  /**
   * prevout script for the BitcoinHTLC address
   */
  private async getOutputScript(order: Order, addressType?: TxType) {
    return bitcoin.address.toOutputScript(
      this.address(order, addressType || 'redeem'),
      this.network,
    );
  }

  async initiate(
    order: Order | BitcoinOrderResponse,
    fee?: number,
  ): AsyncResult<string, string> {
    const provider = await this.getProvider();
    const address = await this.signer.getAddress();

    let to: string;
    let amount: number;

    if (isOrder(order)) {
      to = order.destination_swap.swap_id;
      amount = Number(order.destination_swap.amount);
    } else {
      to = order.to;
      amount = Number(order.amount);
    }

    if (fee === undefined) {
      fee = await provider.suggestFee(address, amount, Urgency.MEDIUM);
    }

    const txHash = await this.signer.send(to, amount, fee);
    return Ok(txHash);
  }

  async generateRedeemSACP(order: Order, secret: string, fee?: number) {
    const { tx, usedUtxos } = await this._buildRawTx(
      order,
      order.destination_swap.delegate,
      'redeem',
      { fee },
    );
    const output = await this.getOutputScript(order, 'redeem');

    const hashType =
      bitcoin.Transaction.SIGHASH_SINGLE |
      bitcoin.Transaction.SIGHASH_ANYONECANPAY;
    const redeemLeafHash = this.leafHash(Leaf.REDEEM, order);

    const values = usedUtxos.map((utxo) => utxo.value);
    const outputs = generateOutputs(output, usedUtxos.length);

    for (let i = 0; i < tx.ins.length; i++) {
      const hash = tx.hashForWitnessV1(
        i,
        outputs,
        values,
        hashType,
        redeemLeafHash,
      );

      const signature = await this.signer.signSchnorr(hash);
      tx.setWitness(i, [
        serializeTaprootSignature(signature, hashType),
        Buffer.from(secret, 'hex'),
        this.redeemLeaf(
          trim0x(order.destination_swap.secret_hash),
          toXOnly(order.destination_swap.delegate),
        ),
        await this.generateControlBlockFor(Leaf.REDEEM, order),
      ]);
    }
    return tx.toHex();
  }

  async generateInstantRefundSACP(order: Order) {
    const outputAddress = await this.getOutputScript(order, 'instantRefund');
    const {
      tx,
      usedUtxos,
      fee: txFee,
    } = await this._buildRawTx(
      order,
      order.destination_swap.delegate,
      'instantRefund',
      {
        fee: 0,
      },
    );
    tx.outs = [];
    const maxUtxoValue = Math.max(...usedUtxos.map((utxo) => utxo.value));

    usedUtxos.forEach(({ value }) => {
      tx.addOutput(
        outputAddress,
        value - (value === maxUtxoValue ? txFee ?? 0 : 0),
      );
    });

    const hashType =
      bitcoin.Transaction.SIGHASH_SINGLE |
      bitcoin.Transaction.SIGHASH_ANYONECANPAY;
    const instantRefundLeafHash = this.leafHash(Leaf.INSTANT_REFUND, order);
    const values = usedUtxos.map((utxo) => utxo.value);
    const outputs = generateOutputs(outputAddress, usedUtxos.length);
    for (let i = 0; i < tx.ins.length; i++) {
      const hash = tx.hashForWitnessV1(
        i,
        outputs,
        values,
        hashType,
        instantRefundLeafHash,
      );

      const signature = await this.signer.signSchnorr(hash);
      tx.setWitness(i, [
        // first is initiator's signature
        serializeTaprootSignature(signature, hashType),
        // second is redeemer's signature
        // this is then modified by the redeemer to include their signature
        serializeTaprootSignature(signature, hashType),
        this.instantRefundLeaf(
          toXOnly(order.source_swap.initiator),
          toXOnly(order.destination_swap.delegate),
        ),
        await this.generateControlBlockFor(Leaf.INSTANT_REFUND, order),
      ]);
    }

    return tx.toHex();
  }

  async generateInstantRefundSACPWithHash(
    hash: string[],
  ): AsyncResult<string[], string> {
    const signatures = [];
    const hashType =
      bitcoin.Transaction.SIGHASH_SINGLE |
      bitcoin.Transaction.SIGHASH_ANYONECANPAY;

    for (let i = 0; i < hash.length; i++) {
      const _hash = Buffer.from(hash[i], 'hex');

      const signature = await this.signer.signSchnorr(_hash);
      signatures.push(
        serializeTaprootSignature(signature, hashType).toString('hex'),
      );
    }
    return Ok(signatures);
  }

  /**
   * Instantly refunds the funds to the initiator given the counterparty's signatures and pubkey
   *
   * Note: If there are multiple UTXOs being spend, there should be a signature for each UTXO in counterPartySigs
   */
  async instantRefund(
    order: Order,
    counterPartySigs: { utxo: string; sig: string }[],
    fee?: number,
  ) {
    assert(counterPartySigs.length > 0, htlcErrors.noCounterpartySigs);

    const { tx, usedUtxos } = await this._buildRawTx(
      order,
      await this.signer.getAddress(),
      'instantRefund',
      { fee },
    );

    for (const utxo of usedUtxos) {
      if (!counterPartySigs.find((sig) => sig.utxo === utxo.txid)) {
        throw new Error(htlcErrors.counterPartySigNotFound(utxo.txid));
      }
    }

    const output = await this.getOutputScript(order, 'instantRefund');

    const hashType = bitcoin.Transaction.SIGHASH_DEFAULT;
    const instantRefundLeafHash = this.leafHash(Leaf.INSTANT_REFUND, order);

    const values = usedUtxos.map((utxo) => utxo.value);
    const outputs = generateOutputs(output, usedUtxos.length);

    for (let i = 0; i < tx.ins.length; i++) {
      const hash = tx.hashForWitnessV1(
        i,
        outputs,
        values,
        hashType,
        instantRefundLeafHash,
      );
      if (
        !ecc.verifySchnorr(
          hash,
          Buffer.from(toXOnly(order.destination_swap.delegate), 'hex'),
          Buffer.from(counterPartySigs[i].sig, 'hex'),
        )
      ) {
        throw new Error(
          htlcErrors.invalidCounterpartySigForUTXO(counterPartySigs[i].utxo),
        );
      }

      const signature = await this.signer.signSchnorr(hash);
      const txid = Buffer.from(tx.ins[i].hash).reverse().toString('hex');
      const counterPartySig = counterPartySigs.find((sig) => sig.utxo === txid);
      if (!counterPartySig)
        throw new Error(htlcErrors.counterPartySigNotFound(txid));

      tx.setWitness(i, [
        Buffer.from(counterPartySig.sig, 'hex'),
        signature,
        this.instantRefundLeaf(
          toXOnly(order.source_swap.initiator),
          toXOnly(order.destination_swap.delegate),
        ),
        await this.generateControlBlockFor(Leaf.INSTANT_REFUND, order),
      ]);
    }

    const provider = await this.getProvider();
    return await provider.broadcast(tx.toHex());
  }

  /**
   * Reveals the secret and redeems the HTLC
   */
  async redeem(
    order: Order,
    secret: string,
    utxoHashes?: string[],
  ): AsyncResult<string, string> {
    const redeemHex = await this.getRedeemHex(order, secret, utxoHashes);
    if (!redeemHex.ok) {
      return Err(redeemHex.error);
    }
    // broadcast the transaction
    const provider = await this.getProvider();
    const txHash = await provider.broadcast(redeemHex.val);
    return Ok(txHash);
  }

  async getRedeemHex(
    order: Order,
    secret: string,
    utxoHashes?: string[],
  ): AsyncResult<string, string> {
    assert(
      bitcoin.crypto.sha256(Buffer.from(secret, 'hex')).toString('hex') ===
        trim0x(order.destination_swap.secret_hash),
      htlcErrors.secretMismatch,
    );
    const isSourceBitcoin = isBitcoin(order.source_swap.chain);

    const reciever = isSourceBitcoin
      ? order.source_swap.redeemer
      : order.destination_swap.redeemer;

    const receiverAddress = reciever ?? (await this.signer.getAddress());

    // First build and sign tx to calculate vSize
    const { tx: tempTx, usedUtxos: utxos } = await this._buildRawTx(
      order,
      receiverAddress,
      'redeem',
      { fee: 0 },
      utxoHashes,
    );

    const redeemLeafHash = this.leafHash(Leaf.REDEEM, order);
    const values = utxos.map((utxo) => utxo.value);
    const outputs = generateOutputs(
      await this.getOutputScript(order, 'redeem'),
      utxos.length,
    );
    const hashType = bitcoin.Transaction.SIGHASH_DEFAULT;

    // Sign temp transaction to get accurate vSize
    for (let i = 0; i < tempTx.ins.length; i++) {
      const hash = tempTx.hashForWitnessV1(
        i,
        outputs,
        values,
        hashType,
        redeemLeafHash,
      );
      const signature = await this.signer.signSchnorr(hash);

      tempTx.setWitness(i, [
        signature,
        Buffer.from(secret, 'hex'),
        this.redeemLeaf(
          trim0x(order.destination_swap.secret_hash),
          toXOnly(order.destination_swap.delegate),
        ),
        await this.generateControlBlockFor(Leaf.REDEEM, order),
      ]);
    }
    // Build final tx with correct fees
    const { tx } = await this._buildRawTx(
      order,
      receiverAddress,
      'redeem',
      {
        vSize: tempTx.virtualSize(),
      },
      utxoHashes,
    );
    // Sign final transaction
    for (let i = 0; i < tx.ins.length; i++) {
      const hash = tx.hashForWitnessV1(
        i,
        outputs,
        values,
        hashType,
        redeemLeafHash,
      );
      const signature = await this.signer.signSchnorr(hash);
      tx.setWitness(i, [
        signature,
        Buffer.from(secret, 'hex'),
        this.redeemLeaf(
          trim0x(order.destination_swap.secret_hash),
          toXOnly(order.destination_swap.delegate),
        ),
        await this.generateControlBlockFor(Leaf.REDEEM, order),
      ]);
    }
    return Ok(tx.toHex());
  }

  /**
   * Refunds the funds back to the initiator if the expiry block height + 1 is reached
   */
  async refund(order: Order, fee?: number): AsyncResult<string, string> {
    const { tx, usedUtxos } = await this._buildRawTx(
      order,
      order.source_swap.delegate ?? (await this.signer.getAddress()),
      'refund',
      { fee },
    );

    const [canRefund, needMoreBlocks] = await this.canRefund(order, usedUtxos);
    if (!canRefund) {
      throw new Error(htlcErrors.htlcNotExpired(needMoreBlocks));
    }

    const refundLeafHash = this.leafHash(Leaf.REFUND, order);

    const values = usedUtxos.map((utxo) => utxo.value);
    const outputs = generateOutputs(
      await this.getOutputScript(order, 'refund'),
      usedUtxos.length,
    );

    const hashType = bitcoin.Transaction.SIGHASH_DEFAULT;

    for (let i = 0; i < tx.ins.length; i++) {
      tx.ins[i].sequence = order.source_swap.timelock;
      const hash = tx.hashForWitnessV1(
        i,
        outputs,
        values,
        hashType,
        refundLeafHash,
      );
      const signature = await this.signer.signSchnorr(hash);

      tx.setWitness(i, [
        signature,
        this.refundLeaf(
          order.source_swap.timelock,
          toXOnly(order.source_swap.initiator),
        ),
        await this.generateControlBlockFor(Leaf.REFUND, order),
      ]);
    }

    const provider = await this.getProvider();
    const txHash = await provider.broadcast(tx.toHex());
    return Ok(txHash);
  }

  /**
   * Given a list of UTXOs, checks if the HTLC can be refunded
   */
  private async canRefund(
    order: Order,
    utxos: BitcoinUTXO[],
  ): Promise<[boolean, number]> {
    const provider = await this.getProvider();
    const currentBlockHeight = await provider.getLatestTip();

    // ensure all utxos are expired
    for (const utxo of utxos) {
      let needMoreBlocks = 0;
      if (
        utxo.status.confirmed &&
        utxo.status.block_height + order.source_swap.timelock >
          currentBlockHeight
      ) {
        needMoreBlocks =
          utxo.status.block_height +
          order.source_swap.timelock -
          currentBlockHeight +
          1;
      } else if (!utxo.status.confirmed) {
        needMoreBlocks = order.source_swap.timelock + 1;
      }
      if (needMoreBlocks > 0) {
        return [false, needMoreBlocks];
      }
    }

    return [true, 0];
  }

  /**
   * Given a leaf, generates the control block necessary for spending the leaf
   */
  private async generateControlBlockFor(leaf: Leaf, order: Order) {
    let redeemScript: Buffer;
    let leaves: LeafTree[];

    switch (leaf) {
      case Leaf.REDEEM:
        redeemScript = this.redeemLeaf(
          trim0x(order.destination_swap.secret_hash),
          toXOnly(order.destination_swap.delegate),
        );
        // For redeem, we need leaves that match the redeem script
        leaves = this.generateLeaves(order, 'redeem');
        break;
      case Leaf.REFUND:
        redeemScript = this.refundLeaf(
          order.source_swap.timelock,
          toXOnly(order.source_swap.initiator),
        );
        // For refund, we need leaves that match the refund script
        leaves = this.generateLeaves(order, 'refund');
        break;
      case Leaf.INSTANT_REFUND:
        redeemScript = this.instantRefundLeaf(
          toXOnly(order.source_swap.initiator),
          toXOnly(order.destination_swap.delegate),
        );
        // For instant refund, we need leaves that match the instant refund script
        leaves = this.generateLeaves(order, 'instantRefund');
        break;
      default:
        throw new Error(htlcErrors.controlBlockGenerationFailed);
    }

    const network = await this.signer.getNetwork();

    const payment = bitcoin.payments.p2tr({
      internalPubkey: generateInternalkey(),
      network,
      scriptTree: leaves as Taptree,
      redeem: {
        output: redeemScript,
        redeemVersion: LEAF_VERSION,
      },
    });
    if (!payment.witness) {
      throw new Error(htlcErrors.controlBlockGenerationFailed);
    }

    return payment.witness[payment.witness.length - 1]!;
  }
  /**
   * Generates the hash of the leaf script
   * @param leaf Use leaf enum or pass 0 for refund, 1 for redeem, 2 for instant refund
   * @returns hash of the leaf script
   */
  leafHash(leaf: Leaf, order: Order): Buffer {
    let leafScript: Buffer;

    switch (leaf) {
      case Leaf.REDEEM:
        leafScript = this.redeemLeaf(
          trim0x(order.destination_swap.secret_hash),
          toXOnly(order.destination_swap.delegate),
        );
        break;
      case Leaf.REFUND:
        leafScript = this.refundLeaf(
          order.source_swap.timelock,
          toXOnly(order.source_swap.initiator),
        );
        break;
      case Leaf.INSTANT_REFUND:
        leafScript = this.instantRefundLeaf(
          toXOnly(order.source_swap.initiator),
          toXOnly(order.destination_swap.redeemer),
        );
        break;
      default:
        throw new Error(htlcErrors.invalidLeaf);
    }

    return bitcoin.crypto.taggedHash('TapLeaf', serializeScript(leafScript));
  }

  private refundLeaf(expiry: number, initiatorPubkey: string): Buffer {
    return bitcoin.script.fromASM(
      `
			${bitcoin.script.number.encode(expiry).toString('hex')}
			OP_CHECKSEQUENCEVERIFY
			OP_DROP
			${initiatorPubkey}	
			OP_CHECKSIG
			`
        .trim()
        .replace(/\s+/g, ' '),
    );
  }

  private redeemLeaf(secretHash: string, redeemerPubkey: string): Buffer {
    return bitcoin.script.fromASM(
      `
			OP_SHA256
			${secretHash}
			OP_EQUALVERIFY
			${redeemerPubkey}
			OP_CHECKSIG
			`
        .trim()
        .replace(/\s+/g, ' '),
    );
  }

  private instantRefundLeaf(
    initiatorPubkey: string,
    redeemerPubkey: string,
  ): Buffer {
    return bitcoin.script.fromASM(
      `
			${initiatorPubkey}
			OP_CHECKSIG
			${redeemerPubkey}
			OP_CHECKSIGADD
			OP_2
			OP_NUMEQUAL
			`
        .trim()
        .replace(/\s+/g, ' '),
    );
  }

  /**
   * Generates leaves for a given action type (redeem, refund, instant refund)
   * @param order The order object
   * @param type 'redeem' | 'refund' | 'instantRefund'
   *   - 'redeem': uses destination_swap for all params
   *   - 'refund': uses source_swap for all params
   *   - 'instantRefund': uses source_swap, but redeem/instantRefund use .redeemer
   */
  private generateLeaves(order: Order, type: TxType): LeafTree[] {
    let swap, redeemPubKey, instantRefundPubKey;
    switch (type) {
      case 'redeem':
        swap = order.destination_swap;
        redeemPubKey = swap.delegate;
        instantRefundPubKey = swap.delegate;
        break;
      case 'refund':
        swap = order.source_swap;
        redeemPubKey = swap.delegate;
        instantRefundPubKey = swap.delegate;
        break;
      case 'instantRefund':
        swap = order.source_swap;
        redeemPubKey = swap.redeemer;
        instantRefundPubKey = swap.redeemer;
        break;
      default:
        throw new Error('Invalid leaf generation type');
    }

    // Generate dynamic leaves based on the actual parameters
    return [
      {
        version: LEAF_VERSION,
        output: this.redeemLeaf(swap.secret_hash, toXOnly(redeemPubKey)),
      },
      [
        {
          version: LEAF_VERSION,
          output: this.refundLeaf(swap.timelock, toXOnly(swap.initiator)),
        },
        {
          version: LEAF_VERSION,
          output: this.instantRefundLeaf(
            toXOnly(swap.initiator),
            toXOnly(instantRefundPubKey),
          ),
        },
      ],
    ];
  }
  /**
   * Generates the merkle proof for the leaf script
   */
  private generateMerkleProofFor(leaf: Leaf, order: Order) {
    const redeemLeafHash = this.leafHash(Leaf.REDEEM, order);
    const instantRefundLeafHash = this.leafHash(Leaf.INSTANT_REFUND, order);
    const refundLeafHash = this.leafHash(Leaf.REFUND, order);
    switch (leaf) {
      case Leaf.REDEEM: {
        const sortedRefundLeaves = sortLeaves(
          refundLeafHash,
          instantRefundLeafHash,
        );
        return [
          bitcoin.crypto.taggedHash(
            'TapBranch',
            Buffer.concat(sortedRefundLeaves),
          ),
        ];
      }
      case Leaf.REFUND:
        return [instantRefundLeafHash, redeemLeafHash];
      case Leaf.INSTANT_REFUND:
        return [refundLeafHash, redeemLeafHash];
      default:
        throw new Error(htlcErrors.invalidLeaf);
    }
  }

  getProvider(): Promise<IBitcoinProvider> {
    return this.signer.getProvider();
  }

  getPublicKey(): Promise<string> {
    return this.signer.getPublicKey();
  }

  htlcActorAddress(): Promise<string> {
    return this.signer.getAddress();
  }
}
