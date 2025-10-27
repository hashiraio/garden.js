import { create } from 'zustand';

export const BREAKPOINTS = {
  xs: 360,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1440,
  '2xl': 1536,
};

type ViewPortStore = {
  width: number;
  height: number;
  isMobile: boolean;
  isTab: boolean;
  updateViewport: () => void;
};

export const viewPortStore = create<ViewPortStore>()((set) => ({
  width: typeof window !== 'undefined' ? window.innerWidth : 0,
  height: typeof window !== 'undefined' ? window.innerHeight : 0,
  isMobile:
    typeof window !== 'undefined'
      ? /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
        window.innerWidth < BREAKPOINTS.sm
      : false,
  isTab:
    typeof window !== 'undefined' ? window.innerWidth >= BREAKPOINTS.md : false,
  updateViewport: () => {
    if (typeof window !== 'undefined') {
      set({
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile:
          /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
          window.innerWidth < BREAKPOINTS.sm,
        isTab: window.innerWidth >= BREAKPOINTS.md,
      });
    }
  },
}));
