import {
  Order,
  EvmOrderResponse,
  isEvmOrderResponse as isTronOrderResponse,
  TronOrderResponse,
} from '@gardenfi/orderbook';
import {
  APIResponse,
  AsyncResult,
  Err,
  Fetcher,
  IAuth,
  Network,
  Ok,
  Url,
} from '@gardenfi/utils';
import { ITronHTLC } from '../tronHTLC.types';
import { redeemOrderThroughRelayer } from '../../utils';
import { TronWeb } from 'tronweb';
import { Adapter } from '@tronweb3/tronwallet-abstract-adapter';
import { TypedDataField } from 'tronweb/lib/esm/utils';

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
    console.log(
      '[TronRelay constructor] relayerUrl:',
      relayerUrl,
      'network:',
      network,
      'options:',
      options,
    );
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
        console.log('[htlcActorAddress] Adapter address not found');
        return '';
      }
      console.log('[htlcActorAddress] Using adapter address:', address);
      return address;
    }

    if (this.options.privateKey) {
      const address = this.tronweb.address.fromPrivateKey(
        this.options.privateKey,
      );
      if (!address) {
        console.log('[htlcActorAddress] Address from privateKey not found');
        return '';
      }
      console.log('[htlcActorAddress] Using address from privateKey:', address);
      return address;
    }

    const defaultAddr = this.tronweb.defaultAddress?.base58;
    if (defaultAddr) {
      console.log(
        '[htlcActorAddress] Using default tronweb address:',
        defaultAddr,
      );
      return defaultAddr;
    }
    console.log(
      '[htlcActorAddress] No HTLC actor address found, returning empty string',
    );
    return '';
  }

  async initiate(order: Order | EvmOrderResponse): AsyncResult<string, string> {
    console.log('[initiate] Initiating order:', order);
    if (isTronOrderResponse(order)) {
      console.log('[initiate] Detected TronOrderResponse');
      return this.initiateDirectContractCall(order);
    }
    console.log(
      '[initiate] Non-Tron order, returning order_id:',
      order.order_id,
    );
    return Ok(order.order_id);
  }

  /**
   * NEW METHOD: Direct contract call for initiate without relayer signature
   */
  private async initiateDirectContractCall(
    order: EvmOrderResponse,
  ): AsyncResult<string, string> {
    console.log('[initiateDirectContractCall] Starting direct contract call');

    if (!this.htlcActorAddress || this.htlcActorAddress === '') {
      console.log('[initiateDirectContractCall] No HTLC actor address found');
      return Err('No HTLC actor address found');
    }

    // Execute approval transaction if present
    if (order.approval_transaction) {
      console.log(
        '[initiateDirectContractCall] approval_transaction detected, running executeApprovalTransaction',
      );
      const approvalResult = await this.executeApprovalTransaction(order);
      if (approvalResult.error) {
        console.log(
          '[initiateDirectContractCall] Approval transaction failed:',
          approvalResult.error,
        );
        return Err(approvalResult.error);
      }
      console.log(
        '[initiateDirectContractCall] Approval transaction succeeded:',
        approvalResult.val,
      );
    }

    // Check if initiate_transaction is available (contains contract address and calldata)
    if (!order.initiate_transaction) {
      console.log(
        '[initiateDirectContractCall] No initiate_transaction found in order',
      );
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

    console.log('[initiateDirectContractCall] Contract call details:', {
      contractAddress,
      callData,
      value,
      gas_limit,
      from: this.htlcActorAddress,
    });

    try {
      // Remove '0x' prefix from callData if present
      const rawCallData = callData.startsWith('0x')
        ? callData.slice(2)
        : callData;

      console.log(
        '[initiateDirectContractCall] Raw call data (hex):',
        rawCallData,
      );

      // CRITICAL FIX: Use transactionBuilder.triggerSmartContract correctly
      // The second parameter should be the function signature string, not encoded data
      // OR we need to construct the transaction manually with the encoded data

      // Convert hex addresses to Tron base58 format if needed
      const contractAddressHex = this.tronweb.address.toHex(contractAddress);
      const ownerAddressHex = this.tronweb.address.toHex(this.htlcActorAddress);

      console.log('[initiateDirectContractCall] Converted addresses:', {
        contractAddressHex,
        ownerAddressHex,
      });

      // Build raw transaction using TronWeb's transaction builder
      // We need to manually construct a TriggerSmartContract transaction
      const tx = await this.tronweb.transactionBuilder.triggerSmartContract(
        contractAddressHex,
        'triggersmartcontract()', // Dummy function, we'll replace the data
        {
          feeLimit: parseInt(gas_limit),
          callValue: value ? parseInt(value) : 0,
        },
        [],
        ownerAddressHex,
      );

      // Now manually inject the correct callData into the transaction
      if (
        tx &&
        tx.transaction &&
        tx.transaction.raw_data &&
        tx.transaction.raw_data.contract
      ) {
        const contract = tx.transaction.raw_data.contract[0];
        if (contract && contract.parameter && contract.parameter.value) {
          // Replace the data field with our actual callData
          contract.parameter.value.data = rawCallData;
          console.log(
            '[initiateDirectContractCall] Injected callData into transaction',
          );
        }
      }

      console.log('[initiateDirectContractCall] Transaction built:', tx);

      if (!tx || !tx.transaction) {
        console.error(
          '[initiateDirectContractCall] Failed to build transaction',
        );
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
        console.error(
          '[initiateDirectContractCall] No signing method available',
        );
        return Err('No signing method available (no adapter or private key)');
      }

      console.log('[initiateDirectContractCall] Transaction signed:', signedTx);

      // Broadcast the transaction directly to the blockchain
      console.log(
        '[initiateDirectContractCall] Broadcasting transaction to blockchain',
      );
      const broadcastResult = await this.tronweb.trx.sendRawTransaction(
        signedTx,
      );

      console.log(
        '[initiateDirectContractCall] Broadcast result:',
        broadcastResult,
      );

      if (!broadcastResult.result) {
        console.error(
          '[initiateDirectContractCall] Transaction broadcast failed:',
          broadcastResult,
        );
        return Err(
          String(broadcastResult.message) ||
            String(broadcastResult.code) ||
            'Transaction broadcast failed',
        );
      }

      const txid = broadcastResult.txid;
      console.log(
        '[initiateDirectContractCall] Transaction successful, txid:',
        txid,
      );

      // Optionally: Wait for transaction confirmation
      // const receipt = await this.waitForTransactionConfirmation(txid);

      return Ok(txid);
    } catch (e) {
      console.error('[initiateDirectContractCall] Exception occurred:', e);
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

  /**
   * LEGACY METHOD: Keep for backward compatibility
   */
  private async initiateWithCreateOrderResponse(
    order: EvmOrderResponse,
  ): AsyncResult<string, string> {
    console.log('[initiateWithCreateOrderResponse] order:', order);
    if (!this.htlcActorAddress || this.htlcActorAddress === '') {
      console.log(
        '[initiateWithCreateOrderResponse] No HTLC actor address found',
      );
      return Err('No HTLC actor address found');
    }

    const headersResult = await this.auth.getAuthHeaders();
    if (!headersResult.ok) {
      console.log(
        '[initiateWithCreateOrderResponse] Error getting auth headers:',
        headersResult.error,
      );
      return Err(headersResult.error);
    }

    // Execute approval transaction if present
    if (order.approval_transaction) {
      console.log(
        '[initiateWithCreateOrderResponse] approval_transaction detected, running executeApprovalTransaction',
      );
      const approvalResult = await this.executeApprovalTransaction(order);
      if (approvalResult.error) {
        console.log(
          '[initiateWithCreateOrderResponse] Approval transaction failed:',
          approvalResult.error,
        );
        return Err(approvalResult.error);
      }
      console.log(
        '[initiateWithCreateOrderResponse] Approval transaction succeeded:',
        approvalResult.val,
      );
    }

    // Check if we should use initiate_transaction instead of typed_data
    // Some relayers prefer the transaction to be signed directly
    if (order.initiate_transaction) {
      console.log(
        '[initiateWithCreateOrderResponse] Using initiate_transaction approach',
      );
      return this.initiateWithTransaction(order);
    }

    const { typed_data } = order;

    // Ensure typed_data is present
    if (!typed_data) {
      console.log('[initiateWithCreateOrderResponse] Typed data missing');
      return Err('Typed data required for TRON order signing');
    }

    let signature: string;

    if (this.options.adapter) {
      try {
        console.log(
          '[initiateWithCreateOrderResponse] Using adapter for signing typed_data:',
          typed_data,
        );
        if (
          'signTypedData' in this.options.adapter &&
          typeof this.options.adapter.signTypedData === 'function'
        ) {
          signature = await this.options.adapter.signTypedData(
            typed_data.domain,
            typed_data.types,
            typed_data.message,
          );
        } else {
          if (!order.initiate_transaction) {
            return Err(
              'Adapter does not support typed data signing and no initiate_transaction provided',
            );
          }
          const tronOrder = order as TronOrderResponse;
          const tx = await this.tronweb.transactionBuilder.triggerSmartContract(
            tronOrder.initiate_transaction.to,
            tronOrder.initiate_transaction.data,
            {
              feeLimit: parseInt(tronOrder.initiate_transaction.gas_limit),
            },
            [],
            this.htlcActorAddress,
          );

          const signedTx = await this.options.adapter.signTransaction(
            tx.transaction,
          );
          console.log('signedTx :', signedTx);
          signature = signedTx.signature?.[0];
        }
        console.log(
          '[initiateWithCreateOrderResponse] Adapter signature:',
          signature,
        );
      } catch (e) {
        console.error(
          '[initiateWithCreateOrderResponse] Adapter signing failed:',
          e,
        );
        return Err(`Adapter signing failed: ${String(e)}`);
      }
    } else {
      try {
        console.log(
          '[initiateWithCreateOrderResponse] Using TronWeb for signing. typed_data:',
          typed_data,
        );

        console.log(
          '[initiateWithCreateOrderResponse] Types without domain:',
          typed_data.types,
        );

        try {
          signature = this.tronweb.trx._signTypedData(
            typed_data.domain,
            typed_data.types as Record<string, TypedDataField[]>,
            typed_data.message,
            this.options.privateKey,
          );
        } catch (signError) {
          console.log(
            '[initiateWithCreateOrderResponse] _signTypedData failed, trying alternative method:',
            signError,
          );

          if ('signMessageV2' in this.tronweb.trx) {
            const typedDataStr = JSON.stringify({
              types: typed_data.types,
              primaryType: typed_data.primaryType,
              domain: typed_data.domain,
              message: typed_data.message,
            });
            signature = this.tronweb.trx.signMessageV2(
              typedDataStr,
              this.options.privateKey,
            );
          } else {
            throw new Error('No compatible signing method found');
          }
        }

        console.log(
          '[initiateWithCreateOrderResponse] TronWeb signature:',
          signature,
        );
      } catch (e) {
        console.error(
          '[initiateWithCreateOrderResponse] TronWeb signing failed:',
          e,
        );
        return Err(`TronWeb signing failed: ${String(e)}`);
      }
    }

    if (!signature) {
      console.log('[initiateWithCreateOrderResponse] Failed to sign message');
      return Err('Failed to sign message');
    }

    console.log(
      '[initiateWithCreateOrderResponse] Submitting signed transaction to relayer server:',
      {
        orderId: order.order_id,
        signature: signature.toString(),
      },
    );

    const res = await Fetcher.patch<APIResponse<string>>(
      this.url
        .endpoint('/v2/orders')
        .endpoint(order.order_id)
        .addSearchParams({ action: 'initiate' }),
      {
        body: JSON.stringify({ signature: signature.toString() }),
        headers: {
          ...headersResult.val,
          'Content-Type': 'application/json',
        },
      },
    );
    if (res.error) {
      console.error(
        '[initiateWithCreateOrderResponse] Error patching relayer server:',
        res.error,
      );
      return Err(res.error);
    }
    if (!res.result) {
      console.error(
        '[initiateWithCreateOrderResponse] Unexpected error, result is undefined',
      );
      return Err('Unexpected error, result is undefined');
    }
    console.log(
      '[initiateWithCreateOrderResponse] Received result from relayer:',
      res.result,
    );
    return Ok(res.result);
  }

  /**
   * Alternative initiation method using the initiate_transaction directly
   */
  private async initiateWithTransaction(
    order: EvmOrderResponse,
  ): AsyncResult<string, string> {
    console.log('[initiateWithTransaction] Using transaction-based approach');

    if (!order.initiate_transaction) {
      return Err('No initiate transaction available');
    }

    const headersResult = await this.auth.getAuthHeaders();
    if (!headersResult.ok) {
      return Err(headersResult.error);
    }

    try {
      const txResult =
        await this.tronweb.transactionBuilder.triggerSmartContract(
          order.initiate_transaction.to,
          order.initiate_transaction.data,
          {
            feeLimit: parseInt(order.initiate_transaction.gas_limit),
            callValue: parseInt(order.initiate_transaction.value || '0'),
          },
          [],
          this.htlcActorAddress,
        );

      console.log('txResult :', txResult);

      if (!txResult || !txResult.transaction) {
        return Err('Failed to build initiate transaction');
      }

      console.log(
        '[initiateWithTransaction] Transaction built:',
        txResult.transaction,
      );

      let signedTx;
      if (this.options.adapter) {
        signedTx = await this.options.adapter.signTransaction(
          txResult.transaction,
        );
      } else {
        signedTx = await this.tronweb.trx.sign(
          txResult.transaction,
          this.options.privateKey,
        );
      }

      console.log('[initiateWithTransaction] Transaction signed');

      const signature = signedTx.signature?.[0];

      console.log(
        '[initiateWithTransaction] Submitting signature to relayer:',
        signature,
      );

      console.log(
        'endpoint :',
        this.url
          .endpoint('/v2/orders')
          .endpoint(order.order_id)
          .addSearchParams({ action: 'initiate' })
          .toString(),
      );
      console.log('body :', JSON.stringify({ signature }));

      const res = await Fetcher.patch<APIResponse<string>>(
        this.url
          .endpoint('/v2/orders')
          .endpoint(order.order_id)
          .addSearchParams({ action: 'initiate' }),
        {
          body: JSON.stringify({ signature }),
          headers: {
            ...headersResult.val,
            'Content-Type': 'application/json',
          },
        },
      );

      if (res.error) {
        console.error(
          '[initiateWithTransaction] Error from relayer:',
          res.error,
        );
        return Err(res.error);
      }
      if (!res.result) {
        return Err('Unexpected error, result is undefined');
      }

      console.log('[initiateWithTransaction] Success:', res.result);
      return Ok(res.result);
    } catch (e) {
      console.error('[initiateWithTransaction] Failed:', e);
      return Err(`Transaction initiation failed: ${String(e)}`);
    }
  }

  /**
   * Execute TRC20 approval transaction (raw calldata passthrough)
   */
  private async executeApprovalTransaction(
    order: EvmOrderResponse,
  ): AsyncResult<string, string> {
    console.log('[executeApprovalTransaction] order:', order);

    if (!this.htlcActorAddress || this.htlcActorAddress === '') {
      return Err('No HTLC actor address found');
    }

    const approvalTx = order.approval_transaction;
    if (!approvalTx) {
      return Ok('No approval transaction required');
    }

    try {
      console.log('[executeApprovalTransaction] Sending approval transaction', {
        to: approvalTx.to,
        data: approvalTx.data,
      });

      const tx = await this.tronweb.transactionBuilder.triggerSmartContract(
        approvalTx.to,
        '', // no function name, use data
        {
          feeLimit: Number(approvalTx.gas_limit),
          callValue: 0,
        },
        [], // empty params
        this.htlcActorAddress,
      );
      if (!tx || !tx.transaction) {
        console.error(
          '[executeApprovalTransaction] Failed to build transaction',
        );
        return Err('Failed to build approval transaction');
      }
      tx.transaction.raw_data.contract[0].parameter.value.data =
        approvalTx.data;

      console.log(
        '[executeApprovalTransaction] Transaction built:',
        tx.transaction,
      );

      // ---- Sign & Broadcast ----
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
      console.log('[executeApprovalTransaction] Broadcast result:', broadcast);

      if (!broadcast.result) {
        return Err(broadcast.message || 'Broadcast failed');
      }

      return Ok(broadcast.txid);
    } catch (e) {
      console.error('[executeApprovalTransaction] Exception:', e);
      return Err(`Approval transaction failed: ${String(e)}`);
    }
  }

  async redeem(order: Order, secret: string): AsyncResult<string, string> {
    console.log('[redeem] Redeeming order:', order, 'with secret:', secret);
    const redeemResult = await redeemOrderThroughRelayer(
      order,
      secret,
      this.auth,
      this.url,
    );
    if (redeemResult.error) {
      console.error('[redeem] Redeem failed:', redeemResult.error);
      return Err(redeemResult.error);
    }
    console.log('[redeem] Redeem succeeded:', redeemResult.val);
    return Ok(redeemResult.val!);
  }

  async refund(): AsyncResult<string, string> {
    console.log('[refund] Refund called, not supported by relayer');
    return Err('Refund is taken care of by the relayer');
  }
}
