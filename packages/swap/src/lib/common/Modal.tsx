import React from 'react';
import { FC, ReactNode } from 'react';
import { BottomSheet } from './BottomSheet';

export const ResponsiveModal: FC<{
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
}> = ({ open, onClose, children }) => {
  return (
    <BottomSheet open={open} onClose={onClose}>
      {children}
    </BottomSheet>
  );
};
