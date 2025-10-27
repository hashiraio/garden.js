import React from 'react';
import { swapStore } from '../../store/swapStore';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import { InputAddress } from './InputAddress';
import { FeesAndRateDetails } from './FeeAndRateDetails';

export const InputAddressAndFeeRateDetails = () => {
  const { showFeesAndRateDetails } = swapStore();
  return (
    <AnimatePresence mode="wait">
      {showFeesAndRateDetails && (
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
          <FeesAndRateDetails />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
