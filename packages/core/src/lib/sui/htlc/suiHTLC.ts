import { Order } from '@gardenfi/orderbook';
import { AsyncResult, Err, Ok, Url } from '@gardenfi/utils';
import { ISuiHTLC } from '../suiHTLC.types';
import {
  getFullnodeUrl,
  SuiClient,
  SuiTransactionBlockResponse,
} from '@mysten/sui/client';
import { Network } from '@gardenfi/utils';
import { Transaction } from '@mysten/sui/transactions';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';
import { SUI_CONFIG } from '../../constants';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
  SuiSignAndExecuteTransaction,
  SuiSignAndExecuteTransactionOutput,
  type WalletWithRequiredFeatures,
} from '@mysten/wallet-standard';
import { getAssetInfoFromOrder } from '../../utils';

export class SuiHTLC implements ISuiHTLC {
  private client: SuiClient;
  private account: WalletWithRequiredFeatures | Ed25519Keypair;
  private network: Network;
  private url: Url;

  constructor(
    account: WalletWithRequiredFeatures | Ed25519Keypair,
    network: Network,
    url: Url,
  ) {
    this.client = new SuiClient({ url: getFullnodeUrl(network) });
    this.account = account;
    this.network = network;
    this.url = url;
  }

  get htlcActorAddress(): string {
    return 'accounts' in this.account
      ? this.account.accounts[0].address
      : this.account.toSuiAddress();
  }

