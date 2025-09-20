// import { useCallback, useEffect, useMemo, useRef } from 'react';
// import { useSwapStore } from '../hooks/store';
// import { IOType, network } from '../constants/constants';
// import { Asset, Chain, isBitcoin, isSolana, isSui } from '@gardenfi/orderbook';
// import debounce from 'lodash.debounce';
// import { assetInfoStore } from '../store/assetInfoStore';
// import { constructOrderPair, validateBTCAddress } from '@gardenfi/core';
// import { useGarden } from '@gardenfi/react-hooks';
// import { useStarknetWallet } from './useStarknetWallet';
// import { useEVMWallet } from './useEVMWallet';
// import { isStarknet, isEVM } from '@gardenfi/orderbook';
// import { useBitcoinWallet } from '@gardenfi/wallet-connectors';
// import { Environment } from '@gardenfi/utils';
// import { Errors } from '../constants/errors';
// import BigNumber from 'bignumber.js';
// import { useSolanaWallet } from './useSolanaWallet';
// import { formatAmount, getOrderPair } from '../utils/utils';
// import { useNetworkFees } from './useNetworkFees';
// import { useSuiWallet } from './useSuiWallet';

// export const useSwap = () => {
//   const {
//     inputAmount,
//     outputAmount,
//     inputAsset,
//     outputAsset,
//     isSwapping,
//     isApproving,
//     strategy,
//     rate,
//     error,
//     btcAddress,
//     tokenPrices,
//     isFetchingQuote,
//     isEditBTCAddress,
//     networkFees,
//     setStrategy,
//     setIsSwapping,
//     setAmount,
//     setRate,
//     setError,
//     swapAssets,
//     setAsset,
//     setIsFetchingQuote,
//     setFiatTokenPrices,
//     isComparisonVisible,
//     setIsValidBitcoinAddress,
//     // setIsApproving,
//     setTokenPrices,
//     clearSwapState,
//     setBtcAddress,
//     setIsComparisonVisible,
//   } = swapStore();
//   const { strategies, balances } = assetInfoStore();
//   const { disconnect } = useEVMWallet();
//   const { swap, getQuote } = useGarden();
//   const { provider, account } = useBitcoinWallet();
//   const controller = useRef<AbortController | null>(null);
//   const { address: evmAddress } = useEVMWallet();
//   const { starknetAddress } = useStarknetWallet();
//   const { solanaAddress } = useSolanaWallet();
//   const { currentAccount } = useSuiWallet();
//   useNetworkFees();

//   const inputBalance = useMemo(() => {
//     if (!inputAsset || !balances) return;
//     return balances[getOrderPair(inputAsset.chain, inputAsset.tokenAddress)];
//   }, [inputAsset, balances]);

//   const inputTokenBalance = useMemo(
//     () =>
//       inputBalance &&
//       inputAsset &&
//       (!isStarknet(inputAsset.chain) &&
//       !isSolana(inputAsset.chain) &&
//       !isSui(inputAsset.chain)
//         ? formatAmount(
//             Number(inputBalance),
//             inputAsset.decimals,
//             Math.min(inputAsset.decimals, 8),
//           )
//         : Number(inputBalance)),
//     [inputBalance, inputAsset],
//   );

//   const isInsufficientBalance = useMemo(() => {
//     if (!inputAmount || inputTokenBalance == null) return false;
//     return BigNumber(inputAmount).gt(inputTokenBalance);
//   }, [inputAmount, inputTokenBalance]);

//   const isBitcoinSwap = useMemo(() => {
//     return !!(
//       inputAsset &&
//       outputAsset &&
//       (isBitcoin(inputAsset.chain) || isBitcoin(outputAsset.chain))
//     );
//   }, [inputAsset, outputAsset]);
//   const isValidBitcoinAddress = useMemo(() => {
//     if (!isBitcoinSwap) return true;
//     return btcAddress
//       ? validateBTCAddress(btcAddress, network as unknown as Environment)
//       : false;
//   }, [btcAddress, isBitcoinSwap]);

