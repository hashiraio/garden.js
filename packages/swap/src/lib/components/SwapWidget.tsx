import React, { useEffect, useMemo, useState } from 'react';
import { useSwapStore } from '../hooks/store';
import AssetModal from './AssetModal';
import { useGarden } from '@gardenfi/react-hooks';
import { SwapParams } from '@gardenfi/core';
import { GardenFullLogo, Button } from '@gardenfi/garden-book';
import Navbar from './Navbar';
import { TabKey } from '../types/types';

const SwapWidget = () => {
  const {
    isLoading,
    error,
    isQuoting,
    quoteError,
    lastQuote,
    selectedFrom,
    selectedTo,
    modalOpenFor,
    openModal,
    closeModal,
    selectAsset,
    fetchAssets,
    fromAmount,
    toAmount,
    setFromAmount,
    setToAmount,
    fetchQuote,
    setAmountInputSide,
    amountInputSide,
  } = useSwapStore();
  const { swap } = useGarden();
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('swap');

  const canSwap = useMemo(() => {
    return (
      typeof swap === 'function' &&
      !!selectedFrom &&
      !!selectedTo &&
      selectedFrom.id !== selectedTo.id &&
      !isQuoting &&
      !isSwapping &&
      ((amountInputSide === 'from' && !!fromAmount) ||
        (amountInputSide === 'to' && !!toAmount))
    );
  }, [
    swap,
    selectedFrom,
    selectedTo,
    isQuoting,
    isSwapping,
    amountInputSide,
    fromAmount,
    toAmount,
  ]);

  async function handleSwapClick() {
    setSwapError(null);
    if (typeof swap !== 'function')
      return setSwapError('Garden context unavailable');
    if (!selectedFrom || !selectedTo) return setSwapError('Select both assets');
    if (selectedFrom.id === selectedTo.id)
      return setSwapError('Assets must be different');
    if (isQuoting) return setSwapError('Please wait, fetching quote…');
    const sendAmount = fromAmount;
    const receiveAmount = toAmount;
    if (!sendAmount && !receiveAmount)
      return setSwapError('Enter an amount to swap');

    try {
      setIsSwapping(true);
      const payload: SwapParams = {
        fromAsset: selectedFrom.id,
        toAsset: selectedTo.id,
        receiveAmount: lastQuote?.isExactOut
          ? lastQuote?.sourceAmount
          : lastQuote?.destinationAmount ?? '',
        sendAmount: lastQuote?.isExactOut
          ? lastQuote?.destinationAmount
          : lastQuote?.sourceAmount ?? '',
      };

      const res = await swap(payload);
      if ((res as any)?.error) setSwapError(String((res as any).error));
    } catch (e: any) {
      setSwapError(e?.message ?? 'Failed to create swap');
    } finally {
      setIsSwapping(false);
    }
  }

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    if (!selectedFrom || !selectedTo) return;
    const hasAmount = amountInputSide === 'from' ? !!fromAmount : !!toAmount;
    if (!hasAmount) return;
    const t = setTimeout(() => {
      fetchQuote(amountInputSide);
    }, 400);
    return () => clearTimeout(t);
  }, [
    fromAmount,
    toAmount,
    selectedFrom,
    selectedTo,
    amountInputSide,
    fetchQuote,
  ]);

  useEffect(() => {
    if (!selectedFrom || !selectedTo) return;
    const hasEither = !!fromAmount || !!toAmount;
    if (!hasEither) return;
    const id = setInterval(() => {
      fetchQuote(amountInputSide);
    }, 5000);
    return () => clearInterval(id);
  }, [
    selectedFrom,
    selectedTo,
    fromAmount,
    toAmount,
    amountInputSide,
    fetchQuote,
  ]);

  return (
    <div className="mx-auto flex h-full w-full rounded-[20px] p-3 pb-4 max-w-[328px] bg-[#E4EBF2] flex-col justify-start gap-4 sm:min-h-[496px] sm:max-w-[424px]">
      <div className="">
        <Navbar active={activeTab} onChange={setActiveTab} />
        {activeTab === 'swap' && (
          <div className="mb-4">
            <GardenFullLogo />
            <p className="text-sm text-slate-500">
              Swap assets across supported chains
            </p>
          </div>
        )}

        {isLoading && (
          <div className="text-sm text-slate-500">Loading assets…</div>
        )}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {quoteError && <div className="text-sm text-red-600">{quoteError}</div>}
        {lastQuote && (
          <div className="text-xs text-slate-600 mt-2">
            Quote: {lastQuote.sourceDisplay} → {lastQuote.destinationDisplay}
          </div>
        )}
        {swapError && <div className="text-sm text-red-600">{swapError}</div>}

        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              From
            </label>
            <div className="flex items-center gap-3">
              <button
                className="garden-btn px-3 py-2"
                onClick={() => openModal('from')}
              >
                {selectedFrom ? (
                  <div className="flex items-center gap-2">
                    {selectedFrom.iconUrl ? (
                      <img
                        src={selectedFrom.iconUrl}
                        alt={selectedFrom.symbol}
                        width={20}
                        height={20}
                        className="h-5 w-5 rounded-full"
                      />
                    ) : (
                      <span className="h-5 w-5 rounded-full bg-slate-200" />
                    )}
                    <span className="font-medium">{selectedFrom.symbol}</span>
                    <span className="text-xs text-slate-500">
                      {selectedFrom.chainDisplayName}
                    </span>
                  </div>
                ) : (
                  'Select'
                )}
              </button>
              <input
                className="garden-input flex-1"
                placeholder="Amount"
                inputMode="decimal"
                value={fromAmount}
                onChange={(e) => {
                  setAmountInputSide('from');
                  setFromAmount(e.target.value);
                }}
                onBlur={() => fetchQuote('from')}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              To
            </label>
            <div className="flex items-center gap-3">
              <button
                className="garden-btn px-3 py-2"
                onClick={() => openModal('to')}
              >
                {selectedTo ? (
                  <div className="flex items-center gap-2">
                    {selectedTo.iconUrl ? (
                      <img
                        src={selectedTo.iconUrl}
                        alt={selectedTo.symbol}
                        width={20}
                        height={20}
                        className="h-5 w-5 rounded-full"
                      />
                    ) : (
                      <span className="h-5 w-5 rounded-full bg-slate-200" />
                    )}
                    <span className="font-medium">{selectedTo.symbol}</span>
                    <span className="text-xs text-slate-500">
                      {selectedTo.chainDisplayName}
                    </span>
                  </div>
                ) : (
                  'Select'
                )}
              </button>
              <input
                className="garden-input flex-1"
                placeholder="Amount"
                inputMode="decimal"
                value={toAmount}
                onChange={(e) => {
                  setAmountInputSide('to');
                  setToAmount(e.target.value);
                }}
                onBlur={() => fetchQuote('to')}
              />
            </div>
          </div>

          <Button
            className="w-full disabled:opacity-60"
            disabled={!canSwap}
            onClick={handleSwapClick}
          >
            {isSwapping ? 'Creating swap…' : isQuoting ? 'Quoting…' : 'Swap'}
          </Button>
        </div>
      </div>

      <AssetModal
        open={modalOpenFor !== null}
        onClose={closeModal}
        onSelect={(asset) => {
          if (!modalOpenFor) return;
          selectAsset(modalOpenFor, asset);
        }}
      />
    </div>
  );
};

export default SwapWidget;
