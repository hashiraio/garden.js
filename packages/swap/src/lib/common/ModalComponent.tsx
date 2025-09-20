import React, { useEffect } from 'react';
import { ResponsiveModal } from './Modal';
import AssetModal from '../components/assetSelection/AssetModal';
import { useSwapStore } from '../hooks/store';

export type ModalProps = {
  open: boolean;
  onClose?: () => void;
};

export const Modal = () => {
  const { closeAssetModal, isAssetModalOpen, modalOpenFor, selectAsset } =
    useSwapStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isAssetModalOpen) closeAssetModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAssetModalOpen, closeAssetModal]);

  return (
    <>
      <ResponsiveModal
        open={isAssetModalOpen}
        onClose={() => closeAssetModal()}
      >
        <AssetModal
          onSelect={(asset) => {
            if (!modalOpenFor) return;
            selectAsset(modalOpenFor, asset);
          }}
        />
      </ResponsiveModal>
    </>
  );
};
