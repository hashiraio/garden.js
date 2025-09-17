import { Asset, Chain, ChainAsset } from '@gardenfi/orderbook';
import { APIResponse, AsyncResult, Request } from '@gardenfi/utils';

export interface IQuote {
  /**
   * Get a quote for the given assets and amount
   * @param fromAsset - The asset to swap from
   * @param toAsset - The asset to swap to
   *
   * @param amount - The amount to quote
   * @param isExactOut - Whether the amount is exact out
   * @param options { affiliateFee?: number; request?: Request } - The options for the quote request, affiliate fee in bps and request object
   *
   */
  getQuoteFromAssets(
    params: QuoteParamsForAssets,
  ): AsyncResult<QuoteResponse[], string>;

  /**
   * Get a quote for the given orderpair and amount
   * @param orderpair - A string representing the order pair for which the quote is requested.
   *
   * ``eg:- bitcoin_regtest:primary::arbitrum_localnet:0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9``
   *
   * Chain name and asset are separated by a colon(:) and chain pairs are separated by double colon(::)
   * @param amount - The amount to quote
   * @param isExactOut - Whether the amount is exact out
   * @param options { affiliateFee?: number; request?: Request } - The options for the quote request, affiliate fee in bps and request object
   */
  getQuote(
    from: ChainAsset,
    to: ChainAsset,
    amount: number,
    isExactOut: boolean,
    options?: QuoteOptions,
  ): AsyncResult<QuoteResponse[], string>;

  /**
   * Get the strategies available for quoting
   * @returns {Strategies} The strategies available
   */
  getStrategies(): AsyncResult<Strategies, string>;
}

export type QuoteOptions = {
  affiliateFee?: number;
  request?: Request;
};

export type BaseQuoteParams = {
  amount: number;
  isExactOut?: boolean;
  options?: QuoteOptions;
};

export type QuoteParamsForAssets = BaseQuoteParams & {
  fromAsset: Asset;
  toAsset: Asset;
};

export type QuoteParamsForOrderPair = BaseQuoteParams & {
  from: ChainAsset;
  to: ChainAsset;
};

export type QuoteResponse = {
  source: {
    asset: string;
    amount: string;
    display: string;
    value: string;
  };
  destination: {
    asset: string;
    amount: string;
    display: string;
    value: string;
  };
  solver_id: string;
};
export type Strategies = Record<
  string,
  {
    id: string;
    minAmount: string;
    maxAmount: string;
    fee: number;
    fixed_fee: number;
  }
>;

export type StrategiesResponse = APIResponse<{
  [strategy: string]: {
    id: string;
    min_amount: string;
    max_amount: string;
    fee: number;
    source_chain: Chain;
    dest_chain: Chain;
    fixed_fee: string;
    source_asset: {
      asset: string;
      token_id: string;
      decimals: number;
    };
    dest_asset: {
      asset: string;
      token_id: string;
      decimals: number;
    };
  };
}>;
