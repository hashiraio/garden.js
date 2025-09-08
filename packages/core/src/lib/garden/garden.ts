import { ISecretManager } from './../secretManager/secretManager.types';
import {
  IGardenJS,
  SwapParams,
  GardenConfigWithHTLCs,
  GardenConfigWithWallets,
  GardenEvents,
} from './garden.types';
import {
  BlockchainType,
  ChainAsset,
  CreateOrderRequest,
  IOrderbook,
  isBitcoin,
  Orderbook,
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
  EventBroker,
} from '@gardenfi/utils';
import { IQuote } from '../quote/quote.types';
import { BitcoinHTLC } from '../bitcoin/bitcoinHtlc';
import { Api, solanaProgramAddress, SolanaRelayerAddress } from '../constants';
import { Quote } from '../quote/quote';
import { SecretManager } from '../secretManager/secretManager';
import { IEVMHTLC } from '../evm/htlc.types';
import { EvmRelay } from '../evm/relay/evmRelay';
import { IStarknetHTLC } from '../starknet/starknetHTLC.types';
import { StarknetRelay } from '../starknet/relay/starknetRelay';
import { ISolanaHTLC } from '../solana/htlc/ISolanaHTLC';
import { SolanaRelay } from '../solana/relayer/solanaRelay';
import { ISuiHTLC } from '../sui/suiHTLC.types';
import { SuiRelay } from '../sui/relay/suiRelay';
import { resolveApiKey, resolveDigestKey } from './utils';
import { Executor } from './executor/executor';
import { IBitcoinHTLC } from '../bitcoin/bitcoinhtlc.types';
import {
  getBitcoinNetworkFromEnvironment,
  resolveApiConfig,
  toXOnly,
  validateAmount,
  withDefaultAffiliateFees,
} from '../utils';
import { isValidBitcoinPubKey } from '../utils';
import { getBitcoinNetwork } from '../bitcoin/utils';
import { BitcoinWallet } from '../bitcoin/wallet/wallet';
import { BitcoinProvider } from '../bitcoin/provider/provider';

export class Garden extends EventBroker<GardenEvents> implements IGardenJS {
  private network: Network;
  private _orderbook: IOrderbook;
  private _quote: IQuote;
  private _auth: IAuth;
  private _evmHTLC: IEVMHTLC | undefined;
  private _starknetHTLC: IStarknetHTLC | undefined;
  private _solanaHTLC: ISolanaHTLC | undefined;
  private _suiHTLC: ISuiHTLC | undefined;
  private _btcHTLC: IBitcoinHTLC | undefined;
  private _api: Api | undefined;
  private _executor: Executor | undefined;

  /**
   * If true, the redeem service will be enabled.
   */
  private redeemServiceEnabled: boolean = true;
  private _secretManager: ISecretManager | undefined;
  private _digestKey: DigestKey | undefined;

  private executeInterval: number = 5000;
  private isBackgroundServiceRunning: boolean = false;
  private executorStop: (() => void) | null = null;

