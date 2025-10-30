import {
  Order,
  EvmOrderResponse,
  isEvmOrderResponse as isTronOrderResponse,
} from '@gardenfi/orderbook';
import { AsyncResult, Err, IAuth, Network, Ok, Url } from '@gardenfi/utils';
import { ITronHTLC } from '../tronHTLC.types';
import { getAssetInfoFromOrder, redeemOrderThroughRelayer } from '../../utils';
import { TronWeb } from 'tronweb';
import { Adapter } from '@tronweb3/tronwallet-abstract-adapter';
import { toBytes32Hex } from '../utils';
import { TRON_CONFIG } from '../../constants';

export type TronRelayOptions = {
  fullHost?: string;
  privateKey?: string;
  adapter?: Adapter;
  solidityNode?: string;
  eventServer?: string;
};

export class TronRelay implements ITronHTLC {
  private url: Url;
  private auth: IAuth;
  private tronweb: TronWeb;
  private options: TronRelayOptions;

  constructor(
    relayerUrl: string | Url,
    network: Network,
    auth: IAuth,
    options: TronRelayOptions,
  ) {
    this.url =
      typeof relayerUrl === 'string' ? new Url(relayerUrl) : relayerUrl;
    this.auth = auth;
    this.tronweb = new TronWeb({
      fullHost: options.fullHost ?? TRON_CONFIG[network],
      ...(options.solidityNode ? { solidityNode: options.solidityNode } : {}),
      ...(options.eventServer ? { eventServer: options.eventServer } : {}),
      ...(options.privateKey ? { privateKey: options.privateKey } : {}),
    });
    this.options = options;
  }

  get htlcActorAddress(): string {
    if (this.options.adapter?.address) {
      return this.options.adapter.address;
    }

    if (this.options.privateKey) {
      return this.tronweb.address.fromPrivateKey(this.options.privateKey) || '';
    }

    return this.tronweb.defaultAddress?.base58 || '';
  }

  async initiate(order: Order | EvmOrderResponse): AsyncResult<string, string> {
    if (isTronOrderResponse(order)) {
      return this.initiateDirectContractCall(order);
    }

    try {
      const { source_swap } = order;
      const assetInfo = await getAssetInfoFromOrder(
        source_swap.asset,
        this.url,
      );

      if (!assetInfo.ok) {
        return Err(assetInfo.error);
      }

      const { htlcAddress } = assetInfo.val;

      return await this.executeContractCall({
        contractAddress: htlcAddress,
        method: 'initiate(address,uint256,uint256,bytes32,bytes)',
        parameters: [
          { type: 'address', value: source_swap.redeemer },
          { type: 'uint256', value: source_swap.timelock },
          { type: 'uint256', value: BigInt(source_swap.amount) },
          {
            type: 'bytes32',
            value: toBytes32Hex(String(source_swap.secret_hash)),
          },
          { type: 'bytes', value: '0x' },
        ],
        options: {},
      });
    } catch (error) {
      return Err(`Failed to initiate: ${String(error)}`);
    }
  }

  private async initiateDirectContractCall(
    order: EvmOrderResponse,
  ): AsyncResult<string, string> {
    if (!this.htlcActorAddress) {
      return Err('No HTLC actor address found');
    }

    // Execute approval transaction if present
    if (order.approval_transaction) {
      const approvalResult = await this.executeApprovalTransaction(order);
      if (approvalResult.error) {
        return Err(approvalResult.error);
      }
    }

    if (!order.initiate_transaction) {
      return Err(
        'No initiate transaction data available for direct contract call',
      );
    }

    if (!order.typed_data?.message) {
      return Err('No typed data message found in order response');
    }

    const {
      to: contractAddress,
      value,
      gas_limit,
    } = order.initiate_transaction;
    const { redeemer, timelock, amount, secretHash, destinationData } =
      order.typed_data.message;

    return await this.executeContractCall({
      contractAddress,
      method: 'initiate(address,uint256,uint256,bytes32,bytes)',
      parameters: [
        { type: 'address', value: redeemer },
        { type: 'uint256', value: timelock },
        { type: 'uint256', value: amount },
        { type: 'bytes32', value: toBytes32Hex(String(secretHash)) },
        { type: 'bytes', value: destinationData },
      ],
      options: {
        feeLimit: parseInt(gas_limit),
        callValue: value ? parseInt(value) : 0,
      },
    });
  }

