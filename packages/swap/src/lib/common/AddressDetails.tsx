import React from 'react';
import { isBitcoin } from '@gardenfi/orderbook';
import { FC, useId, useMemo } from 'react';
import { ArrowNorthEastIcon, EditIcon } from '@gardenfi/garden-book';
import { Typography } from '@gardenfi/garden-book';
// import { useAssetInfoStore } from '../hooks/useAssetInfoStore';
import { swapStore } from '../store/swapStore';
import { getTrimmedAddress } from '../utils/utils';

type AddressDetailsProps = {
  isRefund?: boolean;
  address: string;
};

export const AddressDetails: FC<AddressDetailsProps> = ({
  isRefund,
  address,
}) => {
  //   const { allChains } = useAssetInfoStore();
  const tooltipId = useId();
  const { inputAsset, outputAsset } = swapStore();
  //   const { setIsEditBTCAddress } = swapStore();

  const chain = useMemo(() => {
    return isRefund
      ? inputAsset && inputAsset.chain
      : outputAsset && outputAsset.chain;
  }, [inputAsset, outputAsset, isRefund]);

  //   const redirect = useMemo(() => {
  //     return allChains && chain ? allChains[chain] : null;
  //   }, [allChains, chain]);

  //   const handleAddressRedirect = (address: string) => {
  //     if (!redirect) return;
  //     const url = new Url('address', redirect.explorer).endpoint(address);
  //     window.open(url, '_blank');
  //   };

  return (
    <>
      {address && chain && (
        <div
          className={`flex cursor-pointer items-center justify-between px-4 transition-all duration-200 ease-in-out hover:bg-white ${
            chain && !isBitcoin(chain)
              ? 'pointer-events-auto max-h-7 py-1 opacity-100'
              : 'pointer-events-none max-h-0 py-0 opacity-0'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            // handleAddressRedirect(address);
          }}
        >
          <Typography
            data-tooltip-id={isRefund ? tooltipId : ''}
            size="h5"
            weight="regular"
            className="!text-mid-grey"
          >
            {isRefund ? 'Refund' : 'Receive'} address
          </Typography>
          <div className="flex items-center gap-2">
            <Typography size="h5" weight="regular">
              {getTrimmedAddress(address)}
            </Typography>
            <div className="flex gap-1">
              <EditIcon
                className={`cursor-pointer p-0.5 transition-all duration-500 ease-in-out ${
                  chain && isBitcoin(chain)
                    ? 'max-h-4 max-w-4 opacity-100'
                    : '-mr-3.5 max-h-0 max-w-0 opacity-0'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              />
              <ArrowNorthEastIcon className="h-4 w-4 cursor-pointer p-[3px]" />
            </div>
          </div>
        </div>
      )}
      <Typography size="h5" weight="regular">
        {/* {isRefund && (
          <Tooltip
            id={tooltipId}
            place="right"
            content="If the swap expires, your Bitcoin will be refunded to this address."
            multiline={true}
          />
        )} */}
      </Typography>
    </>
  );
};
