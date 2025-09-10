import {
  APIResponse,
  AsyncResult,
  DigestKey,
  Err,
  Fetcher,
  IAuth,
  Ok,
  trim0x,
  Url,
} from '@gardenfi/utils';
import { GardenEventEmitter, GardenHTLCModules } from './../garden.types';

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

export class Executor {
  private htlcs: GardenHTLCModules;
  private events: GardenEventEmitter;
  #digestKey: DigestKey;
  #orderbook: IOrderbook;
  #secretManager: ISecretManager;
  #cacheManager: GardenCache;
  #auth: IAuth;
  #api: Api;
  private isBackgroundServiceRunning: boolean = false;
  private executorStop: (() => void) | null = null;

  constructor(
    digestKey: DigestKey,
    htlcs: GardenHTLCModules,
    orderbook: IOrderbook,
    auth: IAuth,
    api: Api,
    events: GardenEventEmitter,
  ) {
    this.htlcs = htlcs;
    this.events = events;
    this.#digestKey = digestKey;
    this.#orderbook = orderbook;
    this.#secretManager = SecretManager.fromDigestKey(digestKey.digestKey);
    this.#cacheManager = new GardenCache();
    this.#auth = auth;
    this.#api = api;
  }

  private async getAddressesFromHTLCs(): Promise<string[]> {
    const addressSet = new Set<string>();

    // Collect synchronous addresses
    const syncAddresses = [
      this.htlcs.evm?.htlcActorAddress,
      this.htlcs.sui?.htlcActorAddress,
      this.htlcs.solana?.htlcActorAddress,
      this.htlcs.starknet?.htlcActorAddress,
    ].filter((addr): addr is string => !!addr && addr.length > 0);

    syncAddresses.forEach((addr) => addressSet.add(addr.toLowerCase()));

    // Handle async Bitcoin address
    if (this.htlcs.bitcoin) {
      try {
        const btcAddress = await this.htlcs.bitcoin.htlcActorAddress();
        if (btcAddress && btcAddress.length > 0) {
          addressSet.add(btcAddress.toLowerCase());
        }
      } catch {
        // ignore missing btc
      }
    }

    return Array.from(addressSet);
  }

  startBackgroundService(
    interval: number = 5000,
    redeemServiceEnabled: boolean,
  ): void {
    if (this.isBackgroundServiceRunning || this.executorStop) {
      return;
    }

    this.isBackgroundServiceRunning = true;
    (async () => {
      try {
        if (redeemServiceEnabled) {
          this.stopBackgroundService();
          return;
        }
        const stop = await this.execute(interval);
        if (stop) this.executorStop = stop;
      } catch (error) {
        console.error('Error starting background executor:', error);
        this.isBackgroundServiceRunning = false;
      }
    })();
  }

  stopBackgroundService(): void {
    if (this.executorStop) {
      try {
        this.executorStop();
      } catch {
        console.error('Error stopping background executor');
      }
      this.executorStop = null;
    }
    this.isBackgroundServiceRunning = false;
  }

  async execute(interval: number = 5000): Promise<() => void> {
    const addresses = await this.getAddressesFromHTLCs();
    if (addresses.length === 0) {
      addresses.push(this.#digestKey.userId.toLowerCase());
    }

    let isProcessing = false;
    let intervalId: NodeJS.Timeout | null = null;

    const fetchAndProcessOrders = async () => {
      if (isProcessing) return; // Prevent concurrent processing
      isProcessing = true;

      try {
        // Fetch orders from all addresses in parallel
        const orderPromises = addresses.map(async (address) => {
          try {
            const result = await this.#orderbook.getOrders({
              address,
              status: OrderLifecycle.pending,
              per_page: 500,
            });

            if (result.ok) {
              return result.val.data;
            } else {
              this.events.emit(
                'error',
                {} as Order,
                `Failed to fetch orders for address ${address}: ${result.error}`,
              );
              return [];
            }
          } catch (error) {
            this.events.emit(
              'error',
              {} as Order,
              `Failed to fetch orders for address ${address}: ${error}`,
            );
            return [];
          }
        });

        // Wait for all order fetches to complete
        const allOrdersArrays = await Promise.all(orderPromises);

        // Merge and deduplicate orders from all addresses
        const mergedOrdersById = new Map<string, Order>();
        for (const orders of allOrdersArrays) {
          for (const order of orders) {
            mergedOrdersById.set(order.order_id, order);
          }
        }

        const ordersWithStatus = Array.from(mergedOrdersById.values()).map(
          (order) => ({
            ...order,
            status: ParseOrderStatus(order),
          }),
        );

        this.events.emit('onPendingOrdersChanged', ordersWithStatus);
        await this.processOrderActions(ordersWithStatus);
      } finally {
        isProcessing = false;
      }
    };