  private async executeApprovalTransaction(
    order: EvmOrderResponse,
  ): AsyncResult<string, string> {
    console.log('No Allowance found, Executing Approval');

    if (!this.htlcActorAddress) {
      return Err('No HTLC actor address found');
    }

    const approvalTx = order.approval_transaction;
    if (!approvalTx) {
      return Ok('No approval transaction required');
    }

    try {
      const dataWithoutSelector = '0x' + approvalTx.data.slice(10);
      const params = this.tronweb.utils.abi.decodeParams(
        ['spender', 'amount'],
        ['address', 'uint256'],
        dataWithoutSelector,
        false,
      );

      return await this.executeContractCall({
        contractAddress: approvalTx.to,
        method: 'approve(address,uint256)',
        parameters: [
          { type: 'address', value: params.spender },
          { type: 'uint256', value: params.amount.toString() },
        ],
        options: {
          feeLimit: Number(approvalTx.gas_limit),
          callValue: 0,
        },
      });
    } catch (e) {
      return Err(`Approval transaction failed: ${String(e)}`);
    }
  }

  /**
   * Unified method to execute contract calls with signing and broadcasting
   */
  private async executeContractCall({
    contractAddress,
    method,
    parameters,
    options,
  }: {
    contractAddress: string;
    method: string;
    parameters: Array<{ type: string; value: any }>;
    options: { feeLimit?: number; callValue?: number };
  }): AsyncResult<string, string> {
    try {
      // Build transaction
      const transaction =
        await this.tronweb.transactionBuilder.triggerSmartContract(
          contractAddress,
          method,
          options,
          parameters,
          this.htlcActorAddress,
        );

      if (!transaction?.transaction) {
        return Err('Failed to build transaction');
      }

      // Sign transaction
      const signedTx = await this.signTransaction(transaction.transaction);
      if (signedTx.error) {
        return Err(signedTx.error);
      }

      // Broadcast transaction
      const broadcastResult = await this.tronweb.trx.sendRawTransaction(
        signedTx.val!,
      );

      if (!broadcastResult.result) {
        return Err(
          String(broadcastResult.message) ||
            String(broadcastResult.code) ||
            'Transaction broadcast failed',
        );
      }

      console.log('Transaction successful, txid:', broadcastResult.txid);
      return Ok(broadcastResult.txid);
    } catch (e) {
      return Err(`Contract call failed: ${String(e)}`);
    }
  }

  /**
   * Unified signing method
   */
  private async signTransaction(transaction: any): AsyncResult<any, string> {
    if (this.options.adapter) {
      try {
        const signed = await this.options.adapter.signTransaction(transaction);
        return Ok(signed);
      } catch (e) {
        return Err(`Adapter signing failed: ${String(e)}`);
      }
    }

    if (this.options.privateKey) {
      try {
        const signed = await this.tronweb.trx.sign(
          transaction,
          this.options.privateKey,
        );
        return Ok(signed);
      } catch (e) {
        return Err(`Private key signing failed: ${String(e)}`);
      }
    }

    return Err('No signing method available (no adapter or private key)');
  }

  /**
   * Optional: Wait for transaction confirmation on-chain
   */
  private async waitForTransactionConfirmation(
    txid: string,
    maxAttempts: number = 30,
    delayMs: number = 3000,
  ): Promise<any> {
    console.log('[waitForTransactionConfirmation] Waiting for txid:', txid);

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const txInfo = await this.tronweb.trx.getTransactionInfo(txid);

        if (txInfo && Object.keys(txInfo).length > 0) {
          console.log(
            '[waitForTransactionConfirmation] Transaction confirmed:',
            txInfo,
          );
          return txInfo;
        }

        console.log(
          `[waitForTransactionConfirmation] Attempt ${
            i + 1
          }/${maxAttempts}, waiting...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } catch (e) {
        console.log(
          '[waitForTransactionConfirmation] Error checking transaction:',
          e,
        );
      }
    }

    throw new Error('Transaction confirmation timeout');
  }

  async redeem(order: Order, secret: string): AsyncResult<string, string> {
    const redeemResult = await redeemOrderThroughRelayer(
      order,
      secret,
      this.auth,
      this.url,
    );
    if (redeemResult.error) {
      return Err(redeemResult.error);
    }
    return Ok(redeemResult.val!);
  }

  async refund(): AsyncResult<string, string> {
    return Err('Refund is taken care of by the relayer');
  }
}
