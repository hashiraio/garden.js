import React from 'react';
import { BottomSheet, Modal, OpacityVariants } from '@gardenfi/garden-book';
import { FC, ReactNode } from 'react';
import { viewPortStore } from '../store/viewPortStore';

export const ResponsiveModal: FC<{
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  opacityLevel?: OpacityVariants;
}> = ({ open, onClose, children, opacityLevel = 'medium' }) => {
  const { isMobile } = viewPortStore();

  return (
    <>
      {isMobile ? (
        <BottomSheet open={open} onOpenChange={onClose}>
          {children}
        </BottomSheet>
      ) : (
        <Modal open={open} onClose={onClose}>
          <Modal.Children
            opacityLevel={opacityLevel}
            className={
              'relative flex w-full max-w-[560px] flex-col gap-4 rounded-2xl p-3 overflow-hidden'
            }
          >
            {children}
          </Modal.Children>
        </Modal>
      )}
    </>
  );
};