    // Initial fetch
    await fetchAndProcessOrders();

    // Set up interval for periodic fetching
    intervalId = setInterval(fetchAndProcessOrders, interval);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }

  private async processOrderActions(
    orders: Array<Order & { status: OrderStatus }>,
  ): Promise<void> {
    const bitcoinRefundStatuses = new Set([
      OrderStatus.InitiateDetected,
      OrderStatus.AwaitingRefund,
      OrderStatus.Initiated,
      OrderStatus.RefundDetected,
      OrderStatus.Refunded,
      OrderStatus.Expired,
    ]);

    // Process orders in parallel
    const orderPromises = orders.map(async (order) => {
      try {
        // Handle Bitcoin refund SACP
        if (
          isBitcoin(order.source_swap.chain) &&
          bitcoinRefundStatuses.has(order.status) &&
          !isCompleted(order)
        ) {
          await this.postRefundSACP(order);
          // this.events.emit('log', order.order_id, 'skipping postRefundSACP');
        }

        const orderAction = parseAction(order);

        if (orderAction === OrderAction.Redeem) {
          await this.handleRedeemAction(order);
        }
        // OrderAction.Idle and OrderAction.Refund cases are handled implicitly
      } catch (error) {
        this.events.emit(
          'error',
          order,
          `Error processing order ${order.order_id}: ${error}`,
        );
      }
    });

    // Wait for all order processing to complete
    await Promise.all(orderPromises);
  }

  private async handleRedeemAction(order: Order): Promise<void> {
    const secrets = await this.#secretManager.generateSecret(order.nonce);
    if (!secrets.ok) {
      this.events.emit('error', order, secrets.error);
      return;
    }

    const localSecretHash = trim0x(secrets.val.secretHash);
    const orderSecretHash = trim0x(order.source_swap.secret_hash);
    if (localSecretHash !== orderSecretHash) {
      this.events.emit(
        'log',
        order.order_id,
        'skipping redeem: secret hash mismatch',
      );
      return;
    }

    const secret = secrets.val.secret;
    const blockchainType = getBlockchainType(order.destination_swap.chain);

    const redeemHandlers = {
      [BlockchainType.EVM]: () => this.evmRedeem(order, secret),
      [BlockchainType.Bitcoin]: () => this.btcRedeem(order, secret),
      [BlockchainType.Starknet]: () => this.starknetRedeem(order, secret),
      [BlockchainType.Solana]: () => this.solRedeem(order, secret),
      [BlockchainType.Sui]: () => this.suiRedeem(order, secret),
    };

    const handler = redeemHandlers[blockchainType];
    if (handler) {
      await handler();
    } else {
      this.events.emit(
        'error',
        order,
        `Unsupported chain: ${order.destination_swap.chain}`,
      );
    }
  }

  private async evmRedeem(order: Order, secret: string): Promise<void> {
    this.events.emit('log', order.order_id, 'executing evm redeem');

    const cache = this.#cacheManager.getOrderExecution(
      order,
      OrderAction.Redeem,
    );
    if (cache) {
      this.events.emit('log', order.order_id, 'already redeemed');
      return;
    }

    if (!this.htlcs.evm) {
      this.events.emit('error', order, 'EVM HTLC is required');
      return;
    }

    const res = await this.htlcs.evm.redeem(order, secret);

    if (!res.ok) {
      this.events.emit('error', order, res.error);
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
    this.events.emit('success', order, OrderAction.Redeem, res.val);
  }

  private async starknetRedeem(order: Order, secret: string) {
    this.events.emit('log', order.order_id, 'executing starknet redeem');
    const cache = this.#cacheManager.getOrderExecution(
      order,
      OrderAction.Redeem,
    );
    if (cache) {
      this.events.emit('log', order.order_id, 'already redeemed');
      return;
    }
    if (!this.htlcs.starknet) {
      this.events.emit('error', order, 'Starknet HTLC is required');
      return;
    }

    const res = await this.htlcs.starknet.redeem(order, secret);
    if (!res.ok) {
      this.events.emit('error', order, res.error);
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
      this.events.emit('success', order, OrderAction.Redeem, res.val);
    }
  }

  private async solRedeem(order: Order, secret: string) {
    this.events.emit('log', order.order_id, 'executing sol redeem');
    const cache = this.#cacheManager.getOrderExecution(
      order,
      OrderAction.Redeem,
    );
    if (cache) {
      this.events.emit('log', order.order_id, 'already redeemed');
      return;
    }

    if (!this.htlcs.solana) {
      this.events.emit('error', order, 'Solana HTLC is required');
      return;
    }

    const res = await this.htlcs.solana.redeem(order, secret);

    if (res.error) {
      this.events.emit('error', order, res.error);

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
      this.events.emit('success', order, OrderAction.Redeem, res.val);
    }
  }

  private async suiRedeem(order: Order, secret: string) {
    this.events.emit('log', order.order_id, 'executing sui redeem');
    const cache = this.#cacheManager.getOrderExecution(
      order,
      OrderAction.Redeem,
    );
    if (cache) {
      this.events.emit('log', order.order_id, 'already redeemed');
      return;
    }

    if (!this.htlcs.sui) {
      this.events.emit('error', order, 'Sui HTLC is required');
      return;
    }

    const res = await this.htlcs.sui.redeem(order, secret);

    if (res.error) {
      this.events.emit('error', order, res.error);

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
      this.events.emit('success', order, OrderAction.Redeem, res.val);
    }
  }

  private async btcRedeem(order: Order, secret: string) {
    const provider = this.htlcs.bitcoin?.getProvider();
    if (!provider) {
      this.events.emit('error', order, 'Bitcoin provider not found');
      return;
    }
    const _cache = this.#cacheManager.getBitcoinRedeem(order.order_id);
    const fillerInitTx = order.destination_swap.initiate_tx_hash
      .split(',')
      .at(-1)
      ?.split(':')
      .at(0);
    if (!fillerInitTx) {
      this.events.emit('error', order, 'Failed to get initiate_tx_hash');
      return;
    }

    let rbf = false;
    if (_cache) {
      if (_cache.redeemedFromUTXO && _cache.redeemedFromUTXO !== fillerInitTx) {
        rbf = true;
        this.events.emit('log', order.order_id, 'rbf btc redeem');
      } else if (
        _cache.redeemedAt &&
        Date.now() - _cache.redeemedAt > 1000 * 60 * 15 // 15 minutes
      ) {
        this.events.emit(
          'log',
          order.order_id,
          'redeem not confirmed in last 15 minutes',
        );
        rbf = true;
      } else {
        this.events.emit('log', order.order_id, 'btcRedeem: already redeemed');
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
          this.events.emit('log', order.order_id, 'already a valid redeem');
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
          this.events.emit('error', order, 'Failed to get redeem tx: ' + error);
          return;
        }
      }
    }

    this.events.emit('log', order.order_id, 'executing btc redeem');
    try {
      if (!this.htlcs.bitcoin) {
        this.events.emit('error', order, 'Bitcoin HTLC is required');
        return;
      }
      const redeemHex = await this.htlcs.bitcoin.getRedeemHex(
        order,
        trim0x(secret),
        rbf ? [fillerInitTx] : [],
      );
      if (!redeemHex.ok) {
        this.events.emit('error', order, 'Failed to get redeem hex');
        return;
      }
      const res = await this.broadcastRedeemTx(redeemHex.val, order.order_id);
      if (!res.ok) {
        this.events.emit(
          'error',
          order,
          res.error || 'Failed to broadcast redeem tx',
        );
        return;
      }

      if (rbf) {
        this.events.emit('log', order.order_id, 'rbf: btc redeem success');
        this.events.emit('rbf', order, res.val);
      } else this.events.emit('success', order, OrderAction.Redeem, res.val);
      this.#cacheManager.setBitcoinRedeem(order.order_id, {
        redeemedFromUTXO: fillerInitTx,
        redeemedAt: Date.now(),
        redeemTxHash: res.val,
      });
    } catch (error) {
      this.events.emit('error', order, 'Failed btc redeem: ' + error);
    }
  }

  private async postRefundSACP(order: Order) {
    // const cachedOrder = this.#cacheManager.getSacpCache(order.order_id);
    // if (cachedOrder?.initTxHash === order.source_swap.initiate_tx_hash) return;
    const userBTCAddress = order.source_swap.delegate;
    if (!userBTCAddress) return;
    try {
      if (!this.htlcs.bitcoin) {
        this.events.emit('error', order, 'Bitcoin HTLC is required');
        return;
      }
      const authHeaders = await this.#auth.getAuthHeaders();
      if (authHeaders.error) {
        this.events.emit(
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
        this.events.emit(
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
      this.events.emit(
        'error',
        order,
        'Failed to generate and post SACP: ' + error,
      );
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
