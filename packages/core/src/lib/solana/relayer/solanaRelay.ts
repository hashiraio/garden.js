import { web3, AnchorProvider, Program } from '@coral-xyz/anchor';
import rawSplIdl from '../idl/spl/solana_spl_swaps.json';
import rawNativeIdl from '../idl/native/solana_native_swaps.json';
import { SolanaSplSwaps } from '../idl/spl/solana_spl_swaps';
import { SolanaNativeSwaps } from '../idl/native/solana_native_swaps';
import { SwapConfig, validateSecret } from '../solanaTypes';
import {
  APIResponse,
  AsyncResult,
  Err,
  Fetcher,
  IAuth,
  Ok,
  Url,
} from '@gardenfi/utils';
import { ISolanaHTLC } from '../htlc/ISolanaHTLC';
import {
  isSolanaNativeToken,
  Order,
  SolanaOrderResponse,
  Orderbook,
  IOrderbook,
  isSolanaOrderResponse,
  ChainAsset,
  ChainAssetString,
} from '@gardenfi/orderbook';
import {
  getAssetInfoFromOrder,
  waitForSolanaTxConfirmation,
} from '../../utils';
import * as Spl from '@solana/spl-token';

/**
 * A Relay is an endpoint that submits the transaction on-chain on one's behalf, paying any fees.
 * SolanaRelay is a unified implementation that performs atomic swaps for both SPL and native tokens.
 */
export class SolanaRelay implements ISolanaHTLC {
  /**
   * The on-chain Program Derived Address (PDA) that facilitates this swap.
   * A PDA represents an on-chain memory space. It can store SOL too and is owned by a program (that derived it).
   * This PDA stores the swap state (initiator, redeemer, secrethash etc) on-chain and also escrows the tokens/SOL.
   */
  private splProgram?: Program<SolanaSplSwaps>;
  private nativeProgram?: Program<SolanaNativeSwaps>;
  private relayer: web3.PublicKey;
  private orderbook: IOrderbook;
  private auth: IAuth;

  /**
   * Creates a new instance of SolanaRelay.
   * @param {AnchorProvider} provider - An abstraction of RPC connection and a Wallet
   * @param {Url} endpoint - API endpoint of the relayer node
   * @param {string} relayer - On-chain address of the relayer in base58 format
   * @param {string} splProgramAddress - On-chain address of the SPL token swap program
   * @param {string} nativeProgramAddress - On-chain address of the native token swap program
   * @throws {Error} If any required parameters are missing or invalid
   */
  constructor(
    private provider: AnchorProvider,
    private url: Url,
    relayer: string,
    programAddress: {
      native?: string;
      spl?: string;
    },
    auth: IAuth,
  ) {
    if (!provider) throw new Error('Provider is required');
    if (!url) throw new Error('Endpoint URL is required');
    if (!relayer) throw new Error('Relayer address is required');

    try {
      this.relayer = new web3.PublicKey(relayer);
      this.orderbook = new Orderbook(url);
      this.auth = auth;
    } catch (cause) {
      throw new Error(
        'Error decoding relayer public key. Ensure it is base58 encoded.',
        { cause },
      );
    }

    // Initialize SPL program
    const splIdlWithAddress = programAddress.spl
      ? {
          ...rawSplIdl,
          metadata: {
            ...(rawSplIdl.metadata ?? {}),
          },
          address: programAddress.spl,
        }
      : undefined;

    // Initialize Native program
    const nativeIdlWithAddress = programAddress.native
      ? {
          ...rawNativeIdl,
          metadata: {
            ...(rawNativeIdl.metadata ?? {}),
          },
          address: programAddress.native,
        }
      : undefined;

    try {
      this.splProgram = splIdlWithAddress
        ? new Program(
            splIdlWithAddress as unknown as SolanaSplSwaps,
            this.provider,
          )
        : undefined;

      this.nativeProgram = nativeIdlWithAddress
        ? new Program(
            nativeIdlWithAddress as unknown as SolanaNativeSwaps,
            this.provider,
          )
        : undefined;
    } catch (cause) {
      throw new Error(
        'Error creating Program instances. Ensure the IDLs and provider are correct.',
        { cause },
      );
    }
  }

  /**
   * Gets the on-chain address of the current user's wallet.
   * @returns {string} The wallet's on-chain address in base58 format
   * @throws {Error} If no provider public key is found
   */
  get htlcActorAddress(): string {
    if (!this.provider.publicKey)
      throw new Error('No provider public key found');
    return this.provider.publicKey.toBase58();
  }