//   const _validSwap = useMemo(() => {
//     return !!(
//       inputAsset &&
//       outputAmount &&
//       inputAmount &&
//       outputAsset &&
//       strategy &&
//       isValidBitcoinAddress &&
//       !error.inputError &&
//       !error.outputError &&
//       !error.liquidityError &&
//       !error.insufficientBalanceError
//     );
//   }, [
//     inputAsset,
//     outputAmount,
//     inputAmount,
//     outputAsset,
//     strategy,
//     error,
//     isValidBitcoinAddress,
//   ]);

//   const validSwap = useMemo(() => {
//     return isBitcoinSwap ? !!(_validSwap && btcAddress) : _validSwap;
//   }, [_validSwap, isBitcoinSwap, btcAddress]);

//   const { minAmount, maxAmount } = useMemo(() => {
//     const defaultLimits = {
//       minAmount: 0,
//       maxAmount: 0,
//     };
//     if (!inputAsset || !outputAsset || !strategies.val) return defaultLimits;

//     const limits =
//       strategies.val[
//         constructOrderPair(
//           inputAsset.chain,
//           inputAsset.atomicSwapAddress,
//           outputAsset.chain,
//           outputAsset.atomicSwapAddress,
//         )
//       ];

//     if (!limits) return defaultLimits;
//     else
//       return {
//         minAmount: formatAmount(
//           limits.minAmount,
//           inputAsset.decimals,
//           inputAsset.decimals,
//         ),
//         maxAmount: formatAmount(
//           limits.maxAmount,
//           inputAsset.decimals,
//           inputAsset.decimals,
//         ),
//       };
//   }, [inputAsset, outputAsset, strategies.val]);

//   const debouncedFetchQuote = useMemo(
//     () =>
//       debounce(
//         async (
//           amount: string,
//           fromAsset: Asset,
//           toAsset: Asset,
//           isExactOut: boolean,
//         ) => {
//           if (!getQuote || isSwapping) return;
//           setIsFetchingQuote({ input: isExactOut, output: !isExactOut });

//           if (controller.current) controller.current.abort();
//           controller.current = new AbortController();

//           const decimals = isExactOut ? toAsset.decimals : fromAsset.decimals;
//           const amountInDecimals = new BigNumber(amount).multipliedBy(
//             10 ** decimals,
//           );
//           const quote = await getQuote({
//             fromAsset,
//             toAsset,
//             amount: amountInDecimals.toNumber(),
//             isExactOut,
//             options: {
//               request: {
//                 signal: controller.current.signal,
//               },
//             },
//           });
//           if (!quote || !quote.ok) {
//             if (quote?.error?.includes('AbortError')) {
//               setError({ liquidityError: Errors.none });
//               setIsFetchingQuote({ input: false, output: false });
//               setStrategy('');
//               return;
//             } else if (quote?.error?.includes('insufficient liquidity')) {
//               setError({ liquidityError: Errors.insufficientLiquidity });
//               setAmount(isExactOut ? IOType.input : IOType.output, '');
//             } else if (quote?.error?.includes('output amount too less')) {
//               setError({ outputError: Errors.outLow });
//               setAmount(IOType.input, '');
//             } else if (quote?.error?.includes('output amount too high')) {
//               setError({ outputError: Errors.outHigh });
//               setAmount(IOType.input, '');
//             } else {
//               setAmount(isExactOut ? IOType.input : IOType.output, '');
//             }
//             setIsFetchingQuote({ input: false, output: false });
//             setStrategy('');
//             setTokenPrices({ input: '0', output: '0' });
//             return;
//           }

//           const [_strategy, quoteAmount] = Object.entries(quote.val.quotes)[0];
//           setStrategy(_strategy);
//           const assetToChange = isExactOut ? fromAsset : toAsset;
//           const quoteAmountInDecimals = new BigNumber(Number(quoteAmount)).div(
//             Math.pow(10, assetToChange.decimals),
//           );
//           // Add network fee to output amount before calculating rate
//           let outputAmountWithFee = Number(quoteAmountInDecimals);
//           if (fromAsset.symbol === 'USDC' && toAsset.symbol === 'USDC') {
//             outputAmountWithFee = Number(quoteAmountInDecimals) + networkFees;
//           }
//           const rate = outputAmountWithFee / Number(amount);
//           setRate(rate);

