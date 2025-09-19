import { Swap } from '@gardenfi/orderbook';
import { ParsedAsset } from '../types/types';
import BigNumber from 'bignumber.js';

export const getDayDifference = (date: string) => {
  const now = new Date();
  const differenceInMs = now.getTime() - new Date(date).getTime();
  const dayDifference = Math.floor(differenceInMs / (1000 * 3600 * 24));
  const hourDifference = Math.floor(differenceInMs / (1000 * 3600));
  const minuteDifference = Math.floor(differenceInMs / (1000 * 60));

  if (dayDifference > 3) return `on ${new Date(date).toLocaleDateString()}`;
  if (dayDifference > 0)
    return `${dayDifference} day${dayDifference > 1 ? 's' : ''} ago`;
  if (hourDifference > 0)
    return `${hourDifference} hour${hourDifference > 1 ? 's' : ''} ago`;
  if (minuteDifference > 0)
    return `${minuteDifference} minute${minuteDifference > 1 ? 's' : ''} ago`;
  return 'Just now';
};

export const getAssetFromSwap = (swap: Swap, assets: ParsedAsset[] | null) => {
  return (
    assets && assets.find((asset) => asset.asset.toString() === swap.asset)
  );
};

export const formatAmount = (
  amount: string | number | bigint,
  decimals: number,
  toFixed?: number,
) => {
  const bigAmount = new BigNumber(amount);
  if (bigAmount.isZero()) return 0;

  const value = bigAmount.dividedBy(10 ** decimals);
  const precision = toFixed ? toFixed : Number(value) > 10000 ? 2 : 4;
  let temp = value.toFixed(precision, BigNumber.ROUND_DOWN);

  while (
    temp
      .split('.')[1]
      ?.split('')
      .every((d) => d === '0') &&
    temp.split('.')[1].length < 8
  ) {
    temp = value.toFixed(temp.split('.')[1].length + 2, BigNumber.ROUND_DOWN);
  }

  return Number(temp);
};

export const getTrimmedAddress = (address: string, start = 6, end = 4) => {
  return `${address.slice(0, start)}...${address.slice(-end)}`;
};

export const formatTime = (totalSeconds: number | string): string => {
  const sec = Number(totalSeconds);
  if (isNaN(sec)) return '-';

  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = (sec % 60).toFixed(0);

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${seconds}s`;
};
