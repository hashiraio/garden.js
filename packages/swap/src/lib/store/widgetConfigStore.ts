import { create } from 'zustand';
import { GardenSwapWidgetStyles } from '../types/types';

type WidgetConfigStoreState = {
  styles?: GardenSwapWidgetStyles;
  setStyles: (styles: GardenSwapWidgetStyles) => void;
};

export const widgetConfigStore = create<WidgetConfigStoreState>((set) => ({
  styles: undefined,
  setStyles: (styles) => {
    set({ styles });
  },
}));
