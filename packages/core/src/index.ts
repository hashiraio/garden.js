export { Garden } from './lib/garden/garden';
export type {
  IGardenJS,
  SwapParams,
  GardenEvents,
  IOrderExecutorCache,
  OrderCacheValue,
  EventCallback,
  OrderWithStatus,
  GardenCoreConfig,
  GardenWalletModules,
  GardenHTLCModules,
  GardenConfigWithWallets,
  GardenConfigWithHTLCs,
  ApiConfig,
} from './lib/garden/garden.types';

export { EvmRelay } from './lib/evm/relay/evmRelay';
export type { IEVMRelay, EVMRelayOpts } from './lib/evm/relay/evmRelay.types';
export type { IEVMHTLC } from './lib/evm/htlc.types';

export { StarknetRelay } from './lib/starknet/relay/starknetRelay';
export type { IStarknetHTLC } from './lib/starknet/starknetHTLC.types';
export { StarknetHTLC } from './lib/starknet/htlc/starknetHTLC';

export { SolanaRelay } from './lib/solana/relayer/solanaRelay';
export type { ISolanaHTLC } from './lib/solana/htlc/ISolanaHTLC';
export { SolanaHTLC } from './lib/solana/htlc/solanaHTLC';

export { SecretManager } from './lib/secretManager/secretManager';
export type {
  ISecretManager,
  Secret,
  SecretManagerEvents,
} from './lib/secretManager/secretManager.types';
export {
  checkAllowanceAndApprove as checkStarknetAllowanceAndApprove,
  isAllowanceSufficient as isStarknetAllowanceSufficient,
  checkAllowance as checkStarknetAlloance,
} from './lib/starknet/checkAllowanceAndApprove';

export { Quote } from './lib/quote/quote';
export type {
  StrategiesResponse,
  BaseQuoteParams,
  IQuote,
  QuoteOptions,
  QuoteParamsForAssets,
  QuoteParamsForOrderPair,
  QuoteResponse,
  Strategies,
} from './lib/quote/quote.types';

export {
  constructOrderPair,
  validateBTCAddress,
  toXOnly,
  resolveApiConfig,
} from './lib/utils';

export {
  botanixMainnet,
  evmToViemChainMap,
  getChainNameFromChainId,
  hyperliquid,
  hyperliquidTestnet,
  switchOrAddNetwork,
} from './lib/switchOrAddNetwork';

export { BitcoinNetwork } from './lib/bitcoin/provider/provider.interface';
export { BitcoinProvider } from './lib/bitcoin/provider/provider';
export { BitcoinWallet } from './lib/bitcoin/wallet/wallet';
export type {
  UrgencyToFeeRateKey,
  Urgency,
  IBitcoinProvider,
  FeeRates,
  BitcoinTxType,
  BitcoinTx,
  BitcoinUTXO,
  FeeRateKeys,
} from './lib/bitcoin/provider/provider.interface';

export {
  DEFAULT_AFFILIATE_ASSET,
  API,
  STARKNET_CONFIG,
  SUI_CONFIG,
  SolanaRelayerAddress,
  solanaProgramAddress,
} from './lib/constants';

export type { Api } from './lib/constants';

export {
  RouteValidator,
  buildRouteMatrix,
} from './lib/routeValidator/routeValidator';
export type { RoutePolicy } from './lib/routeValidator/routeValidator';