  /**
   * Sends a transaction via the relayer for SPL tokens.
   * @param {web3.Transaction} transaction - The transaction to send
   * @param {string} orderId - The order ID for tracking
   * @returns {Promise<AsyncResult<string, string>>} A promise that resolves to either:
   *   - Ok with the transaction ID on success
   *   - Err with an error message on failure
   * @private
   */
  private async sendSplViaRelayer(
    transaction: web3.Transaction,
    orderId: string,
  ): AsyncResult<string, string> {
    try {
      transaction.recentBlockhash = (
        await this.provider.connection.getLatestBlockhash()
      ).blockhash;
      transaction.feePayer = this.relayer;

      const signedTransaction = await this.provider.wallet.signTransaction(
        transaction,
      );

      const encodedTx = signedTransaction
        .serialize({ requireAllSignatures: false })
        .toString('base64');

      const res: APIResponse<string> = await Fetcher.post(
        this.url.endpoint('/initiate'),
        {
          body: JSON.stringify({
            order_id: orderId,
            serialized_tx: encodedTx,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (res.error || !res.result) {
        return Err(`Error from Relayer: ${res.error}`);
      }

      const isConfirmed = await waitForSolanaTxConfirmation(
        this.provider.connection,
        res.result,
      );
      return isConfirmed
        ? Ok(res.result)
        : Err('Relayer: Failed to Initiate swap, confirmation timed out');
    } catch (error) {
      return Err(
        `Failed to send SPL transaction: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Initiates a swap directly via HTLC (without relayer).
   * @param {web3.Transaction} transaction - The transaction to send
   * @param {Order} order - The matched order
   * @returns {Promise<AsyncResult<string, string>>} A promise that resolves to either:
   *   - Ok with the transaction ID on success
   *   - Err with an error message on failure
   * @private
   */
  private async initiateViaHTLC(
    transaction: web3.Transaction,
    order: Order,
  ): AsyncResult<string, string> {
    if (!order) return Err('Order is required');

    try {
      const txHash = await this.provider.sendAndConfirm(transaction);

      if (!txHash) return Err('Failed to initiate HTLC transaction');

      const isConfirmed = await waitForSolanaTxConfirmation(
        this.provider.connection,
        txHash,
      );

      return isConfirmed
        ? Ok(txHash)
        : Err('HTLC: Failed to Initiate swap, confirmation timed out');
    } catch (error) {
      return Err(
        `Error initiating swap: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Initiates a swap for SPL tokens.
   * @param {Order} order - The matched order containing swap details
   * @returns {Promise<AsyncResult<string, string>>} A promise that resolves to either:
   *   - Ok with the transaction ID on success
   *   - Err with an error message on failure
   * @private
   */
  private async initiateSplSwap(order: Order): AsyncResult<string, string> {
    if (!this.splProgram) return Err('SPL program is not initialized');
    try {
      const { redeemer, secretHash, amount, expiresIn } =
        SwapConfig.from(order);

      const txBuilder = this.splProgram.methods.initiate(
        expiresIn,
        redeemer,
        secretHash,
        amount,
        null,
      );

      const assetInfo = await getAssetInfoFromOrder(
        order.source_swap.asset,
        this.url,
      );

      if (!assetInfo.ok) {
        return Err(assetInfo.error);
      }
      const { tokenAddress } = assetInfo.val;

      const mint = new web3.PublicKey(tokenAddress);
      const accounts = {
        initiator: this.provider.publicKey,
        mint,
        initiatorTokenAccount: Spl.getAssociatedTokenAddressSync(
          mint,
          this.provider.publicKey,
        ),
        sponsor: this.relayer,
      };

      const tx = await txBuilder.accounts(accounts).transaction();
      return this.sendSplViaRelayer(tx, order.order_id);
    } catch (error) {
      return Err(
        `Error initiating SPL swap: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Initiates a swap for native tokens (SOL).
   * @param {Order} order - The matched order containing swap details
   * @returns {Promise<AsyncResult<string, string>>} A promise that resolves to either:
   *   - Ok with the transaction ID on success
   *   - Err with an error message on failure
   * @private
   */
  private async initiateNativeSwap(order: Order): AsyncResult<string, string> {
    if (!this.nativeProgram) return Err('Native program is not initialized');
    try {
      const { redeemer, secretHash, amount, expiresIn } =
        SwapConfig.from(order);

      const tx = await this.nativeProgram.methods
        .initiate(amount, expiresIn, redeemer, secretHash)
        .accounts({ initiator: this.provider.publicKey })
        .transaction();

      return this.initiateViaHTLC(tx, order);
    } catch (error) {
      return Err(
        `Error initiating native swap: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Initiates a swap by creating a new swap account and locking funds.
   * Automatically detects whether to use SPL or native token handling.
   * @param {Order} order - The matched order containing swap details
   * @returns {Promise<AsyncResult<string, string>>} A promise that resolves to either:
   *   - Ok with the transaction ID on success
   *   - Err with an error message on failure
   */
  async initiate(
    order: Order | SolanaOrderResponse,
  ): AsyncResult<string, string> {
    if (!order) {
      return Err('Order is required');
    }

    if (isSolanaOrderResponse(order)) {
      return this.initiateWithCreateOrderResponse(order);
    }

    try {
      const asset = ChainAsset.fromString(
        order.source_swap.asset as ChainAssetString,
      );
      const isNative = isSolanaNativeToken(asset.getChain(), asset.getSymbol());

      if (isNative) {
        if (!this.nativeProgram)
          return Err('Native program is not initialized');
        return await this.initiateNativeSwap(order);
      } else {
        if (!this.splProgram) return Err('SPL program is not initialized');
        return await this.initiateSplSwap(order);
      }
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
   * @returns {Promise<AsyncResult<string, string>>} A promise that resolves to either:
   *   - Ok with the transaction ID on success
   *   - Err with an error message on failure
   */
  async redeem(order: Order, secret: string): AsyncResult<string, string> {
    try {
      const headers = await this.auth.getAuthHeaders();
      if (!headers.ok) return Err(headers.error);

      const _secret = validateSecret(secret);
      const res: APIResponse<string> = await Fetcher.patch<APIResponse<string>>(
        this.url
          .endpoint('/v2/orders')
          .endpoint(order.order_id)
          .addSearchParams({ action: 'redeem' }),
        {
          body: JSON.stringify({
            secret: Buffer.from(_secret).toString('hex'),
          }),
          headers: {
            ...headers.val,
            'Content-Type': 'application/json',
          },
        },
      );
      if (res.error || !res.result) {
        return Err(`Redeem: Error from relayer: ${res.error}`);
      }

      const txHash = res.result;

      const isConfirmed = await waitForSolanaTxConfirmation(
        this.provider.connection,
        txHash,
      );

      return isConfirmed
        ? Ok(txHash)
        : Err('Redeem: Timed out waiting for confirmation');
    } catch (error) {
      console.error('Redeem: Caught exception:', error);
      return Err(`Error redeeming: ${error}`);
    }
  }

  private async initiateWithCreateOrderResponse(
    order: SolanaOrderResponse,
  ): AsyncResult<string, string> {
    if (!this.relayer) return Err('No relayer address');
    const { versioned_tx, order_id } = order;

    const headers = await this.auth.getAuthHeaders();
    if (!headers.ok) return Err(headers.error);

    try {
      const orderResult = await this.orderbook.getOrder(order_id);
      if (orderResult.error || !orderResult.val) {
        return Err(`Failed to fetch order by id: ${orderResult.error}`);
      }

      const asset = ChainAsset.fromString(
        orderResult.val.source_swap.asset as ChainAssetString,
      );
      if (isSolanaNativeToken(asset.getChain(), asset.getSymbol())) {
        return await this.initiateNativeSwap(orderResult.val);
      }

      const transaction = web3.VersionedTransaction.deserialize(
        Buffer.from(versioned_tx, 'base64'),
      );

      const signedTx = await this.provider.wallet.signTransaction(transaction);

      const signatureBuffer = signedTx.signatures[0];
      if (!signatureBuffer) {
        return Err('No signature found after signing transaction');
      }
      const signatureBase64 = Buffer.from(signedTx.serialize()).toString(
        'base64',
      );

      const res = await Fetcher.patch<APIResponse<string>>(
        this.url
          .endpoint('/v2/orders')
          .endpoint(order.order_id)
          .addSearchParams({ action: 'initiate' }),
        {
          body: JSON.stringify({ serialized_tx: signatureBase64 }),
          headers: {
            ...headers.val,
            'Content-Type': 'application/json',
          },
        },
      );

      if (res.error) {
        return Err(`Initiate: Error from relayer: ${res.error}`);
      }

      if (!res.result) {
        return Err('Initiate: No transaction hash returned from relayer');
      }

      return Ok(res.result);
    } catch (error) {
      return Err(`Error initiating with create order response: ${error}`);
    }
  }
  /**
   * DO NOT CALL THIS FUNCTION. Refund is automatically taken care of by the relayer!
   * This method exists only to satisfy the ISolanaHTLC interface but is not intended for direct use.
   * @param order - Matched order object
   * @returns {AsyncResult<string, string>} Always returns an error message
   * @deprecated This function should never be called directly
   */
  async refund(): AsyncResult<string, string> {
    return Err('Refund is automatically handled by the relayer.');
  }
}
