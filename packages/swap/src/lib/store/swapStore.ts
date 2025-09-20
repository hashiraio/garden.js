import { create } from 'zustand';
import {
  IOType,
  ErrorFormat,
  Errors,
  DEFAULT_NETWORK,
} from '../constants/constants';
import { Chains } from '@gardenfi/orderbook';
import { Network } from '@gardenfi/utils';
import { ParsedAsset } from '../types/assetTypes';

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
  inputAsset?: ParsedAsset;
  outputAsset?: ParsedAsset;
  inputAmount: string;
  outputAmount: string;
  rate: number;
  networkFees: number;
  btcAddress: string;
  isSwapping: boolean;
  isApproving: boolean;
  strategy: string;
  tokenPrices: TokenPrices;
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
  currentNetwork: Network;
  setCurrentNetwork: (network: Network) => void;
  setTokenPrices: (tokenPrices: TokenPrices) => void;
  setIsSwapping: (isSwapping: boolean) => void;
  setIsApproving: (isApproving: boolean) => void;
  setStrategy: (strategy: string) => void;
  setAsset: (ioType: IOType, asset: ParsedAsset | undefined) => void;
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

export const BTC = {
  name: 'Bitcoin',
  decimals: 8,
  symbol: 'BTC',
  logo: 'https://garden.imgix.net/token-images/bitcoin.svg',
  tokenAddress: 'primary',
  atomicSwapAddress: 'primary',
  chain:
    Network.MAINNET === 'mainnet' ? Chains.bitcoin : Chains.bitcoin_testnet,
  price: 115767.9,
  min_amount: '50000',
  max_amount: '10000000000',
};

export const swapStore = create<SwapState>((set) => ({
  inputAsset: BTC,
  inputAmount: '',
  outputAmount: '',
  rate: 0,
  networkFees: 0,
  btcAddress: '',
  isApproving: false,
  isNetworkFeesLoading: false,
  swapInProgress: {
    isOpen: false,
    order: null,
  },
  isSwapping: false,
  strategy: '',
  tokenPrices: {
    input: '0',
    output: '0',
  },
  error: {
    inputError: Errors.none,
    outputError: Errors.none,
    liquidityError: Errors.none,
    insufficientBalanceError: Errors.none,
  },
  isFetchingQuote: {
    input: false,
    output: false,
  },
  isEditBTCAddress: false,
  isComparisonVisible: false,
  isValidBitcoinAddress: false,
  showComparison: {
    isTime: false,
    isFees: false,
  },
  maxTimeSaved: 0,
  maxCostSaved: 0,
  currentNetwork: DEFAULT_NETWORK,
  setCurrentNetwork: (network) => set({ currentNetwork: network }),
  setAsset: (ioType, asset) => {
    set((state) => ({
      ...state,
      [ioType === IOType.input ? 'inputAsset' : 'outputAsset']: asset,
    }));
  },
  setAmount: (ioType, amount) => {
    set((state) => ({
      ...state,
      [ioType === IOType.input ? 'inputAmount' : 'outputAmount']: amount,
    }));
  },
  setRate: (rate) => {
    set((state) => ({
      ...state,
      rate,
    }));
  },
  setNetworkFees: (networkFees) => {
    set((state) => ({
      ...state,
      networkFees,
    }));
  },
  setIsNetworkFeesLoading: (isNetworkFeesLoading) => {
    set({ isNetworkFeesLoading });
  },
  setBtcAddress: (btcAddress) => {
    set((state) => ({
      ...state,
      btcAddress,
    }));
  },
  swapAssets: () => {
    set((state) => {
      const newInputAmount =
        !state.outputAmount || state.outputAmount === '0'
          ? ''
          : state.outputAmount;

      const newOutputAmount =
        !state.inputAmount || state.inputAmount === '0'
          ? ''
          : state.outputAmount;
      return {
        ...state,
        inputAsset: state.outputAsset,
        outputAsset: state.inputAsset,
        inputAmount: newInputAmount,
        outputAmount: newOutputAmount,
        error: {
          ...state.error,
          inputError: Errors.none,
          outputError: Errors.none,
          liquidityError: Errors.none,
          insufficientBalanceError: Errors.none,
        },
      };
    });
  },
  setIsSwapping: (isSwapping) => {
    set({ isSwapping });
  },
  setIsEditBTCAddress: (isEditBTCAddress) => {
    set({ isEditBTCAddress });
  },
  setStrategy: (strategy) => {
    set({ strategy });
  },
  setTokenPrices: (tokenPrices) => {
    set({ tokenPrices });
  },
  setError: (error) => {
    set((state) => ({ error: { ...state.error, ...error } }));
  },
  setIsFetchingQuote: (isFetchingQuote) => {
    set({ isFetchingQuote });
  },
  setIsApproving: (isApproving) => {
    set({ isApproving });
  },
  setIsComparisonVisible: (isComparisonVisible) => {
    set({ isComparisonVisible });
  },
  setIsValidBitcoinAddress: (isValidBitcoinAddress) => {
    set({ isValidBitcoinAddress });
  },
  showComparisonHandler: (type) => {
    set({
      isComparisonVisible: true,
      showComparison: {
        isTime: type === 'time',
        isFees: type === 'fees',
      },
    });
  },
  hideComparison: () => {
    set({
      isComparisonVisible: false,
      showComparison: {
        isTime: false,
        isFees: false,
      },
    });
  },
  updateComparisonSavings: (time, cost) => {
    set({
      maxTimeSaved: time,
      maxCostSaved: cost,
    });
  },
  clearSwapState: () => {
    set({
      inputAmount: '',
      outputAmount: '',
      rate: 0,
      btcAddress: '',
      outputAsset: undefined,
      inputAsset: BTC,
      isApproving: false,
      isSwapping: false,
      strategy: '',
      tokenPrices: {
        input: '0',
        output: '0',
      },
      error: {
        inputError: Errors.none,
        outputError: Errors.none,
        liquidityError: Errors.none,
        insufficientBalanceError: Errors.none,
      },
      isFetchingQuote: {
        input: false,
        output: false,
      },
      isEditBTCAddress: false,
      isValidBitcoinAddress: false,
      showComparison: {
        isTime: false,
        isFees: false,
      },
      maxTimeSaved: 0,
      maxCostSaved: 0,
    });
  },
  clear: () => {
    set({
      inputAmount: '',
      outputAmount: '',
      btcAddress: '',
      rate: 0,
      outputAsset: undefined,
      inputAsset: BTC,
      isSwapping: false,
      isApproving: false,
      strategy: '',
      tokenPrices: {
        input: '0',
        output: '0',
      },
      error: {
        inputError: Errors.none,
        outputError: Errors.none,
        liquidityError: Errors.none,
        insufficientBalanceError: Errors.none,
      },
      isFetchingQuote: {
        input: false,
        output: false,
      },
      isEditBTCAddress: false,
      isValidBitcoinAddress: false,
      showComparison: {
        isTime: false,
        isFees: false,
      },
      maxTimeSaved: 0,
      maxCostSaved: 0,
    });
  },
  clearSwapInputState: () => {
    set({
      inputAmount: '',
      outputAmount: '',
      rate: 0,
      tokenPrices: {
        input: '0',
        output: '0',
      },

      error: {
        inputError: Errors.none,
        outputError: Errors.none,
        liquidityError: Errors.none,
        insufficientBalanceError: Errors.none,
      },
    });
  },
}));
