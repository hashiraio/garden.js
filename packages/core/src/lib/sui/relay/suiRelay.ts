import {
  isSuiOrderResponse,
  Order,
  SuiOrderResponse,
} from '@gardenfi/orderbook';
import {
  APIResponse,
  AsyncResult,
  Err,
  Fetcher,
  Network,
  Ok,
  Url,
} from '@gardenfi/utils';
import { ISuiHTLC } from '../suiHTLC.types';
import {
  getFullnodeUrl,
  SuiClient,
  SuiTransactionBlockResponse,
} from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';
import { Transaction } from '@mysten/sui/transactions';
import {
  SuiSignAndExecuteTransaction,
  SuiSignAndExecuteTransactionOutput,
  WalletWithRequiredFeatures,
} from '@mysten/wallet-standard';
import { SUI_CONFIG } from '../../constants';
import { getAssetInfoFromOrder } from '../../utils';

export class SuiRelay implements ISuiHTLC {
  private client: SuiClient;
  private url: Url;
  private account: WalletWithRequiredFeatures | Ed25519Keypair;
  private network: Network;

  constructor(
    relayerUrl: string | Url,
    account: WalletWithRequiredFeatures | Ed25519Keypair,
    network: Network,
  ) {
    this.client = new SuiClient({ url: getFullnodeUrl(network) });
    this.url = relayerUrl instanceof Url ? relayerUrl : new Url(relayerUrl);
    this.account = account;
    this.network = network;
  }

  get htlcActorAddress(): string {
    return 'accounts' in this.account
      ? this.account.accounts[0].address
      : this.account.toSuiAddress();
  }

  // ---------------------- INITIATE ----------------------
  async initiate(order: Order | SuiOrderResponse): AsyncResult<string, string> {
    if (!order) {
      return Err('Order is required');
    }
    if (isSuiOrderResponse(order)) {
      return this.initiateWithCreateOrderResponse(order);
    }
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

      const { tokenAddress } = assetInfo.val;

      const tx = new Transaction();
      tx.setSender(this.htlcActorAddress);

      const [coin] = tx.splitCoins(tx.gas, [amount]);

      tx.moveCall({
        target: `${SUI_CONFIG[this.network].packageId}::${
          SUI_CONFIG[this.network].moduleName
        }::initiate`,
        typeArguments: [tokenAddress],
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
          chain: `sui:${this.network}`,
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

  // ---------------------- INITIATE WITH CREATE ORDER RESPONSE ----------------------
  private async initiateWithCreateOrderResponse(
    order: SuiOrderResponse,
  ): AsyncResult<string, string> {
    const { ptb_bytes } = order;
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    const gasPrice = await client.getReferenceGasPrice();
    const estimatedGasBudget = 10000000;

    const transaction = Transaction.fromKind(new Uint8Array(ptb_bytes));
    transaction.setSender(this.htlcActorAddress);
    transaction.setGasPrice(gasPrice);
    transaction.setGasBudget(estimatedGasBudget);

    try {
      let initResult:
        | SuiSignAndExecuteTransactionOutput
        | SuiTransactionBlockResponse
        | undefined;
      if ('features' in this.account) {
        initResult = await this.account.features[
          SuiSignAndExecuteTransaction
        ]?.signAndExecuteTransaction({
          transaction: transaction,
          account: this.account.accounts[0],
          chain: `sui:${this.network}`,
        });
      } else {
        initResult = await this.client.signAndExecuteTransaction({
          signer: this.account,
          transaction: transaction,
          options: {
            showEffects: true,
          },
        });
      }

      if (!initResult) {
        return Err('Failed to initiate');
      }

      const tx = await this.client.waitForTransaction({
        digest: initResult.digest,
        options: {
          showEffects: true,
        },
      });
      if (tx.effects?.status.status === 'failure') {
        return Err(`Failed to initiate: ${tx.effects?.status.error}`);
      }

      return Ok(tx.digest);
    } catch (error) {
      return Err(String(error));
    }
  }

  // ---------------------- REDEEM ----------------------
  async redeem(order: Order, secret: string): AsyncResult<string, string> {
    try {
      const res = await Fetcher.post<APIResponse<string>>(
        this.url.endpoint('redeem'),
        {
          body: JSON.stringify({
            order_id: order.order_id,
            secret: secret,
            perform_on: 'Destination',
          }),
          headers: {
            'Content-Type': 'application/json',
          },
          retryCount: 10,
          retryDelay: 2000,
        },
      );

      if (res.error) return Err(res.error);
      return res.result ? Ok(res.result) : Err('Redeem: No result found');
    } catch (error) {
      return Err(String(error));
    }
  }

  // ---------------------- REFUND ----------------------
  async refund(): AsyncResult<string, string> {
    return Err('Refund is taken care of by the relayer');
  }
}
