import React, { useEffect, useState } from 'react';
import { useSwapStore } from '../hooks/store';
import { useAssetStore } from '../hooks/assetStore';
import AssetModal from './AssetModal';
import Navbar from './Navbar';
import { TabKey } from '../types/types';
import TransactionHistory from './TransactionHistory';
import CreateSwap from './CreateSwap';
import { GardenFullLogo } from '@gardenfi/garden-book';

const SwapWidget = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('swap');

  const { modalOpenFor, closeModal, selectAsset, quoteError } = useSwapStore();

  const { fetchAssets, isLoading, error } = useAssetStore();

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  return (
    <div className="mx-auto flex h-full w-[424px] rounded-[20px] p-3 pb-4 max-w-[424px] bg-[#E4EBF2] flex-col justify-start gap-4 sm:min-h-[496px] sm:max-h-[496px] sm:max-w-[424px]">
      <Navbar active={activeTab} onChange={setActiveTab} />
      <div className="flex-1 flex flex-col min-h-0 w-full">
        {activeTab === 'swap' && <CreateSwap />}
        {activeTab === 'history' && <TransactionHistory />}
      </div>

      {isLoading && (
        <div className="text-sm text-slate-500">Loading assets…</div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {quoteError && <div className="text-sm text-red-600">{quoteError}</div>}

      <div className="text-xs h-4 text-[#908AAD] flex items-center justify-center gap-1.5 px-2">
        Powered by
        <GardenFullLogo color={'#908AAD'} width={58} />
      </div>

      <AssetModal
        open={modalOpenFor !== null}
        onClose={closeModal}
        onSelect={(asset) => {
          if (!modalOpenFor) return;
          selectAsset(modalOpenFor, asset);
        }}
      />
    </div>
  );
};

export default SwapWidget;
