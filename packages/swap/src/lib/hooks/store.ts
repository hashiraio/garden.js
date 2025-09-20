import { create } from 'zustand';
import { Quote } from '@gardenfi/core';
import { Network } from '@gardenfi/utils';
import {
  getApiEndpoint,
  DEFAULT_NETWORK,
  IOType,
} from '../constants/constants';
import { Asset } from '@gardenfi/orderbook';

type SwapState = {
  inputAsset: Asset | null;
  outputAsset: Asset | null;
  inputAmount: string;
  outputAmount: string;
  amountInputSide: IOType;
  isQuoting: boolean;
  error: string | null;
  btcAddress: string;
  // last successful quote snapshot
  lastQuote?: {
    isExactOut: boolean;
    sourceAmount: string; // base units
    sourceDisplay: string; // human readable
    destinationAmount: string; // base units
    destinationDisplay: string; // human readable
  };
  selectAsset: (side: IOType, asset: Asset) => void;
  setinputAmount: (val: string) => void;
  setoutputAmount: (val: string) => void;
  setAmountInputSide: (side: IOType) => void;
  fetchQuote: (side: IOType) => Promise<void>;
  swapAssets: () => void;
  currentNetwork: Network;
  setCurrentNetwork: (network: Network) => void;
  setDefaultBTC: (assets: Asset[]) => void;
  debouncedFetchQuote: (side: IOType) => void;
  setBtcAddress: (address: string) => void;
};

export const swapStore = create<SwapState>((set, get) => ({
  inputAsset: null,
  outputAsset: null,
  inputAmount: '',
  outputAmount: '',
  amountInputSide: IOType.input,
  isQuoting: false,
  error: null,
  btcAddress: '',
  lastQuote: undefined,
  currentNetwork: DEFAULT_NETWORK,
  setCurrentNetwork: (network) => set({ currentNetwork: network }),
  selectAsset: (side, asset) => {
    const { inputAsset, outputAsset } = get();
    if (side === IOType.input) {
      // If same as to, swap them
      if (outputAsset && outputAsset === asset) {
        set({
          inputAsset: outputAsset,
          outputAsset: asset,
        });
      } else {
        set({
          inputAsset: asset,
        });
      }
    } else {
      if (inputAsset && inputAsset === asset) {
        set({
          outputAsset: inputAsset,
          inputAsset: asset,
        });
      } else {
        set({
          outputAsset: asset,
        });
      }
    }
    // Trigger quote fetch when assets change
    setTimeout(() => get().debouncedFetchQuote(side), 100);
  },

  setinputAmount: (val) => {
    set({ inputAmount: val, amountInputSide: IOType.input });
    // Trigger debounced quote fetch
    get().debouncedFetchQuote(IOType.input);
  },
  setoutputAmount: (val) => {
    set({ outputAmount: val, amountInputSide: IOType.output });
    // Trigger debounced quote fetch
    get().debouncedFetchQuote(IOType.output);
  },
  setAmountInputSide: (side) => set({ amountInputSide: side }),
  fetchQuote: async (side) => {
    const { inputAsset, outputAsset, inputAmount, outputAmount, isQuoting } =
      get();
    if (isQuoting) return; // Avoid overlapping quote requests
    if (!inputAsset || !outputAsset) return;
    const quote = new Quote(getApiEndpoint(get().currentNetwork).api);
    const isExactOut = side === IOType.output;
    const amountStr = side === IOType.input ? inputAmount : outputAmount;
    const amountNum = toBaseUnitsSafe(
      amountStr,
      side === IOType.input ? inputAsset.decimals : outputAsset.decimals,
    );
    if (amountNum <= 0) return;
    set({ isQuoting: true, error: null });
    try {
      const res = await quote.getQuote(
        inputAsset,
        outputAsset,
        amountNum,
        isExactOut,
      );
      if (res.error) {
        set({ error: String(res.error) });
        return;
      }
      const val = res.val as any[] | undefined;
      const best = val?.[0];
      if (!best) return;
      if (isExactOut) {
        const srcAmount = Number(best.source?.amount ?? 0);
        set({ inputAmount: fromBaseUnits(srcAmount, inputAsset.decimals) });
      } else {
        const dstAmount = Number(best.destination?.amount ?? 0);
        set({ outputAmount: fromBaseUnits(dstAmount, outputAsset.decimals) });
      }
      set({
        lastQuote: {
          isExactOut,
          sourceAmount: String(best.source?.amount ?? ''),
          sourceDisplay: String(best.source?.display ?? ''),
          destinationAmount: String(best.destination?.amount ?? ''),
          destinationDisplay: String(best.destination?.display ?? ''),
        },
      });
    } catch (e: any) {
      set({ error: e?.message ?? 'Failed to fetch quote' });
    } finally {
      set({ isQuoting: false });
    }
  },
  swapAssets: () => {
    const { inputAsset, outputAsset } = get();
    set({
      inputAsset: outputAsset,
      outputAsset: inputAsset,
    });
    // Trigger quote fetch after swapping assets
    setTimeout(() => get().debouncedFetchQuote(IOType.input), 100);
  },

  setDefaultBTC: (assets: Asset[]) => {
    const { inputAsset } = get();
    // Only set BTC as default if no asset is currently selected
    if (!inputAsset) {
      const btcAsset = assets.find(
        (asset) =>
          asset.symbol === 'BTC' &&
          asset.name.toLowerCase().includes('bitcoin'),
      );
      if (btcAsset) {
        set({ inputAsset: btcAsset });
      }
    }
  },

  debouncedFetchQuote: (() => {
    let timeoutId: NodeJS.Timeout;
    return (side: IOType) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        get().fetchQuote(side);
      }, 500); // 500ms debounce
    };
  })(),

  setBtcAddress: (address: string) => set({ btcAddress: address }),
}));

function toBaseUnitsSafe(humanAmount: string, decimals: number): number {
  const n = Number(humanAmount);
  if (!isFinite(n) || n <= 0) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor);
}

function fromBaseUnits(amount: number, decimals: number): string {
  const factor = Math.pow(10, decimals);
  return (amount / factor).toString();
}
