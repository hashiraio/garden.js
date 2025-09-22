import React, { useEffect, useState } from 'react';
import { swapStore } from '../store/swapStore';
import { assetInfoStore } from '../store/assetStore';
import { Navbar } from '../common/Header';
import TransactionHistory from './transactions/TransactionHistory';
import CreateSwap from './CreateSwap';
import { Modal } from '../common/ModalComponent';
import { ApiConfig, resolveApiConfig } from '@gardenfi/core';
import { tabs } from '../constants/constants';
import { Tab } from '../types/types';

const SwapWidget = ({ network }: { network: ApiConfig }) => {
  const { network: networkType } = resolveApiConfig(network);
  const [activeTab, setActiveTab] = useState<Tab>(tabs.swap);

  const { setCurrentNetwork } = swapStore();
  const { fetchAssets } = assetInfoStore();

  useEffect(() => {
    fetchAssets(networkType);
    setCurrentNetwork(networkType);
  }, [fetchAssets, setCurrentNetwork, networkType]);

  return (
    <>
      <div
        className={`mx-auto flex h-full w-[424px] rounded-[20px] p-3 pb-4 max-w-[424px] bg-garden-grey flex-col justify-start gap-4 sm:max-w-[424px] ${
          activeTab.id === tabs.history.id ? 'max-h-[496px]' : ''
        }`}
      >
        <Navbar activeTab={activeTab} onChange={setActiveTab} />
        <div className="flex-1 flex flex-col min-h-0 w-full">
          {activeTab.id === tabs.swap.id && <CreateSwap />}
          {activeTab.id === tabs.history.id && <TransactionHistory />}
        </div>
      </div>
      <Modal />
    </>
  );
};

export default SwapWidget;
