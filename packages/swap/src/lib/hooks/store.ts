import { create } from 'zustand';
import { ParsedAsset } from '../types/types';
import { Quote } from '@gardenfi/core';

type SelectionSide = 'from' | 'to';

type SwapState = {
  filter: string;
  modalOpenFor: SelectionSide | null;
  isAssetModalOpen: boolean;
  selectedFrom: ParsedAsset | null;
  selectedTo: ParsedAsset | null;
  fromAmount: string;
  toAmount: string;
  amountInputSide: SelectionSide;
  isQuoting: boolean;
  quoteError: string | null;
  // last successful quote snapshot
  lastQuote?: {
    isExactOut: boolean;
    sourceAmount: string; // base units
    sourceDisplay: string; // human readable
    destinationAmount: string; // base units
    destinationDisplay: string; // human readable
  };
  setFilter: (filter: string) => void;
  openModal: (side: SelectionSide) => void;
  closeModal: () => void;
  openAssetModal: () => void;
  closeAssetModal: () => void;
  selectAsset: (side: SelectionSide, asset: ParsedAsset) => void;
  setFromAmount: (val: string) => void;
  setToAmount: (val: string) => void;
  setAmountInputSide: (side: SelectionSide) => void;
  fetchQuote: (side: SelectionSide) => Promise<void>;
  swapAssets: () => void;
};

export const useSwapStore = create<SwapState>((set, get) => ({
  filter: '',
  modalOpenFor: null,
  isAssetModalOpen: false,
  selectedFrom: null,
  selectedTo: null,
  fromAmount: '',
  toAmount: '',
  amountInputSide: 'from',
  isQuoting: false,
  quoteError: null,
  lastQuote: undefined,
  setFilter: (filter) => set({ filter }),
  openModal: (side) => set({ modalOpenFor: side }),
  closeModal: () => set({ modalOpenFor: null, filter: '' }),
  openAssetModal: () => set({ isAssetModalOpen: true }),
  closeAssetModal: () => set({ isAssetModalOpen: false, filter: '' }),
  selectAsset: (side, asset) => {
    const { selectedFrom, selectedTo } = get();
    if (side === 'from') {
      // If same as to, swap them
      if (selectedTo && selectedTo.asset === asset.asset) {
        set({
          selectedFrom: selectedTo,
          selectedTo: asset,
          modalOpenFor: null,
          isAssetModalOpen: false,
          filter: '',
        });
      } else {
        set({
          selectedFrom: asset,
          modalOpenFor: null,
          isAssetModalOpen: false,
          filter: '',
        });
      }
    } else {
      if (selectedFrom && selectedFrom.asset === asset.asset) {
        set({
          selectedTo: selectedFrom,
          selectedFrom: asset,
          modalOpenFor: null,
          isAssetModalOpen: false,
          filter: '',
        });
      } else {
        set({
          selectedTo: asset,
          modalOpenFor: null,
          isAssetModalOpen: false,
          filter: '',
        });
      }
    }
  },

  setFromAmount: (val) => set({ fromAmount: val, amountInputSide: 'from' }),
  setToAmount: (val) => set({ toAmount: val, amountInputSide: 'to' }),
  setAmountInputSide: (side) => set({ amountInputSide: side }),
  fetchQuote: async (side) => {
    const { selectedFrom, selectedTo, fromAmount, toAmount, isQuoting } = get();
    if (isQuoting) return; // Avoid overlapping quote requests
    if (!selectedFrom || !selectedTo) return;
    const quote = new Quote('https://testnet.api.garden.finance');
    const isExactOut = side === 'to';
    const amountStr = side === 'from' ? fromAmount : toAmount;
    const amountNum = toBaseUnitsSafe(
      amountStr,
      side === 'from' ? selectedFrom.decimals : selectedTo.decimals,
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
  },
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
