import React, { useEffect } from 'react';
import { swapStore } from '../store/swapStore';
import { assetInfoStore } from '../store/assetStore';
import { Header } from '../common/Header';
import { TransactionHistory } from './transactions/TransactionHistory';
import { CreateSwap } from './CreateSwap';
import { Modal } from '../common/ModalComponent';
import { ApiConfig, resolveApiConfig } from '@gardenfi/core';
import { tabs } from '../constants/constants';
import { SwapWidgetBase } from '../common/SwapWidgetBase';
import { orderInProgressStore } from '../store/orderInProgressStore';
import { SwapInProgress } from './swapInProgress/SwapInProgress';
import { GardenSwapWidgetStyle } from '../types/types';
import { widgetConfigStore } from '../store/widgetConfigStore';

export const SwapWidget = ({
  network,
  style,
}: {
  network: ApiConfig;
  style: GardenSwapWidgetStyle;
}) => {
  const { network: networkType } = resolveApiConfig(network);

  const { setCurrentNetwork, activeTab } = swapStore();
  const { fetchAssets, fetchAndSetRPCs } = assetInfoStore();
  const { setStyle } = widgetConfigStore();

  useEffect(() => {
    fetchAssets(networkType);
    setCurrentNetwork(networkType);
    setStyle(style);
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

export const Swap = () => {
  const { isOpen } = orderInProgressStore();

  return <>{isOpen ? <SwapInProgress /> : <CreateSwap />}</>;
};
