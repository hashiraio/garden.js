import { web3, AnchorProvider, Program } from '@coral-xyz/anchor';
import idl from '../idl/native/solana_native_swaps.json';
import { SolanaNativeSwaps } from '../idl/native/solana_native_swaps';
import { SwapConfig, validateSecret } from '../solanaTypes';
import { ISolanaHTLC } from './ISolanaHTLC';
import { Order } from '@gardenfi/orderbook';
import { AsyncResult, Err, Ok } from '@gardenfi/utils';

/**
 * SolanaHTLC is an implementation of ISolanaHTLC that performs atomic swaps directly on-chain.
 * As such, fees will be deducted from the initiator.
 * To use a relayer that pays fees on behalf, see SolanaRelay
 */
export class SolanaHTLC implements ISolanaHTLC {
  /**
   * The on-chain Program Derived Address (PDA) that facilitates this swap.
   * Stores the swap state (initiator, redeemer, secrethash etc) and escrows the tokens.
   */
  private swapAccount?: web3.PublicKey;
  private program: Program<SolanaNativeSwaps>;

  /**
   * Creates a new instance of SolanaHTLC.
   * @param {AnchorProvider} provider - Solana Provider (abstraction of RPC connection and a Wallet)
   * @throws {Error} If provider is not provided
   */
  constructor(private provider: AnchorProvider) {
    if (!provider) throw new Error('Provider is required');
    this.provider = provider;
    this.program = new Program(idl as SolanaNativeSwaps, provider);
  }

  /**
   * Gets the on-chain address of the atomic swap program.
   * @returns {string} The program's on-chain address in base58 format
   * @throws {Error} If no program ID is found
   */
  get htlcActorAddress(): string {
    if (!this.program.programId) throw new Error('No program found');
    return this.provider.publicKey.toBase58();
  }

  /**
   * Initiates a swap by creating a new swap account and locking funds.
   * @param {Order} order - The matched order containing swap details
   * @returns {Promise<AsyncResult<string, string>>} A promise that resolves to either:
   *   - Ok with the transaction ID on success
   *   - Err with an error message on failure
   */
  async initiate(order: Order): AsyncResult<string, string> {
    if (!order) return Err('Order is required');

    try {
      const { redeemer, secretHash, amount, expiresIn } =
        SwapConfig.from(order);

      // Initializing the data on blockchain
      const pdaSeeds = [
        Buffer.from('swap_account'),
        this.provider.publicKey.toBuffer(),
        Buffer.from(secretHash),
      ];
      this.swapAccount = web3.PublicKey.findProgramAddressSync(
        pdaSeeds,
        this.program.programId,
      )[0];

      const tx = await this.program.methods
        .initiate(amount, expiresIn, redeemer, secretHash)
        .accounts({ initiator: this.provider.publicKey })
        .transaction();
      const txHex = await this.provider.sendAndConfirm(tx);

      return txHex ? Ok(txHex) : Err('Failed to initiate HTLC transaction');
    } catch (error) {
      return Err(
        `Error initiating swap: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Redeems a swap by providing the secret.
   * @param {Order} order - Matched order object containing swap details
   * @param {string} secret - Secret key in hex format
   * @returns {AsyncResult<string, string>} A promise that resolves to either:
   *   - Ok with the transaction ID on success
   *   - Err with an error message on failure
   */
  async redeem(order: Order, secret: string): AsyncResult<string, string> {
    if (!order) return Err('Order is required');
    if (!secret) return Err('Secret is required');
    const { secretHash } = SwapConfig.from(order);

    const pdaSeeds = [
      Buffer.from('swap_account'),
      this.provider.publicKey.toBuffer(),
      Buffer.from(secretHash),
    ];
    this.swapAccount = web3.PublicKey.findProgramAddressSync(
      pdaSeeds,
      this.program.programId,
    )[0];

    try {
      const { redeemer } = SwapConfig.from(order);
      if (!this.swapAccount)
        return Err(
          'Swap account not initialized. Call initiate() first or provide swap ID.',
        );

      const tx = await this.program.methods
        .redeem(validateSecret(secret))
        .accounts({
          swapAccount: this.swapAccount,
          initiator: this.provider.publicKey,
          redeemer: redeemer,
        })
        .transaction();
      const txId = await this.provider.sendAndConfirm(tx);

      return txId ? Ok(txId) : Err('Failed to redeem HTLC transaction');
    } catch (error) {
      return Err(
        `Error redeeming swap: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Refunds the swap back to the initiator.
   * @param {Order} order - Matched order object
   * @returns {AsyncResult<string, string>} A promise that resolves to either:
   *   - Ok with the transaction ID on success
   *   - Err with an error message on failure
   */
  async refund(order: Order): AsyncResult<string, string> {
    if (!order) return Err('Order is required');

    const { secretHash } = SwapConfig.from(order);
    const pdaSeeds = [Buffer.from('swap_account'), Buffer.from(secretHash)];
    this.swapAccount = web3.PublicKey.findProgramAddressSync(
      pdaSeeds,
      this.program.programId,
    )[0];

    try {
      console.log('Initiating refund for ::', order.source_swap.swap_id);
      if (!this.swapAccount)
        return Err(
          'Swap account not initialized. Call initiate() first or provide swap ID.',
        );

      const tx = await this.program.methods
        .refund()
        .accounts({
          swapAccount: this.swapAccount,
          initiator: this.provider.publicKey,
        })
        .transaction();

      const txId = await this.provider.sendAndConfirm(tx);
      return txId ? Ok(txId) : Err('Failed to refund HTLC transaction');
    } catch (error) {
      return Err(
        `Error refunding swap: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
