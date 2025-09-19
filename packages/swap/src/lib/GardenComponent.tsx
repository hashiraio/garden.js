import React from 'react';
import { GardenProvider } from '@gardenfi/react-hooks';
import SwapWidget from './components/SwapWidget';
import '@gardenfi/garden-book/style.css';

type Props = Omit<React.ComponentProps<typeof GardenProvider>, 'children'>;

const GardenComponent: React.FC<Props> = ({ ...providerProps }) => {
  return (
    <GardenProvider {...providerProps}>
      <SwapWidget />
    </GardenProvider>
  );
};

export { GardenComponent };
