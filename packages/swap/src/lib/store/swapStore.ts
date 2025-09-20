import { create } from 'zustand';
import { Asset, Chains } from '@gardenfi/orderbook';
import { Quote } from '@gardenfi/core';
import { Network } from '@gardenfi/utils';
import {
  getApiEndpoint,
  DEFAULT_NETWORK,
  IOType,
  ErrorFormat,
  Errors,
} from '../constants/constants';

export type TokenPrices = {
  input: string;
  output: string;
};

export type FetchingQuote = {
  input: boolean;
  output: boolean;
};

export type SwapErrors = {
  inputError?: ErrorFormat;
  outputError?: ErrorFormat;
  liquidityError?: ErrorFormat;
  insufficientBalanceError?: ErrorFormat;
};

type SwapState = {
  inputAsset?: Asset;
  outputAsset?: Asset;
  inputAmount: string;
  outputAmount: string;
  rate: number;
  networkFees: number;
  btcAddress: string;
  isSwapping: boolean;
  isApproving: boolean;
  strategy: string;
  tokenPrices: TokenPrices;
  fiatTokenPrices: TokenPrices;
  error: SwapErrors;
  isNetworkFeesLoading: boolean;
  isFetchingQuote: FetchingQuote;
  isEditBTCAddress: boolean;
  isComparisonVisible: boolean;
  isValidBitcoinAddress: boolean;
  showComparison: {
    isTime: boolean;
    isFees: boolean;
  };
  maxTimeSaved: number;
  maxCostSaved: number;
  setFiatTokenPrices: (fiatTokenPrices: TokenPrices) => void;
  setTokenPrices: (tokenPrices: TokenPrices) => void;
  setIsSwapping: (isSwapping: boolean) => void;
  setIsApproving: (isApproving: boolean) => void;
  setStrategy: (strategy: string) => void;
  setAsset: (ioType: IOType, asset: Asset | undefined) => void;
  setAmount: (ioType: IOType, amount: string) => void;
  setRate: (rate: number) => void;
  setNetworkFees: (networkFees: number) => void;
  setIsNetworkFeesLoading: (isNetworkFeesLoading: boolean) => void;
  setBtcAddress: (btcAddress: string) => void;
  swapAssets: () => void;
  setError: (error: SwapErrors) => void;
  setIsFetchingQuote: (isFetchingQuote: FetchingQuote) => void;
  setIsEditBTCAddress: (isEditBTCAddress: boolean) => void;
  setIsComparisonVisible: (isComparisonVisible: boolean) => void;
  setIsValidBitcoinAddress: (isValidBitcoinAddress: boolean) => void;
  showComparisonHandler: (type: 'time' | 'fees') => void;
  hideComparison: () => void;
  updateComparisonSavings: (time: number, cost: number) => void;
  clearSwapState: () => void;
  clear: () => void;
  clearSwapInputState: () => void;
};
