import { GardenFullLogo, Typography } from '@gardenfi/garden-book';
import React from 'react';
import { swapStore } from '../store/swapStore';

type SwapWidgetBaseProps = {
  children: React.ReactNode;
};

const SwapWidgetBase = ({ children }: SwapWidgetBaseProps) => {
  const { activeTab } = swapStore();
  return (
    <div
      className={`mx-auto flex h-full w-[424px] rounded-[20px] p-3 pb-4 max-w-[424px] bg-garden-grey flex-col justify-start gap-4 sm:max-w-[424px] ${
        activeTab === 'history' ? 'max-h-[496px]' : ''
      }`}
    >
      {children}
      <div className="text-xs h-4 text-mid-grey flex items-center justify-center gap-1.5 px-2">
        <Typography size="h5" weight="medium" className="!text-mid-grey">
          Powered by
        </Typography>
        <GardenFullLogo width={58} />
      </div>
    </div>
  );
};

export default SwapWidgetBase;
