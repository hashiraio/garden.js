import React, { useState, useRef, useMemo } from 'react';
import {
  GasStationIcon,
  InfoIcon,
  KeyboardDownIcon,
  Typography,
} from '@gardenfi/garden-book';

// import { useBitcoinWallet } from '@gardenfi/wallet-connectors';
import { Asset } from '@gardenfi/orderbook';
import { motion, AnimatePresence } from 'framer-motion';
// import { swapStore } from '../store/dum';
import { formatAmount } from '../../utils/utils';
import { delayedFadeAnimation } from '../../constants/animations';
import { swapStore } from '../../store/swapStore';
import { SwapSavingsAndAddresses } from './../SwapSavingsAndAddresses';

const RateDisplay = ({
  inputAsset,
  outputAsset,
  formattedRate,
  formattedTokenPrice,
  className = '',
}: {
  inputAsset?: Asset | null;
  outputAsset?: Asset | null;
  formattedRate?: number;
  formattedTokenPrice?: number;
  className?: string;
}) => (
  <div className={`flex min-w-fit items-center gap-1`}>
    <Typography
      size="h5"
      weight="regular"
      className={`!text-nowrap ${className}`}
    >
      1 {inputAsset?.symbol} ≈
    </Typography>
    <Typography
      size="h5"
      weight="regular"
      className={`!text-nowrap ${className}`}
    >
      {formattedRate && `${formattedRate} ${outputAsset?.symbol}`}
      {formattedTokenPrice && `$${formattedTokenPrice}`}
    </Typography>
  </div>
);

export const FeesAndRateDetails = () => {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [, setIsHovered] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);

  const formattedTokenPrice = useMemo(() => formatAmount(2000, 0, 2), []);

  const {
    inputAsset,
    outputAsset,
    // rate,
    // networkFees,
    // showComparisonHandler,
    // fiatTokenPrices,
  } = swapStore();
  //   //   const { account: btcAddress } = useBitcoinWallet();
  //   //   const { solanaAddress } = useSolanaWallet();
  //   //   const { address } = useEVMWallet();

  //   const isBitcoinChains = outputAsset?.symbol.includes(BTC.symbol);
  //   const formattedRate = useMemo(
  //     () => formatAmount(rate, 0, isBitcoinChains ? 7 : 3),
  //     [isBitcoinChains, rate],
  //   );

  //   const formattedTokenPrice = useMemo(
  //     () => formatAmount(fiatTokenPrices.input, 0, 2),
  //     [fiatTokenPrices.input],
  //   );

  //   const refundAddress = useMemo(
  //     () =>
  //       inputAsset
  //         ? isBitcoin(inputAsset.chain)
  //           ? btcAddress
  //           : isSolana(inputAsset.chain)
  //           ? solanaAddress
  //           : address
  //         : undefined,
  //     [inputAsset, btcAddress, solanaAddress, address],
  //   );

  //   const receiveAddress = useMemo(
  //     () =>
  //       outputAsset
  //         ? isBitcoin(outputAsset.chain)
  //           ? btcAddress
  //           : isSolana(outputAsset.chain)
  //           ? solanaAddress
  //           : address
  //         : undefined,
  //     [outputAsset, btcAddress, solanaAddress, address],
  //   );

  return (
    <div className="flex flex-col rounded-2xl bg-white/50 pb-4 mt-3 transition-all duration-200">
      <div className="flex w-full items-center justify-between rounded-2xl px-4 pt-4">
        <div className="relative flex w-full items-center justify-start gap-1">
          <AnimatePresence mode="wait">
            {isDetailsExpanded ? (
              <motion.div
                key="expanded"
                className="w-fit"
                {...delayedFadeAnimation}
              >
                <div className="flex items-center gap-1">
                  <Typography
                    size="h5"
                    weight="regular"
                    className="!text-mid-grey"
                  >
                    Rate
                  </Typography>
                  <span
                    ref={targetRef}
                    className="inline-block cursor-pointer"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                  >
                    <InfoIcon className="h-3 w-3 !fill-mid-grey" />
                    {/* {isHovered && inputAsset && outputAsset && (
                      <TooltipWrapper targetRef={targetRef}>
                        <RateDisplay
                          inputAsset={inputAsset}
                          outputAsset={outputAsset}
                          formattedRate={formattedRate}
                        />
                      </TooltipWrapper>
                    )} */}
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed"
                className="w-fit"
                {...delayedFadeAnimation}
              >
                <RateDisplay
                  inputAsset={inputAsset}
                  outputAsset={outputAsset}
                  formattedTokenPrice={formattedTokenPrice}
                  className="!text-mid-grey"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex w-full items-center justify-end gap-1">
          <AnimatePresence mode="wait">
            {isDetailsExpanded ? (
              <motion.div
                key="expanded"
                className="w-fit"
                {...delayedFadeAnimation}
              >
                <RateDisplay
                  inputAsset={inputAsset}
                  outputAsset={outputAsset}
                  formattedTokenPrice={formattedTokenPrice}
                />
              </motion.div>
            ) : (
              <motion.div
                key="collapsed"
                className="w-fit"
                {...delayedFadeAnimation}
              >
                <div className="flex min-w-fit items-center gap-1">
                  <GasStationIcon className="h-3 w-3" />
                  <Typography
                    size="h5"
                    weight="regular"
                    className="!text-nowrap"
                  >
                    {/* {networkFees === 0 ? ( */}
                    Free
                    {/* ) : (
                      <span className="flex items-center">
                        ${formatAmount(200, 0, 2)}
                      </span>
                    )} */}
                  </Typography>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          initial={{ width: 0, scale: 0, opacity: 0 }}
          animate={{ width: 'auto', scale: 1, opacity: 1 }}
          exit={{ width: 0, scale: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="pl-1"
        >
          <KeyboardDownIcon
            className={`h-4 w-4 cursor-pointer px-1 transition-transform duration-300 ${
              isDetailsExpanded ? 'rotate-180' : ''
            }`}
            onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
          />
        </motion.div>
      </div>
      <AnimatePresence>
        {isDetailsExpanded && (
          <SwapSavingsAndAddresses
            refundAddress={'jhgvfb'}
            receiveAddress={'nbvcx'}
            showComparison={() => {}}
            networkFeesValue={formatAmount(2000, 0, 2)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
