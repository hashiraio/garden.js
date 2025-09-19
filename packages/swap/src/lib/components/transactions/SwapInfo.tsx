import React from 'react';
import {
  ArrowRightIcon,
  TokenNetworkLogos,
  Typography,
} from '@gardenfi/garden-book';
import { FC } from 'react';
import { useAssetStore } from '../../hooks/assetStore';
import { ParsedAsset } from '../../types/assetTypes';

type SwapInfoProps = {
  sendAsset: ParsedAsset;
  receiveAsset: ParsedAsset;
  sendAmount: string | number;
  receiveAmount: string | number;
  equalSplit?: boolean;
};

export const SwapInfo: FC<SwapInfoProps> = ({
  sendAsset,
  receiveAsset,
  sendAmount,
  receiveAmount,
  equalSplit = false,
}) => {
  const { chains } = useAssetStore();
  const sendChain = chains.find(
    (chain) => chain.chainDisplayName === sendAsset.chainDisplayName,
  );
  const receiveChain = chains.find(
    (chain) => chain.chainDisplayName === receiveAsset.chainDisplayName,
  );

  return (
    <div className="flex items-center justify-between">
      <div
        className={`flex items-center justify-start gap-2 ${
          equalSplit ? 'w-fit' : 'w-full'
        }`}
      >
        <Typography size="h3" weight="regular">
          {sendAmount}
        </Typography>
        <TokenNetworkLogos
          tokenLogo={sendAsset.iconUrl}
          chainLogo={
            sendChain?.iconUrl === sendAsset.iconUrl
              ? ''
              : sendChain?.iconUrl ?? ''
          }
        />
      </div>
      <ArrowRightIcon className={equalSplit ? '' : 'h-5 w-9'} />
      <div
        className={`flex items-center justify-end gap-2 ${
          equalSplit ? 'w-fit' : 'w-full'
        }`}
      >
        <Typography size="h3" weight="regular">
          {receiveAmount}
        </Typography>
        <TokenNetworkLogos
          tokenLogo={receiveAsset.iconUrl}
          chainLogo={receiveChain?.iconUrl ?? ''}
        />
      </div>
    </div>
  );
};