//           setAmount(
//             isExactOut ? IOType.input : IOType.output,
//             Number(
//               quoteAmountInDecimals.toFixed(8, BigNumber.ROUND_DOWN),
//             ).toString(),
//           );
//           setIsFetchingQuote({ input: false, output: false });

//           const inputAmount = isExactOut
//             ? quoteAmountInDecimals
//             : new BigNumber(amount);
//           const outputAmount = isExactOut
//             ? new BigNumber(amount)
//             : quoteAmountInDecimals;
//           const inputTokenPrice = inputAmount.multipliedBy(
//             quote.val.input_token_price,
//           );
//           const outputTokenPrice = outputAmount.multipliedBy(
//             quote.val.output_token_price,
//           );
//           setFiatTokenPrices({
//             input: quote.val.input_token_price.toString(),
//             output: quote.val.output_token_price.toString(),
//           });
//           setTokenPrices({
//             input: inputTokenPrice.toString(),
//             output: outputTokenPrice.toString(),
//           });
//           setError({
//             liquidityError: Errors.none,
//           });
//         },
//         500,
//       ),
//     [
//       getQuote,
//       setIsFetchingQuote,
//       setStrategy,
//       setRate,
//       setAmount,
//       setTokenPrices,
//       setError,
//       isSwapping,
//       networkFees,
//     ],
//   );

//   const fetchQuote = useCallback(
//     async (
//       amount: string,
//       fromAsset: Asset,
//       toAsset: Asset,
//       isExactOut: boolean,
//     ) => {
//       debouncedFetchQuote(amount, fromAsset, toAsset, isExactOut);
//     },
//     [debouncedFetchQuote],
//   );

//   const handleInputAmountChange = useCallback(
//     async (amount: string) => {
//       setAmount(IOType.input, amount);

//       const amountInNumber = Number(amount);

//       if (!amountInNumber) {
//         // cancel debounced fetch quote
//         debouncedFetchQuote.cancel();
//         // abort if any calls are already in progress
//         if (controller.current) controller.current.abort();
//         setAmount(IOType.output, '');
//         setTokenPrices({ input: '0', output: '0' });
//         setError({ inputError: Errors.none, liquidityError: Errors.none });
//         return;
//       }

//       if (inputAsset && minAmount && amountInNumber < minAmount) {
//         setError({
//           inputError: Errors.minError(minAmount.toString(), inputAsset?.symbol),
//         });
//         setAmount(IOType.output, '');
//         setTokenPrices({ input: '0', output: '0' });
//         // cancel debounced fetch quote
//         debouncedFetchQuote.cancel();
//         // abort if any calls are already in progress
//         if (controller.current) controller.current.abort();
//         return;
//       }

//       if (inputAsset && maxAmount && amountInNumber > maxAmount) {
//         setError({
//           inputError: Errors.maxError(maxAmount.toString(), inputAsset?.symbol),
//         });
//         setAmount(IOType.output, '');
//         // cancel debounced fetch quote
//         debouncedFetchQuote.cancel();
//         // abort if any calls are already in progress
//         if (controller.current) controller.current.abort();
//         return;
//       }

//       setError({ inputError: Errors.none });

//       if (!inputAsset || !outputAsset || !Number(amount)) return;

//       fetchQuote(amount, inputAsset, outputAsset, false);
//     },
//     [
//       inputAsset,
//       outputAsset,
//       minAmount,
//       maxAmount,
//       fetchQuote,
//       debouncedFetchQuote,
//       setAmount,
//       setError,
//       setTokenPrices,
//     ],
//   );

//   const handleOutputAmountChange = async (amount: string) => {
//     setAmount(IOType.output, amount);
//     const amountInNumber = Number(amount);

//     if (!amountInNumber) {
//       // cancel debounced fetch quote
//       debouncedFetchQuote.cancel();
//       // abort if any calls are already in progress
//       if (controller.current) controller.current.abort();
//       setAmount(IOType.input, '');
//       setError({ outputError: Errors.none });
//       return;
//     }