  constructor(config: GardenConfigWithHTLCs) {
    super();
    const { api, network } = resolveApiConfig(config.environment);
    this.network = network;
    this._api = api;
    this._digestKey = resolveDigestKey(config.digestKey);
    this._auth = resolveApiKey(config.apiKey);
    this._quote = config.quote ?? new Quote(this._api.baseurl);

    this._orderbook =
      config.orderbook ?? new Orderbook(new Url(this._api.baseurl));

    this._evmHTLC = config.htlc.evm;
    this._starknetHTLC = config.htlc.starknet;
    this._solanaHTLC = config.htlc.solana;
    this._suiHTLC = config.htlc.sui;
    this._btcHTLC = config.htlc.bitcoin;
    this._executor = this._digestKey
      ? new Executor(
          this._digestKey,
          {
            evm: this._evmHTLC,
            starknet: this._starknetHTLC,
            solana: this._solanaHTLC,
            sui: this._suiHTLC,
            bitcoin: this._btcHTLC,
          },
          this._orderbook,
          this._auth,
          this._api,
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
    this.redeemServiceEnabled = enabled;

    if (enabled) {
      this.stopBackgroundService();
    } else {
      if (!this._digestKey) {
        throw new Error('Digest key is required for manual secret management');
      }
      this._secretManager = SecretManager.fromDigestKey(
        this._digestKey.digestKey,
      );
      if (!this._btcHTLC) {
        const provider = new BitcoinProvider(
          getBitcoinNetworkFromEnvironment(this.network),
        );
        this._btcHTLC = new BitcoinHTLC(
          BitcoinWallet.fromPrivateKey(this._digestKey.digestKey, provider),
          getBitcoinNetwork(getBitcoinNetworkFromEnvironment(this.network)),
        );
      }
      this.startBackgroundService();
    }
    return this;
  }

  private startBackgroundService(): void {
    if (this.isBackgroundServiceRunning || this.executorStop) {
      return;
    }

    this.isBackgroundServiceRunning = true;
    (async () => {
      try {
        if (this.redeemServiceEnabled) {
          this.stopBackgroundService();
          return;
        }
        const stop = await this._executor?.execute(this.executeInterval);
        if (stop) this.executorStop = stop;
      } catch (error) {
        console.error('Error starting background executor:', error);
        this.isBackgroundServiceRunning = false;
      }
    })();
  }

  private stopBackgroundService(): void {
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

  static fromWallets(config: GardenConfigWithWallets) {
    const apiKey = resolveApiKey(config.apiKey);
    const { api, network } = resolveApiConfig(config.environment);

    if (!api)
      throw new Error(
        'API not found, invalid environment ' + config.environment,
      );

    const htlc = {
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
            network === Network.MAINNET
              ? SolanaRelayerAddress.mainnet
              : SolanaRelayerAddress.testnet,
            {
              native:
                config.solanaProgramAddress &&
                config.solanaProgramAddress.native
                  ? config.solanaProgramAddress.native
                  : solanaProgramAddress.mainnet.native,
              spl:
                config.solanaProgramAddress && config.solanaProgramAddress.spl
                  ? config.solanaProgramAddress.spl
                  : solanaProgramAddress.mainnet.spl,
            },
            apiKey,
          )
        : undefined,
      sui: config.wallets.sui
        ? new SuiRelay(
            api.baseurl,
            config.wallets.sui,
            network === Network.MAINNET ? Network.MAINNET : Network.TESTNET,
          )
        : undefined,
      bitcoin: config.wallets.bitcoin
        ? new BitcoinHTLC(
            config.wallets.bitcoin,
            getBitcoinNetwork(getBitcoinNetworkFromEnvironment(network)),
          )
        : undefined,
    };

    return new Garden({
      htlc,
      ...config,
    });
  }

  get evmHTLC() {
    return this._evmHTLC;
  }

  get starknetHTLC() {
    return this._starknetHTLC;
  }

  get solanaHTLC() {
    return this._solanaHTLC;
  }

  get suiHTLC() {
    return this._suiHTLC;
  }

  get quote() {
    return this._quote;
  }

  get btcHTLC() {
    return this._btcHTLC;
  }

  get orderbook() {
    return this._orderbook;
  }

  get secretManager() {
    if (this.redeemServiceEnabled || !this._secretManager)
      throw new Error('Secret manager is not available');

    return this._secretManager;
  }

  get auth() {
    return this._auth;
  }

  get digestKey() {
    return this._digestKey;
  }

  /**
   * Executes a swap operation by creating and polling an order, and optionally initiating the HTLC
   * on the appropriate chain. Handles all error cases robustly and ensures proper flow.
   * @param params SwapParams
   * @returns AsyncResult<Order, string>
   */
  async swap(params: SwapParams): AsyncResult<string, string> {
    const validation = await this.validateAndFillParams(params);
    if (!validation.ok) return Err(validation.error);

    const { sendAddress, receiveAddress } = validation.val;

    const nonce = Date.now().toString();
    let secretHash: string | undefined;

    if (!this.redeemServiceEnabled) {
      const secrets = await this.secretManager.generateSecret(nonce);
      if (!secrets.ok) return Err(secrets.error);
      secretHash = secrets.val.secretHash;
    }

    const { btcAddress } = params.additionalData || {};

    const isSourceBitcoin = isBitcoin(
      ChainAsset.from(params.fromAsset).getChain(),
    );
    const isDestinationBitcoin = isBitcoin(
      ChainAsset.from(params.toAsset).getChain(),
    );

    const shouldProvideBtcAddress =
      (!isSourceBitcoin && !isDestinationBitcoin) || !!secretHash;

    const orderRequest: CreateOrderRequest = {
      source: {
        asset: ChainAsset.from(params.fromAsset),
        owner: isSourceBitcoin ? btcAddress ?? sendAddress : sendAddress,
        delegate:
          shouldProvideBtcAddress && isSourceBitcoin ? sendAddress : null,
        amount: params.sendAmount,
      },
      destination: {
        asset: ChainAsset.from(params.toAsset),
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
    const createOrderRes = await this._orderbook.createOrder(
      orderRequest,
      this._auth,
    );
    if (!createOrderRes.ok) return Err(createOrderRes.error);

    switch (orderRequest.source.asset.getBlockchainType()) {
      case BlockchainType.EVM:
        if (!this._evmHTLC || createOrderRes.val.type !== BlockchainType.EVM) {
          return Err(
            'EVM HTLC is not initialized, does not support initiation, or order type is not EVM',
          );
        }
        {
          const evmInitRes = await this._evmHTLC.initiate(createOrderRes.val);
          if (!evmInitRes.ok)
            return Err(`EVM HTLC initiation failed: ${evmInitRes.error}`);
        }
        break;
      case BlockchainType.Solana:
        if (
          !this._solanaHTLC ||
          createOrderRes.val.type !== BlockchainType.Solana
        ) {
          return Err(
            'Solana HTLC is not initialized or does not support initiation',
          );
        }
        {
          const solanaInitRes = await this._solanaHTLC.initiate(
            createOrderRes.val,
          );
          if (!solanaInitRes.ok)
            return Err(`Solana HTLC initiation failed: ${solanaInitRes.error}`);
        }
        break;
      case BlockchainType.Starknet:
        if (
          !this._starknetHTLC ||
          createOrderRes.val.type !== BlockchainType.Starknet
        ) {
          return Err(
            'Starknet HTLC is not initialized or does not support initiation',
          );
        }
        {
          const starknetInitRes = await this._starknetHTLC.initiate(
            createOrderRes.val,
          );
          if (!starknetInitRes.ok)
            return Err(
              `Starknet HTLC initiation failed: ${starknetInitRes.error}`,
            );
        }
        break;
      case BlockchainType.Sui:
        if (!this._suiHTLC || createOrderRes.val.type !== BlockchainType.Sui) {
          return Err(
            'Sui HTLC is not initialized or does not support initiation',
          );
        }
        {
          const suiInitRes = await this._suiHTLC.initiate(createOrderRes.val);
          if (!suiInitRes.ok)
            return Err(`Sui HTLC initiation failed: ${suiInitRes.error}`);
        }
        break;
      default:
        return Err(`Unsupported blockchain type`);
    }

    return Ok(createOrderRes.val.order_id);
  }

  private async validateAndFillParams(params: SwapParams) {
    if (!params.fromAsset || !params.toAsset)
      return Err('Source and destination assets are required for swap');

    const fromAsset = ChainAsset.from(params.fromAsset);
    const toAsset = ChainAsset.from(params.toAsset);

    if (fromAsset.getNetwork() !== toAsset.getNetwork())
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
      isBitcoin(ChainAsset.from(params.fromAsset).getChain()) ||
      isBitcoin(ChainAsset.from(params.toAsset).getChain())
    ) {
      if (!params.additionalData.btcAddress)
        return Err(
          'btcAddress in additionalData is required if source or destination chain is bitcoin, it is used as refund or redeem address.',
        );
    }

    const sendAddress = await this.getAddresses(fromAsset.getBlockchainType());
    if (!sendAddress.ok) return Err(sendAddress.error);

    const receiveAddress = await this.getAddresses(toAsset.getBlockchainType());
    if (!receiveAddress.ok) return Err(receiveAddress.error);

    return Ok({
      sendAddress: sendAddress.val,
      receiveAddress: receiveAddress.val,
    });
  }

  private async getAddresses(blockchainType: BlockchainType) {
    switch (blockchainType) {
      case BlockchainType.EVM:
        if (!this._evmHTLC)
          return Err('Please provide evmHTLC when initializing garden');
        return Ok(this._evmHTLC.htlcActorAddress);
      case BlockchainType.Bitcoin: {
        const pubKey = await this._btcHTLC?.getPublicKey();
        if (!pubKey || !isValidBitcoinPubKey(pubKey))
          return Err('Invalid btc public key');
        return Ok(toXOnly(pubKey));
      }
      case BlockchainType.Solana: {
        if (!this._solanaHTLC)
          return Err('Please provide solanaHTLC when initializing garden');
        return Ok(this._solanaHTLC.htlcActorAddress);
      }
      case BlockchainType.Starknet: {
        if (!this._starknetHTLC)
          return Err('Please provide starknetHTLC when initializing garden');
        return Ok(this._starknetHTLC.htlcActorAddress);
      }
      case BlockchainType.Sui: {
        if (!this._suiHTLC)
          return Err('Please provide suiHTLC when initializing garden');
        return Ok(this._suiHTLC.htlcActorAddress);
      }
      default:
        return Err('Unsupported chain');
    }
  }
}
