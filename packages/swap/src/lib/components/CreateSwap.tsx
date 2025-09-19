import React, { useMemo, useState } from 'react';
import { useGarden } from '@gardenfi/react-hooks';
import { SwapParams } from '@gardenfi/core';
import { Button } from '@gardenfi/garden-book';
import { useSwapStore } from '../hooks/store';
import { SwapInput } from './SwapInput';
import { IOType } from '../constants/constants';

const CreateSwap = () => {
  const {
    isQuoting,
    lastQuote,
    selectedFrom,
    selectedTo,
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
  console.log(swapError);
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
  return (
    <div className="flex flex-col h-full w-full space-y-4">
      <div onBlur={() => fetchQuote('from')} className="w-full">
        <SwapInput
          type={IOType.input}
          amount={fromAmount}
          onChange={(amount) => {
            setAmountInputSide('from');
            setFromAmount(amount);
          }}
          asset={selectedFrom as any}
          loading={isQuoting}
          price={
            selectedFrom
              ? (Number(fromAmount) * selectedFrom.priceUsd).toString()
              : '0'
          }
          error={swapError as any}
          balance={undefined} // TODO: Add balance fetching
          timeEstimate={undefined}
        />
      </div>

      <div onBlur={() => fetchQuote('to')} className="w-full">
        <SwapInput
          type={IOType.output}
          amount={toAmount}
          onChange={(amount) => {
            setAmountInputSide('to');
            setToAmount(amount);
          }}
          asset={selectedTo as any}
          loading={isQuoting}
          price={
            selectedTo
              ? (Number(toAmount) * selectedTo.priceUsd).toString()
              : '0'
          }
          error={undefined}
          balance={undefined}
          timeEstimate="~2-5 min"
        />
      </div>

      <Button
        className="w-full disabled:opacity-60"
        disabled={!canSwap}
        onClick={handleSwapClick}
      >
        {isSwapping ? 'Creating swap…' : isQuoting ? 'Quoting…' : 'Swap'}
      </Button>
    </div>
  );
};

export default CreateSwap;
