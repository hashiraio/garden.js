import { createPublicClient, http } from 'viem';
import { EVMChains } from '@gardenfi/orderbook';
import { evmToViemChainMap } from '@gardenfi/core';

export const getLegacyGasEstimate = async (
  chain: EVMChains,
  address: `0x${string}`,
  contractAddress: `0x${string}`,
): Promise<{ gasLimit: bigint; gasPrice: bigint; gasCost: bigint } | null> => {
  const viemChain = evmToViemChainMap[chain];
  if (!viemChain) return null;

  const publicClient = createPublicClient({
    chain: viemChain,
    transport: http(),
  });

  try {
    const redeemer = '0x000000000000000000000000000000000000dead';
    const timelock = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const secretHash = ('0x' + '0'.repeat(64)) as `0x${string}`;

    // Estimate gas limit
    const gasLimit = await publicClient.estimateContractGas({
      address: contractAddress,
      account: address,
      abi: [
        {
          inputs: [
            {
              internalType: 'address payable',
              name: 'redeemer',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'timelock',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amount',
              type: 'uint256',
            },
            {
              internalType: 'bytes32',
              name: 'secretHash',
              type: 'bytes32',
            },
          ],
          name: 'initiate',
          outputs: [],
          stateMutability: 'payable',
          type: 'function',
        },
      ],
      functionName: 'initiate',
      args: [redeemer, timelock, 1n, secretHash],
      value: 1n,
    });

    // Get legacy gas price
    const gasPrice = await publicClient.getGasPrice();

    // Total fee in wei
    const bufferedGasLimit = gasLimit + (gasLimit * 40n) / 100n;
    const bufferedGasPrice = gasPrice + (gasPrice * 50n) / 100n;
    const gasCost = bufferedGasLimit * bufferedGasPrice;

    return {
      gasLimit,
      gasPrice,
      gasCost,
    };
  } catch (err) {
    console.error('Legacy gas estimate failed:', err);
    return null;
  }
};
