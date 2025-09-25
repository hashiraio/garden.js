import { ISecretManager } from './../secretManager/secretManager.types';
import {
  IGardenJS,
  SwapParams,
  GardenConfigWithHTLCs,
  GardenConfigWithWallets,
  GardenHTLCModules,
  GardenEventEmitter,
  GardenEvents,
} from './garden.types';
import {
  BlockchainType,
  ChainAsset,
  CreateOrderRequest,
  CreateOrderResponse,
  isBitcoin,
  Orderbook,
  isEvmOrderResponse,
  isStarknetOrderResponse,
  isSolanaOrderResponse,
  isSuiOrderResponse,
} from '@gardenfi/orderbook';
import {
  IAuth,
  Url,
  DigestKey,
  Network,
  trim0x,
  Err,
  AsyncResult,
  Ok,
  hasKeys,
  EventBroker,
} from '@gardenfi/utils';
import { IQuote } from '../quote/quote.types';
import { BitcoinHTLC } from '../bitcoin/bitcoinHtlc';
import { Api } from '../constants';
import { Quote } from '../quote/quote';
import { SecretManager } from '../secretManager/secretManager';
import { EvmRelay } from '../evm/relay/evmRelay';
import { StarknetRelay } from '../starknet/relay/starknetRelay';
import { SolanaRelay } from '../solana/relayer/solanaRelay';
import { SuiRelay } from '../sui/relay/suiRelay';
import { resolveApiKey, resolveDigestKey } from './utils';
import { Executor } from './executor/executor';

import {
  getAddresses,
  resolveApiConfig,
  validateAmount,
  validateHTLCForSwap,
  withDefaultAffiliateFees,
} from '../utils';
import { BitcoinWallet } from '../bitcoin/wallet/wallet';
import { BitcoinProvider } from '../bitcoin/provider/provider';

class GardenEventBus
  extends EventBroker<GardenEvents>
  implements GardenEventEmitter
{
  public override emit<K extends keyof GardenEvents>(
    event: K,
    ...args: Parameters<GardenEvents[K]>
  ) {
    super.emit(event, ...args);
  }
}

export class Garden extends Orderbook implements IGardenJS {
  private network: Network;
  private _quote: IQuote;
  private _auth: IAuth;
  private _htlcs: GardenHTLCModules;
  private _api: Api | undefined;
  private _executor: Executor | undefined;
  private _events: GardenEventBus;

  /**
   * If true, the redeem service will be enabled.
   */
  private _redeemServiceEnabled: boolean = true;
  private _secretManager: ISecretManager | undefined;
  private _digestKey: DigestKey | undefined;

  private executeInterval: number = 5000;

  constructor(config: GardenConfigWithHTLCs) {
    const { api, network } = resolveApiConfig(config.environment);
    super(new Url(api.baseurl));
    this.network = network;
    this._api = api;
    this._digestKey = resolveDigestKey(config.digestKey);
    this._auth = resolveApiKey(config.apiKey);
    this._quote = config.quote ?? new Quote(this._api.baseurl);
    this._htlcs = config.htlc ?? {};
    this._events = new GardenEventBus();
    this._executor = this._digestKey
      ? new Executor(
          this._digestKey,
          this.htlcs,
          this,
          this._auth,
          this._api,
          this._events,
        )
      : undefined;
  }

  /**
   * Enables or disables the auto-redeem service provided by Garden API.
   *
   * If enabled, make sure to pass DigestKey to the constructor.
   * @default true
   * @param enabled - boolean
   * @returns this
   */
  setRedeemServiceEnabled(enabled: boolean): this {
    this._redeemServiceEnabled = enabled;

    if (enabled) {
      this._executor?.stop();
    } else {
      if (!this._digestKey) {
        throw new Error('Digest key is required for manual secret management');
      }
      this._secretManager = SecretManager.fromDigestKey(
        this._digestKey.digestKey,
      );
      if (!this._htlcs.bitcoin) {
        const provider = new BitcoinProvider(this.network);
        this._htlcs.bitcoin = new BitcoinHTLC(
          BitcoinWallet.fromPrivateKey(this._digestKey.digestKey, provider),
          this.network,
        );
      }
      this._executor?.start(this.executeInterval, this._redeemServiceEnabled);
    }
    return this;
  }

