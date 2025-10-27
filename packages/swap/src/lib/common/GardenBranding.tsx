import React from 'react';
import { GardenFullLogo, Typography } from '@gardenfi/garden-book';

export const GardenBranding = () => {
  return (
    <div className="text-xs h-4 text-mid-grey flex items-center justify-center gap-1.5 px-2">
      <Typography size="h5" weight="medium" className="!text-mid-grey">
        Powered by
      </Typography>
      <GardenFullLogo width={58} />
    </div>
  );
};
