import { create } from 'zustand';
import { ApiAsset, ParsedAsset, toParsedAsset } from '../types/types';
import { Quote } from '@gardenfi/core';

type SelectionSide = 'from' | 'to';

type SwapState = {
  assets: ParsedAsset[];
  isLoading: boolean;
  error: string | null;
  filter: string;
  modalOpenFor: SelectionSide | null;
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
  selectAsset: (side: SelectionSide, asset: ParsedAsset) => void;
  fetchAssets: () => Promise<void>;
  setFromAmount: (val: string) => void;
  setToAmount: (val: string) => void;
  setAmountInputSide: (side: SelectionSide) => void;
  fetchQuote: (side: SelectionSide) => Promise<void>;
};

export const useSwapStore = create<SwapState>((set, get) => ({
  assets: [],
  isLoading: false,
  error: null,
  filter: '',
  modalOpenFor: null,
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
  selectAsset: (side, asset) => {
    const { selectedFrom, selectedTo } = get();
    if (side === 'from') {
      // If same as to, swap them
      if (selectedTo && selectedTo.id === asset.id) {
        set({
          selectedFrom: selectedTo,
          selectedTo: asset,
          modalOpenFor: null,
          filter: '',
        });
      } else {
        set({ selectedFrom: asset, modalOpenFor: null, filter: '' });
      }
    } else {
      if (selectedFrom && selectedFrom.id === asset.id) {
        set({
          selectedTo: selectedFrom,
          selectedFrom: asset,
          modalOpenFor: null,
          filter: '',
        });
      } else {
        set({ selectedTo: asset, modalOpenFor: null, filter: '' });
      }
    }
  },
  fetchAssets: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('https://testnet.api.garden.finance/v2/assets');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { status: string; result: ApiAsset[] } = await res.json();
      const parsed = data.result.map(toParsedAsset);
      set({ assets: parsed, isLoading: false });
      // Initialize defaults if empty
      const s = parsed[0] ?? null;
      const t = parsed.find((a) => a.id !== s?.id) ?? null;
      set({ selectedFrom: s, selectedTo: t });
    } catch (e: any) {
      set({ error: e?.message ?? 'Failed to load assets', isLoading: false });
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
        selectedFrom.id,
        selectedTo.id,
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
