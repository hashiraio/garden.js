import { GardenFullLogo, Typography } from '@gardenfi/garden-book';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { swapStore } from '../store/swapStore';
import { tabs } from '../constants/constants';

type SwapWidgetBaseProps = {
  children: React.ReactNode;
};

const SwapWidgetBase = ({ children }: SwapWidgetBaseProps) => {
  const { showFeesAndRateDetails, showBtcAddress, activeTab } = swapStore();
  const [height, setHeight] = useState(348);

  useEffect(() => {
    if (activeTab.id === tabs.swap.id) {
      const newHeight = showFeesAndRateDetails
        ? showBtcAddress
          ? 496
          : 408
        : 348;
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
      <div className="text-xs h-4 text-mid-grey flex items-center justify-center gap-1.5 px-2">
        <Typography size="h5" weight="medium" className="!text-mid-grey">
          Powered by
        </Typography>
        <GardenFullLogo width={58} />
      </div>
    </motion.div>
  );
};

export default SwapWidgetBase;
