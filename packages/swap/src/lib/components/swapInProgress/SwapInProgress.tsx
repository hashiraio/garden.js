import React from 'react';
import {
  ArrowNorthEastIcon,
  CloseIcon,
  // DeleteIcon,
  Typography,
} from '@gardenfi/garden-book';
import { useCallback, useMemo } from 'react';
import {
  getTrimmedAddress,
  formatAmount,
  getAssetFromSwap,
} from '../../utils/utils';
import { assetInfoStore } from '../../store/assetStore';
import QRCode from 'react-qr-code';
import { isBitcoin } from '@gardenfi/orderbook';
import { CopyToClipboard } from '../../common/CopyToClipboard';
import { OrderStatus as OrderStatusEnum } from '@gardenfi/orderbook';
import { BTC } from '../../store/swapStore';
import { SwapInfo } from '../transactions/SwapInfo';
import { getApiEndpoint } from '../../constants/constants';
import orderInProgressStore from '../../store/orderInProgressStore';

export const SwapInProgress = () => {
  const { order, setIsOpen } = orderInProgressStore();
  const { allAssets, currentNetwork } = assetInfoStore();

  const { depositAddress, inputAsset, outputAsset } = useMemo(() => {
    return {
      depositAddress:
        order && isBitcoin(order?.source_swap.chain)
          ? order.source_swap.swap_id
          : '',
      inputAsset: order && getAssetFromSwap(order.source_swap, allAssets),
      outputAsset: order && getAssetFromSwap(order.destination_swap, allAssets),
      btcAddress: order ? order.destination_swap.delegate : '',
    };
  }, [allAssets, order]);

  const goBack = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const handleClickTransaction = () => {
    if (!order) return;
    window.open(
      `${getApiEndpoint(currentNetwork).explorer}/order/${order.order_id}`,
    );
  };

  return order ? (
    <div className="animate-fade-out flex flex-col gap-3">
      <div className="flex items-center justify-between p-1">
        <Typography size="h4" weight="medium">
          Swap in progress
        </Typography>
        <div className="flex items-center justify-center gap-3">
          <CloseIcon className="m-1 h-3 w-3 cursor-pointer" onClick={goBack} />
        </div>
      </div>
      <div
        className="flex cursor-pointer flex-col gap-2 rounded-2xl bg-white/50 p-4 hover:bg-white"
        onClick={handleClickTransaction}
      >
        <div className="flex items-center gap-2">
          <Typography size="h5" weight="medium">
            Transaction
          </Typography>
          <ArrowNorthEastIcon className="h-[10px] w-[10px]" />
        </div>
        {inputAsset && outputAsset && (
          <SwapInfo
            sendAsset={inputAsset}
            receiveAsset={outputAsset}
            sendAmount={formatAmount(
              order.source_swap.amount,
              inputAsset.decimals,
              inputAsset.symbol.includes(BTC.symbol)
                ? inputAsset.decimals
                : undefined,
            )}
            receiveAmount={formatAmount(
              order.destination_swap.amount,
              outputAsset.decimals,
              outputAsset.symbol.includes(BTC.symbol)
                ? outputAsset.decimals
                : undefined,
            )}
          />
        )}
      </div>
      {inputAsset &&
        isBitcoin(inputAsset.chain) &&
        order.status === OrderStatusEnum.Created && (
          <div className="flex justify-between rounded-2xl bg-white p-4">
            <div className="flex flex-col gap-2">
              <Typography size="h5" weight="medium">
                Deposit address
              </Typography>
              <div className="flex items-center gap-2">
                <Typography size="h3" weight="medium">
                  {getTrimmedAddress(depositAddress, 8, 6)}
                </Typography>
                <CopyToClipboard text={depositAddress} />
              </div>
            </div>
            <QRCode value={depositAddress} size={48} fgColor="#554B6A" />
          </div>
        )}
    </div>
  ) : (
    <></>
  );
};
