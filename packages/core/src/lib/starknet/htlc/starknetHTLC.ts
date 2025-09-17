import { STARKNET_CONFIG } from './../../constants';
import { Order } from '@gardenfi/orderbook';
import { Account, cairo, Contract, num, CallData, RpcProvider } from 'starknet';
import { AsyncResult, Err, hexToU32Array, Network, Ok } from '@gardenfi/utils';
import { TokenABI } from '../abi/starknetTokenABI';
import { IStarknetHTLC } from '../starknetHTLC.types';
import { checkAllowanceAndApprove } from '../checkAllowanceAndApprove';
import { starknetHtlcABI } from '../abi/starknetHtlcABI';

export class StarknetHTLC implements IStarknetHTLC {
  private account: Account;
  private starknetProvider: RpcProvider;

  constructor(account: Account, nodeUrl?: string, network?: Network) {
    this.account = account;
    this.starknetProvider = new RpcProvider({
      nodeUrl:
        nodeUrl ||
        (network
          ? STARKNET_CONFIG[network].nodeUrl
          : STARKNET_CONFIG.mainnet.nodeUrl),
    });
  }

  get htlcActorAddress(): string {
    return this.account.address;
  }

  private async getHTLCContract(order: Order, isRedeeming: boolean = false) {
    const assetAddress = isRedeeming
      ? order.destination_swap.asset
      : order.source_swap.asset;
    const contract = new Contract(starknetHtlcABI, assetAddress, this.account);
    return contract;
  }

  /**
   * Initiates the HTLC
   * @param order Order to initiate HTLC for
   * @returns Transaction ID
   */
  async initiate(order: Order): AsyncResult<string, string> {
    try {
      const htlcContract = await this.getHTLCContract(order);

      const token = await htlcContract['token']();
      if (!token) {
        throw new Error('Token address retrieval failed');
      }

      const tokenHex = num.toHex(token);
      const amountUint256 = cairo.uint256(BigInt(order.source_swap.amount));
      // Check allowance
      try {
        const approvalResult = await checkAllowanceAndApprove(
          this.account,
          tokenHex,
          order.source_swap.asset,
          BigInt(order.source_swap.amount),
          this.starknetProvider,
        );
        if (approvalResult.error) return Err(approvalResult.error);
      } catch (error) {
        return Err(`Allowance check failed: ${error}`);
      }
      const secret_hash = order.source_swap.secret_hash;
      if (!secret_hash) {
        return Err('Invalid order: secret_hash is undefined');
      }

      const initiateResponse = await this.account.execute({
        contractAddress: order.source_swap.asset,
        entrypoint: 'initiate',
        calldata: [
          order.source_swap.redeemer,
          BigInt(order.source_swap.timelock),
          amountUint256.low,
          amountUint256.high,
          ...hexToU32Array(secret_hash),
        ],
      });

      if (!initiateResponse.transaction_hash) {
        throw new Error('Failed to initiate HTLC transaction');
      }

      return Ok(initiateResponse.transaction_hash);
    } catch (error) {
      return Err(`HTLC Initiation Error: ${error}`);
    }
  }
  callData = new CallData(TokenABI);

  /**
   * Redeems the HTLC
   *
   * @param order Order to redeem HTLC for
   * @param secret Secret to redeem HTLC with
   * @returns Transaction ID
   */
  async redeem(order: Order, secret: string): AsyncResult<string, string> {
    try {
      const htlcContract = await this.getHTLCContract(order, true);
      const swapId = order.source_swap.chain.includes('starknet')
        ? order.source_swap.swap_id
        : order.destination_swap.swap_id;
      const redeemResponse = await this.account.execute({
        contractAddress: htlcContract.address,
        entrypoint: 'redeem',
        calldata: CallData.compile({
          swap_id: swapId,
          secret: hexToU32Array(secret),
        }),
      });
      if (!redeemResponse.transaction_hash) {
        return Err('Failed to redeem HTLC transaction');
      }
      return Ok(redeemResponse.transaction_hash);
    } catch (error) {
      return Err(`HTLC Redeem Error`);
    }
  }

  /**
   * Refunds the HTLC
   *
   * @param order Order to refund HTLC for
   * @returns Refund transaction ID
   */
  async refund(order: Order): AsyncResult<string, string> {
    try {
      const swapId = order.source_swap.chain.includes('starknet')
        ? order.source_swap.swap_id
        : order.destination_swap.swap_id;
      const htlcContract = await this.getHTLCContract(order);
      const refundResponse = await this.account.execute({
        contractAddress: htlcContract.address,
        entrypoint: 'refund',
        calldata: {
          orderId: swapId,
        },
      });
      if (!refundResponse.transaction_hash) {
        return Err('Failed to refund HTLC transaction');
      }

      return Ok(refundResponse.transaction_hash);
    } catch (error) {
      return Err(`HTLC Refund Error`);
    }
  }
}
