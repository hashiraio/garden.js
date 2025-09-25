import { create } from 'zustand';
import { GardenSwapWidgetStyle } from '../types/types';

type WidgetConfigStoreState = {
  style: GardenSwapWidgetStyle;
  setStyle: (style: GardenSwapWidgetStyle) => void;
};

export const widgetConfigStore = create<WidgetConfigStoreState>((set) => ({
  style: {},
  setStyle: (style) => {
    set({ style });
  },
}));
