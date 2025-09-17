import { web3, BN } from '@coral-xyz/anchor';
import { hex } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import { Order } from '@gardenfi/orderbook';

/**
 * A Swap configuration in Solana
 */
export class SwapConfig {
  public swapId: number[];
  public redeemer: web3.PublicKey;
  public secretHash: number[];
  public amount: BN;
  public expiresIn: BN;

  /**
   * @param swapId - A Unique 32-bit ID to represent this configuration in hex
   * @param redeemer - The Solana address of redeemer in base58
   * @param secretHash - The 32-bit Secret Hash used for this Swap in hex
   * @param amount - The Swap amount in lowest denomination
   * @param expiresIn - The number of Slots in which the Swap should expire. (1 Solana Slot = 400 ms)
   */
  constructor(
    swapId: string,
    redeemer: string,
    secretHash: string,
    amount: bigint,
    expiresIn: number,
  ) {
    try {
      this.swapId = Array.from(Buffer.from(swapId, 'hex'));
      this.secretHash = Array.from(Buffer.from(secretHash, 'hex'));
    } catch (cause) {
      throw new Error('Error decoding swapId or secretHash', { cause });
    }
    if (this.secretHash.length != 32 || this.swapId.length != 32) {
      throw new Error('swapId or secretHash must be exactly 32 bits in size');
    }

    try {
      this.redeemer = new web3.PublicKey(redeemer);
    } catch (cause) {
      throw new Error(
        'Error decoding redeemer. Ensure it is a valid base58 encoded',
        { cause },
      );
    }
    try {
      this.amount = new BN(amount.toString(10), 10);
      this.expiresIn = new BN(expiresIn);
    } catch (cause) {
      throw new Error('Error decoding amount. Invalid value for amount', {
        cause,
      });
    }
    if (!(Number.isInteger(expiresIn) && expiresIn > 0))
      throw new Error('expiresIn must be a positive integer.');
  }

  /**
   * Constructs a SwapConfig from a matched order object with Solana as a source swap
   * @param order - The Order with a Solana as source swap
   */
  static from(order: Order): SwapConfig {
    let swap;
    if (order.source_swap.chain.includes('solana')) swap = order.source_swap;
    else if (order.destination_swap.chain.includes('solana'))
      swap = order.destination_swap;
    else
      throw new Error(
        "Expected source_swap or destination_swap to be one of 'solana', 'solana_localnet', 'solana_devnet'",
      );

    const { swap_id, redeemer, secret_hash, timelock } = swap;
    const amount = BigInt(swap.amount);
    return new SwapConfig(swap_id, redeemer, secret_hash, amount, timelock);
  }
}

/**
 * Checks whether given secret is a valid 32 byte hex string.
 * @returns Validated and decoded secret
 */
export function validateSecret(secret: string): number[] {
  let secretBuf;
  try {
    secretBuf = [...hex.decode(secret)];
  } catch (cause) {
    throw new Error('Error decoding secret. Ensure it is a hex string', {
      cause,
    });
  }
  if (secretBuf.length != 32) {
    throw new Error(
      'Invalid Secret size. Expected 32 bytes, got ' + secretBuf.length,
    );
  }
  return secretBuf;
}
