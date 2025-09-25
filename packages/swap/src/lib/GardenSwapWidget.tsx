import React from 'react';
import { GardenProvider } from '@gardenfi/react-hooks';
import { SwapWidget } from './components/SwapWidget';
import type { GardenSwapWidgetProps } from './types/types';

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