//     setError({ outputError: Errors.none });

//     if (!inputAsset || !outputAsset || !amountInNumber) return;

//     fetchQuote(amount, inputAsset, outputAsset, true);
//   };

//   const needsWalletConnection = useMemo<null | string>(() => {
//     if (!inputAsset || !outputAsset) return null;

//     if (
//       !inputAmount ||
//       inputAmount === '0' ||
//       !outputAmount ||
//       outputAmount === '0'
//     ) {
//       return null;
//     }

//     const chainRequirements = {
//       evm: {
//         check: (chain: Chain) => isEVM(chain),
//         address: evmAddress,
//       },
//       starknet: {
//         check: (chain: Chain) => isStarknet(chain),
//         address: starknetAddress,
//       },
//       solana: {
//         check: (chain: Chain) => isSolana(chain),
//         address: solanaAddress,
//       },
//       sui: {
//         check: (chain: Chain) => isSui(chain),
//         address: currentAccount?.address,
//       },
//     };

//     for (const [chainKey, { check, address }] of Object.entries(
//       chainRequirements,
//     )) {
//       if ((check(inputAsset.chain) || check(outputAsset.chain)) && !address) {
//         return chainKey;
//       }
//     }

//     return null;
//   }, [
//     inputAsset,
//     outputAsset,
//     inputAmount,
//     outputAmount,
//     evmAddress,
//     starknetAddress,
//     solanaAddress,
//     currentAccount,
//   ]);

//   const handleSwapClick = async () => {
//     if (needsWalletConnection) {
//       return;
//     }
//     if (!validSwap || !swap || !inputAsset || !outputAsset || !strategy) return;
//     setIsSwapping(true);

//     const inputAmountInDecimals = new BigNumber(inputAmount)
//       .multipliedBy(10 ** inputAsset.decimals)
//       .toFixed();
//     const outputAmountInDecimals = new BigNumber(outputAmount)
//       .multipliedBy(10 ** outputAsset.decimals)
//       .toFixed();

//     try {
//       const res = await swap({
//         fromAsset: inputAsset,
//         toAsset: outputAsset,
//         sendAmount: inputAmountInDecimals,
//         receiveAmount: outputAmountInDecimals,
//         ...(isBitcoinSwap && { addresses: { bitcoin: btcAddress } }),
//       });
//       if (!res.ok) {
//         if (
//           res.error.includes(
//             "Cannot read properties of undefined (reading 'toLowerCase')",
//           )
//         ) {
//           disconnect();
//         } else if (res.error.includes('destination amount too high')) {
//           //order failed due to price fluctuation, refresh quote here
//           fetchQuote(inputAmount, inputAsset, outputAsset, false);
//         } else {
//           console.error('failed to create order ❌', res.error);
//         }
//         setIsSwapping(false);
//         return;
//       }

//       console.log('orderCreated ✅', res.val);

//       if (isBitcoin(res.val.source_swap.chain)) {
//         if (provider) {
//           const order = res.val;
//           const bitcoinRes = await provider.sendBitcoin(
//             order.source_swap.swap_id,
//             Number(order.source_swap.amount),
//           );
//           if (bitcoinRes.error) {
//             console.error('failed to send bitcoin ❌', bitcoinRes.error);
//             setIsSwapping(false);
//           }
//           const updatedOrder = {
//             ...order,
//             source_swap: {
//               ...order.source_swap,
//               initiate_tx_hash: bitcoinRes.val ?? '',
//             },
//             status: bitcoinRes.val
//               ? OrderStatus.InitiateDetected
//               : OrderStatus.Matched,
//           };
//           updateOrder(updatedOrder);
//           clearSwapState();
//           return;
//         }
//         setIsSwapping(false);
//         updateOrder({ ...res.val, status: OrderStatus.Matched });
//         clearSwapState();
//         return;
//       }
//       setIsSwapping(false);
//       updateOrder({ ...res.val, status: OrderStatus.InitiateDetected });
//       clearSwapState();
//     } catch (error) {
//       console.error('failed to create order ❌', error);
//       setIsSwapping(false);
//       throw error;
//     }
//   };

