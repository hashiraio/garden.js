import {
  APIResponse,
  AsyncResult,
  DigestKey,
  Err,
  EventBroker,
  Fetcher,
  IAuth,
  Ok,
  trim0x,
  Url,
} from '@gardenfi/utils';
import { GardenEvents, GardenHTLCModules } from './../garden.types';
import {
  BlockchainType,
  getBlockchainType,
  IOrderbook,
  isBitcoin,
  Order,
  OrderLifecycle,
} from '@gardenfi/orderbook';
import {
  isCompleted,
  OrderAction,
  OrderStatus,
  parseAction,
  ParseOrderStatus,
} from '../../orderStatus/orderStatus';
import { ISecretManager } from '../../secretManager/secretManager.types';
import { SecretManager } from '../../secretManager/secretManager';
import { GardenCache } from '../cache/GardenCache';
import { Api } from '../../constants';

export class Executor extends EventBroker<GardenEvents> {
  private htlcs: GardenHTLCModules;
  #digestKey: DigestKey;
  #orderbook: IOrderbook;
  #secretManager: ISecretManager;
  #cacheManager: GardenCache;
  #auth: IAuth;
  #api: Api;

  constructor(
    digestKey: DigestKey,
    htlcs: GardenHTLCModules,
    orderbook: IOrderbook,
    auth: IAuth,
    api: Api,
  ) {
    super();
    this.htlcs = htlcs;
    this.#digestKey = digestKey;
    this.#orderbook = orderbook;
    this.#secretManager = SecretManager.fromDigestKey(digestKey.digestKey);
    this.#cacheManager = new GardenCache();
    this.#auth = auth;
    this.#api = api;
  }

