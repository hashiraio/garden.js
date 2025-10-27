import React from 'react';
import {
  ArrowRightIcon,
  TokenNetworkLogos,
  Typography,
} from '@gardenfi/garden-book';
import { FC } from 'react';
import { assetInfoStore } from '../../store/assetStore';
import { Asset } from '@gardenfi/orderbook';

type SwapInfoProps = {
  sendAsset: Asset;
  receiveAsset: Asset;
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
  const { chains } = assetInfoStore();
  const sendChain = chains.find((chain) => chain.chain === sendAsset.chain);
  const receiveChain = chains.find(
    (chain) => chain.chain === receiveAsset.chain,
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
          tokenLogo={sendAsset.icon}
          chainLogo={
            sendChain?.iconUrl === sendAsset.icon
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
          tokenLogo={receiveAsset.icon}
          chainLogo={receiveChain?.iconUrl ?? ''}
        />
      </div>
    </div>
  );
};
