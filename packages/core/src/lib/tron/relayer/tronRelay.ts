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
import {
  Adapter,
  SignedTransaction,
} from '@tronweb3/tronwallet-abstract-adapter';
import { TypedDataField } from 'tronweb/lib/esm/utils';

export type TronRelayOptions = {
  fullHost: string;
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
    console.log(
      '[TronRelay constructor] relayerUrl:',
      relayerUrl,
      'network:',
      network,
      'options:',
      options,
    );
    // FIX: Use the actual relayerUrl parameter instead of hardcoding
    this.url =
      typeof relayerUrl === 'string' ? new Url(relayerUrl) : relayerUrl;
    this.auth = auth;
    this.tronweb = new TronWeb({
      fullHost: options.fullHost,
      ...(options.solidityNode ? { solidityNode: options.solidityNode } : {}),
      ...(options.eventServer ? { eventServer: options.eventServer } : {}),
      // FIX: Set private key if provided
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
      return this.initiateWithCreateOrderResponse(order);
    }
    console.log(
      '[initiate] Non-Tron order, returning order_id:',
      order.order_id,
    );
    return Ok(order.order_id);
  }

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
        // FIX: For adapter signing, we need to use signTypedData if available
        // or construct the transaction properly
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
          // Fallback: build transaction from initiate_transaction if available
          if (!order.initiate_transaction) {
            return Err(
              'Adapter does not support typed data signing and no initiate_transaction provided',
            );
          }
          // Explicitly cast order as TronOrderResponse to avoid never type
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

        // Try different signing approaches based on TronWeb version
        try {
          // Method 1: Try with _signTypedData (TronWeb v5+)
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

          // Method 2: Use signMessageV2 or construct manually
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
      // Build the transaction
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

      // Extract signature from signed transaction
      console.log('signedTx :', signedTx);
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
      // Submit to relayer
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
   * Execute ERC20/TRC20 approval transaction if required.
   */
  private async executeApprovalTransaction(
    order: EvmOrderResponse,
  ): AsyncResult<string, string> {
    console.log('[executeApprovalTransaction] order:', order);
    if (!this.htlcActorAddress || this.htlcActorAddress === '') {
      console.log('[executeApprovalTransaction] No HTLC actor address found');
      return Err('No HTLC actor address found');
    }
    if (!order.approval_transaction) {
      console.log(
        '[executeApprovalTransaction] No approval transaction required',
      );
      return Ok('No approval transaction required');
    }

    console.log(
      '[executeApprovalTransaction] Triggering approval transaction',
      {
        to: order.approval_transaction.to,
        data: order.approval_transaction.data,
      },
    );

    try {
      // FIX: Properly build the transaction with correct parameters
      const txResult =
        await this.tronweb.transactionBuilder.triggerSmartContract(
          order.approval_transaction.to,
          order.approval_transaction.data,
          {
            feeLimit: parseInt(order.approval_transaction.gas_limit),
            callValue: parseInt(order.approval_transaction.value || '0'),
          },
          [],
          this.htlcActorAddress,
        );

      if (!txResult || !txResult.transaction) {
        console.error(
          '[executeApprovalTransaction] Failed to build transaction',
        );
        return Err('Failed to build approval transaction');
      }

      console.log(
        '[executeApprovalTransaction] Approval transaction built:',
        txResult.transaction,
      );

      let signedTx;
      if (this.options.adapter) {
        // Use adapter to sign
        signedTx = await this.options.adapter.signTransaction(
          txResult.transaction,
        );
        // Adapter may return different format, need to broadcast it
        const broadcastResult = await this.tronweb.trx.sendRawTransaction(
          signedTx,
        );
        if (!broadcastResult.result) {
          console.error(
            '[executeApprovalTransaction] Approval transaction broadcast failed:',
            broadcastResult,
          );
          return Err(broadcastResult.message || 'Broadcast failed');
        }
        console.log(
          '[executeApprovalTransaction] Approval transaction succeeded, txid:',
          broadcastResult.txid,
        );
        return Ok(broadcastResult.txid);
      } else {
        // Use TronWeb to sign
        signedTx = await this.tronweb.trx.sign(
          txResult.transaction,
          this.options.privateKey,
        );
        console.log(
          '[executeApprovalTransaction] Signed approval transaction:',
          signedTx,
        );

        const receipt = await this.tronweb.trx.sendRawTransaction(signedTx);
        console.log(
          '[executeApprovalTransaction] Approval transaction receipt:',
          receipt,
        );

        if (!receipt.result) {
          console.error(
            '[executeApprovalTransaction] Approval transaction failed:',
            receipt.message || receipt.code,
          );
          return Err(
            (receipt.message || receipt.code || 'Transaction failed') as string,
          );
        }
        console.log(
          '[executeApprovalTransaction] Approval transaction succeeded, txid:',
          receipt.txid,
        );
        return Ok(receipt.txid);
      }
    } catch (e) {
      console.error('[executeApprovalTransaction] Exception occurred:', e);
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
