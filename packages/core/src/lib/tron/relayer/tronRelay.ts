import {
  Order,
  EvmOrderResponse,
  isEvmOrderResponse as isTronOrderResponse,
} from '@gardenfi/orderbook';
import { AsyncResult, Err, IAuth, Network, Ok, Url } from '@gardenfi/utils';
import { ITronHTLC } from '../tronHTLC.types';
import { redeemOrderThroughRelayer } from '../../utils';
import { TronWeb } from 'tronweb';
import { Adapter } from '@tronweb3/tronwallet-abstract-adapter';
import { tronHtlcAbi } from '../abi/tronHtlcABI';

export type TronRelayOptions = {
  fullHost: string;
  privateKey?: string;
  adapter?: Adapter;
  solidityNode?: string;
  eventServer?: string;
  htlcContractAddress?: string;
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
    console.log(network);
    this.url =
      typeof relayerUrl === 'string' ? new Url(relayerUrl) : relayerUrl;
    this.auth = auth;
    this.tronweb = new TronWeb({
      fullHost: options.fullHost,
      ...(options.solidityNode ? { solidityNode: options.solidityNode } : {}),
      ...(options.eventServer ? { eventServer: options.eventServer } : {}),
      ...(options.privateKey ? { privateKey: options.privateKey } : {}),
    });
    this.options = options;
  }

  get htlcActorAddress(): string {
    if (this.options.adapter) {
      const address = this.options.adapter.address;
      if (!address) {
        return '';
      }
      return address;
    }

    if (this.options.privateKey) {
      const address = this.tronweb.address.fromPrivateKey(
        this.options.privateKey,
      );
      if (!address) {
        return '';
      }
      return address;
    }

    const defaultAddr = this.tronweb.defaultAddress?.base58;
    if (defaultAddr) {
      return defaultAddr;
    }
    return '';
  }

  async initiate(order: Order | EvmOrderResponse): AsyncResult<string, string> {
    if (isTronOrderResponse(order)) {
      return this.initiateDirectContractCall(order);
    }
    return Ok(order.order_id);
  }

  /**
   * NEW METHOD: Direct contract call for initiate without relayer signature
   */
  private async initiateDirectContractCall(
    order: EvmOrderResponse,
  ): AsyncResult<string, string> {
    if (!this.htlcActorAddress || this.htlcActorAddress === '') {
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

    try {
      const callValue = value ? parseInt(value) : 0;
      const feeLimit = parseInt(gas_limit);

      // Build the transaction using transactionBuilder
      const parameter = [
        { type: 'address', value: redeemer },
        { type: 'uint256', value: timelock },
        { type: 'uint256', value: amount },
        { type: 'bytes32', value: secretHash },
        { type: 'bytes', value: destinationData || '0x' },
      ];

      const options = {
        feeLimit,
        callValue,
      };

      const transaction =
        await this.tronweb.transactionBuilder.triggerSmartContract(
          contractAddress,
          'initiate(address,uint256,uint256,bytes32,bytes)',
          options,
          parameter,
          this.htlcActorAddress,
        );

      if (!transaction || !transaction.transaction) {
        return Err('Failed to build initiate transaction');
      }

      // Sign the transaction
      let signedTx;
      if (this.options.adapter) {
        signedTx = await this.options.adapter.signTransaction(
          transaction.transaction,
        );
      } else if (this.options.privateKey) {
        signedTx = await this.tronweb.trx.sign(
          transaction.transaction,
          this.options.privateKey,
        );
      } else {
        return Err('No signing method available (no adapter or private key)');
      }

      // Broadcast the transaction
      const broadcastResult = await this.tronweb.trx.sendRawTransaction(
        signedTx,
      );

      if (!broadcastResult.result) {
        return Err(
          String(broadcastResult.message) ||
            String(broadcastResult.code) ||
            'Transaction broadcast failed',
        );
      }

      const txid = broadcastResult.txid;
      console.log('Transaction successful, txid:', txid);
      return Ok(txid);
    } catch (e) {
      return Err(`Direct contract call failed: ${String(e)}`);
    }
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

  private async executeApprovalTransaction(
    order: EvmOrderResponse,
  ): AsyncResult<string, string> {
    console.log('No Allowance found, Executing Approval');

    if (!this.htlcActorAddress || this.htlcActorAddress === '') {
      return Err('No HTLC actor address found');
    }

    const approvalTx = order.approval_transaction;
    if (!approvalTx) {
      return Ok('No approval transaction required');
    }

    try {
      // Decode the parameters from the data
      const dataWithoutSelector = '0x' + approvalTx.data.slice(10); // Remove function selector but keep 0x prefix

      const params = this.tronweb.utils.abi.decodeParams(
        ['spender', 'amount'],
        ['address', 'uint256'],
        dataWithoutSelector,
        false,
      );

      const spenderAddress = params.spender;
      const amount = params.amount.toString();

      console.log('[executeApprovalTransaction] Decoded approval:', {
        spender: spenderAddress,
        amount: amount.toString(),
        tokenContract: approvalTx.to,
      });

      // Build the transaction using transactionBuilder
      const parameter = [
        { type: 'address', value: spenderAddress },
        { type: 'uint256', value: amount },
      ];

      const options = {
        feeLimit: Number(approvalTx.gas_limit),
        callValue: 0,
      };

      const transaction =
        await this.tronweb.transactionBuilder.triggerSmartContract(
          approvalTx.to,
          'approve(address,uint256)',
          options,
          parameter,
          this.htlcActorAddress,
        );

      if (!transaction || !transaction.transaction) {
        return Err('Failed to build approval transaction');
      }

      // Sign the transaction
      let signedTx;
      if (this.options.adapter) {
        signedTx = await this.options.adapter.signTransaction(
          transaction.transaction,
        );
      } else if (this.options.privateKey) {
        signedTx = await this.tronweb.trx.sign(
          transaction.transaction,
          this.options.privateKey,
        );
      } else {
        return Err('No signing method available (no adapter or private key)');
      }

      // Broadcast the transaction
      const broadcast = await this.tronweb.trx.sendRawTransaction(signedTx);

      if (!broadcast.result) {
        return Err(
          String(broadcast.message) ||
            String(broadcast.code) ||
            'Approval broadcast failed',
        );
      }

      console.log('Approval transaction successful, txid:', broadcast.txid);
      return Ok(broadcast.txid);
    } catch (e) {
      return Err(`Approval transaction failed: ${String(e)}`);
    }
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
