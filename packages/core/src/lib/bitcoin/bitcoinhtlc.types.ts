import { Order } from '@gardenfi/orderbook';
import { AsyncResult } from '@gardenfi/utils';
import { IBitcoinProvider } from './provider/provider.interface';

export interface IBitcoinHTLC {
  /**
   * Initiates the HTLC by sending funds to the HTLC contract.
   * @param order - The matched order.
   * @returns A promise resolving to the transaction hash of the initiation.
   */
  initiate(order: Order, fee?: number): AsyncResult<string, string>;

  /**
   * Redeems funds from the HTLC contract to the actor's address.
   * @param order - The matched order.
   * @param secret - The secret required to unlock the htlc.
   * @returns A promise resolving to the transaction hash of the redemption.
   */
  redeem(order: Order, secret: string): AsyncResult<string, string>;

  /**
   * Refunds funds from the HTLC contract back to the actor's address upon expiration.
   * @param order - The matched order.
   * @returns A promise resolving to the transaction hash of the refund.
   */
  refund(order: Order): AsyncResult<string, string>;

  /**
   * Generates the instant refund SACP with the hash of the refund transaction.
   * @param hash - The hash of the refund transaction.
   * @returns A promise resolving to the SACP.
   */
  generateInstantRefundSACPWithHash(
    hash: string[],
  ): AsyncResult<string[], string>;

  /**
   * Generates the redeem SACP with the secret.
   * @param order - The matched order.
   * @param secret - The secret required to unlock the htlc.
   * @returns A promise resolving to the SACP.
   */
  getRedeemHex(
    order: Order,
    secret: string,
    utxoHashes?: string[],
  ): AsyncResult<string, string>;

  /**
   * Gets the provider of the wallet.
   * @returns A promise resolving to the provider.
   */
  getProvider(): Promise<IBitcoinProvider>;

  /**
   * Gets the public key of the wallet.
   * @returns A promise resolving to the public key.
   */
  getPublicKey(): Promise<string>;
  /**
   * Returns the HTLC actor address.
   * This is the user's wallet address in the case of EVM.
   */
  htlcActorAddress(): Promise<string>;
}
