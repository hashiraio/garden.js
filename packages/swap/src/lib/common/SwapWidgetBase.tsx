import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { swapStore } from '../store/swapStore';
import { tabs, HEIGHTS } from '../constants/constants';
import { GardenBranding } from './GardenBranding';

type SwapWidgetBaseProps = {
  children: React.ReactNode;
};

export const SwapWidgetBase = ({ children }: SwapWidgetBaseProps) => {
  const { showFeesAndRateDetails, showBtcAddress, activeTab } = swapStore();
  const [height, setHeight] = useState(HEIGHTS.small);

  useEffect(() => {
    if (activeTab.id === tabs.swap.id) {
      const newHeight = showFeesAndRateDetails
        ? showBtcAddress
          ? HEIGHTS.large
          : HEIGHTS.medium
        : HEIGHTS.small;
      setHeight(newHeight);
    }
  }, [showFeesAndRateDetails, showBtcAddress, activeTab.id]);

  return (
    <motion.div
      animate={{
        minHeight: height,
        maxHeight: activeTab.id === tabs.swap.id ? '' : height,
      }}
      style={{
        minHeight: height,
        maxHeight: activeTab.id === tabs.swap.id ? '' : height,
      }}
      className={`mx-auto relative flex h-full overflow-hidden w-[424px] duration-300 delay-200 ease-in-out transition-all rounded-[20px] p-3 pb-4 max-w-[424px] bg-garden-grey flex-col justify-between gap-4 sm:max-w-[424px]`}
    >
      <div className="flex-col justify-start gap-4 flex overflow-y-auto">
        {children}
      </div>
      <GardenBranding />
    </motion.div>
  );
};