  static fromWallets(config: GardenConfigWithWallets) {
    const apiKey = resolveApiKey(config.apiKey);
    const { api, network } = resolveApiConfig(config.environment);

    if (!api)
      throw new Error(
        'API not found, invalid environment ' + config.environment,
      );

    const htlc = config.wallets
      ? {
          evm: config.wallets.evm
            ? new EvmRelay(api.baseurl, config.wallets.evm, apiKey)
            : undefined,
          starknet: config.wallets.starknet
            ? new StarknetRelay(
                api.baseurl,
                config.wallets.starknet,
                network,
                apiKey,
              )
            : undefined,
          solana: config.wallets.solana
            ? new SolanaRelay(
                config.wallets.solana,
                new Url(api.baseurl),
                network,
                apiKey,
                {
                  programAddress: config.solanaProgramAddress,
                },
              )
            : undefined,
          sui: config.wallets.sui
            ? new SuiRelay(api.baseurl, config.wallets.sui, network)
            : undefined,
          bitcoin: config.wallets.bitcoin
            ? new BitcoinHTLC(config.wallets.bitcoin, network)
            : undefined,
        }
      : {};

    return new Garden({
      htlc,
      ...config,
    });
  }

  get htlcs() {
    return {
      evm: this._htlcs.evm,
      starknet: this._htlcs.starknet,
      solana: this._htlcs.solana,
      sui: this._htlcs.sui,
      bitcoin: this._htlcs.bitcoin,
    } as const;
  }

  get quote() {
    return this._quote;
  }

  get secretManager() {
    if (this._redeemServiceEnabled || !this._secretManager)
      throw new Error('Secret manager is not available');

    return this._secretManager;
  }

  get auth() {
    return this._auth;
  }

  get digestKey() {
    return this._digestKey;
  }

  get executor() {
    return this._executor;
  }

  get redeemServiceEnabled() {
    return this._redeemServiceEnabled;
  }

  /**
   * Creates an order for a swap operation and initiates the HTLC on the source chain.
   * @param params SwapParams
   * @returns AsyncResult<Order, string>
   */
  async createSwap(
    params: SwapParams,
  ): AsyncResult<CreateOrderResponse | string, string> {
    const blockchainType = ChainAsset.from(params.fromAsset).blockchainType;
    const htlcValidation = await validateHTLCForSwap(
      blockchainType,
      this._htlcs,
    );
    if (!htlcValidation.ok) return Err(htlcValidation.error);

    const createOrderRes = await this.createOrder(params);
    if (!createOrderRes.ok) return Err(createOrderRes.error);

    const createOrderResponse = createOrderRes.val;

    switch (blockchainType) {
      case BlockchainType.evm:
        if (!this._htlcs.evm || !isEvmOrderResponse(createOrderResponse)) {
          return Err('Order type does not match EVM blockchain type');
        }
        {
          const evmInitRes = await this._htlcs.evm.initiate(
            createOrderResponse,
          );
          if (!evmInitRes.ok)
            return Err(`EVM HTLC initiation failed: ${evmInitRes.error}`);
        }
        break;
      case BlockchainType.solana:
        if (
          !this._htlcs.solana ||
          !isSolanaOrderResponse(createOrderResponse)
        ) {
          return Err('Order type does not match Solana blockchain type');
        }
        {
          const solanaInitRes = await this._htlcs.solana.initiate(
            createOrderResponse,
          );
          if (!solanaInitRes.ok)
            return Err(`Solana HTLC initiation failed: ${solanaInitRes.error}`);
        }
        break;
      case BlockchainType.starknet:
        if (
          !this._htlcs.starknet ||
          !isStarknetOrderResponse(createOrderResponse)
        ) {
          return Err('Order type does not match Starknet blockchain type');
        }
        {
          const starknetInitRes = await this._htlcs.starknet.initiate(
            createOrderResponse,
          );
          if (!starknetInitRes.ok)
            return Err(
              `Starknet HTLC initiation failed: ${starknetInitRes.error}`,
            );
        }
        break;
      case BlockchainType.sui:
        if (!this._htlcs.sui || !isSuiOrderResponse(createOrderResponse)) {
          return Err('Order type does not match Sui blockchain type');
        }
        {
          const suiInitRes = await this._htlcs.sui.initiate(
            createOrderResponse,
          );
          if (!suiInitRes.ok)
            return Err(`Sui HTLC initiation failed: ${suiInitRes.error}`);
        }
        break;
      case BlockchainType.bitcoin:
        return Ok(createOrderResponse);
      default:
        return Err(`Unsupported blockchain type for swap initiation`);
    }

    return Ok(createOrderResponse.order_id);
  }

