import React from 'react';
import { GardenProvider } from '@gardenfi/react-hooks';
import { SwapWidget } from './components/SwapWidget';
import type { GardenSwapWidgetProps } from './types/types';

const GardenSwapWidget: React.FC<GardenSwapWidgetProps> = ({ config }) => {
  const { styles, store, setRedeemServiceEnabled, ...providerConfig } = config;
  return (
    <GardenProvider
      config={providerConfig}
      store={store}
      setRedeemServiceEnabled={setRedeemServiceEnabled}
    >
      <SwapWidget network={providerConfig.environment} styles={styles} />
    </GardenProvider>
  );
};

export { GardenSwapWidget };
