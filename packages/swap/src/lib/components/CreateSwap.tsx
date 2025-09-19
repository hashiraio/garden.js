import React, { useMemo, useState } from 'react';
import { useGarden } from '@gardenfi/react-hooks';
import { SwapParams } from '@gardenfi/core';
import { Button, ExchangeIcon } from '@gardenfi/garden-book';
import { useSwapStore } from '../hooks/store';
import { SwapInput } from './SwapInput';
import { IOType } from '../constants/constants';
import { InputAddressAndFeeRateDetails } from './InputAddressAndFeeRateDetails';

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
    setAmountInputSide,
    amountInputSide,
    swapAssets,
  } = useSwapStore();
  const { swap } = useGarden();
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);

  const canSwap = useMemo(() => {
    return (
      typeof swap === 'function' &&
      !!selectedFrom &&
      !!selectedTo &&
      selectedFrom.asset.toString() !== selectedTo.asset.toString() &&
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

  // const buttonVariant = useMemo(() => {
  //   return buttonDisabled
  //     ? "disabled"
  //     : isSwapping
  //       ? "ternary"
  //       : garden?.htlcs.evm || validSwap
  //         ? "primary"
  //         : "disabled";
  // }, [buttonDisabled, isSwapping, validSwap, needsWalletConnection]);

  async function handleSwapClick() {
    setSwapError(null);
    if (typeof swap !== 'function')
      return setSwapError('Garden context unavailable');
    if (!selectedFrom || !selectedTo) return setSwapError('Select both assets');
    if (selectedFrom.asset.toString() === selectedTo.asset.toString())
      return setSwapError('Assets must be different');
    if (isQuoting) return setSwapError('Please wait, fetching quote…');
    const sendAmount = fromAmount;
    const receiveAmount = toAmount;
    if (!sendAmount && !receiveAmount)
      return setSwapError('Enter an amount to swap');

    try {
      setIsSwapping(true);
      const payload: SwapParams = {
        fromAsset: selectedFrom.asset.toString(),
        toAsset: selectedTo.asset.toString(),
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
    <div className="flex flex-col gap-3">
      <div className="relative flex flex-col gap-3">
        <div className="w-full">
          <SwapInput
            type={IOType.input}
            amount={fromAmount}
            onChange={(amount) => {
              setAmountInputSide('from');
              setFromAmount(amount);
            }}
            asset={selectedFrom || undefined}
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
        <div
          className="absolute left-1/2 top-1/2 -translate-x-[8px] -translate-y-[8px] cursor-pointer"
          onClick={swapAssets}
        >
          <div className="h-8 w-8 origin-center rounded-full border border-light-grey bg-white p-1.5 transition-transform hover:scale-[1.05]"></div>
          <ExchangeIcon className="pointer-events-none absolute bottom-1.5 left-1.5" />
        </div>
        <div className="w-full">
          <SwapInput
            type={IOType.output}
            amount={toAmount}
            onChange={(amount) => {
              setAmountInputSide('to');
              setToAmount(amount);
            }}
            asset={selectedTo || undefined}
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
      </div>

      <InputAddressAndFeeRateDetails />

      <Button
        className="w-full  transition-colors duration-500"
        disabled={!canSwap}
        variant={!canSwap ? 'disabled' : 'primary'}
        size="lg"
        onClick={handleSwapClick}
      >
        {isSwapping ? 'Creating swap…' : isQuoting ? 'Quoting…' : 'Swap'}
      </Button>
    </div>
  );
};

export default CreateSwap;
