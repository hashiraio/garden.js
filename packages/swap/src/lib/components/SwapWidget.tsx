import React, { useEffect } from 'react';
import { swapStore } from '../store/swapStore';
import { assetInfoStore } from '../store/assetStore';
import { Header } from '../common/Header';
import TransactionHistory from './transactions/TransactionHistory';
import CreateSwap from './CreateSwap';
import { Modal } from '../common/ModalComponent';
import { ApiConfig, resolveApiConfig } from '@gardenfi/core';
import { tabs } from '../constants/constants';
import SwapWidgetBase from '../common/SwapWidgetBase';

const SwapWidget = ({ network }: { network: ApiConfig }) => {
  const { network: networkType } = resolveApiConfig(network);

  const { setCurrentNetwork, activeTab } = swapStore();
  const { fetchAssets, fetchAndSetRPCs } = assetInfoStore();

  useEffect(() => {
    fetchAssets(networkType);
    setCurrentNetwork(networkType);
  }, [fetchAssets, setCurrentNetwork, networkType]);

  useEffect(() => {
    fetchAndSetRPCs();
  }, [fetchAndSetRPCs]);

  return (
    <>
      <SwapWidgetBase>
        <Header />
        {activeTab.id === tabs.swap.id && <CreateSwap />}
        {activeTab.id === tabs.history.id && <TransactionHistory />}
        <Modal />
      </SwapWidgetBase>
    </>
  );
};

export default SwapWidget;
