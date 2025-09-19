import React from 'react';
import { useMemo } from 'react';
import { useSwapStore } from '../hooks/store';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import { InputAddress } from './InputAddress';

export const InputAddressAndFeeRateDetails = () => {
  const { selectedFrom, selectedTo, fromAmount, toAmount } = useSwapStore();

  const shouldShowDetails = useMemo(() => {
    return !!(
      selectedFrom &&
      selectedTo &&
      //   !error.inputError &&
      //   !error.outputError &&
      //   !error.liquidityError &&
      fromAmount &&
      toAmount &&
      Number(fromAmount) !== 0 &&
      Number(toAmount) !== 0
    );
  }, [
    selectedFrom,
    selectedTo,
    // error.inputError,
    // error.outputError,
    // error.liquidityError,
    fromAmount,
    toAmount,
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
          className="flex flex-col overflow-hidden"
        >
          <InputAddress />
          {/* <FeesAndRateDetails /> */}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