  /**
   * Initiates the HTLC
   * @param order Order to initiate HTLC for
   * @returns Transaction ID
   */
  async initiate(order: Order): AsyncResult<string, string> {
    try {
      const { source_swap } = order;

      const amount = BigInt(source_swap.amount);
      const registryId = source_swap.asset;
      const solverAddress = source_swap.redeemer;
      const secretHash = source_swap.secret_hash;

      const assetInfo = await getAssetInfoFromOrder(
        source_swap.asset,
        this.url,
      );

      if (!assetInfo.ok) {
        return Err(assetInfo.error);
      }

      const tx = new Transaction();
      tx.setSender(this.htlcActorAddress);

      const [coin] = tx.splitCoins(tx.gas, [amount]);

      tx.moveCall({
        target: `${SUI_CONFIG[this.network].packageId}::${
          SUI_CONFIG[this.network].moduleName
        }::initiate`,
        typeArguments: [assetInfo.val?.tokenAddress],
        arguments: [
          tx.object(registryId),
          tx.pure.address(this.htlcActorAddress),
          tx.pure.address(solverAddress),
          tx.pure.vector('u8', Buffer.from(secretHash, 'hex')),
          tx.pure.u64(amount),
          tx.pure.u256(source_swap.timelock),
          tx.pure.vector('u8', Buffer.from('')),
          coin,
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });

      const data = await tx.build({ client: this.client });

      const dryRunResult = await this.client.dryRunTransactionBlock({
        transactionBlock: data,
      });
      if (dryRunResult.effects.status.status === 'failure') {
        return Err(`${dryRunResult.effects.status.error}`);
      }

      let initResult:
        | SuiSignAndExecuteTransactionOutput
        | SuiTransactionBlockResponse
        | undefined;
      if ('features' in this.account) {
        initResult = await this.account.features[
          SuiSignAndExecuteTransaction
        ]?.signAndExecuteTransaction({
          transaction: tx,
          account: this.account.accounts[0],
          chain: this.account.chains[0],
        });
      } else {
        initResult = await this.client.signAndExecuteTransaction({
          signer: this.account,
          transaction: tx,
          options: {
            showEffects: true,
          },
        });
      }
      if (!initResult) {
        return Err(`Failed to initiate`);
      }

      const transaction = await this.client.waitForTransaction({
        digest: initResult.digest,
        options: {
          showEffects: true,
        },
      });
      if (transaction.effects?.status.status === 'failure') {
        return Err(`Failed to initiate: ${transaction.effects?.status.error}`);
      }

      return Ok(transaction.digest);
    } catch (error) {
      return Err(error as string);
    }
  }

  /**
   * Redeems the HTLC
   *
   * @param order Order to redeem HTLC for
   * @param secret Secret to redeem HTLC with
   * @returns Transaction ID
   */
  async redeem(order: Order, secret: string): AsyncResult<string, string> {
    try {
      const { destination_swap } = order;

      const registryId = destination_swap.asset;

      const assetInfo = await getAssetInfoFromOrder(
        destination_swap.asset,
        this.url,
      );

      if (!assetInfo.ok) {
        return Err(assetInfo.error);
      }

      const tx = new Transaction();
      tx.setSender(this.htlcActorAddress);

      tx.moveCall({
        target: `${SUI_CONFIG[this.network].packageId}::${
          SUI_CONFIG[this.network].moduleName
        }::redeem`,
        typeArguments: [assetInfo.val?.tokenAddress],
        arguments: [
          tx.object(registryId),
          tx.pure.vector('u8', Buffer.from(destination_swap.swap_id, 'hex')),
          tx.pure.vector('u8', Buffer.from(secret, 'hex')),
        ],
      });

      const data = await tx.build({ client: this.client });

      const dryRunResult = await this.client.dryRunTransactionBlock({
        transactionBlock: data,
      });
      if (dryRunResult.effects.status.status === 'failure') {
        return Err(`${dryRunResult.effects.status.error}`);
      }

      let redeemResult:
        | SuiSignAndExecuteTransactionOutput
        | SuiTransactionBlockResponse
        | undefined;
      if ('features' in this.account) {
        redeemResult = await this.account.features[
          SuiSignAndExecuteTransaction
        ]?.signAndExecuteTransaction({
          transaction: tx,
          account: this.account.accounts[0],
          chain: this.account.chains[0],
        });
      } else {
        redeemResult = await this.client.signAndExecuteTransaction({
          signer: this.account,
          transaction: tx,
          options: {
            showEffects: true,
          },
        });
      }

      if (!redeemResult) {
        return Err(`Failed to redeem`);
      }

      const transaction = await this.client.waitForTransaction({
        digest: redeemResult.digest,
        options: {
          showEffects: true,
        },
      });
      if (transaction.effects?.status.status === 'failure') {
        return Err(`Failed to redeem: ${transaction.effects?.status.error}`);
      }

      return Ok(transaction.digest);
    } catch (error) {
      return Err(error as string);
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
      const { source_swap } = order;

      const registryId = source_swap.asset;

      const assetInfo = await getAssetInfoFromOrder(
        source_swap.asset,
        this.url,
      );

      if (!assetInfo.ok) {
        return Err(assetInfo.error);
      }

      const tx = new Transaction();
      tx.setSender(this.htlcActorAddress);

      tx.moveCall({
        target: `${SUI_CONFIG[this.network].packageId}::${
          SUI_CONFIG[this.network].moduleName
        }::refund`,
        typeArguments: [assetInfo.val?.tokenAddress],
        arguments: [
          tx.object(registryId),
          tx.pure.vector('u8', Buffer.from(source_swap.swap_id, 'hex')),
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });

      const data = await tx.build({ client: this.client });

      const dryRunResult = await this.client.dryRunTransactionBlock({
        transactionBlock: data,
      });

      if (dryRunResult.effects.status.status === 'failure') {
        return Err(`${dryRunResult.effects.status.error}`);
      }

      let refundResult:
        | SuiSignAndExecuteTransactionOutput
        | SuiTransactionBlockResponse
        | undefined;
      if ('features' in this.account) {
        refundResult = await this.account.features[
          SuiSignAndExecuteTransaction
        ]?.signAndExecuteTransaction({
          transaction: tx,
          account: this.account.accounts[0],
          chain: this.account.chains[0],
        });
      } else {
        refundResult = await this.client.signAndExecuteTransaction({
          signer: this.account,
          transaction: tx,
          options: {
            showEffects: true,
          },
        });
      }
      if (!refundResult) {
        return Err(`Failed to refund`);
      }

      const transaction = await this.client.waitForTransaction({
        digest: refundResult.digest,
        options: {
          showEffects: true,
        },
      });
      if (transaction.effects?.status.status === 'failure') {
        return Err(`Failed to refund: ${transaction.effects?.status.error}`);
      }

      return Ok(transaction.digest);
    } catch (error) {
      return Err(error as string);
    }
  }
}
