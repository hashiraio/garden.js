import React, { useEffect } from 'react';
import { swapStore } from '../store/swapStore';
import { assetInfoStore } from '../store/assetStore';
import { Header } from '../common/Header';
import TransactionHistory from './transactions/TransactionHistory';
import CreateSwap from './CreateSwap';
import { Modal } from '../common/ModalComponent';
import { ApiConfig, resolveApiConfig } from '@gardenfi/core';
import SwapWidgetBase from '../common/SwapWidgetBase';

const SwapWidget = ({ network }: { network: ApiConfig }) => {
  const { network: networkType } = resolveApiConfig(network);

  const { setCurrentNetwork, activeTab } = swapStore();
  const { fetchAssets } = assetInfoStore();

  useEffect(() => {
    fetchAssets(networkType);
    setCurrentNetwork(networkType);
  }, [fetchAssets, setCurrentNetwork, networkType]);

  return (
    <>
      <SwapWidgetBase>
        <Header />
        <div className="flex-1 flex flex-col min-h-0 w-full">
          {activeTab === 'swap' && <CreateSwap />}
          {activeTab === 'history' && <TransactionHistory />}
        </div>
      </SwapWidgetBase>
      <Modal />
    </>
  );
};

export default SwapWidget;
