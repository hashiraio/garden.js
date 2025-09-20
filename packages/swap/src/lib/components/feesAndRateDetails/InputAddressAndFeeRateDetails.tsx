import React from 'react';
import { useMemo } from 'react';
import { swapStore } from '../../store/swapStore';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import { InputAddress } from './InputAddress';
import { FeesAndRateDetails } from './FeeAndRateDetails';

export const InputAddressAndFeeRateDetails = () => {
  const { inputAsset, outputAsset, inputAmount, outputAmount } = swapStore();

  const shouldShowDetails = useMemo(() => {
    return !!(
      inputAsset &&
      outputAsset &&
      //   !error.inputError &&
      //   !error.outputError &&
      //   !error.liquidityError &&
      inputAmount &&
      outputAmount &&
      Number(inputAmount) !== 0 &&
      Number(outputAmount) !== 0
    );
  }, [
    inputAsset,
    outputAsset,
    // error.inputError,
    // error.outputError,
    // error.liquidityError,
    inputAmount,
    outputAmount,
  ]);

  return (
    <AnimatePresence mode="wait">
      {shouldShowDetails && (
        <motion.div
          variants={{
            hidden: {
              opacity: 0,
              height: 0,
              transition: { duration: 0.3, delay: 0.2, ease: 'easeOut' },
            },
            visible: {
              opacity: 1,
              height: 'auto',
              pointerEvents: 'auto',
              transition: { duration: 0.3, delay: 0.2, ease: 'easeOut' },
            },
            exit: {
              opacity: 0,
              height: 0,
              transition: { duration: 0.3, delay: 0.2, ease: 'easeOut' },
            },
          }}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="flex flex-col mt-3 overflow-hidden"
        >
          <InputAddress />
          <FeesAndRateDetails />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
