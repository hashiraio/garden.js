import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, ExchangeIcon } from '@gardenfi/garden-book';
import { SwapInput } from '../common/SwapInput';
import { getTimeEstimates, IOType } from '../constants/constants';
import { InputAddressAndFeeRateDetails } from './feesAndRateDetails/InputAddressAndFeeRateDetails';
import {
  isBitcoin,
  isEVM,
  isSolana,
  isStarknet,
  isSui,
} from '@gardenfi/orderbook';
import { useSwap } from '../hooks/useSwap';
import { assetInfoStore } from '../store/assetStore';
import { useWallets } from '../hooks/useWallets';

const CreateSwap = () => {
  const [loadingDisabled, setLoadingDisabled] = useState(false);
  const {
    evmAddress,
    solanaAddress,
    starknetAddress,
    suiAddress,
    bitcoinAddress,
    bitcoinProvider,
  } = useWallets();

  const {
    outputAmount,
    inputAmount,
    inputAsset,
    outputAsset,
    handleInputAmountChange,
    handleOutputAmountChange,
    loading,
    error,
    validSwap,
    // inputTokenBalance,
    tokenPrices,
    isApproving,
    isSwapping,
    handleSwapClick,
    needsWalletConnection,
    controller,
    clearSwapState,
    swapAssets,
  } = useSwap();

  const {
    fetchAndSetEvmBalances,
    fetchAndSetSolanaBalance,
    fetchAndSetStarknetBalance,
    fetchAndSetSuiBalance,
    fetchAndSetBitcoinBalance,
    allAssets,
    isAssetModalOpen,
  } = assetInfoStore();

  const isChainSupported = useMemo(() => {
    if (!inputAsset || !outputAsset) return true;
    if (
      isBitcoin(inputAsset.chain) ||
      isStarknet(inputAsset.chain) ||
      isSolana(inputAsset.chain) ||
      isEVM(inputAsset.chain) ||
      isSui(inputAsset.chain)
    )
      return true;
    return true;
  }, [inputAsset, outputAsset]);

  const buttonLabel = useMemo(() => {
    // if (needsWalletConnection)
    //   return `Connect ${capitalizeChain(needsWalletConnection)} Wallet`;

    return error.liquidityError
      ? 'Insufficient liquidity'
      : !isChainSupported
      ? 'Wallet does not support the chain'
      : error.insufficientBalanceError
      ? 'Insufficient balance'
      : isApproving
      ? 'Approving...'
      : isSwapping
      ? 'Signing'
      : 'Swap';
  }, [
    isChainSupported,
    error.liquidityError,
    isApproving,
    isSwapping,
    needsWalletConnection,
    error.insufficientBalanceError,
  ]);

  const buttonDisabled = useMemo(() => {
    return error.liquidityError
      ? true
      : needsWalletConnection
      ? false
      : !isChainSupported || isSwapping
      ? true
      : validSwap
      ? false
      : true;
  }, [
    isChainSupported,
    isSwapping,
    validSwap,
    error.liquidityError,
    needsWalletConnection,
  ]);

  const buttonVariant = useMemo(() => {
    return buttonDisabled || needsWalletConnection
      ? 'disabled'
      : isSwapping
      ? 'ternary'
      : validSwap
      ? 'primary'
      : 'disabled';
  }, [buttonDisabled, isSwapping, validSwap, needsWalletConnection]);

  const fetchInputAssetBalance = useCallback(async () => {
    if (!inputAsset) return;
    if (isEVM(inputAsset.chain) && evmAddress)
      await fetchAndSetEvmBalances(evmAddress, inputAsset);
    if (isBitcoin(inputAsset.chain) && bitcoinProvider && bitcoinAddress)
      await fetchAndSetBitcoinBalance(bitcoinProvider, bitcoinAddress);
    if (isStarknet(inputAsset.chain) && starknetAddress)
      await fetchAndSetStarknetBalance(starknetAddress);
    if (isSolana(inputAsset.chain) && solanaAddress)
      await fetchAndSetSolanaBalance(solanaAddress);
    if (isSui(inputAsset.chain) && suiAddress)
      await fetchAndSetSuiBalance(suiAddress);
  }, [
    inputAsset,
    bitcoinProvider,
    evmAddress,
    bitcoinAddress,
    starknetAddress,
    solanaAddress,
    suiAddress,
    fetchAndSetEvmBalances,
    fetchAndSetBitcoinBalance,
    fetchAndSetStarknetBalance,
    fetchAndSetSolanaBalance,
    fetchAndSetSuiBalance,
  ]);

  const fetchAllBalances = useCallback(async () => {
    await Promise.allSettled([
      evmAddress && fetchAndSetEvmBalances(evmAddress),
      bitcoinAddress &&
        bitcoinProvider &&
        fetchAndSetBitcoinBalance(bitcoinProvider, bitcoinAddress),
      starknetAddress && fetchAndSetStarknetBalance(starknetAddress),
      solanaAddress && fetchAndSetSolanaBalance(solanaAddress),
      suiAddress && fetchAndSetSuiBalance(suiAddress),
    ]);
  }, [
    evmAddress,
    starknetAddress,
    solanaAddress,
    suiAddress,
    bitcoinProvider,
    fetchAndSetEvmBalances,
    fetchAndSetBitcoinBalance,
    fetchAndSetStarknetBalance,
    fetchAndSetSolanaBalance,
    fetchAndSetSuiBalance,
  ]);

  useEffect(() => {
    if (!allAssets) return;
    fetchAllBalances();
  }, [allAssets, fetchAllBalances]);

  useEffect(() => {
    if (!allAssets) return;

    const interval = setInterval(() => {
      if (isAssetModalOpen) {
        fetchAllBalances();
      } else {
        fetchInputAssetBalance();
      }
    }, 7000);

    return () => {
      clearInterval(interval);
    };
  }, [allAssets, isAssetModalOpen, fetchAllBalances, fetchInputAssetBalance]);

  const timeEstimate = useMemo(() => {
    if (!inputAsset || !outputAsset) return '';
    return getTimeEstimates(inputAsset);
  }, [inputAsset, outputAsset]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (loading.input || loading.output) {
      timeoutId = setTimeout(() => {
        setLoadingDisabled(true);
      }, 300);
    } else {
      setLoadingDisabled(false);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading]);

  useEffect(() => {
    const currentController = controller.current;
    return () => {
      if (currentController) {
        currentController.abort();
      }
      clearSwapState();
    };
  }, [clearSwapState, controller]);

  return (
    <div className="flex flex-col relative">
      <div className="relative flex flex-col gap-3">
        <div className="w-full">
          <SwapInput
            type={IOType.input}
            amount={inputAmount}
            onChange={handleInputAmountChange}
            asset={inputAsset}
            loading={loading.input}
            price={tokenPrices.input}
            error={error.inputError}
            balance={undefined} // TODO: Add balance fetching
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
            amount={outputAmount}
            onChange={handleOutputAmountChange}
            asset={outputAsset}
            loading={loading.output}
            price={tokenPrices.output}
            error={error.outputError}
            timeEstimate={timeEstimate}
          />
        </div>
      </div>

      <InputAddressAndFeeRateDetails />

      <Button
        className="w-full mt-3 transition-colors duration-500"
        variant={buttonVariant}
        size="lg"
        disabled={buttonDisabled || loadingDisabled}
        onClick={handleSwapClick}
      >
        {buttonLabel}
      </Button>
    </div>
  );
};

export default CreateSwap;