//   //interval for fetching quote in interval of 5 seconds
//   useEffect(() => {
//     if (
//       !inputAsset ||
//       !outputAsset ||
//       !inputAmount ||
//       isSwapping ||
//       isComparisonVisible
//     )
//       return;

//     const interval = setInterval(() => {
//       fetchQuote(inputAmount, inputAsset, outputAsset, false);
//     }, 5000);
//     return () => clearInterval(interval);
//   }, [
//     inputAmount,
//     inputAsset,
//     outputAsset,
//     fetchQuote,
//     isSwapping,
//     isComparisonVisible,
//   ]);

//   //call input amount handler when assets are changed
//   useEffect(() => {
//     if (!inputAsset || !outputAsset) return;
//     setError({ inputError: '' });
//     handleInputAmountChange(inputAmount);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [inputAsset, handleInputAmountChange, setError]);

//   //set token prices to 0 if input and output amounts are 0 and set liq error to false
//   useEffect(() => {
//     if (
//       outputAmount == '0' ||
//       !outputAmount ||
//       inputAmount == '0' ||
//       !inputAmount
//     ) {
//       setTokenPrices({ input: '0', output: '0' });
//       return;
//     }
//   }, [inputAmount, outputAmount, setTokenPrices, setError]);

//   //set min and max amount errors when amounts are changed
//   useEffect(() => {
//     if (!inputAmount || !minAmount || !maxAmount) return;
//     const amountInNumber = Number(inputAmount);

//     if (!amountInNumber) return;

//     if (amountInNumber < minAmount && inputAsset) {
//       setError({
//         inputError: Errors.minError(minAmount.toString(), inputAsset.symbol),
//       });
//       setTokenPrices({ input: '0', output: '0' });
//       setAmount(IOType.output, '');
//       return;
//     }
//     if (amountInNumber > maxAmount && inputAsset) {
//       setError({
//         inputError: Errors.maxError(maxAmount.toString(), inputAsset.symbol),
//       });
//       setTokenPrices({ input: '0', output: '0' });
//       setAmount(IOType.output, '');
//       return;
//     }
//   }, [
//     inputAmount,
//     minAmount,
//     maxAmount,
//     inputAsset,
//     setError,
//     setTokenPrices,
//     handleInputAmountChange,
//     setAmount,
//   ]);

//   useEffect(() => {
//     if (isInsufficientBalance) {
//       setError({ insufficientBalanceError: Errors.insufficientBalance });
//       return;
//     }
//     setError({ insufficientBalanceError: Errors.none });
//   }, [isInsufficientBalance, setError, inputAsset, outputAsset, inputAmount]);

//   //set btc address if bitcoin wallet is connected
//   useEffect(() => {
//     if (account) {
//       setBtcAddress(account);
//     }
//   }, [account, setBtcAddress]);

//   // Update isValidBitcoinAddress state in an effect
//   useEffect(() => {
//     if (!isBitcoinSwap) {
//       setIsValidBitcoinAddress(true);
//       return;
//     }
//     const isValid = btcAddress
//       ? validateBTCAddress(btcAddress, network as unknown as Environment)
//       : false;
//     setIsValidBitcoinAddress(isValid);
//   }, [btcAddress, isBitcoinSwap, setIsValidBitcoinAddress]);

//   return {
//     inputAmount,
//     outputAmount,
//     inputAsset,
//     outputAsset,
//     tokenPrices,
//     strategy,
//     rate,
//     error,
//     isEditBTCAddress,
//     loading: isFetchingQuote,
//     validSwap,
//     isSwapping,
//     isApproving,
//     isBitcoinSwap,
//     inputTokenBalance,
//     needsWalletConnection,
//     btcAddress,
//     controller,
//     isComparisonVisible,
//     setBtcAddress,
//     swapAssets,
//     handleInputAmountChange,
//     handleOutputAmountChange,
//     handleSwapClick,
//     setAsset,
//     clearSwapState,
//     setIsComparisonVisible,
//   };
// };
