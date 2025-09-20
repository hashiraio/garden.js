import React, { useEffect, useState } from 'react';
import { useSwapStore } from '../hooks/store';
import { useAssetStore } from '../store/assetStore';
import { Navbar } from '../common/Navbar';
import { TabKey } from '../types/types';
import TransactionHistory from './transactions/TransactionHistory';
import CreateSwap from './CreateSwap';
import { GardenFullLogo, Typography } from '@gardenfi/garden-book';
import { Modal } from '../common/ModalComponent';
import { ApiConfig, resolveApiConfig } from '@gardenfi/core';

const SwapWidget = ({ network }: { network: ApiConfig }) => {
  const { network: networkType } = resolveApiConfig(network);
  const [activeTab, setActiveTab] = useState<TabKey>('swap');

  const { quoteError, setCurrentNetwork, setDefaultBTC } = useSwapStore();

  const { fetchAssets, isLoading, error, allAssets } = useAssetStore();

  useEffect(() => {
    fetchAssets(networkType);
    setCurrentNetwork(networkType);
  }, [fetchAssets, setCurrentNetwork, networkType]);

  // Set BTC as default when assets are loaded
  useEffect(() => {
    if (allAssets.length > 0) {
      setDefaultBTC(allAssets);
    }
  }, [allAssets, setDefaultBTC]);

  return (
    <>
      <div
        className={`mx-auto flex h-full w-[424px] rounded-[20px] p-3 pb-4 max-w-[424px] bg-garden-grey flex-col justify-start gap-4 sm:max-w-[424px] ${
          activeTab === 'history' ? 'max-h-[496px]' : ''
        }`}
      >
        <Navbar active={activeTab} onChange={setActiveTab} />
        <div className="flex-1 flex flex-col min-h-0 w-full">
          {activeTab === 'swap' && <CreateSwap />}
          {activeTab === 'history' && <TransactionHistory />}
        </div>

        {isLoading && (
          <div className="text-sm text-mid-grey">Loading assets…</div>
        )}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {quoteError && <div className="text-sm text-red-600">{quoteError}</div>}

        <div className="text-xs h-4 text-mid-grey flex items-center justify-center gap-1.5 px-2">
          <Typography size="h5" weight="medium" className="!text-mid-grey">
            Powered by
          </Typography>
          <GardenFullLogo width={58} />
        </div>
      </div>
      <Modal />
    </>
  );
};

export default SwapWidget;
