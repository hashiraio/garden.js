import React from 'react';
import { Typography } from '@gardenfi/garden-book';

type TooltipProps = {
  chain: string;
  className?: string;
};

export const ChainsTooltip = ({ chain, className }: TooltipProps) => {
  return (
    <div className={`absolute z-50 mx-auto -mt-[84px]`}>
      <div className="absolute left-1/2 z-50 mt-6 h-3 w-3 -translate-x-1/2 rotate-45 rounded-sm bg-white"></div>
      <div
        className={`flex text-nowrap rounded-2xl bg-white px-3 py-2 shadow-custom ${className}`}
      >
        <Typography
          size="h5"
          weight="medium"
          className="text-center !text-dark-grey"
        >
          {chain}
        </Typography>
      </div>
    </div>
  );
};
