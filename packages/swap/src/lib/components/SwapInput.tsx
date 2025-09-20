import React from 'react';
import {
  KeyboardDownIcon,
  TimerIcon,
  TokenInfo,
  Typography,
  WalletIcon,
} from '@gardenfi/garden-book';
import { FC, useMemo, useRef, ChangeEvent, useState, useEffect } from 'react';
import { useAssetStore } from '../store/assetStore';
import { ParsedAsset } from '../types/assetTypes';
import NumberFlow from '@number-flow/react';
import clsx from 'clsx';
import { formatAmount } from '../utils/utils';
import { ErrorFormat, IOType } from '../constants/constants';

type SwapInputProps = {
  type: IOType;
  amount: string;
  onChange: (amount: string) => void;
  asset?: ParsedAsset;
  loading: boolean;
  price: string;
  error?: ErrorFormat;
  balance?: number;
  timeEstimate?: string;
};

export const SwapInput: FC<SwapInputProps> = ({
  type,
  amount,
  asset,
  onChange,
  price,
  error,
  balance,
  timeEstimate,
  loading,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [animated, setAnimated] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showLoadingOpacity, setShowLoadingOpacity] = useState(false);

  const { openAssetModal, openModal } = useAssetStore();
  const { chains } = useAssetStore();

  const inputRef = useRef<HTMLInputElement>(null);

  const network = useMemo(() => {
    if (!asset) return;
    return chains?.find((chain) => chain.chainId === asset.chainId);
  }, [asset, chains]);

  const label = type === IOType.input ? 'Send' : 'Receive';

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;

    // Strict validation: only allow numbers and a single decimal point
    if (!/^[0-9]*\.?[0-9]*$/.test(input)) {
      setAnimated(false);
      setTimeout(() => {
        setAnimated(true);
      }, 800);
      return;
    }
    setAnimated(false);

    if (input.startsWith('.')) {
      input = '0' + input;
    }

    const parts = input.split('.');
    if (input === '-') return;

    // If there's more than one decimal point, reject the input
    if (parts.length > 2) {
      setTimeout(() => {
        setAnimated(true);
      }, 800);
      return;
    }

    const decimals = (parts[1] || '').length;
    // If there are more than the maximum decimals after the point.
    if (asset && decimals > asset.decimals && parts[1]) {
      // Trim decimals to only keep the maximum amount.
      onChange(parts[0] + '.' + parts[1].slice(0, asset.decimals));
    } else {
      // Otherwise, just set the input.
      onChange(input);
    }
  };

  const handleBalanceClick = () => {
    if (type === IOType.input && balance && asset) {
      const balanceStr = balance.toString();
      onChange(balanceStr);
    }
  };

  const handleOpenAssetSelector = () => {
    openModal(type === IOType.input ? IOType.input : IOType.output);
    openAssetModal();
  };

  useEffect(() => {
    setAnimated(true);
  }, [asset, isFocused]);

  // Show loading opacity when loading
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (loading) {
      timeoutId = setTimeout(() => {
        setShowLoadingOpacity(true);
      }, 300);
    } else {
      setShowLoadingOpacity(false);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading]);

  return (
    <>
      <div className="flex flex-col gap-2 rounded-2xl bg-white p-4">
        <div className="flex justify-between">
          <div className="flex gap-3">
            <Typography
              size="h5"
              weight="medium"
              onClick={() => inputRef.current!.focus()}
            >
              {label}
            </Typography>
            <div className="flex gap-2">
              {amount && Number(price) !== 0 && (
                <Typography size="h5" weight="regular">
                  <span className="text-mid-grey">
                    ~${formatAmount(price, 0, 3)}
                  </span>
                </Typography>
              )}
            </div>
          </div>
          {type === IOType.input &&
            (error ? (
              <Typography
                size="h5"
                weight="regular"
                className="!text-error-red"
              >
                {error}
              </Typography>
            ) : balance !== undefined && !Number.isNaN(balance) ? (
              <div
                className="flex cursor-pointer items-center gap-1"
                onClick={handleBalanceClick}
              >
                <WalletIcon className="h-2.5 w-2.5" />
                <Typography size="h5" weight="regular">
                  {balance}
                </Typography>
              </div>
            ) : (
              <></>
            ))}
          {type === IOType.output &&
            (error ? (
              <Typography
                size="h5"
                weight="regular"
                className="!text-error-red"
              >
                {error}
              </Typography>
            ) : (
              timeEstimate && (
                <div className="flex items-end gap-1">
                  <TimerIcon className="h-4" />
                  <Typography
                    size="h5"
                    weight="regular"
                    className="!leading-none"
                  >
                    {timeEstimate}
                  </Typography>
                </div>
              )
            ))}
        </div>
        <div className="flex h-6 justify-between sm:h-7">
          <Typography
            size={'h3'}
            breakpoints={{
              sm: 'h2',
            }}
            weight="medium"
          >
            <div className="relative w-[150px] max-w-[150px] md:w-[200px] md:max-w-[200px]">
              <div
                className={clsx(
                  'relative flex w-full items-center',
                  !isAnimating && 'cursor-text',
                )}
                onClick={(e) => {
                  if (isAnimating) return;
                  e.preventDefault();
                  setIsFocused(true);
                  // Use setTimeout to ensure the input is mounted before focusing
                  setTimeout(() => {
                    inputRef.current?.focus();
                  }, 0);
                }}
              >
                {isFocused ? (
                  <input
                    ref={inputRef}
                    className={clsx(
                      'w-full bg-transparent py-[1px] text-start font-[inherit] outline-none',
                      isAnimating && 'pointer-events-none',
                    )}
                    style={{ fontKerning: 'none' }}
                    inputMode="decimal"
                    value={amount}
                    onChange={handleAmountChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                  />
                ) : (
                  <NumberFlow
                    value={Number(amount) || 0}
                    locales="en-US"
                    style={{ fontKerning: 'none', width: '100%' }}
                    format={{
                      useGrouping: false,
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 20,
                    }}
                    aria-hidden="true"
                    animated={animated}
                    onAnimationsStart={() => {
                      setIsAnimating(true);
                    }}
                    onAnimationsFinish={() => {
                      setIsAnimating(false);
                    }}
                    className={`w-full text-start font-[inherit] tracking-normal duration-200 ease-in-out ${
                      showLoadingOpacity ? 'opacity-75' : ''
                    }`}
                    willChange
                  />
                )}
              </div>
            </div>
          </Typography>
          {asset ? (
            <TokenInfo
              symbol={asset.symbol}
              tokenLogo={asset.iconUrl || ''}
              chainLogo={network?.iconUrl}
              onClick={handleOpenAssetSelector}
            />
          ) : (
            <div
              className="flex cursor-pointer items-center gap-1"
              onClick={handleOpenAssetSelector}
            >
              <Typography
                size={'h3'}
                breakpoints={{
                  sm: 'h2',
                }}
                weight="regular"
              >
                Select token
              </Typography>
              <KeyboardDownIcon className="w-5" />
            </div>
          )}
        </div>
      </div>
    </>
  );
};
