import React from 'react';
import {
  ArrowNorthEastIcon,
  KeyboardDownIcon,
  Typography,
} from '@gardenfi/garden-book';
import { useState, FC, useMemo } from 'react';
import { isBitcoin, Order } from '@gardenfi/orderbook';
import BigNumber from 'bignumber.js';
import { CopyToClipboard } from '../../common/CopyToClipboard';
import { Url } from '@gardenfi/utils';
import { assetInfoStore } from '../../store/assetStore';
import {
  formatAmount,
  getAssetFromSwap,
  getTrimmedAddress,
} from '../../utils/utils';

type OrderDetailsProps = {
  order: Order;
};

type OrderDetailsRowProps = {
  title: string;
  value: string;
  copyString?: string;
  link?: string;
};

export const OrderDetailsRow: FC<OrderDetailsRowProps> = ({
  title,
  value,
  copyString,
  link,
}) => {
  const handleClickAddress = () => {
    if (link) window.open(link, '_blank');
  };

  return (
    <div className="flex justify-between">
      <Typography size="h4" weight="regular">
        {title}
      </Typography>
      <div className="flex items-center gap-2">
        <Typography size="h4" weight="regular">
          {link ? getTrimmedAddress(value) : value}
        </Typography>
        {copyString && <CopyToClipboard text={copyString} />}
        {link && (
          <ArrowNorthEastIcon
            className="h-[10px] w-[10px] cursor-pointer"
            onClick={handleClickAddress}
          />
        )}
      </div>
    </div>
  );
};

export const OrderDetails: FC<OrderDetailsProps> = ({ order }) => {
  const [dropdown, setDropdown] = useState(false);
  const { allAssets, chains } = assetInfoStore();

  const { inputAsset, outputAsset, btcAddress } = useMemo(() => {
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

  const chain = isBitcoin(order.source_swap.chain)
    ? order.source_swap.chain
    : isBitcoin(order.destination_swap.chain)
    ? order.destination_swap.chain
    : '';
  const baseUrl =
    order &&
    chains &&
    chain &&
    chains.find((c) => c.chain === chain) &&
    new Url(
      'address',
      chains.find((c) => c.chain === chain)?.explorerUrl.toString(),
    );

  const link = baseUrl && btcAddress && baseUrl.endpoint(btcAddress);

  const { inputAmountPrice, outputAmountPrice, amountToFill, filledAmount } =
    useMemo(() => {
      return {
        inputAmountPrice: order
          ? new BigNumber(order.source_swap.amount)
              .dividedBy(10 ** (inputAsset?.decimals ?? 0))
              .multipliedBy(order.source_swap.asset_price)
          : new BigNumber(0),
        outputAmountPrice: order
          ? new BigNumber(order.destination_swap.amount)
              .dividedBy(10 ** (outputAsset?.decimals ?? 0))
              .multipliedBy(order.destination_swap.asset_price)
          : new BigNumber(0),
        amountToFill: order
          ? formatAmount(order.source_swap.amount, inputAsset?.decimals ?? 0)
          : 0,
        filledAmount: order
          ? formatAmount(
              order.source_swap.filled_amount,
              inputAsset?.decimals ?? 0,
            )
          : 0,
      };
    }, [inputAsset, order, outputAsset]);

  const fees = BigNumber.maximum(
    inputAmountPrice.minus(outputAmountPrice),
    0,
  ).toFixed(3);

  const handleDropdown = () => setDropdown(!dropdown);

  return (
    <div className="flex flex-col justify-between rounded-2xl bg-white/50 p-4">
      <div
        onClick={handleDropdown}
        className="flex w-full cursor-pointer items-center justify-between"
      >
        <Typography size="h5" weight="medium">
          Details
        </Typography>
        <div
          className={`transform transition-transform duration-300 ${
            dropdown ? 'rotate-180' : 'rotate-0'
          }`}
        >
          <KeyboardDownIcon />
        </div>
      </div>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          dropdown ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="mt-2 flex flex-col gap-3 rounded-2xl">
          <OrderDetailsRow title="Fee" value={`$${fees}`} />
          <OrderDetailsRow
            title="Amount"
            value={`${filledAmount} / ${amountToFill} ${inputAsset?.symbol}`}
          />
          <OrderDetailsRow
            title="Order ID"
            value={getTrimmedAddress(order.order_id)}
            copyString={order.order_id}
          />
          {inputAsset && btcAddress && link && (
            <OrderDetailsRow
              title={
                isBitcoin(inputAsset.chain)
                  ? 'Recovery'
                  : 'Receive' + ' address'
              }
              value={btcAddress}
              link={link.toString()}
            />
          )}
        </div>
      </div>
    </div>
  );
};
