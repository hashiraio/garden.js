import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Network } from '@gardenfi/utils';
import { ParsedAsset } from 'src/lib/types/types';

export const getSuiNetworkFee = async (
  address: string,
  asset: ParsedAsset,
  inputAmount: string,
  network: Network,
) => {
  const BUFFER_FEE_IN_MIST = 5_000_000;
  try {
    const amount = new BigNumber(inputAmount)
      .multipliedBy(10 ** asset.decimals)
      .toFixed(0);

    const totalGasCost = await getSuiTotalGasFee(address, amount, network);

    const networkFee = BigNumber(BUFFER_FEE_IN_MIST + totalGasCost)
      .dividedBy(10 ** asset.decimals)
      .toNumber();

    return networkFee * asset.price;
  } catch (error) {
    console.log(error);
  }
  return 0;
};

export const getSuiTotalGasFee = async (
  address: string,
  amount: string,
  network: Network,
) => {
  const client = new SuiClient({ url: getFullnodeUrl(network) });
  const tx = new Transaction();
  tx.setSender(address);

  const [coin] = tx.splitCoins(tx.gas, [BigInt(amount)]);

  tx.transferObjects([coin], address);
  const data = await tx.build({ client });
  const dryRunResult = await client.dryRunTransactionBlock({
    transactionBlock: data,
  });
  const gasObject = dryRunResult.effects.gasUsed;
  const totalGasCost =
    Number(gasObject.computationCost) +
    Number(gasObject.storageCost) +
    Number(gasObject.nonRefundableStorageFee);
  return totalGasCost;
};
