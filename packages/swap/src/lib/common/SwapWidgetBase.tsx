import { GardenFullLogo, Typography } from '@gardenfi/garden-book';
import React from 'react';
import { motion } from 'framer-motion';
import { swapStore } from '../store/swapStore';

type SwapWidgetBaseProps = {
  children: React.ReactNode;
};

const SwapWidgetBase = ({ children }: SwapWidgetBaseProps) => {
  const { showFeesAndRateDetails, showBtcAddress } = swapStore();
  return (
    <motion.div
      layout
      animate={{
        minHeight: showFeesAndRateDetails ? (showBtcAddress ? 496 : 408) : 348,
        maxHeight: showFeesAndRateDetails ? (showBtcAddress ? 496 : 408) : 348,
      }}
      className={`mx-auto relative flex h-full overflow-hidden w-[424px] rounded-[20px] p-3 pb-4 max-w-[424px] bg-garden-grey flex-col justify-start gap-4 sm:max-w-[424px]`}
    >
      <div className="flex-col justify-start gap-4 flex">{children}</div>
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