  override async createOrder<T extends BlockchainType>(
    arg: CreateOrderRequest | SwapParams,
  ): AsyncResult<CreateOrderResponse<T>, string> {
    if (hasKeys(arg, ['source', 'destination', 'nonce'])) {
      return super.createOrder(arg as CreateOrderRequest, this._auth);
    }

    const params = arg as SwapParams;
    const validation = await this.validateAndFillParams(params);
    if (!validation.ok) return Err(validation.error);

    const { sendAddress, receiveAddress, fromAsset, toAsset } = validation.val;

    const nonce = Date.now().toString();
    let secretHash: string | undefined;

    if (!this.redeemServiceEnabled) {
      const secrets = await this.secretManager.generateSecret(nonce);
      if (!secrets.ok) return Err(secrets.error);
      secretHash = secrets.val.secretHash;
    }

    const btcAddress = params.addresses?.bitcoin;

    const isSourceBitcoin = isBitcoin(ChainAsset.from(params.fromAsset).chain);
    const isDestinationBitcoin = isBitcoin(
      ChainAsset.from(params.toAsset).chain,
    );

    const shouldProvideBtcAddress =
      (!isSourceBitcoin && !isDestinationBitcoin) || !!secretHash;

    const orderRequest: CreateOrderRequest = {
      source: {
        asset: fromAsset.toString(),
        owner: isSourceBitcoin ? btcAddress ?? sendAddress : sendAddress,
        delegate:
          shouldProvideBtcAddress && isSourceBitcoin ? sendAddress : null,
        amount: params.sendAmount,
      },
      destination: {
        asset: toAsset.toString(),
        owner: isDestinationBitcoin
          ? btcAddress ?? receiveAddress
          : receiveAddress,
        delegate:
          shouldProvideBtcAddress && isDestinationBitcoin
            ? receiveAddress
            : null,
        amount: params.receiveAmount,
      },
      nonce: Number(nonce),
      ...(!this.redeemServiceEnabled && secretHash
        ? {
            secret_hash: trim0x(secretHash),
          }
        : {}),
      affiliate_fees: withDefaultAffiliateFees(params.affiliateFee),
      slippage: 50,
    };

    const createOrderRes = await super.createOrder<T>(orderRequest, this._auth);
    if (!createOrderRes.ok) return Err(createOrderRes.error);

    const sourceType = ChainAsset.from(params.fromAsset).blockchainType;
    if (createOrderRes.val.type !== sourceType) {
      return Err('Order response type does not match source blockchain type');
    }

    return Ok(createOrderRes.val);
  }

  private async validateAndFillParams(params: SwapParams) {
    if (!params.fromAsset || !params.toAsset)
      return Err('Source and destination assets are required for swap');

    const fromAsset = ChainAsset.from(params.fromAsset);
    const toAsset = ChainAsset.from(params.toAsset);

    if (fromAsset.network !== toAsset.network)
      return Err(
        'Both assets should be on the same network (either mainnet or testnet)',
      );

    const inputAmount = validateAmount(params.sendAmount);
    if (!inputAmount.ok) return Err(inputAmount.error);

    const outputAmount = validateAmount(params.receiveAmount);
    if (!outputAmount.ok) return Err(outputAmount.error);

    if (inputAmount < outputAmount)
      return Err('Send amount should be greater than receive amount');

    if (
      isBitcoin(ChainAsset.from(params.fromAsset).chain) ||
      isBitcoin(ChainAsset.from(params.toAsset).chain)
    ) {
      if (!params.addresses?.bitcoin)
        return Err(
          'Bitcoin address in addresses is required if source or destination chain is bitcoin, it is used as refund or redeem address.',
        );
    }

    const sendAddress = await getAddresses(
      fromAsset.blockchainType,
      this._htlcs,
      this._redeemServiceEnabled,
      params.addresses,
    );
    if (!sendAddress.ok) return Err(sendAddress.error);

    const receiveAddress = await getAddresses(
      toAsset.blockchainType,
      this._htlcs,
      this._redeemServiceEnabled,
      params.addresses,
    );
    if (!receiveAddress.ok) return Err(receiveAddress.error);

    return Ok({
      sendAddress: sendAddress.val,
      receiveAddress: receiveAddress.val,
      fromAsset: fromAsset,
      toAsset: toAsset,
    });
  }

  on<K extends keyof GardenEvents>(event: K, listener: GardenEvents[K]) {
    this._events.on(event, listener);
    return this;
  }

  off<K extends keyof GardenEvents>(event: K, listener: GardenEvents[K]) {
    this._events.off(event, listener);
    return this;
  }
}
