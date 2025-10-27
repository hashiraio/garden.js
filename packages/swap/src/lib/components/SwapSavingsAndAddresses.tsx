import React from 'react';
import { Typography } from '@gardenfi/garden-book';
import { motion } from 'framer-motion';
import { expandWithDelayAnimation } from '../constants/animations';
import { swapStore } from '../store/swapStore';
import { AddressDetails } from '../common/AddressDetails';

type SwapSavingsProps = {
  refundAddress: string | undefined;
  receiveAddress: string | undefined;
  showComparison: (type: 'time' | 'fees') => void;
  networkFeesValue: number;
};

export const SwapSavingsAndAddresses = ({
  refundAddress,
  receiveAddress,
  networkFeesValue,
}: SwapSavingsProps) => {
  const { outputAsset, outputAmount } = swapStore();

  return (
    <motion.div className="flex flex-col" {...expandWithDelayAnimation}>
      <div className="h-full">
        <div className="flex items-center justify-between px-4 pt-1">
          <div className="flex items-center gap-1">
            <Typography size="h5" weight="regular" className="!text-mid-grey">
              Network fee
            </Typography>
          </div>
          <div className="flex gap-5 py-1">
            <Typography size="h5" weight="regular">
              {networkFeesValue === 0 ? 'Free' : '$' + networkFeesValue}
            </Typography>
          </div>
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-1">
            <Typography size="h5" weight="regular" className="!text-mid-grey">
              Minimum received
            </Typography>
            {/* <span
              ref={targetRef}
              className="inline-block cursor-pointer"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <InfoIcon className="h-3 w-3 !fill-mid-grey" />
              {isHovered && inputAsset && outputAsset && (
                <TooltipWrapper targetRef={targetRef}>
                  <div className="flex min-w-32 justify-between">
                    <Typography
                      size="h5"
                      weight="regular"
                      className="!text-mid-grey"
                    >
                      Slippage
                    </Typography>
                    <Typography size="h5" weight="regular">
                      0.50%
                    </Typography>
                  </div>
                </TooltipWrapper>
              )}
            </span> */}
          </div>
          <div className="flex gap-5 py-1">
            <Typography size="h5" weight="regular">
              {outputAmount} {outputAsset?.symbol}
            </Typography>
          </div>
        </div>
        {(receiveAddress || refundAddress) && (
          <>
            <div className="flex flex-col items-stretch justify-center">
              {receiveAddress && <AddressDetails address={receiveAddress} />}
              {refundAddress && (
                <AddressDetails address={refundAddress} isRefund />
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};
