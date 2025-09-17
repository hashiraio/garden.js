import React, { createContext, FC, useEffect, useMemo, useState } from 'react';
import { useOrderbook } from '../hooks/useOrderbook';
import {
  Garden,
  IGardenJS,
  Quote,
  QuoteParamsForAssets,
  resolveApiConfig,
} from '@gardenfi/core';
import { SwapParams } from '@gardenfi/core';
import type {
  GardenContextType,
  GardenProviderProps,
} from './gardenProvider.types';
import { hasAnyValidValue } from '../utils';
import { useDigestKey } from '../hooks/useDigestKey';
import { Err, Ok } from '@gardenfi/utils';
import { PENDING_ORDERS_STORE } from '../constants';

export const GardenContext = createContext<GardenContextType>({
  pendingOrders: [],
});

export const GardenProvider: FC<GardenProviderProps> = ({
  children,
  config,
  store,
  setRedeemServiceEnabled = true,
}) => {
  const [garden, setGarden] = useState<IGardenJS>();

  const { digestKey } = useDigestKey(setRedeemServiceEnabled);
  const { pendingOrders } = useOrderbook(garden, store);

  const quote = useMemo(() => {
    const { api } = resolveApiConfig(config.environment);
    return config.quote ?? new Quote(api.baseurl);
  }, [config.environment, config.quote]);

  const getQuote = useMemo(
    () =>
      async ({
        fromAsset,
        toAsset,
        amount,
        isExactOut = false,
        options,
      }: QuoteParamsForAssets) => {
        const _quote = garden ? garden.quote : quote;
        return await _quote.getQuoteFromAssets({
          fromAsset,
          toAsset,
          amount,
          isExactOut,
          options,
        });
      },
    [garden, quote],
  );

  const swap = async (params: SwapParams) => {
    if (!garden) return Err('Garden not initialized');

    const order = await garden.createSwap(params);
    if (!order.val) return Err(order.error || 'Unknown error occurred');

    if (setRedeemServiceEnabled) {
      try {
        const existing = store.getItem(PENDING_ORDERS_STORE);
        const ids: string[] = existing ? JSON.parse(existing) : [];
        if (!ids.includes(order.val)) ids.push(order.val);
        store.setItem(PENDING_ORDERS_STORE, JSON.stringify(ids));
      } catch (e) {
        console.error('Failed to persist pending order id', e);
      }
    }

    return Ok(order.val);
  };

  useEffect(() => {
    if (!window) return;

    if (!!setRedeemServiceEnabled && !digestKey) return;

    if (!('wallets' in config) && !('htlc' in config)) return;

    let garden: Garden;
    if (
      'wallets' in config &&
      Object.keys(config.wallets ?? {}).length > 0 &&
      hasAnyValidValue(config.wallets ?? {})
    ) {
      garden = Garden.fromWallets({
        ...config,
        digestKey: setRedeemServiceEnabled ? undefined : digestKey,
      }).setRedeemServiceEnabled(setRedeemServiceEnabled);
    } else if (
      'htlc' in config &&
      Object.keys(config.htlc ?? {}).length > 0 &&
      hasAnyValidValue(config.htlc ?? {})
    ) {
      garden = new Garden({
        ...config,
        digestKey: setRedeemServiceEnabled ? undefined : digestKey,
      }).setRedeemServiceEnabled(setRedeemServiceEnabled);
    } else {
      return;
    }

    setGarden(garden);
  }, [config, digestKey, setRedeemServiceEnabled]);

  return (
    <GardenContext.Provider
      value={{
        swap,
        pendingOrders,
        getQuote,
        garden,
        orderBook: garden,
      }}
    >
      {children}
    </GardenContext.Provider>
  );
};

export const useGarden = () => {
  const garden = React.useContext(GardenContext);
  if (!garden)
    throw new Error('useGarden must be used within a GardenProvider');
  return garden;
};
