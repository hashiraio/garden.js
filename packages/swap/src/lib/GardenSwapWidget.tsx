import React from 'react';
import { GardenProvider } from '@gardenfi/react-hooks';
import type { GardenSwapWidgetProps } from './types/types';
import SwapWidget from './components/SwapWidget';

const GardenSwapWidget: React.FC<GardenSwapWidgetProps> = ({
  ...providerProps
}) => {
  return (
    <GardenProvider {...providerProps}>
      <SwapWidget
        network={providerProps.config.environment}
        style={providerProps.config.style ?? {}}
      />
    </GardenProvider>
  );
};

export { GardenSwapWidget };
