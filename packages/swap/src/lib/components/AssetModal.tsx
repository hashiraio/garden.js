import React, { useMemo } from 'react';
import { ParsedAsset } from '../types/types';
import { useSwapStore } from '../hooks/store';
import { useAssetStore } from '../hooks/assetStore';
import { GradientScroll } from '@gardenfi/garden-book';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: ParsedAsset) => void;
};

const AssetModal: React.FC<Props> = ({ open, onClose, onSelect }) => {
  const { filter, setFilter, selectedFrom, selectedTo, modalOpenFor } =
    useSwapStore();
  const { allAssets } = useAssetStore();

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return allAssets;
    return allAssets.filter(
      (a) =>
        a.chainDisplayName.toLowerCase().includes(f) ||
        a.symbol.toLowerCase().includes(f),
    );
  }, [allAssets, filter]);

  const options = useMemo(() => {
    const other = modalOpenFor === 'from' ? selectedTo : selectedFrom;
    return filtered.filter((a) => a.id !== other?.id);
  }, [filtered, modalOpenFor, selectedFrom, selectedTo]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <GradientScroll height={376} gradientHeight={42} className="rounded-2xl">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-xl">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Select Asset
            </h2>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700"
            >
              ✕
            </button>
          </div>
          <div className="p-4 space-y-4">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by chain or symbol"
              className="w-full garden-input"
            />
            <div className="max-h-96 overflow-auto divide-y">
              {options.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onSelect(a)}
                  className="w-full text-left p-3 hover:bg-slate-50 flex items-center gap-3"
                >
                  {a.iconUrl ? (
                    <img
                      src={a.iconUrl}
                      alt={a.symbol}
                      width={20}
                      height={20}
                      className="h-6 w-6 rounded-full"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-slate-200" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900">
                        {a.symbol}
                      </span>
                      <span className="text-sm text-slate-500">
                        {a.chainDisplayName}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </GradientScroll>
    </div>
  );
};

export default AssetModal;
