import { IGardenJS, OrderWithStatus } from '@gardenfi/core';
import { create } from 'zustand';

type OrderInProgressStoreState = {
  order: OrderWithStatus | null;
  isOpen: boolean;
  setOrder: (garden: IGardenJS, orderId: string) => Promise<void>;
  setIsOpen: (isOpen: boolean) => void;
};

const orderInProgressStore = create<OrderInProgressStoreState>((set) => ({
  order: null,
  isOpen: false,
  setOrder: async (garden, orderId) => {
    const order = await garden?.getOrder(orderId);
    set({ order: order.val });
  },
  setIsOpen: (isOpen) => {
    set({ isOpen });
  },
}));

export default orderInProgressStore;