  async execute(interval: number = 5000): Promise<() => void> {
    return await this.#orderbook.subscribeOrders(
      {
        address: this.#digestKey.userId,
        status: OrderLifecycle.pending,
        per_page: 500,
      },
      async (pendingOrders) => {
        const ordersWithStatus = pendingOrders.data.map((order) => {
          return { ...order, status: ParseOrderStatus(order) };
        });
        this.emit('onPendingOrdersChanged', ordersWithStatus);
        if (pendingOrders.data.length === 0) return;

        for (const order of ordersWithStatus) {
          const orderAction = parseAction(order);

          if (
            isBitcoin(order.source_swap.chain) &&
            // post refund sacp for bitcoin orders only at relevent statuses
            (order.status === OrderStatus.InitiateDetected ||
              order.status === OrderStatus.AwaitingRefund ||
              order.status === OrderStatus.Initiated ||
              order.status === OrderStatus.RefundDetected ||
              order.status === OrderStatus.Refunded ||
              order.status === OrderStatus.Expired) &&
            !isCompleted(order)
          ) {
            await this.postRefundSACP(order);
          }

          switch (orderAction) {
            case OrderAction.Redeem: {
              const secrets = await this.#secretManager.generateSecret(
                order.nonce,
              );
              if (!secrets.ok) {
                this.emit('error', order, secrets.error);
                return;
              }

              const secret = secrets.val.secret;
              switch (getBlockchainType(order.destination_swap.chain)) {
                case BlockchainType.EVM:
                  await this.evmRedeem(order, secret);
                  break;
                case BlockchainType.Bitcoin: {
                  await this.btcRedeem(order, secret);
                  break;
                }
                case BlockchainType.Starknet: {
                  await this.starknetRedeem(order, secret);
                  break;
                }
                case BlockchainType.Solana: {
                  await this.solRedeem(order, secrets.val.secret);
                  break;
                }
                case BlockchainType.Sui: {
                  await this.suiRedeem(order, secrets.val.secret);
                  break;
                }
                default:
                  this.emit(
                    'error',
                    order,
                    `Unsupported chain: ${order.destination_swap.chain}`,
                  );
              }
              break;
            }
            case OrderAction.Idle:
              break;
            default:
            //TODO: handle refund case
            // case OrderAction.Refund:
          }
        }
      },
      interval,
    );
  }

  private async evmRedeem(order: Order, secret: string): Promise<void> {
    this.emit('log', order.order_id, 'executing evm redeem');

    const cache = this.#cacheManager.getOrderExecution(
      order,
      OrderAction.Redeem,
    );
    if (cache) {
      this.emit('log', order.order_id, 'already redeemed');
      return;
    }

    if (!this.htlcs.evm) {
      this.emit('error', order, 'EVM HTLC is required');
      return;
    }

    const res = await this.htlcs.evm.redeem(order, secret);

    if (!res.ok) {
      this.emit('error', order, res.error);
      if (res.error.includes('Order already redeemed')) {
        this.#cacheManager.setOrderExecution(
          order,
          OrderAction.Redeem,
          order.destination_swap.redeem_tx_hash,
        );
      }
      return;
    }

    this.#cacheManager.setOrderExecution(order, OrderAction.Redeem, res.val);
    this.emit('success', order, OrderAction.Redeem, res.val);
  }

  private async starknetRedeem(order: Order, secret: string) {
    this.emit('log', order.order_id, 'executing starknet redeem');
    const cache = this.#cacheManager.getOrderExecution(
      order,
      OrderAction.Redeem,
    );
    if (cache) {
      this.emit('log', order.order_id, 'already redeemed');
      return;
    }
    if (!this.htlcs.starknet) {
      this.emit('error', order, 'Starknet HTLC is required');
      return;
    }

    const res = await this.htlcs.starknet.redeem(order, secret);
    if (!res.ok) {
      this.emit('error', order, res.error);
      if (res.error.includes('Order already redeemed')) {
        this.#cacheManager.setOrderExecution(
          order,
          OrderAction.Redeem,
          order.destination_swap.redeem_tx_hash,
        );
      }
      return;
    }
    if (res.val) {
      this.#cacheManager.setOrderExecution(order, OrderAction.Redeem, res.val);
      this.emit('success', order, OrderAction.Redeem, res.val);
    }
  }

  private async solRedeem(order: Order, secret: string) {
    this.emit('log', order.order_id, 'executing sol redeem');
    const cache = this.#cacheManager.getOrderExecution(
      order,
      OrderAction.Redeem,
    );
    if (cache) {
      this.emit('log', order.order_id, 'already redeemed');
      return;
    }

    if (!this.htlcs.solana) {
      this.emit('error', order, 'Solana HTLC is required');
      return;
    }

    const res = await this.htlcs.solana.redeem(order, secret);

    if (res.error) {
      this.emit('error', order, res.error);

      if (res.error.includes('Order already redeemed')) {
        this.#cacheManager.setOrderExecution(
          order,
          OrderAction.Redeem,
          order.destination_swap.redeem_tx_hash,
        );
      }
      return;
    }

    if (res.val) {
      this.#cacheManager.setOrderExecution(order, OrderAction.Redeem, res.val);
      this.emit('success', order, OrderAction.Redeem, res.val);
    }
  }

  private async suiRedeem(order: Order, secret: string) {
    this.emit('log', order.order_id, 'executing sui redeem');
    const cache = this.#cacheManager.getOrderExecution(
      order,
      OrderAction.Redeem,
    );
    if (cache) {
      this.emit('log', order.order_id, 'already redeemed');
      return;
    }

    if (!this.htlcs.sui) {
      this.emit('error', order, 'Sui HTLC is required');
      return;
    }

    const res = await this.htlcs.sui.redeem(order, secret);

    if (res.error) {
      this.emit('error', order, res.error);

      if (res.error.includes('Order already redeemed')) {
        this.#cacheManager.setOrderExecution(
          order,
          OrderAction.Redeem,
          order.destination_swap.redeem_tx_hash,
        );
      }
      return;
    }

    if (res.val) {
      this.#cacheManager.setOrderExecution(order, OrderAction.Redeem, res.val);
      this.emit('success', order, OrderAction.Redeem, res.val);
    }
  }

  private async btcRedeem(order: Order, secret: string) {
    const provider = this.htlcs.bitcoin?.getProvider();
    if (!provider) {
      this.emit('error', order, 'Bitcoin provider not found');
      return;
    }
    const _cache = this.#cacheManager.getBitcoinRedeem(order.order_id);
    const fillerInitTx = order.destination_swap.initiate_tx_hash
      .split(',')
      .at(-1)
      ?.split(':')
      .at(0);
    if (!fillerInitTx) {
      this.emit('error', order, 'Failed to get initiate_tx_hash');
      return;
    }

    let rbf = false;
    if (_cache) {
      if (_cache.redeemedFromUTXO && _cache.redeemedFromUTXO !== fillerInitTx) {
        rbf = true;
        this.emit('log', order.order_id, 'rbf btc redeem');
      } else if (
        _cache.redeemedAt &&
        Date.now() - _cache.redeemedAt > 1000 * 60 * 15 // 15 minutes
      ) {
        this.emit(
          'log',
          order.order_id,
          'redeem not confirmed in last 15 minutes',
        );
        rbf = true;
      } else {
        this.emit('log', order.order_id, 'btcRedeem: already redeemed');
        return;
      }
    } else if (
      //check if redeem tx is valid if cache is not found.
      order.destination_swap.redeem_tx_hash &&
      !Number(order.destination_swap.redeem_block_number)
    ) {
      try {
        const tx = await (
          await provider
        ).getTransaction(order.destination_swap.redeem_tx_hash);

        let isValidRedeem = false;
        for (const input of tx.vin) {
          if (input.txid === fillerInitTx) {
            isValidRedeem = true;
            break;
          }
        }
        if (isValidRedeem) {
          this.emit('log', order.order_id, 'already a valid redeem');
          let redeemedAt = 0;
          try {
            const [_redeemedAt] = await (
              await provider
            ).getTransactionTimes([order.destination_swap.redeem_tx_hash]);
            if (_redeemedAt !== 0) redeemedAt = _redeemedAt;
          } catch {
            // Ignore error - fallback to using current timestamp
            redeemedAt = Date.now();
          }

          this.#cacheManager.setBitcoinRedeem(order.order_id, {
            redeemedFromUTXO: fillerInitTx,
            redeemedAt,
            redeemTxHash: order.destination_swap.redeem_tx_hash,
          });
          return;
        }
        rbf = true;
      } catch (error) {
        if ((error as Error).message.includes('Transaction not found')) {
          rbf = true;
        } else {
          this.emit('error', order, 'Failed to get redeem tx: ' + error);
          return;
        }
      }
    }

    this.emit('log', order.order_id, 'executing btc redeem');
    try {
      if (!this.htlcs.bitcoin) {
        this.emit('error', order, 'Bitcoin HTLC is required');
        return;
      }
      const redeemHex = await this.htlcs.bitcoin.getRedeemHex(
        order,
        trim0x(secret),
        rbf ? [fillerInitTx] : [],
      );
      if (!redeemHex.ok) {
        this.emit('error', order, 'Failed to get redeem hex');
        return;
      }
      const res = await this.broadcastRedeemTx(redeemHex.val, order.order_id);
      if (!res.ok) {
        this.emit('error', order, res.error || 'Failed to broadcast redeem tx');
        return;
      }

      if (rbf) {
        this.emit('log', order.order_id, 'rbf: btc redeem success');
        this.emit('rbf', order, res.val);
      } else this.emit('success', order, OrderAction.Redeem, res.val);
      this.#cacheManager.setBitcoinRedeem(order.order_id, {
        redeemedFromUTXO: fillerInitTx,
        redeemedAt: Date.now(),
        redeemTxHash: res.val,
      });
    } catch (error) {
      this.emit('error', order, 'Failed btc redeem: ' + error);
    }
  }

  private async postRefundSACP(order: Order) {
    // const cachedOrder = this.#cacheManager.getSacpCache(order.order_id);
    // if (cachedOrder?.initTxHash === order.source_swap.initiate_tx_hash) return;
    const userBTCAddress = order.source_swap.delegate;
    if (!userBTCAddress) return;
    try {
      if (!this.htlcs.bitcoin) {
        this.emit('error', order, 'Bitcoin HTLC is required');
        return;
      }
      const authHeaders = await this.#auth.getAuthHeaders();
      if (authHeaders.error) {
        this.emit(
          'error',
          order,
          'Failed to get auth headers: ' + authHeaders.error,
        );
        return;
      }
      const hash = await Fetcher.post<APIResponse<string[]>>(
        new Url(this.#api.baseurl).endpoint(
          'relayer/bitcoin/instant-refund-hash',
        ),
        {
          body: JSON.stringify({
            order_id: order.order_id,
          }),
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders.val,
          },
        },
      );
      if (hash.error || !hash.result) {
        this.emit(
          'error',
          order,
          'Failed to get hash while posting instant refund SACP: ' + hash.error,
        );
        return;
      }

      const signatures =
        await this.htlcs.bitcoin.generateInstantRefundSACPWithHash(hash.result);

      const url = new Url(this.#api.baseurl).endpoint(
        'relayer/bitcoin/instant-refund',
      );

      const res = await Fetcher.post<AsyncResult<string, string>>(url, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders.val,
        },
        body: JSON.stringify({
          order_id: order.order_id,
          signatures: signatures.val,
        }),
      });
      if (res.ok) {
        this.#cacheManager.setSacpCache(order.order_id, {
          initTxHash: order.source_swap.initiate_tx_hash,
        });
      }
    } catch (error) {
      this.emit('error', order, 'Failed to generate and post SACP: ' + error);
      return;
    }
  }

  private async broadcastRedeemTx(redeemTx: string, orderId: string) {
    try {
      if (!this.#api) return Err('API not found');
      const url = new Url(this.#api.relayer).endpoint('/bitcoin/redeem ');
      const authHeaders = await this.#auth.getAuthHeaders();
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders.val,
        },
        body: JSON.stringify({
          redeem_tx_bytes: redeemTx,
          order_id: orderId,
        }),
      });

      const resJson: APIResponse<string> = await res.json();

      if (resJson.status === 'Ok' && resJson.result) {
        return Ok(resJson.result);
      }
      return Err(resJson.error);
    } catch (error) {
      return Err('Failed to broadcast redeem tx: ' + error);
    }
  }
}
