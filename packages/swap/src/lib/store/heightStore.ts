import { create } from 'zustand';

type HeightStore = {
  showBtcAddress: boolean;
  showInputAddress: boolean;
  showFeesAndRateDetails: boolean;
  setShowBtcAddress: (showBtcAddress: boolean) => void;
  setShowInputAddress: (showInputAddress: boolean) => void;
  setShowFeesAndRateDetails: (showFeesAndRateDetails: boolean) => void;
};

export const heightStore = create<HeightStore>()((set) => ({
  showBtcAddress: false,
  showInputAddress: false,
  showFeesAndRateDetails: false,
  setShowBtcAddress: (showBtcAddress: boolean) =>
    set({ showBtcAddress: showBtcAddress }),
  setShowInputAddress: (showInputAddress: boolean) =>
    set({ showInputAddress: showInputAddress }),
  setShowFeesAndRateDetails: (showFeesAndRateDetails: boolean) =>
    set({ showFeesAndRateDetails: showFeesAndRateDetails }),
}));
