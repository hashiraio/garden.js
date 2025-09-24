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
// import Swap from './Swap';
import orderInProgressStore from '../store/orderInProgressStore';
import { SwapInProgress } from './swapInProgress/SwapInProgress';

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
        {activeTab.id === tabs.swap.id && <Swap />}
        {activeTab.id === tabs.history.id && <TransactionHistory />}
        <Modal />
      </SwapWidgetBase>
    </>
  );
};

const Swap = () => {
  const { isOpen } = orderInProgressStore();

  return <>{isOpen ? <SwapInProgress /> : <CreateSwap />}</>;
};

export default SwapWidget;
