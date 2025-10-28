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

    const {
      to: contractAddress,
      data: callData,
      value,
      gas_limit,
    } = order.initiate_transaction;

    try {
      // Parse the calldata to extract function parameters
      // Function signature: initiate(address,uint256,uint256,bytes32,bytes)
      // 0x4ede0ab7 is the function selector for initiate

      // const functionSelector = callData.slice(0, 10); // 0x4ede0ab7
      const params = callData.slice(10); // Remove function selector

      // Decode parameters (each is 32 bytes = 64 hex chars)
      // Parameter 1: token address (offset 0-64)
      const tokenHex = params.slice(24, 64); // Skip padding, get address
      const tokenAddress = this.tronweb.address.fromHex('41' + tokenHex);

      // Parameter 2: amount (offset 64-128)
      const amountHex = '0x' + params.slice(64, 128);

      // Parameter 3: timelock (offset 128-192)
      const timelockHex = '0x' + params.slice(128, 192);

      // Parameter 4: secretHash (offset 192-256)
      const secretHashHex = '0x' + params.slice(192, 256);

      // Parameter 5: destinationData offset (offset 256-320)
      // const destinationDataOffsetHex = '0x' + params.slice(256, 320);

      // Parameter 6: destinationData length (offset 320-384)
      // const destinationDataLengthHex = '0x' + params.slice(320, 384);

      // Since destinationData is empty (length = 0), we don't need to read further
      const destinationData = '0x';

      console.log('[initiateDirectContractCall] Decoded parameters:', {
        tokenAddress,
        amount: amountHex,
        timelock: timelockHex,
        secretHash: secretHashHex,
        destinationData,
      });

      // Build transaction using triggerSmartContract with proper parameters
      const tx = await this.tronweb.transactionBuilder.triggerSmartContract(
        this.tronweb.address.toHex(contractAddress),
        'initiate(address,uint256,uint256,bytes32,bytes)',
        {
          feeLimit: parseInt(gas_limit),
          callValue: value ? parseInt(value) : 0,
        },
        [
          { type: 'address', value: tokenAddress },
          { type: 'uint256', value: amountHex },
          { type: 'uint256', value: timelockHex },
          { type: 'bytes32', value: secretHashHex },
          { type: 'bytes', value: destinationData },
        ],
        this.tronweb.address.toHex(this.htlcActorAddress),
      );

      if (!tx || !tx.transaction) {
        return Err('Failed to build initiate transaction');
      }

      // Sign the transaction
      let signedTx;
      if (this.options.adapter) {
        console.log('[initiateDirectContractCall] Signing with adapter');
        signedTx = await this.options.adapter.signTransaction(tx.transaction);
      } else if (this.options.privateKey) {
        console.log('[initiateDirectContractCall] Signing with private key');
        signedTx = await this.tronweb.trx.sign(
          tx.transaction,
          this.options.privateKey,
        );
      } else {
        return Err('No signing method available (no adapter or private key)');
      }

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
      // Decode the function selector and parameters from the data
      // 0x095ea7b3 is the approve(address,uint256) function selector
      const functionSelector = approvalTx.data.slice(0, 10);
      const parameter = '0x' + approvalTx.data.slice(10);

      // Parse the spender address and amount from the parameter
      // First 32 bytes (64 chars) is the spender address
      // Next 32 bytes (64 chars) is the amount
      const spenderHex = parameter.slice(2, 66); // Remove 0x and get first 64 chars
      const amountHex = parameter.slice(66, 130); // Get next 64 chars

      // Convert hex address to Tron address
      const spenderAddress = this.tronweb.address.fromHex(
        '41' + spenderHex.slice(24),
      );

      // Call approve function
      const tx = await this.tronweb.transactionBuilder.triggerSmartContract(
        this.tronweb.address.toHex(approvalTx.to),
        functionSelector,
        {
          feeLimit: Number(approvalTx.gas_limit),
          callValue: 0,
        },
        [
          { type: 'address', value: spenderAddress },
          { type: 'uint256', value: '0x' + amountHex },
        ],
        this.tronweb.address.toHex(this.htlcActorAddress),
      );

      if (!tx || !tx.transaction) {
        return Err('Failed to build approval transaction');
      }

      // Sign & Broadcast
      let signedTx;
      if (this.options.adapter) {
        signedTx = await this.options.adapter.signTransaction(tx.transaction);
      } else {
        signedTx = await this.tronweb.trx.sign(
          tx.transaction,
          this.options.privateKey,
        );
      }

      const broadcast = await this.tronweb.trx.sendRawTransaction(signedTx);

      if (!broadcast.result) {
        return Err(broadcast.message || 'Broadcast failed');
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
