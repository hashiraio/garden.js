import { create } from 'zustand';
import { ParsedAsset } from '../types/types';
import { Quote } from '@gardenfi/core';
import { Network } from '@gardenfi/utils';
import {
  getApiEndpoint,
  DEFAULT_NETWORK,
  IOType,
} from '../constants/constants';

type SwapState = {
  selectedFrom: ParsedAsset | null;
  selectedTo: ParsedAsset | null;
  fromAmount: string;
  toAmount: string;
  amountInputSide: IOType;
  isQuoting: boolean;
  quoteError: string | null;
  btcAddress: string;
  // last successful quote snapshot
  lastQuote?: {
    isExactOut: boolean;
    sourceAmount: string; // base units
    sourceDisplay: string; // human readable
    destinationAmount: string; // base units
    destinationDisplay: string; // human readable
  };
  selectAsset: (side: IOType, asset: ParsedAsset) => void;
  setFromAmount: (val: string) => void;
  setToAmount: (val: string) => void;
  setAmountInputSide: (side: IOType) => void;
  fetchQuote: (side: IOType) => Promise<void>;
  swapAssets: () => void;
  currentNetwork: Network;
  setCurrentNetwork: (network: Network) => void;
  setDefaultBTC: (assets: ParsedAsset[]) => void;
  debouncedFetchQuote: (side: IOType) => void;
  setBtcAddress: (address: string) => void;
};

export const useSwapStore = create<SwapState>((set, get) => ({
  selectedFrom: null,
  selectedTo: null,
  fromAmount: '',
  toAmount: '',
  amountInputSide: IOType.input,
  isQuoting: false,
  quoteError: null,
  btcAddress: '',
  lastQuote: undefined,
  currentNetwork: DEFAULT_NETWORK,
  setCurrentNetwork: (network) => set({ currentNetwork: network }),
  selectAsset: (side, asset) => {
    const { selectedFrom, selectedTo } = get();
    if (side === IOType.input) {
      // If same as to, swap them
      if (selectedTo && selectedTo.asset === asset.asset) {
        set({
          selectedFrom: selectedTo,
          selectedTo: asset,
        });
      } else {
        set({
          selectedFrom: asset,
        });
      }
    } else {
      if (selectedFrom && selectedFrom.asset === asset.asset) {
        set({
          selectedTo: selectedFrom,
          selectedFrom: asset,
        });
      } else {
        set({
          selectedTo: asset,
        });
      }
    }
    // Trigger quote fetch when assets change
    setTimeout(() => get().debouncedFetchQuote(side), 100);
  },

  setFromAmount: (val) => {
    set({ fromAmount: val, amountInputSide: IOType.input });
    // Trigger debounced quote fetch
    get().debouncedFetchQuote(IOType.input);
  },
  setToAmount: (val) => {
    set({ toAmount: val, amountInputSide: IOType.output });
    // Trigger debounced quote fetch
    get().debouncedFetchQuote(IOType.output);
  },
  setAmountInputSide: (side) => set({ amountInputSide: side }),
  fetchQuote: async (side) => {
    const { selectedFrom, selectedTo, fromAmount, toAmount, isQuoting } = get();
    if (isQuoting) return; // Avoid overlapping quote requests
    if (!selectedFrom || !selectedTo) return;
    const quote = new Quote(getApiEndpoint(get().currentNetwork).api);
    const isExactOut = side === IOType.output;
    const amountStr = side === IOType.input ? fromAmount : toAmount;
    const amountNum = toBaseUnitsSafe(
      amountStr,
      side === IOType.input ? selectedFrom.decimals : selectedTo.decimals,
    );
    if (amountNum <= 0) return;
    set({ isQuoting: true, quoteError: null });
    try {
      const res = await quote.getQuote(
        selectedFrom.asset.toString(),
        selectedTo.asset.toString(),
        amountNum,
        isExactOut,
      );
      if (res.error) {
        set({ quoteError: String(res.error) });
        return;
      }
      const val = res.val as any[] | undefined;
      const best = val?.[0];
      if (!best) return;
      if (isExactOut) {
        const srcAmount = Number(best.source?.amount ?? 0);
        set({ fromAmount: fromBaseUnits(srcAmount, selectedFrom.decimals) });
      } else {
        const dstAmount = Number(best.destination?.amount ?? 0);
        set({ toAmount: fromBaseUnits(dstAmount, selectedTo.decimals) });
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
      set({ quoteError: e?.message ?? 'Failed to fetch quote' });
    } finally {
      set({ isQuoting: false });
    }
  },
  swapAssets: () => {
    const { selectedFrom, selectedTo } = get();
    set({
      selectedFrom: selectedTo,
      selectedTo: selectedFrom,
    });
    // Trigger quote fetch after swapping assets
    setTimeout(() => get().debouncedFetchQuote(IOType.input), 100);
  },

  setDefaultBTC: (assets: ParsedAsset[]) => {
    const { selectedFrom } = get();
    // Only set BTC as default if no asset is currently selected
    if (!selectedFrom) {
      const btcAsset = assets.find(
        (asset) =>
          asset.symbol === 'BTC' &&
          asset.chainDisplayName.toLowerCase().includes('bitcoin'),
      );
      if (btcAsset) {
        set({ selectedFrom: btcAsset });
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
